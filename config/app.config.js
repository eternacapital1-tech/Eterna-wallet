/**
 * Eterna Capital Wallet - App Configuration
 * PRIVATE USE ONLY
 */

const AppConfig = {
    // App Information
    name: 'Eterna Capital Wallet',
    version: '1.0.0',
    author: 'Private User',
    
    // Security Settings
    security: {
        minPasswordLength: 8,
        autoLockDelay: 300, // 5 minutes in seconds
        maxFailedAttempts: 5,
        sessionTimeout: 3600, // 1 hour in seconds
        mnemonicWordCount: 12,
        encryptionIterations: 100000,
        keySize: 256
    },
    
    // Wallet Settings
    wallet: {
        defaultDerivationPath: "m/44'/60'/0'/0/0",
        supportedChains: ['ethereum', 'bsc', 'polygon', 'tron', 'bitcoin'],
        defaultCurrency: 'USD',
        priceUpdateInterval: 30000, // 30 seconds
        balanceUpdateInterval: 15000 // 15 seconds
    },
    
    // UI Settings
    ui: {
        defaultTheme: 'dark',
        animations: true,
        confirmations: {
            send: true,
            receive: false,
            swap: true
        },
        notifications: {
            enabled: true,
            duration: 5000
        }
    },
    
    // Feature Flags
    features: {
        multiChain: true,
        tokenManagement: true,
        nftSupport: false,
        swapIntegration: false,
        fiatOnRamp: false,
        hardwareWallet: false
    },
    
    // Backup Settings
    backup: {
        autoBackup: false,
        backupInterval: 604800, // 1 week in seconds
        maxBackups: 5
    },
    
    // Development
    debug: false,
    logLevel: 'error' // 'debug', 'info', 'warn', 'error', 'none'
};

// Freeze config to prevent modifications
Object.freeze(AppConfig);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppConfig;
} else {
    window.AppConfig = AppConfig;
}