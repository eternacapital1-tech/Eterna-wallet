/**
 * Ethereum/BSC/Polygon Chain Manager
 * Uses ethers.js
 */

class EthereumChain {
    constructor() {
        this.name = 'ethereum';
        this.chainId = 1;
        this.symbol = 'ETH';
        this.decimals = 18;
        this.derivationPath = "m/44'/60'/0'/0/0";
    }
    
    /**
     * Get provider for chain
     */
    async getProvider(chainName = 'ethereum') {
        const rpcUrl = RPCConfig.getRpcUrl(chainName);
        return new ethers.providers.JsonRpcProvider(rpcUrl);
    }
    
    /**
     * Get address from seed
     */
    async getAddressFromSeed(seed) {
        const wallet = ethers.Wallet.fromMnemonic(
            Wallet.wallet.mnemonic,
            this.derivationPath
        );
        return wallet.address;
    }
    
    /**
     * Get private key from mnemonic
     */
    async getPrivateKeyFromMnemonic(mnemonic) {
        const wallet = ethers.Wallet.fromMnemonic(mnemonic, this.derivationPath);
        return wallet.privateKey;
    }
    
    /**
     * Get balance
     */
    async getBalance(address, provider) {
        try {
            const balance = await provider.getBalance(address);
            return ethers.utils.formatEther(balance);
        } catch (error) {
            console.error('Failed to get balance:', error);
            return '0';
        }
    }
    
    /**
     * Get token balance
     */
    async getTokenBalance(tokenAddress, walletAddress, provider) {
        try {
            // ERC-20 ABI for balanceOf
            const abi = ['function balanceOf(address owner) view returns (uint256)'];
            const contract = new ethers.Contract(tokenAddress, abi, provider);
            
            const balance = await contract.balanceOf(walletAddress);
            // Need token decimals - would need full ABI or known tokens
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
            const wallet = new ethers.Wallet(privateKey, provider);
            
            const tx = await wallet.sendTransaction({
                to: transaction.to,
                value: ethers.utils.parseEther(transaction.amount),
                gasLimit: transaction.gasLimit || 21000,
                gasPrice: transaction.gasPrice || (await provider.getGasPrice())
            });
            
            return {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: transaction.amount,
                fee: tx.gasPrice.mul(tx.gasLimit).toString()
            };
            
        } catch (error) {
            console.error('Transaction failed:', error);
            throw error;
        }
    }
    
    /**
     * Estimate transaction fee
     */
    async estimateFee(transaction, provider) {
        try {
            const gasPrice = await provider.getGasPrice();
            const gasLimit = transaction.gasLimit || 21000;
            
            const fee = gasPrice.mul(gasLimit);
            return ethers.utils.formatEther(fee);
            
        } catch (error) {
            console.error('Failed to estimate fee:', error);
            return '0';
        }
    }
    
    /**
     * Get gas price
     */
    async getGasPrice(provider) {
        try {
            const gasPrice = await provider.getGasPrice();
            return ethers.utils.formatUnits(gasPrice, 'gwei');
        } catch (error) {
            console.error('Failed to get gas price:', error);
            return '0';
        }
    }
    
    /**
     * Validate address
     */
    validateAddress(address) {
        return ethers.utils.isAddress(address);
    }
    
    /**
     * Get transaction receipt
     */
    async getTransactionReceipt(hash, provider) {
        return provider.getTransactionReceipt(hash);
    }
    
    /**
     * Get transaction count (nonce)
     */
    async getTransactionCount(address, provider) {
        return provider.getTransactionCount(address);
    }
}

// Create instances for each EVM chain
const Ethereum = new EthereumChain();
Ethereum.name = 'ethereum';
Ethereum.chainId = 1;
Ethereum.symbol = 'ETH';

const BSC = new EthereumChain();
BSC.name = 'bsc';
BSC.chainId = 56;
BSC.symbol = 'BNB';
BSC.derivationPath = "m/44'/60'/0'/0/0";

const Polygon = new EthereumChain();
Polygon.name = 'polygon';
Polygon.chainId = 137;
Polygon.symbol = 'MATIC';
Polygon.derivationPath = "m/44'/60'/0'/0/0";

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Ethereum, BSC, Polygon };
} else {
    window.Ethereum = Ethereum;
    window.BSC = BSC;
    window.Polygon = Polygon;
}