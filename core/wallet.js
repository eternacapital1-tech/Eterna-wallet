/**
 * Main Wallet Manager
 * Handles wallet operations and chain interactions
 */

class WalletManager {
    constructor() {
        this.wallet = null;
        this.mnemonic = null;
        this.privateKeys = new Map();
        this.chains = new Map();
        this.providers = new Map();
        this.isLocked = true;
        
        // Initialize chain managers
        this.initChains();
    }
    
    /**
     * Initialize chain-specific managers
     */
    initChains() {
        // Load chain modules
        if (typeof Ethereum !== 'undefined') {
            this.chains.set('ethereum', Ethereum);
            this.chains.set('bsc', Ethereum); // BSC uses same interface
            this.chains.set('polygon', Ethereum); // Polygon uses same interface
        }
        
        if (typeof Tron !== 'undefined') {
            this.chains.set('tron', Tron);
        }
        
        if (typeof Bitcoin !== 'undefined') {
            this.chains.set('bitcoin', Bitcoin);
        }
    }
    
    /**
     * Create new wallet
     */
    async createWallet(password) {
        try {
            // Generate mnemonic
            this.mnemonic = Mnemonic.generateMnemonic(12);
            
            // Generate addresses for all chains
            const addresses = {};
            const seed = await Mnemonic.mnemonicToSeed(this.mnemonic);
            
            for (const [chainName, chainManager] of this.chains) {
                try {
                    const address = await chainManager.getAddressFromSeed(seed);
                    addresses[chainName] = address;
                } catch (error) {
                    console.warn(`Failed to generate address for ${chainName}:`, error);
                }
            }
            
            // Create wallet data
            this.wallet = {
                id: Storage.generateId(),
                name: 'Eterna Wallet',
                mnemonic: this.mnemonic,
                addresses: addresses,
                createdAt: Date.now()
            };
            
            // Save encrypted wallet
            await Storage.saveWallet(this.wallet, password);
            
            // Clear mnemonic from memory (it's now in encrypted storage)
            this.clearSensitiveData();
            
            // Unlock wallet
            await this.unlock(password);
            
            return this.wallet;
            
        } catch (error) {
            console.error('Failed to create wallet:', error);
            this.clearSensitiveData();
            throw error;
        }
    }
    
    /**
     * Import wallet from mnemonic
     */
    async importWallet(mnemonic, password) {
        try {
            // Validate mnemonic
            const validation = Mnemonic.validateMnemonic(mnemonic);
            if (!validation.valid) {
                throw new Error(validation.error);
            }
            
            this.mnemonic = mnemonic;
            
            // Generate addresses
            const addresses = {};
            const seed = await Mnemonic.mnemonicToSeed(this.mnemonic);
            
            for (const [chainName, chainManager] of this.chains) {
                try {
                    const address = await chainManager.getAddressFromSeed(seed);
                    addresses[chainName] = address;
                } catch (error) {
                    console.warn(`Failed to generate address for ${chainName}:`, error);
                }
            }
            
            // Create wallet data
            this.wallet = {
                id: Storage.generateId(),
                name: 'Eterna Wallet',
                mnemonic: this.mnemonic,
                addresses: addresses,
                createdAt: Date.now()
            };
            
            // Save encrypted wallet
            await Storage.saveWallet(this.wallet, password);
            
            // Clear mnemonic from memory
            this.clearSensitiveData();
            
            // Unlock wallet
            await this.unlock(password);
            
            return this.wallet;
            
        } catch (error) {
            console.error('Failed to import wallet:', error);
            this.clearSensitiveData();
            throw error;
        }
    }
    
    /**
     * Unlock wallet with password
     */
    async unlock(password) {
        try {
            // Load and decrypt wallet
            const walletInfo = await Storage.getWalletInfo();
            if (!walletInfo) {
                throw new Error('No wallet found');
            }
            
            this.wallet = await Storage.loadWallet(walletInfo.id, password);
            this.mnemonic = this.wallet.mnemonic;
            
            // Initialize providers
            await this.initProviders();
            
            this.isLocked = false;
            
            // Start auto-lock timer
            this.startAutoLock();
            
            return true;
            
        } catch (error) {
            console.error('Failed to unlock wallet:', error);
            this.lock();
            throw error;
        }
    }
    
    /**
     * Lock wallet
     */
    lock() {
        this.clearSensitiveData();
        this.providers.clear();
        this.isLocked = true;
        
        // Clear auto-lock timer
        if (this.autoLockTimer) {
            clearTimeout(this.autoLockTimer);
            this.autoLockTimer = null;
        }
    }
    
    /**
     * Initialize blockchain providers
     */
    async initProviders() {
        for (const [chainName, chainManager] of this.chains) {
            try {
                const provider = await chainManager.getProvider();
                this.providers.set(chainName, provider);
            } catch (error) {
                console.warn(`Failed to initialize provider for ${chainName}:`, error);
            }
        }
    }
    
    /**
     * Get address for specific chain
     */
    getAddress(chain) {
        if (this.isLocked) {
            throw new Error('Wallet is locked');
        }
        
        if (!this.wallet || !this.wallet.addresses[chain]) {
            throw new Error(`No address found for chain: ${chain}`);
        }
        
        return this.wallet.addresses[chain];
    }
    
    /**
     * Get balance for chain
     */
    async getBalance(chain, address = null) {
        if (this.isLocked) {
            throw new Error('Wallet is locked');
        }
        
        const chainManager = this.chains.get(chain);
        if (!chainManager) {
            throw new Error(`Unsupported chain: ${chain}`);
        }
        
        const addr = address || this.getAddress(chain);
        const provider = this.providers.get(chain);
        
        if (!provider) {
            throw new Error(`Provider not available for chain: ${chain}`);
        }
        
        return chainManager.getBalance(addr, provider);
    }
    
    /**
     * Get token balance
     */
    async getTokenBalance(chain, tokenAddress, walletAddress = null) {
        if (this.isLocked) {
            throw new Error('Wallet is locked');
        }
        
        const chainManager = this.chains.get(chain);
        if (!chainManager || !chainManager.getTokenBalance) {
            throw new Error(`Token balance not supported for chain: ${chain}`);
        }
        
        const addr = walletAddress || this.getAddress(chain);
        const provider = this.providers.get(chain);
        
        if (!provider) {
            throw new Error(`Provider not available for chain: ${chain}`);
        }
        
        return chainManager.getTokenBalance(tokenAddress, addr, provider);
    }
    
    /**
     * Send transaction
     */
    async sendTransaction(chain, transaction) {
        if (this.isLocked) {
            throw new Error('Wallet is locked');
        }
        
        const chainManager = this.chains.get(chain);
        if (!chainManager) {
            throw new Error(`Unsupported chain: ${chain}`);
        }
        
        // Get private key for signing
        const privateKey = await this.getPrivateKey(chain);
        if (!privateKey) {
            throw new Error(`Failed to get private key for chain: ${chain}`);
        }
        
        const provider = this.providers.get(chain);
        if (!provider) {
            throw new Error(`Provider not available for chain: ${chain}`);
        }
        
        // Send transaction
        const result = await chainManager.sendTransaction(
            transaction,
            privateKey,
            provider
        );
        
        // Save transaction to history
        if (result.hash) {
            await Storage.saveTransaction({
                chain: chain,
                type: 'send',
                from: transaction.from || this.getAddress(chain),
                to: transaction.to,
                amount: transaction.value || transaction.amount,
                token: transaction.token || 'native',
                fee: result.fee,
                hash: result.hash,
                timestamp: Date.now(),
                status: 'pending'
            });
        }
        
        return result;
    }
    
    /**
     * Get private key for chain (derived from mnemonic)
     */
    async getPrivateKey(chain) {
        if (this.isLocked || !this.mnemonic) {
            throw new Error('Wallet is locked');
        }
        
        // Check cache
        if (this.privateKeys.has(chain)) {
            return this.privateKeys.get(chain);
        }
        
        const chainManager = this.chains.get(chain);
        if (!chainManager || !chainManager.getPrivateKeyFromMnemonic) {
            throw new Error(`Private key derivation not supported for chain: ${chain}`);
        }
        
        // Derive private key
        const privateKey = await chainManager.getPrivateKeyFromMnemonic(
            this.mnemonic
        );
        
        // Cache private key (temporarily)
        this.privateKeys.set(chain, privateKey);
        
        // Auto-clear after 30 seconds
        setTimeout(() => {
            this.privateKeys.delete(chain);
        }, 30000);
        
        return privateKey;
    }
    
    /**
     * Get transaction history
     */
    async getTransactionHistory(chain, limit = 20) {
        return Storage.getTransactions(chain, limit);
    }
    
    /**
     * Estimate transaction fee
     */
    async estimateFee(chain, transaction) {
        if (this.isLocked) {
            throw new Error('Wallet is locked');
        }
        
        const chainManager = this.chains.get(chain);
        if (!chainManager || !chainManager.estimateFee) {
            throw new Error(`Fee estimation not supported for chain: ${chain}`);
        }
        
        const provider = this.providers.get(chain);
        if (!provider) {
            throw new Error(`Provider not available for chain: ${chain}`);
        }
        
        return chainManager.estimateFee(transaction, provider);
    }
    
    /**
     * Get gas price (for EVM chains)
     */
    async getGasPrice(chain) {
        if (this.isLocked) {
            throw new Error('Wallet is locked');
        }
        
        const chainManager = this.chains.get(chain);
        if (!chainManager || !chainManager.getGasPrice) {
            throw new Error(`Gas price not available for chain: ${chain}`);
        }
        
        const provider = this.providers.get(chain);
        if (!provider) {
            throw new Error(`Provider not available for chain: ${chain}`);
        }
        
        return chainManager.getGasPrice(provider);
    }
    
    /**
     * Validate address for chain
     */
    validateAddress(chain, address) {
        const chainManager = this.chains.get(chain);
        if (chainManager && chainManager.validateAddress) {
            return chainManager.validateAddress(address);
        }
        
        // Fallback to security config validation
        return SecurityConfig.validateAddress(address, chain);
    }
    
    /**
     * Start auto-lock timer
     */
    startAutoLock() {
        if (this.autoLockTimer) {
            clearTimeout(this.autoLockTimer);
        }
        
        const delay = await Storage.loadSetting('autoLockDelay', 300) * 1000;
        
        if (delay > 0) {
            this.autoLockTimer = setTimeout(() => {
                if (!this.isLocked) {
                    this.lock();
                    this.showNotification('Wallet auto-locked due to inactivity');
                }
            }, delay);
        }
    }
    
    /**
     * Reset auto-lock timer
     */
    resetAutoLock() {
        if (!this.isLocked) {
            this.startAutoLock();
        }
    }
    
    /**
     * Clear sensitive data from memory
     */
    clearSensitiveData() {
        // Clear mnemonic
        if (this.mnemonic) {
            this.mnemonic = null;
        }
        
        // Clear private keys
        this.privateKeys.clear();
        
        // Clear wallet data (except non-sensitive info)
        if (this.wallet && this.wallet.mnemonic) {
            this.wallet.mnemonic = null;
        }
    }
    
    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const event = new CustomEvent('wallet-notification', {
            detail: { message, type }
        });
        window.dispatchEvent(event);
    }
    
    /**
     * Check if wallet is initialized
     */
    async isInitialized() {
        return Storage.walletExists();
    }
    
    /**
     * Export wallet backup
     */
    async exportBackup(password) {
        if (this.isLocked) {
            throw new Error('Wallet is locked');
        }
        
        return Storage.exportWallet(password);
    }
    
    /**
     * Import wallet backup
     */
    async importBackup(backupData, password) {
        await Storage.importWallet(backupData, password);
        await this.unlock(password);
    }
    
    /**
     * Clear all wallet data
     */
    async clearWallet() {
        this.lock();
        await Storage.clearAll();
        this.wallet = null;
    }
}

// Create singleton instance
const Wallet = new WalletManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Wallet;
} else {
    window.Wallet = Wallet;
}