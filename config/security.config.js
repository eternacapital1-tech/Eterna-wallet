/**
 * Security Configuration
 * Critical security settings and policies
 */

const SecurityConfig = {
    // Encryption Settings
    encryption: {
        algorithm: 'AES-GCM',
        keySize: 256,
        ivSize: 12, // 96 bits for AES-GCM
        saltSize: 16,
        iterations: 100000,
        hash: 'SHA-256'
    },
    
    // Key Derivation
    keyDerivation: {
        algorithm: 'PBKDF2',
        minPasswordLength: 8,
        maxPasswordLength: 128,
        requiredChars: {
            lowercase: true,
            uppercase: true,
            numbers: true,
            symbols: false // Optional for usability
        }
    },
    
    // Memory Security
    memory: {
        zeroDelay: 100, // ms to zero out sensitive data
        autoClearInterval: 30000, // Clear memory every 30 seconds
        maxMemoryAge: 300000 // Clear after 5 minutes
    },
    
    // Session Security
    session: {
        autoLock: true,
        lockDelay: 300, // 5 minutes
        maxSessionDuration: 3600, // 1 hour
        requirePasswordOnResume: true
    },
    
    // Input Validation
    validation: {
        address: {
            ethereum: /^(0x)?[0-9a-fA-F]{40}$/,
            bitcoin: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/,
            tron: /^T[A-Za-z1-9]{33}$/
        },
        mnemonic: {
            wordCount: [12, 15, 18, 21, 24],
            wordList: 'english' // BIP-39 English word list
        }
    },
    
    // Network Security
    network: {
        maxRpcRetries: 3,
        timeout: 10000,
        requireHttps: true,
        blockPrivateNetworks: true,
        allowedDomains: [
            '*.ethers.io',
            '*.tronweb.org',
            '*.binance.org',
            '*.polygon.technology',
            '*.infura.io',
            '*.alchemyapi.io'
        ]
    },
    
    // Privacy Settings
    privacy: {
        noTracking: true,
        noAnalytics: true,
        noCookies: true,
        noLocalStorageSensitive: true, // Use IndexedDB instead
        clearOnExit: true,
        preventPhishing: true
    },
    
    // Anti-Phishing
    antiPhishing: {
        enabled: true,
        knownPhishingDomains: [],
        addressBook: true,
        transactionConfirmation: true,
        warningOnUnknownTokens: true
    },
    
    // Backup Security
    backup: {
        encrypted: true,
        requirePassword: true,
        maxBackupAge: 2592000, // 30 days
        backupIntegrityCheck: true
    },
    
    // Critical Security Rules (Never modify these)
    criticalRules: {
        neverExportPrivateKey: true,
        neverLogSensitiveData: true,
        neverTransmitPrivateKey: true,
        neverStorePlaintextMnemonic: true,
        requireUserConfirmation: true,
        validateAllInputs: true
    }
};

// Security utility functions
SecurityConfig.validatePassword = function(password) {
    if (typeof password !== 'string') {
        return { valid: false, error: 'Password must be a string' };
    }
    
    if (password.length < this.keyDerivation.minPasswordLength) {
        return {
            valid: false,
            error: `Password must be at least ${this.keyDerivation.minPasswordLength} characters`
        };
    }
    
    if (password.length > this.keyDerivation.maxPasswordLength) {
        return {
            valid: false,
            error: `Password must be less than ${this.keyDerivation.maxPasswordLength} characters`
        };
    }
    
    // Character requirements
    const requirements = this.keyDerivation.requiredChars;
    const errors = [];
    
    if (requirements.lowercase && !/[a-z]/.test(password)) {
        errors.push('lowercase letter');
    }
    
    if (requirements.uppercase && !/[A-Z]/.test(password)) {
        errors.push('uppercase letter');
    }
    
    if (requirements.numbers && !/[0-9]/.test(password)) {
        errors.push('number');
    }
    
    if (requirements.symbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('special character');
    }
    
    if (errors.length > 0) {
        return {
            valid: false,
            error: `Password must contain at least one ${errors.join(', ')}`
        };
    }
    
    return { valid: true };
};

SecurityConfig.validateAddress = function(address, chain) {
    if (!address || typeof address !== 'string') {
        return false;
    }
    
    address = address.trim();
    
    switch (chain) {
        case 'ethereum':
        case 'bsc':
        case 'polygon':
            return this.validation.address.ethereum.test(address);
            
        case 'bitcoin':
            return this.validation.address.bitcoin.test(address);
            
        case 'tron':
            return this.validation.address.tron.test(address);
            
        default:
            // For unknown chains, do basic validation
            return address.length >= 26 && address.length <= 64;
    }
};

SecurityConfig.generateSecureRandom = function(bytes) {
    if (!window.crypto || !window.crypto.getRandomValues) {
        throw new Error('Secure random number generator not available');
    }
    
    const array = new Uint8Array(bytes);
    window.crypto.getRandomValues(array);
    return array;
};

SecurityConfig.zeroBuffer = function(buffer) {
    if (buffer instanceof ArrayBuffer) {
        const view = new Uint8Array(buffer);
        for (let i = 0; i < view.length; i++) {
            view[i] = 0;
        }
    } else if (Array.isArray(buffer)) {
        for (let i = 0; i < buffer.length; i++) {
            buffer[i] = 0;
        }
    } else if (typeof buffer === 'string') {
        // Strings are immutable, can't zero them
        // Overwrite the variable reference instead
        buffer = null;
    }
};

// Security event listeners
SecurityConfig.setupSecurityListeners = function() {
    // Clear clipboard after 30 seconds
    setInterval(() => {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText('');
        }
    }, 30000);
    
    // Warn on page visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('Page hidden - consider locking wallet');
        }
    });
    
    // Prevent right-click context menu on sensitive elements
    document.addEventListener('contextmenu', (e) => {
        if (e.target.closest('.sensitive-data')) {
            e.preventDefault();
            return false;
        }
    });
    
    // Prevent drag and drop on sensitive elements
    document.addEventListener('dragstart', (e) => {
        if (e.target.closest('.sensitive-data')) {
            e.preventDefault();
            return false;
        }
    });
};

// Initialize security
SecurityConfig.setupSecurityListeners();

// Freeze config to prevent modifications
Object.freeze(SecurityConfig);
Object.freeze(SecurityConfig.encryption);
Object.freeze(SecurityConfig.keyDerivation);
Object.freeze(SecurityConfig.memory);
Object.freeze(SecurityConfig.session);
Object.freeze(SecurityConfig.validation);
Object.freeze(SecurityConfig.network);
Object.freeze(SecurityConfig.privacy);
Object.freeze(SecurityConfig.antiPhishing);
Object.freeze(SecurityConfig.backup);
Object.freeze(SecurityConfig.criticalRules);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecurityConfig;
} else {
    window.SecurityConfig = SecurityConfig;
}