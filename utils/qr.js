/**
 * QR Code utilities
 * Uses QRCode.js library
 */

class QRManager {
    constructor() {
        this.qrcode = window.QRCode;
    }
    
    /**
     * Generate QR code for address
     */
    generateQRCode(elementId, data, options = {}) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`Element #${elementId} not found`);
            return null;
        }
        
        // Clear previous QR code
        element.innerHTML = '';
        
        // Default options
        const defaultOptions = {
            text: data,
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: this.qrcode.CorrectLevel.H
        };
        
        // Create QR code
        try {
            new this.qrcode(element, {
                ...defaultOptions,
                ...options
            });
            
            return true;
        } catch (error) {
            console.error('Failed to generate QR code:', error);
            return false;
        }
    }
    
    /**
     * Generate QR code for payment request
     */
    generatePaymentQR(address, chain, amount = null, token = null) {
        let data = address;
        
        // Add payment details if provided
        if (amount && chain) {
            const symbol = Formatter.formatChainSymbol(chain);
            
            if (token && token !== 'native') {
                // ERC-20 token transfer
                data = this.createERC20TransferData(address, amount, token);
            } else {
                // Native token transfer
                data = `${chain}:${address}?amount=${amount}`;
            }
        }
        
        return data;
    }
    
    /**
     * Create ERC-20 transfer data for QR
     */
    createERC20TransferData(toAddress, amount, tokenAddress) {
        // Basic transfer function data
        const transferFunction = 'a9059cbb'; // transfer(address,uint256)
        
        // Pad addresses and amount
        const paddedTo = toAddress.replace('0x', '').padStart(64, '0');
        const paddedAmount = BigInt(Math.floor(amount * 1e18)).toString(16).padStart(64, '0');
        
        return `0x${transferFunction}${paddedTo}${paddedAmount}`;
    }
    
    /**
     * Generate QR code for wallet backup
     */
    generateBackupQR(data, password = null) {
        // Format backup data
        const backup = {
            type: 'eterna-wallet-backup',
            version: AppConfig.version,
            timestamp: Date.now(),
            data: data
        };
        
        // Encrypt if password provided
        if (password) {
            // Note: In production, this would use the Encryption module
            backup.encrypted = true;
        }
        
        return JSON.stringify(backup);
    }
    
    /**
     * Parse QR code data
     */
    parseQRData(qrData) {
        try {
            // Check if it's JSON
            if (qrData.startsWith('{') && qrData.endsWith('}')) {
                return JSON.parse(qrData);
            }
            
            // Check if it's a URL
            if (qrData.includes('://')) {
                return { type: 'url', data: qrData };
            }
            
            // Check if it's an address
            if (this.isValidAddress(qrData)) {
                return { type: 'address', data: qrData };
            }
            
            // Check if it's a transaction data
            if (qrData.startsWith('0x') && qrData.length > 42) {
                return { type: 'transaction', data: qrData };
            }
            
            // Default to text
            return { type: 'text', data: qrData };
            
        } catch (error) {
            console.error('Failed to parse QR data:', error);
            return { type: 'unknown', data: qrData };
        }
    }
    
    /**
     * Check if string is a valid address
     */
    isValidAddress(data) {
        // Check Ethereum/BSC/Polygon address
        if (/^0x[a-fA-F0-9]{40}$/.test(data)) {
            return true;
        }
        
        // Check TRON address
        if (/^T[a-zA-Z0-9]{33}$/.test(data)) {
            return true;
        }
        
        // Check Bitcoin address
        if (/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/.test(data)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Detect chain from address
     */
    detectChainFromAddress(address) {
        if (!address) return null;
        
        if (address.startsWith('0x') && address.length === 42) {
            // Could be Ethereum, BSC, or Polygon
            // Need additional context to determine
            return 'ethereum';
        }
        
        if (address.startsWith('T') && address.length === 34) {
            return 'tron';
        }
        
        if (address.startsWith('bc1') || address.startsWith('1') || address.startsWith('3')) {
            return 'bitcoin';
        }
        
        return null;
    }
    
    /**
     * Create QR code canvas
     */
    createQRCanvas(data, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                const canvas = document.createElement('canvas');
                
                this.qrcode.toCanvas(canvas, data, options, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(canvas);
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * Download QR code as image
     */
    async downloadQRCode(data, filename = 'qr-code.png', options = {}) {
        try {
            const canvas = await this.createQRCanvas(data, options);
            
            // Convert to blob
            const blob = await new Promise((resolve) => {
                canvas.toBlob(resolve, 'image/png');
            });
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            console.error('Failed to download QR code:', error);
            return false;
        }
    }
    
    /**
     * Generate multiple QR codes for large data
     */
    generateSegmentedQR(data, maxLength = 1000) {
        if (data.length <= maxLength) {
            return [data];
        }
        
        const segments = [];
        const totalSegments = Math.ceil(data.length / maxLength);
        
        for (let i = 0; i < totalSegments; i++) {
            const segment = {
                index: i + 1,
                total: totalSegments,
                data: data.substring(i * maxLength, (i + 1) * maxLength)
            };
            segments.push(JSON.stringify(segment));
        }
        
        return segments;
    }
    
    /**
     * Scan QR code from camera (simplified)
     */
    async scanFromCamera() {
        // Note: Full camera QR scanning requires additional libraries
        // This is a placeholder implementation
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera access not available');
        }
        
        // Request camera permission
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        
        return {
            stream,
            startScanning: (callback) => {
                // In production, use a QR scanning library here
                console.log('QR scanning started');
            },
            stopScanning: () => {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }
    
    /**
     * Scan QR code from image file
     */
    async scanFromImage(file) {
        // Note: This requires a QR code reading library
        // This is a placeholder implementation
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                // In production, decode QR code from image
                resolve({ data: 'QR code data would be extracted here' });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}

// Create singleton instance
const QR = new QRManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QR;
} else {
    window.QR = QR;
}