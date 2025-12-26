/**
 * RPC Endpoint Configuration
 * Public endpoints only - no private keys
 */

const RPCConfig = {
    endpoints: {
        ethereum: {
            name: 'Ethereum Mainnet',
            chainId: 1,
            rpcUrls: [
                'https://cloudflare-eth.com',
                'https://rpc.ankr.com/eth',
                'https://eth-mainnet.public.blastapi.io'
            ],
            explorer: 'https://etherscan.io',
            nativeCurrency: {
                name: 'Ether',
                symbol: 'ETH',
                decimals: 18
            }
        },
        
        bsc: {
            name: 'BNB Smart Chain',
            chainId: 56,
            rpcUrls: [
                'https://bsc-dataseed1.binance.org',
                'https://bsc-dataseed2.binance.org',
                'https://bsc-dataseed3.binance.org'
            ],
            explorer: 'https://bscscan.com',
            nativeCurrency: {
                name: 'BNB',
                symbol: 'BNB',
                decimals: 18
            }
        },
        
        polygon: {
            name: 'Polygon Mainnet',
            chainId: 137,
            rpcUrls: [
                'https://polygon-rpc.com',
                'https://rpc-mainnet.maticvigil.com',
                'https://polygon-mainnet.public.blastapi.io'
            ],
            explorer: 'https://polygonscan.com',
            nativeCurrency: {
                name: 'MATIC',
                symbol: 'MATIC',
                decimals: 18
            }
        },
        
        tron: {
            name: 'TRON Mainnet',
            chainId: null,
            rpcUrls: [
                'https://api.trongrid.io',
                'https://api.tronstack.io'
            ],
            explorer: 'https://tronscan.org',
            nativeCurrency: {
                name: 'TRON',
                symbol: 'TRX',
                decimals: 6
            }
        }
    },
    
    bitcoin: {
        network: 'mainnet',
        explorers: [
            'https://blockstream.info/api',
            'https://mempool.space/api'
        ]
    },
    
    // Fallback configuration
    fallback: {
        maxRetries: 3,
        timeout: 10000, // 10 seconds
        healthCheckInterval: 60000 // 1 minute
    },
    
    // Custom RPC endpoints (user can add)
    customEndpoints: {
        // Format: { [chainName]: { name: string, rpcUrl: string, chainId: number } }
    }
};

// Helper function to get a working RPC URL
RPCConfig.getRpcUrl = function(chain) {
    if (!this.endpoints[chain]) {
        throw new Error(`Unsupported chain: ${chain}`);
    }
    
    // Check for custom endpoint first
    if (this.customEndpoints[chain]) {
        return this.customEndpoints[chain].rpcUrl;
    }
    
    // Return first public endpoint
    return this.endpoints[chain].rpcUrls[0];
};

// Helper function to add custom endpoint
RPCConfig.addCustomEndpoint = function(chain, endpoint) {
    if (!this.customEndpoints[chain]) {
        this.customEndpoints[chain] = [];
    }
    this.customEndpoints[chain].push(endpoint);
    
    // Save to localStorage
    try {
        localStorage.setItem('customRpcEndpoints', JSON.stringify(this.customEndpoints));
    } catch (error) {
        console.warn('Failed to save custom endpoints:', error);
    }
};

// Load custom endpoints from localStorage
try {
    const savedEndpoints = localStorage.getItem('customRpcEndpoints');
    if (savedEndpoints) {
        RPCConfig.customEndpoints = JSON.parse(savedEndpoints);
    }
} catch (error) {
    console.warn('Failed to load custom endpoints:', error);
}

// Freeze config (except custom endpoints which need to be mutable)
Object.freeze(RPCConfig.endpoints);
Object.freeze(RPCConfig.bitcoin);
Object.freeze(RPCConfig.fallback);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RPCConfig;
} else {
    window.RPCConfig = RPCConfig;
}