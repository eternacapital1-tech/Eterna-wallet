/**
 * Secure Storage Manager
 * Uses IndexedDB with encryption for sensitive data
 */

class StorageManager {
    constructor() {
        this.dbName = 'EternaWalletDB';
        this.dbVersion = 1;
        this.db = null;
        this.encryption = Encryption;
    }
    
    /**
     * Initialize IndexedDB database
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                reject(new Error('Failed to open database'));
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                if (!db.objectStoreNames.contains('wallets')) {
                    const store = db.createObjectStore('wallets', { keyPath: 'id' });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
                
                if (!db.objectStoreNames.contains('transactions')) {
                    const store = db.createObjectStore('transactions', { keyPath: 'id' });
                    store.createIndex('chain', 'chain', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('tokens')) {
                    const store = db.createObjectStore('tokens', { keyPath: 'address' });
                    store.createIndex('chain', 'chain', { unique: false });
                }
            };
        });
    }
    
    /**
     * Save encrypted wallet data
     */
    async saveWallet(walletData, password) {
        if (!this.db) await this.init();
        
        try {
            // Encrypt sensitive data
            const encryptedData = {
                id: walletData.id || this.generateId(),
                name: walletData.name || 'Eterna Wallet',
                encryptedMnemonic: await this.encryption.encrypt(
                    walletData.mnemonic,
                    password
                ),
                addresses: walletData.addresses,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                version: AppConfig.version
            };
            
            // Save to IndexedDB
            await this.put('wallets', encryptedData);
            
            // Clear sensitive data from memory
            walletData.mnemonic = null;
            
            return encryptedData.id;
            
        } catch (error) {
            console.error('Failed to save wallet:', error);
            throw error;
        }
    }
    
    /**
     * Load and decrypt wallet
     */
    async loadWallet(walletId, password) {
        if (!this.db) await this.init();
        
        try {
            // Load encrypted data
            const encryptedData = await this.get('wallets', walletId);
            
            if (!encryptedData) {
                throw new Error('Wallet not found');
            }
            
            // Decrypt mnemonic
            const mnemonic = await this.encryption.decrypt(
                encryptedData.encryptedMnemonic,
                password
            );
            
            return {
                id: encryptedData.id,
                name: encryptedData.name,
                mnemonic: mnemonic,
                addresses: encryptedData.addresses || {},
                createdAt: encryptedData.createdAt,
                version: encryptedData.version
            };
            
        } catch (error) {
            console.error('Failed to load wallet:', error);
            throw error;
        }
    }
    
    /**
     * Check if wallet exists
     */
    async walletExists() {
        if (!this.db) await this.init();
        
        try {
            const count = await this.count('wallets');
            return count > 0;
        } catch (error) {
            console.error('Failed to check wallet existence:', error);
            return false;
        }
    }
    
    /**
     * Get wallet info (without sensitive data)
     */
    async getWalletInfo() {
        if (!this.db) await this.init();
        
        try {
            const wallets = await this.getAll('wallets');
            if (wallets.length === 0) {
                return null;
            }
            
            const wallet = wallets[0];
            return {
                id: wallet.id,
                name: wallet.name,
                createdAt: wallet.createdAt,
                updatedAt: wallet.updatedAt,
                version: wallet.version
            };
            
        } catch (error) {
            console.error('Failed to get wallet info:', error);
            return null;
        }
    }
    
    /**
     * Save setting
     */
    async saveSetting(key, value) {
        if (!this.db) await this.init();
        
        try {
            await this.put('settings', { key, value });
        } catch (error) {
            console.error('Failed to save setting:', error);
            throw error;
        }
    }
    
    /**
     * Load setting
     */
    async loadSetting(key, defaultValue = null) {
        if (!this.db) await this.init();
        
        try {
            const setting = await this.get('settings', key);
            return setting ? setting.value : defaultValue;
        } catch (error) {
            console.error('Failed to load setting:', error);
            return defaultValue;
        }
    }
    
    /**
     * Save transaction
     */
    async saveTransaction(txData) {
        if (!this.db) await this.init();
        
        try {
            const tx = {
                id: txData.hash || this.generateId(),
                chain: txData.chain,
                type: txData.type, // 'send' or 'receive'
                from: txData.from,
                to: txData.to,
                amount: txData.amount,
                token: txData.token,
                fee: txData.fee,
                timestamp: txData.timestamp || Date.now(),
                status: txData.status || 'pending',
                hash: txData.hash,
                blockNumber: txData.blockNumber,
                confirmed: txData.confirmed || false
            };
            
            await this.put('transactions', tx);
            return tx.id;
            
        } catch (error) {
            console.error('Failed to save transaction:', error);
            throw error;
        }
    }
    
    /**
     * Get transactions for chain
     */
    async getTransactions(chain, limit = 50) {
        if (!this.db) await this.init();
        
        try {
            const store = this.db.transaction('transactions', 'readonly')
                .objectStore('transactions');
            const index = store.index('timestamp');
            
            return new Promise((resolve, reject) => {
                const transactions = [];
                let count = 0;
                
                const request = index.openCursor(null, 'prev');
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    
                    if (cursor && count < limit) {
                        const tx = cursor.value;
                        if (!chain || tx.chain === chain) {
                            transactions.push(tx);
                            count++;
                        }
                        cursor.continue();
                    } else {
                        resolve(transactions);
                    }
                };
                
                request.onerror = (event) => {
                    reject(event.target.error);
                };
            });
            
        } catch (error) {
            console.error('Failed to get transactions:', error);
            return [];
        }
    }
    
    /**
     * Save custom token
     */
    async saveToken(tokenData) {
        if (!this.db) await this.init();
        
        try {
            const token = {
                address: tokenData.address.toLowerCase(),
                chain: tokenData.chain,
                symbol: tokenData.symbol,
                name: tokenData.name,
                decimals: tokenData.decimals,
                logoURI: tokenData.logoURI,
                addedAt: Date.now()
            };
            
            await this.put('tokens', token);
            return token.address;
            
        } catch (error) {
            console.error('Failed to save token:', error);
            throw error;
        }
    }
    
    /**
     * Get tokens for chain
     */
    async getTokens(chain) {
        if (!this.db) await this.init();
        
        try {
            const store = this.db.transaction('tokens', 'readonly')
                .objectStore('tokens');
            const index = store.index('chain');
            
            return new Promise((resolve, reject) => {
                const tokens = [];
                
                const request = index.openCursor(IDBKeyRange.only(chain));
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        tokens.push(cursor.value);
                        cursor.continue();
                    } else {
                        resolve(tokens);
                    }
                };
                
                request.onerror = (event) => {
                    reject(event.target.error);
                };
            });
            
        } catch (error) {
            console.error('Failed to get tokens:', error);
            return [];
        }
    }
    
    /**
     * Remove token
     */
    async removeToken(address) {
        if (!this.db) await this.init();
        
        try {
            await this.delete('tokens', address.toLowerCase());
        } catch (error) {
            console.error('Failed to remove token:', error);
            throw error;
        }
    }
    
    /**
     * Clear all wallet data (logout)
     */
    async clearAll() {
        if (!this.db) await this.init();
        
        try {
            await this.clear('wallets');
            await this.clear('transactions');
            await this.clear('tokens');
            
            // Keep settings (like theme, RPC endpoints)
            
            return true;
            
        } catch (error) {
            console.error('Failed to clear data:', error);
            throw error;
        }
    }
    
    /**
     * Export wallet data (encrypted backup)
     */
    async exportWallet(password) {
        if (!this.db) await this.init();
        
        try {
            const wallets = await this.getAll('wallets');
            const settings = await this.getAll('settings');
            const transactions = await this.getAll('transactions');
            const tokens = await this.getAll('tokens');
            
            const backup = {
                version: AppConfig.version,
                timestamp: Date.now(),
                wallets: wallets,
                settings: settings,
                transactions: transactions,
                tokens: tokens
            };
            
            // Encrypt the entire backup
            const encryptedBackup = await this.encryption.encrypt(
                JSON.stringify(backup),
                password
            );
            
            return {
                data: encryptedBackup,
                format: 'eterna-wallet-backup',
                version: AppConfig.version
            };
            
        } catch (error) {
            console.error('Failed to export wallet:', error);
            throw error;
        }
    }
    
    /**
     * Import wallet data from backup
     */
    async importWallet(backupData, password) {
        if (!this.db) await this.init();
        
        try {
            // Decrypt backup
            const decrypted = await this.encryption.decrypt(
                backupData.data,
                password
            );
            
            const backup = JSON.parse(decrypted);
            
            // Validate backup format
            if (!backup.version || !backup.wallets) {
                throw new Error('Invalid backup format');
            }
            
            // Clear existing data
            await this.clearAll();
            
            // Import data
            for (const wallet of backup.wallets) {
                await this.put('wallets', wallet);
            }
            
            if (backup.settings) {
                for (const setting of backup.settings) {
                    await this.put('settings', setting);
                }
            }
            
            if (backup.transactions) {
                for (const tx of backup.transactions) {
                    await this.put('transactions', tx);
                }
            }
            
            if (backup.tokens) {
                for (const token of backup.tokens) {
                    await this.put('tokens', token);
                }
            }
            
            return true;
            
        } catch (error) {
            console.error('Failed to import wallet:', error);
            throw error;
        }
    }
    
    /**
     * Generic IndexedDB operations
     */
    async put(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }
    
    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }
    
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }
    
    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }
    
    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }
    
    async count(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.count();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }
    
    /**
     * Generate unique ID
     */
    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Create singleton instance
const Storage = new StorageManager();

// Initialize on load
Storage.init().catch(console.error);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
} else {
    window.Storage = Storage;
}