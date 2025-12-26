/**
 * Token Manager
 * Handles custom token management
 */

class TokenManager {
    constructor() {
        this.defaultTokens = {};
        this.loadDefaultTokens();
    }
    
    /**
     * Load default token list
     */
    async loadDefaultTokens() {
        try {
            const response = await fetch('./scripts/tokens/token-list.json');
            const data = await response.json();
            this.defaultTokens = data.tokens;
        } catch (error) {
            console.error('Failed to load default tokens:', error);
            this.defaultTokens = {};
        }
    }
    
    /**
     * Get default tokens for chain
     */
    getDefaultTokens(chain) {
        return this.defaultTokens[chain] || [];
    }
    
    /**
     * Get all tokens for chain (default + custom)
     */
    async getTokens(chain) {
        try {
            const defaultTokens = this.getDefaultTokens(chain);
            const customTokens = await Storage.getTokens(chain);
            
            // Merge and remove duplicates
            const tokenMap = new Map();
            
            [...defaultTokens, ...customTokens].forEach(token => {
                const key = token.address.toLowerCase();
                if (!tokenMap.has(key)) {
                    tokenMap.set(key, token);
                }
            });
            
            return Array.from(tokenMap.values());
            
        } catch (error) {
            console.error('Failed to get tokens:', error);
            return this.getDefaultTokens(chain);
        }
    }
    
    /**
     * Add custom token
     */
    async addToken(tokenData) {
        try {
            // Validate token data
            if (!this.validateTokenData(tokenData)) {
                throw new Error('Invalid token data');
            }
            
            // Save to storage
            await Storage.saveToken(tokenData);
            
            return true;
            
        } catch (error) {
            console.error('Failed to add token:', error);
            throw error;
        }
    }
    
    /**
     * Remove custom token
     */
    async removeToken(address) {
        try {
            await Storage.removeToken(address);
            return true;
        } catch (error) {
            console.error('Failed to remove token:', error);
            throw error;
        }
    }
    
    /**
     * Validate token data
     */
    validateTokenData(tokenData) {
        const requiredFields = ['address', 'chain', 'symbol', 'name', 'decimals'];
        
        // Check required fields
        for (const field of requiredFields) {
            if (!tokenData[field]) {
                return false;
            }
        }
        
        // Validate address based on chain
        if (!SecurityConfig.validateAddress(tokenData.address, tokenData.chain)) {
            return false;
        }
        
        // Validate decimals
        const decimals = parseInt(tokenData.decimals);
        if (isNaN(decimals) || decimals < 0 || decimals > 18) {
            return false;
        }
        
        // Validate symbol
        if (tokenData.symbol.length > 10) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Detect token from address
     */
    async detectToken(address, chain) {
        try {
            // Check if it's in default tokens
            const defaultTokens = this.getDefaultTokens(chain);
            const foundToken = defaultTokens.find(
                token => token.address.toLowerCase() === address.toLowerCase()
            );
            
            if (foundToken) {
                return foundToken;
            }
            
            // Try to detect from blockchain (simplified)
            // In production, this would query the token contract
            return null;
            
        } catch (error) {
            console.error('Failed to detect token:', error);
            return null;
        }
    }
    
    /**
     * Get token info
     */
    async getTokenInfo(address, chain) {
        try {
            const allTokens = await this.getTokens(chain);
            return allTokens.find(
                token => token.address.toLowerCase() === address.toLowerCase()
            );
        } catch (error) {
            console.error('Failed to get token info:', error);
            return null;
        }
    }
    
    /**
     * Search tokens
     */
    async searchTokens(query, chain) {
        try {
            const tokens = await this.getTokens(chain);
            
            const searchTerm = query.toLowerCase();
            return tokens.filter(token => 
                token.symbol.toLowerCase().includes(searchTerm) ||
                token.name.toLowerCase().includes(searchTerm) ||
                token.address.toLowerCase().includes(searchTerm)
            );
            
        } catch (error) {
            console.error('Failed to search tokens:', error);
            return [];
        }
    }
    
    /**
     * Import tokens from list
     */
    async importTokens(tokens, chain) {
        try {
            let imported = 0;
            
            for (const token of tokens) {
                if (this.validateTokenData({ ...token, chain })) {
                    await this.addToken({ ...token, chain });
                    imported++;
                }
            }
            
            return imported;
            
        } catch (error) {
            console.error('Failed to import tokens:', error);
            throw error;
        }
    }
    
    /**
     * Export tokens
     */
    async exportTokens(chain) {
        try {
            const tokens = await this.getTokens(chain);
            return {
                chain: chain,
                tokens: tokens,
                exportedAt: Date.now(),
                version: AppConfig.version
            };
        } catch (error) {
            console.error('Failed to export tokens:', error);
            throw error;
        }
    }
}

// Create singleton instance
const TokenManagerInstance = new TokenManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TokenManagerInstance;
} else {
    window.TokenManager = TokenManagerInstance;
}