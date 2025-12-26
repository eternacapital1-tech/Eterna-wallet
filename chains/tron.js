/**
 * TRON Chain Manager
 * Uses TronWeb
 */

class TronChain {
    constructor() {
        this.name = 'tron';
        this.symbol = 'TRX';
        this.decimals = 6;
        this.derivationPath = "m/44'/195'/0'/0/0";
        
        // Initialize TronWeb
        this.tronWeb = null;
        this.initTronWeb();
    }
    
    /**
     * Initialize TronWeb
     */
    initTronWeb() {
        const rpcUrl = RPCConfig.getRpcUrl('tron');
        this.tronWeb = new TronWeb({
            fullHost: rpcUrl,
            headers: { "TRON-PRO-API-KEY": "your-api-key-here" }
        });
    }
    
    /**
     * Get provider
     */
    async getProvider() {
        if (!this.tronWeb) {
            this.initTronWeb();
        }
        return this.tronWeb;
    }
    
    /**
     * Get address from seed
     */
    async getAddressFromSeed(seed) {
        // TRON uses same derivation as Ethereum
        const ethWallet = ethers.Wallet.fromMnemonic(
            Wallet.wallet.mnemonic,
            this.derivationPath
        );
        
        // Convert Ethereum private key to TRON address
        return this.privateKeyToAddress(ethWallet.privateKey);
    }
    
    /**
     * Get private key from mnemonic
     */
    async getPrivateKeyFromMnemonic(mnemonic) {
        const wallet = ethers.Wallet.fromMnemonic(mnemonic, this.derivationPath);
        return wallet.privateKey;
    }
    
    /**
     * Convert private key to TRON address
     */
    privateKeyToAddress(privateKey) {
        // Remove 0x prefix if present
        const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
        
        // TRON addresses start with T
        const address = this.tronWeb.address.fromPrivateKey(cleanKey);
        return address.base58;
    }
    
    /**
     * Get balance
     */
    async getBalance(address, provider) {
        try {
            const balance = await provider.trx.getBalance(address);
            return provider.fromSun(balance);
        } catch (error) {
            console.error('Failed to get TRX balance:', error);
            return '0';
        }
    }
    
    /**
     * Get token balance (TRC-20)
     */
    async getTokenBalance(tokenAddress, walletAddress, provider) {
        try {
            const contract = await provider.contract().at(tokenAddress);
            const balance = await contract.balanceOf(walletAddress).call();
            return balance.toString();
        } catch (error) {
            console.error('Failed to get token balance:', error);
            return '0';
        }
    }
    
    /**
     * Send transaction
     */
    async sendTransaction(transaction, privateKey, provider) {
        try {
            // Remove 0x prefix from private key
            const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
            
            // Create transaction
            const tx = await provider.transactionBuilder.sendTrx(
                transaction.to,
                provider.toSun(transaction.amount),
                transaction.from || this.privateKeyToAddress(privateKey)
            );
            
            // Sign transaction
            const signedTx = await provider.trx.sign(tx, cleanKey);
            
            // Broadcast transaction
            const result = await provider.trx.sendRawTransaction(signedTx);
            
            return {
                hash: result.txid,
                from: transaction.from,
                to: transaction.to,
                value: transaction.amount,
                fee: transaction.fee || 0
            };
            
        } catch (error) {
            console.error('TRON transaction failed:', error);
            throw error;
        }
    }
    
    /**
     * Estimate transaction fee
     */
    async estimateFee(transaction, provider) {
        // TRON transactions have minimal fees
        // Current fee is about 0.001 TRX
        return '0.001';
    }
    
    /**
     * Validate address
     */
    validateAddress(address) {
        return this.tronWeb.isAddress(address);
    }
    
    /**
     * Get account info
     */
    async getAccount(address, provider) {
        return provider.trx.getAccount(address);
    }
    
    /**
     * Get transaction info
     */
    async getTransactionInfo(hash, provider) {
        return provider.trx.getTransactionInfo(hash);
    }
}

// Create singleton instance
const Tron = new TronChain();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Tron;
} else {
    window.Tron = Tron;
}