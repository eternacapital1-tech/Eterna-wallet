/**
 * Formatting utilities for addresses, numbers, currencies
 */

class Formatter {
    /**
     * Format address for display
     */
    static formatAddress(address, chain = null) {
        if (!address) return '';
        
        // Chain-specific formatting
        switch (chain) {
            case 'ethereum':
            case 'bsc':
            case 'polygon':
                return this.formatEthereumAddress(address);
                
            case 'tron':
                return this.formatTronAddress(address);
                
            case 'bitcoin':
                return this.formatBitcoinAddress(address);
                
            default:
                return this.formatGenericAddress(address);
        }
    }
    
    /**
     * Format Ethereum address (0x...)
     */
    static formatEthereumAddress(address) {
        if (!address || address.length < 10) return address;
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }
    
    /**
     * Format TRON address (T...)
     */
    static formatTronAddress(address) {
        if (!address || address.length < 10) return address;
        return `${address.substring(0, 5)}...${address.substring(address.length - 4)}`;
    }
    
    /**
     * Format Bitcoin address
     */
    static formatBitcoinAddress(address) {
        if (!address || address.length < 10) return address;
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }
    
    /**
     * Format generic address
     */
    static formatGenericAddress(address) {
        if (!address || address.length < 10) return address;
        return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
    }
    
    /**
     * Format number with commas
     */
    static formatNumber(number, decimals = 2) {
        if (number === null || number === undefined) return '0';
        
        const num = typeof number === 'string' ? parseFloat(number) : number;
        
        if (isNaN(num)) return '0';
        
        // Handle very small numbers
        if (Math.abs(num) < 0.000001 && num !== 0) {
            return num.toExponential(6);
        }
        
        // Format with commas and specified decimals
        return num.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }
    
    /**
     * Format currency
     */
    static formatCurrency(amount, currency = 'USD', decimals = 2) {
        if (amount === null || amount === undefined) return `0 ${currency}`;
        
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        
        if (isNaN(num)) return `0 ${currency}`;
        
        // Special handling for crypto currencies
        const cryptoCurrencies = ['BTC', 'ETH', 'BNB', 'MATIC', 'TRX'];
        if (cryptoCurrencies.includes(currency.toUpperCase())) {
            return `${this.formatNumber(num, decimals)} ${currency}`;
        }
        
        // Fiat currencies
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(num);
    }
    
    /**
     * Format percentage
     */
    static formatPercent(value, decimals = 2) {
        if (value === null || value === undefined) return '0%';
        
        const num = typeof value === 'string' ? parseFloat(value) : value;
        
        if (isNaN(num)) return '0%';
        
        return `${num > 0 ? '+' : ''}${num.toFixed(decimals)}%`;
    }
    
    /**
     * Format balance with appropriate decimals
     */
    static formatBalance(balance, decimals = 18, precision = 6) {
        if (!balance) return '0';
        
        const num = typeof balance === 'string' ? parseFloat(balance) : balance;
        
        if (isNaN(num)) return '0';
        
        // Convert from smallest unit if needed
        const divisor = Math.pow(10, decimals);
        const formatted = num / divisor;
        
        // Determine appropriate precision
        let actualPrecision = precision;
        if (formatted === 0) {
            actualPrecision = 0;
        } else if (formatted < 0.000001) {
            actualPrecision = 8;
        } else if (formatted < 0.001) {
            actualPrecision = 6;
        } else if (formatted < 1) {
            actualPrecision = 4;
        }
        
        return this.formatNumber(formatted, actualPrecision);
    }
    
    /**
     * Format token amount
     */
    static formatTokenAmount(amount, tokenDecimals, symbol = '', precision = 4) {
        const formatted = this.formatBalance(amount, tokenDecimals, precision);
        return symbol ? `${formatted} ${symbol}` : formatted;
    }
    
    /**
     * Format date
     */
    static formatDate(timestamp, format = 'relative') {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        
        if (format === 'relative') {
            return this.formatRelativeTime(date);
        } else if (format === 'short') {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } else if (format === 'long') {
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            return date.toISOString().split('T')[0];
        }
    }
    
    /**
     * Format relative time
     */
    static formatRelativeTime(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffSec < 60) {
            return 'just now';
        } else if (diffMin < 60) {
            return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
        } else if (diffHour < 24) {
            return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
        } else if (diffDay < 7) {
            return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
        }
    }
    
    /**
     * Format file size
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Format gas price
     */
    static formatGasPrice(gwei) {
        if (!gwei) return '0 Gwei';
        const num = typeof gwei === 'string' ? parseFloat(gwei) : gwei;
        return `${this.formatNumber(num, 2)} Gwei`;
    }
    
    /**
     * Format transaction fee
     */
    static formatTransactionFee(fee, currency = 'USD') {
        if (!fee) return `0 ${currency}`;
        
        const num = typeof fee === 'string' ? parseFloat(fee) : fee;
        
        if (num < 0.01) {
            return `< 0.01 ${currency}`;
        }
        
        return this.formatCurrency(num, currency, 2);
    }
    
    /**
     * Format network name
     */
    static formatNetworkName(chain) {
        const networks = {
            ethereum: 'Ethereum',
            bsc: 'BNB Smart Chain',
            polygon: 'Polygon',
            tron: 'TRON',
            bitcoin: 'Bitcoin'
        };
        
        return networks[chain] || chain;
    }
    
    /**
     * Format chain symbol
     */
    static formatChainSymbol(chain) {
        const symbols = {
            ethereum: 'ETH',
            bsc: 'BNB',
            polygon: 'MATIC',
            tron: 'TRX',
            bitcoin: 'BTC'
        };
        
        return symbols[chain] || chain.toUpperCase();
    }
    
    /**
     * Truncate text
     */
    static truncateText(text, maxLength, ellipsis = '...') {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + ellipsis;
    }
    
    /**
     * Capitalize first letter
     */
    static capitalize(text) {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }
    
    /**
     * Convert camelCase to Title Case
     */
    static camelToTitle(camelCase) {
        if (!camelCase) return '';
        return camelCase
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Formatter;
} else {
    window.Formatter = Formatter;
}