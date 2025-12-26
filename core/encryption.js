/**
 * AES-256 Encryption Module
 * Client-side only - never transmits data
 */

class EncryptionManager {
    constructor() {
        this.algorithm = SecurityConfig.encryption.algorithm;
        this.keySize = SecurityConfig.encryption.keySize;
        this.ivSize = SecurityConfig.encryption.ivSize;
        this.saltSize = SecurityConfig.encryption.saltSize;
        this.iterations = SecurityConfig.encryption.iterations;
        this.hash = SecurityConfig.encryption.hash;
    }
    
    /**
     * Derive encryption key from password
     */
    async deriveKey(password, salt) {
        if (!password || !salt) {
            throw new Error('Password and salt required');
        }
        
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);
        
        // Import password as raw key
        const baseKey = await window.crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );
        
        // Derive encryption key
        const key = await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: this.iterations,
                hash: this.hash
            },
            baseKey,
            {
                name: this.algorithm.split('-')[0], // 'AES'
                length: this.keySize
            },
            false, // not extractable
            ['encrypt', 'decrypt']
        );
        
        // Zero out sensitive data
        this.zeroBuffer(passwordBuffer);
        
        return key;
    }
    
    /**
     * Encrypt data with password
     */
    async encrypt(data, password) {
        try {
            // Generate salt and IV
            const salt = SecurityConfig.generateSecureRandom(this.saltSize);
            const iv = SecurityConfig.generateSecureRandom(this.ivSize);
            
            // Derive key
            const key = await this.deriveKey(password, salt);
            
            // Convert data to ArrayBuffer if it's a string
            let dataBuffer;
            if (typeof data === 'string') {
                const encoder = new TextEncoder();
                dataBuffer = encoder.encode(data);
            } else if (data instanceof Uint8Array) {
                dataBuffer = data.buffer;
            } else {
                dataBuffer = data;
            }
            
            // Encrypt
            const encrypted = await window.crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                dataBuffer
            );
            
            // Combine salt + iv + encrypted data
            const result = new Uint8Array(
                salt.byteLength + iv.byteLength + encrypted.byteLength
            );
            
            result.set(new Uint8Array(salt), 0);
            result.set(new Uint8Array(iv), salt.byteLength);
            result.set(new Uint8Array(encrypted), salt.byteLength + iv.byteLength);
            
            // Convert to base64 for storage
            const base64 = this.arrayBufferToBase64(result);
            
            // Clean up
            this.zeroBuffer(salt);
            this.zeroBuffer(iv);
            this.zeroBuffer(dataBuffer);
            
            return base64;
            
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Failed to encrypt data');
        }
    }
    
    /**
     * Decrypt data with password
     */
    async decrypt(encryptedData, password) {
        try {
            // Convert from base64
            const encryptedBuffer = this.base64ToArrayBuffer(encryptedData);
            
            // Extract salt, iv, and ciphertext
            const salt = encryptedBuffer.slice(0, this.saltSize);
            const iv = encryptedBuffer.slice(
                this.saltSize,
                this.saltSize + this.ivSize
            );
            const ciphertext = encryptedBuffer.slice(
                this.saltSize + this.ivSize
            );
            
            // Derive key
            const key = await this.deriveKey(password, salt);
            
            // Decrypt
            const decrypted = await window.crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                ciphertext
            );
            
            // Convert to string
            const decoder = new TextDecoder();
            const result = decoder.decode(decrypted);
            
            // Clean up
            this.zeroBuffer(salt);
            this.zeroBuffer(iv);
            this.zeroBuffer(decrypted);
            
            return result;
            
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt data - wrong password?');
        }
    }
    
    /**
     * Generate key pair for signing (if needed in future)
     */
    async generateKeyPair() {
        return window.crypto.subtle.generateKey(
            {
                name: 'ECDSA',
                namedCurve: 'P-256'
            },
            true, // extractable
            ['sign', 'verify']
        );
    }
    
    /**
     * Generate secure random bytes
     */
    generateRandomBytes(length) {
        return SecurityConfig.generateSecureRandom(length);
    }
    
    /**
     * Convert ArrayBuffer to base64
     */
    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    
    /**
     * Convert base64 to ArrayBuffer
     */
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
    
    /**
     * Zero out sensitive data in buffer
     */
    zeroBuffer(buffer) {
        SecurityConfig.zeroBuffer(buffer);
    }
    
    /**
     * Hash data (for integrity checking)
     */
    async hashData(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        
        const hashBuffer = await window.crypto.subtle.digest(
            SecurityConfig.encryption.hash,
            dataBuffer
        );
        
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        this.zeroBuffer(dataBuffer);
        
        return hashHex;
    }
}

// Create singleton instance
const Encryption = new EncryptionManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Encryption;
} else {
    window.Encryption = Encryption;
}