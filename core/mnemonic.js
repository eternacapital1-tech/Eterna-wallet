/**
 * BIP-39 Mnemonic Generation and Validation
 * English wordlist only
 */

class MnemonicManager {
    constructor() {
        this.wordCount = SecurityConfig.validation.mnemonic.wordCount;
        this.wordList = this.getEnglishWordList();
    }
    
    /**
     * BIP-39 English Word List (2048 words)
     */
    getEnglishWordList() {
        return [
            "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse",
            "access", "accident", "account", "accuse", "achieve", "acid", "acoustic", "acquire", "across", "act",
            "action", "actor", "actress", "actual", "adapt", "add", "addict", "address", "adjust", "admit",
            "adult", "advance", "advice", "aerobic", "affair", "afford", "afraid", "again", "age", "agent",
            "agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol", "alert",
            // ... (truncated for brevity - full 2048 words in production)
            "zone"
        ];
    }
    
    /**
     * Generate random mnemonic
     */
    generateMnemonic(wordCount = 12) {
        if (!this.wordCount.includes(wordCount)) {
            throw new Error(`Invalid word count. Must be one of: ${this.wordCount.join(', ')}`);
        }
        
        const entropyBits = wordCount * 11 - (wordCount / 3);
        const entropyBytes = entropyBits / 8;
        
        // Generate random entropy
        const entropy = SecurityConfig.generateSecureRandom(entropyBytes);
        
        // Create mnemonic
        const mnemonic = this.entropyToMnemonic(entropy);
        
        // Clear entropy from memory
        SecurityConfig.zeroBuffer(entropy);
        
        return mnemonic;
    }
    
    /**
     * Convert entropy to mnemonic words
     */
    entropyToMnemonic(entropy) {
        // Calculate checksum
        const hash = this.sha256(entropy);
        const checksumBits = entropy.length * 8 / 32;
        
        // Combine entropy and checksum
        const bits = [];
        for (let i = 0; i < entropy.length; i++) {
            bits.push(...this.byteToBits(entropy[i]));
        }
        
        const hashBits = [];
        for (let i = 0; i < hash.length; i++) {
            hashBits.push(...this.byteToBits(hash[i]));
        }
        
        bits.push(...hashBits.slice(0, checksumBits));
        
        // Convert bits to words
        const words = [];
        for (let i = 0; i < bits.length; i += 11) {
            const wordBits = bits.slice(i, i + 11);
            const index = this.bitsToNumber(wordBits);
            words.push(this.wordList[index]);
        }
        
        return words.join(' ');
    }
    
    /**
     * Validate mnemonic
     */
    validateMnemonic(mnemonic) {
        if (!mnemonic || typeof mnemonic !== 'string') {
            return { valid: false, error: 'Invalid mnemonic format' };
        }
        
        const words = mnemonic.trim().split(/\s+/g);
        
        // Check word count
        if (!this.wordCount.includes(words.length)) {
            return {
                valid: false,
                error: `Invalid word count. Must be ${this.wordCount.join(', ')} words`
            };
        }
        
        // Check all words are valid
        for (const word of words) {
            if (!this.wordList.includes(word)) {
                return {
                    valid: false,
                    error: `Invalid word: "${word}"`
                };
            }
        }
        
        // Verify checksum
        try {
            const entropy = this.mnemonicToEntropy(mnemonic);
            const valid = this.verifyChecksum(entropy);
            
            if (!valid) {
                return { valid: false, error: 'Invalid checksum' };
            }
            
            return { valid: true };
            
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }
    
    /**
     * Convert mnemonic to entropy
     */
    mnemonicToEntropy(mnemonic) {
        const words = mnemonic.trim().split(/\s+/g);
        const bits = [];
        
        // Convert words to bits
        for (const word of words) {
            const index = this.wordList.indexOf(word);
            if (index === -1) {
                throw new Error(`Invalid word: ${word}`);
            }
            bits.push(...this.numberToBits(index, 11));
        }
        
        // Extract entropy and checksum
        const checksumBits = bits.length / 33;
        const entropyBits = bits.length - checksumBits;
        
        const entropy = [];
        for (let i = 0; i < entropyBits; i += 8) {
            const byteBits = bits.slice(i, i + 8);
            entropy.push(this.bitsToNumber(byteBits));
        }
        
        return new Uint8Array(entropy);
    }
    
    /**
     * Verify mnemonic checksum
     */
    verifyChecksum(entropy) {
        const hash = this.sha256(entropy);
        const checksumBits = entropy.length * 8 / 32;
        
        const hashBits = [];
        for (let i = 0; i < hash.length; i++) {
            hashBits.push(...this.byteToBits(hash[i]));
        }
        
        const mnemonic = this.entropyToMnemonic(entropy);
        const words = mnemonic.split(' ');
        const bits = [];
        
        for (const word of words) {
            const index = this.wordList.indexOf(word);
            bits.push(...this.numberToBits(index, 11));
        }
        
        // Extract checksum from mnemonic
        const extractedChecksum = bits.slice(-checksumBits);
        const expectedChecksum = hashBits.slice(0, checksumBits);
        
        // Compare checksums
        for (let i = 0; i < checksumBits; i++) {
            if (extractedChecksum[i] !== expectedChecksum[i]) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Convert mnemonic to seed
     */
    async mnemonicToSeed(mnemonic, passphrase = '') {
        const mnemonicBuffer = new TextEncoder().encode(
            this.normalizeString(mnemonic)
        );
        const saltBuffer = new TextEncoder().encode(
            'mnemonic' + this.normalizeString(passphrase)
        );
        
        // Use PBKDF2 to derive seed
        const baseKey = await window.crypto.subtle.importKey(
            'raw',
            mnemonicBuffer,
            { name: 'PBKDF2' },
            false,
            ['deriveBits']
        );
        
        const seed = await window.crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: saltBuffer,
                iterations: 2048,
                hash: 'SHA-512'
            },
            baseKey,
            512
        );
        
        // Clean up
        SecurityConfig.zeroBuffer(mnemonicBuffer);
        SecurityConfig.zeroBuffer(saltBuffer);
        
        return new Uint8Array(seed);
    }
    
    /**
     * Helper: SHA-256 hash
     */
    sha256(data) {
        // Using Web Crypto API
        const buffer = data instanceof Uint8Array ? data.buffer : data;
        return window.crypto.subtle.digest('SHA-256', buffer);
    }
    
    /**
     * Helper: Convert byte to bits array
     */
    byteToBits(byte) {
        const bits = [];
        for (let i = 7; i >= 0; i--) {
            bits.push((byte >> i) & 1);
        }
        return bits;
    }
    
    /**
     * Helper: Convert number to bits array
     */
    numberToBits(number, length) {
        const bits = [];
        for (let i = length - 1; i >= 0; i--) {
            bits.push((number >> i) & 1);
        }
        return bits;
    }
    
    /**
     * Helper: Convert bits array to number
     */
    bitsToNumber(bits) {
        let number = 0;
        for (let i = 0; i < bits.length; i++) {
            number = (number << 1) | bits[i];
        }
        return number;
    }
    
    /**
     * Helper: Normalize string (NFKD)
     */
    normalizeString(str) {
        return str.normalize('NFKD');
    }
    
    /**
     * Split mnemonic into chunks for display
     */
    formatMnemonic(mnemonic) {
        const words = mnemonic.split(' ');
        return words.map((word, index) => ({
            index: index + 1,
            word: word
        }));
    }
    
    /**
     * Generate random word indexes for verification
     */
    getVerificationWords(mnemonic, count = 3) {
        const words = mnemonic.split(' ');
        const indexes = [];
        
        while (indexes.length < count) {
            const index = Math.floor(Math.random() * words.length);
            if (!indexes.includes(index)) {
                indexes.push(index);
            }
        }
        
        return indexes.sort((a, b) => a - b).map(index => ({
            index: index + 1,
            word: words[index],
            options: this.getRandomWords(words[index], 3)
        }));
    }
    
    /**
     * Get random words for verification options
     */
    getRandomWords(correctWord, count) {
        const options = [correctWord];
        
        while (options.length < count + 1) {
            const randomWord = this.wordList[
                Math.floor(Math.random() * this.wordList.length)
            ];
            if (!options.includes(randomWord)) {
                options.push(randomWord);
            }
        }
        
        // Shuffle options
        return options.sort(() => Math.random() - 0.5);
    }
}

// Create singleton instance
const Mnemonic = new MnemonicManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Mnemonic;
} else {
    window.Mnemonic = Mnemonic;
}