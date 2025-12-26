/**
 * Eterna Capital Wallet - Main Application
 * PRIVATE USE ONLY - NO BACKEND
 */

// Import configuration
importScripts('../config/app.config.js');
importScripts('../config/rpc.config.js');
importScripts('../config/security.config.js');

// Import core modules
importScripts('../scripts/core/encryption.js');
importScripts('../scripts/core/mnemonic.js');
importScripts('../scripts/core/storage.js');
importScripts('../scripts/core/wallet.js');

// Import chain modules
importScripts('../scripts/chains/ethereum.js');
importScripts('../scripts/chains/tron.js');
importScripts('../scripts/chains/bitcoin.js');

// Import utilities
importScripts('../scripts/utils/helpers.js');
importScripts('../scripts/utils/formatter.js');
importScripts('../scripts/utils/qr.js');

// Import token manager
importScripts('../scripts/tokens/token-manager.js');

class EternaWalletApp {
    constructor() {
        this.currentScreen = 'loading';
        this.wallet = Wallet;
        this.isInitialized = false;
        this.userActivityTimer = null;
        this.notifications = [];
        
        this.init();
    }
    
    async init() {
        try {
            // Initialize storage
            await Storage.init();
            
            // Register service worker for PWA
            this.registerServiceWorker();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Check if wallet exists
            this.isInitialized = await this.wallet.isInitialized();
            
            // Show appropriate screen
            if (this.isInitialized) {
                this.showScreen('unlock');
            } else {
                this.showScreen('welcome');
            }
            
            // Set up auto-lock monitoring
            this.setupAutoLock();
            
            // Update connection status
            this.updateConnectionStatus();
            
            // Initialize theme
            this.initTheme();
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to initialize application');
        }
    }
    
    /**
     * Register service worker for PWA
     */
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registered:', registration);
                })
                .catch(error => {
                    console.error('ServiceWorker registration failed:', error);
                });
        }
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Wallet events
        window.addEventListener('wallet-notification', (event) => {
            this.showNotification(event.detail.message, event.detail.type);
        });
        
        // User activity tracking for auto-lock
        document.addEventListener('mousemove', () => this.resetAutoLock());
        document.addEventListener('keydown', () => this.resetAutoLock());
        document.addEventListener('touchstart', () => this.resetAutoLock());
        document.addEventListener('click', () => this.resetAutoLock());
        
        // Page visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onPageHidden();
            } else {
                this.onPageVisible();
            }
        });
        
        // Network status
        window.addEventListener('online', () => this.updateConnectionStatus());
        window.addEventListener('offline', () => this.updateConnectionStatus());
        
        // Setup UI event listeners
        this.setupUIEventListeners();
    }
    
    /**
     * Set up UI event listeners
     */
    setupUIEventListeners() {
        // Welcome screen
        document.getElementById('createWalletBtn')?.addEventListener('click', () => {
            this.showScreen('createWallet');
        });
        
        document.getElementById('importWalletBtn')?.addEventListener('click', () => {
            this.showScreen('importWallet');
        });
        
        // Create wallet screen
        document.getElementById('generateWalletBtn')?.addEventListener('click', () => {
            this.onCreateWallet();
        });
        
        // Password validation
        const passwordInput = document.getElementById('walletPassword');
        const confirmInput = document.getElementById('confirmPassword');
        const termsCheckbox = document.getElementById('termsCheckbox');
        
        if (passwordInput && confirmInput && termsCheckbox) {
            const validateForm = () => {
                const password = passwordInput.value;
                const confirm = confirmInput.value;
                const termsAccepted = termsCheckbox.checked;
                
                const passwordValid = password.length >= 8;
                const passwordsMatch = password === confirm;
                const formValid = passwordValid && passwordsMatch && termsAccepted;
                
                document.getElementById('generateWalletBtn').disabled = !formValid;
                
                // Update password strength
                this.updatePasswordStrength(password);
            };
            
            passwordInput.addEventListener('input', validateForm);
            confirmInput.addEventListener('input', validateForm);
            termsCheckbox.addEventListener('change', validateForm);
        }
        
        // Unlock screen
        document.getElementById('unlockBtn')?.addEventListener('click', () => {
            this.onUnlockWallet();
        });
        
        document.getElementById('showPasswordBtn')?.addEventListener('click', () => {
            this.togglePasswordVisibility('unlockPassword');
        });
        
        // Dashboard buttons
        document.getElementById('sendBtn')?.addEventListener('click', () => {
            this.showSendModal();
        });
        
        document.getElementById('receiveBtn')?.addEventListener('click', () => {
            this.showReceiveModal();
        });
        
        document.getElementById('receiveActionBtn')?.addEventListener('click', () => {
            this.showReceiveModal();
        });
        
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            this.showScreen('settings');
        });
        
        document.getElementById('lockBtn')?.addEventListener('click', () => {
            this.wallet.lock();
            this.showScreen('unlock');
            this.showNotification('Wallet locked');
        });
        
        // Chain tabs
        document.querySelectorAll('.chain-tab').forEach(tab => {
            tab.addEventListener('click', (event) => {
                const chain = event.currentTarget.dataset.chain;
                this.switchChain(chain);
            });
        });
        
        // Bottom navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (event) => {
                const screen = event.currentTarget.dataset.screen;
                this.showScreen(screen);
            });
        });
        
        // Back buttons
        document.querySelectorAll('.btn-back').forEach(btn => {
            btn.addEventListener('click', () => {
                this.goBack();
            });
        });
        
        // Modal close buttons
        document.querySelectorAll('.btn-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModal(btn.closest('.modal'));
            });
        });
        
        // Settings
        document.getElementById('lockTimerSelect')?.addEventListener('change', (event) => {
            this.saveSetting('autoLockDelay', parseInt(event.target.value));
        });
        
        document.getElementById('showRecoveryBtn')?.addEventListener('click', () => {
            this.showRecoveryPhrase();
        });
        
        document.getElementById('clearWalletBtn')?.addEventListener('click', () => {
            this.clearWalletData();
        });
        
        // Copy address button
        document.getElementById('copyAddressBtn')?.addEventListener('click', () => {
            this.copyAddressToClipboard();
        });
        
        // Send transaction
        document.getElementById('sendConfirmBtn')?.addEventListener('click', () => {
            this.sendTransaction();
        });
        
        // Add more event listeners as needed...
    }
    
    /**
     * Show screen
     */
    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        const targetScreen = document.getElementById(`${screenName}Screen`);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenName;
            
            // Screen-specific initialization
            switch (screenName) {
                case 'dashboard':
                    this.initDashboard();
                    break;
                case 'settings':
                    this.initSettings();
                    break;
                case 'unlock':
                    this.focusUnlockPassword();
                    break;
            }
        }
        
        // Reset auto-lock timer
        this.resetAutoLock();
    }
    
    /**
     * Show modal
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            
            // Modal-specific initialization
            switch (modalId) {
                case 'receiveModal':
                    this.initReceiveModal();
                    break;
                case 'sendModal':
                    this.initSendModal();
                    break;
            }
        }
    }
    
    /**
     * Close modal
     */
    closeModal(modal) {
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    /**
     * Go back to previous screen
     */
    goBack() {
        switch (this.currentScreen) {
            case 'createWallet':
            case 'importWallet':
            case 'mnemonic':
                this.showScreen('welcome');
                break;
            case 'settings':
                this.showScreen('dashboard');
                break;
            default:
                if (this.isInitialized && !this.wallet.isLocked) {
                    this.showScreen('dashboard');
                } else {
                    this.showScreen('welcome');
                }
        }
    }
    
    /**
     * Initialize dashboard
     */
    async initDashboard() {
        if (this.wallet.isLocked) {
            this.showScreen('unlock');
            return;
        }
        
        try {
            // Load balances
            await this.loadBalances();
            
            // Load assets
            await this.loadAssets();
            
            // Load transactions
            await this.loadTransactions();
            
            // Update UI
            this.updateDashboardUI();
            
        } catch (error) {
            console.error('Failed to initialize dashboard:', error);
            this.showError('Failed to load wallet data');
        }
    }
    
    /**
     * Load balances
     */
    async loadBalances() {
        // This would fetch balances from blockchain
        // For now, use placeholder data
        const totalBalance = 0;
        
        // Update UI
        const balanceElement = document.getElementById('totalBalance');
        if (balanceElement) {
            balanceElement.textContent = Formatter.formatCurrency(totalBalance, 'USD');
        }
    }
    
    /**
     * Load assets
     */
    async loadAssets() {
        const assetsList = document.getElementById('assetsList');
        if (!assetsList) return;
        
        // Clear existing assets
        assetsList.innerHTML = '';
        
        // Placeholder assets
        const placeholderAssets = [
            { symbol: 'ETH', name: 'Ethereum', balance: '0.5', value: '$850.00', change: '+2.5%' },
            { symbol: 'USDC', name: 'USD Coin', balance: '1000', value: '$1000.00', change: '0%' },
            { symbol: 'MATIC', name: 'Polygon', balance: '500', value: '$250.00', change: '-1.2%' }
        ];
        
        // Add assets to list
        placeholderAssets.forEach(asset => {
            const assetElement = this.createAssetElement(asset);
            assetsList.appendChild(assetElement);
        });
    }
    
    /**
     * Create asset element
     */
    createAssetElement(asset) {
        const div = document.createElement('div');
        div.className = 'asset-item';
        div.innerHTML = `
            <div class="asset-icon">${asset.symbol.charAt(0)}</div>
            <div class="asset-info">
                <div class="asset-name">${asset.name}</div>
                <div class="asset-balance">${asset.balance} ${asset.symbol}</div>
            </div>
            <div class="asset-value">
                <div class="amount">${asset.value}</div>
                <div class="change ${asset.change.startsWith('+') ? 'positive' : 'negative'}">
                    ${asset.change}
                </div>
            </div>
        `;
        return div;
    }
    
    /**
     * Load transactions
     */
    async loadTransactions() {
        const transactionsList = document.getElementById('transactionsList');
        if (!transactionsList) return;
        
        // Clear existing transactions
        transactionsList.innerHTML = '';
        
        try {
            // Load transactions from storage
            const transactions = await this.wallet.getTransactionHistory(null, 5);
            
            if (transactions.length === 0) {
                transactionsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📋</div>
                        <p>No transactions yet</p>
                    </div>
                `;
                return;
            }
            
            // Add transactions to list
            transactions.forEach(tx => {
                const txElement = this.createTransactionElement(tx);
                transactionsList.appendChild(txElement);
            });
            
        } catch (error) {
            console.error('Failed to load transactions:', error);
            transactionsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <p>Failed to load transactions</p>
                </div>
            `;
        }
    }
    
    /**
     * Create transaction element
     */
    createTransactionElement(tx) {
        const div = document.createElement('div');
        div.className = 'transaction-item';
        
        const isSend = tx.type === 'send';
        const icon = isSend ? '↑' : '↓';
        const typeClass = isSend ? 'send' : 'receive';
        const amountPrefix = isSend ? '-' : '+';
        
        div.innerHTML = `
            <div class="transaction-icon ${typeClass}">${icon}</div>
            <div class="transaction-info">
                <div class="transaction-type">${isSend ? 'Sent' : 'Received'} ${tx.token || 'ETH'}</div>
                <div class="transaction-date">${Formatter.formatDate(tx.timestamp, 'relative')}</div>
            </div>
            <div class="transaction-amount ${typeClass}">
                ${amountPrefix}${tx.amount} ${tx.token || 'ETH'}
            </div>
        `;
        
        return div;
    }
    
    /**
     * Update dashboard UI
     */
    updateDashboardUI() {
        // Update wallet name
        const walletName = document.querySelector('.wallet-name');
        if (walletName && this.wallet.wallet) {
            walletName.textContent = this.wallet.wallet.name;
        }
        
        // Update connection status
        this.updateConnectionStatus();
    }
    
    /**
     * Update connection status
     */
    updateConnectionStatus() {
        const statusElement = document.getElementById('connectionStatus');
        if (!statusElement) return;
        
        const isOnline = navigator.onLine;
        const statusDot = statusElement.querySelector('.status-dot');
        
        if (isOnline) {
            statusElement.textContent = 'Online';
            statusDot.className = 'status-dot online';
        } else {
            statusElement.textContent = 'Offline';
            statusDot.className = 'status-dot offline';
            statusDot.style.backgroundColor = 'var(--danger-color)';
        }
    }
    
    /**
     * Initialize settings screen
     */
    async initSettings() {
        // Load current settings
        const lockTimer = await Storage.loadSetting('autoLockDelay', 5);
        const lockTimerSelect = document.getElementById('lockTimerSelect');
        if (lockTimerSelect) {
            lockTimerSelect.value = lockTimer;
        }
        
        // Load app version
        const versionElement = document.getElementById('appVersion');
        if (versionElement) {
            versionElement.textContent = AppConfig.version;
        }
    }
    
    /**
     * Save setting
     */
    async saveSetting(key, value) {
        await Storage.saveSetting(key, value);
        this.showNotification('Setting saved');
    }
    
    /**
     * Show receive modal
     */
    async initReceiveModal() {
        if (this.wallet.isLocked) {
            this.showScreen('unlock');
            return;
        }
        
        try {
            // Get current chain
            const chainSelect = document.getElementById('receiveChainSelect');
            const chain = chainSelect?.value || 'ethereum';
            
            // Get address for chain
            const address = this.wallet.getAddress(chain);
            
            // Update UI
            const addressElement = document.getElementById('receiveAddress');
            if (addressElement) {
                addressElement.textContent = address;
            }
            
            // Generate QR code
            const qrData = QR.generatePaymentQR(address, chain);
            QR.generateQRCode('qrCodeContainer', qrData);
            
        } catch (error) {
            console.error('Failed to init receive modal:', error);
            this.showError('Failed to load receive address');
        }
    }
    
    /**
     * Show send modal
     */
    async initSendModal() {
        if (this.wallet.isLocked) {
            this.showScreen('unlock');
            return;
        }
        
        // Initialize form
        this.updateSendForm();
    }
    
    /**
     * Update send form
     */
    async updateSendForm() {
        // Update balance display
        const chainSelect = document.getElementById('sendChain');
        const chain = chainSelect?.value || 'ethereum';
        
        try {
            const balance = await this.wallet.getBalance(chain);
            const balanceElement = document.getElementById('availableBalance');
            if (balanceElement) {
                balanceElement.textContent = `${balance} ${Formatter.formatChainSymbol(chain)}`;
            }
        } catch (error) {
            console.error('Failed to update balance:', error);
        }
    }
    
    /**
     * Send transaction
     */
    async sendTransaction() {
        const chain = document.getElementById('sendChain')?.value;
        const toAddress = document.getElementById('recipientAddress')?.value;
        const amount = document.getElementById('sendAmount')?.value;
        
        if (!chain || !toAddress || !amount) {
            this.showError('Please fill all fields');
            return;
        }
        
        // Validate address
        if (!this.wallet.validateAddress(chain, toAddress)) {
            this.showError('Invalid recipient address');
            return;
        }
        
        // Validate amount
        if (parseFloat(amount) <= 0) {
            this.showError('Invalid amount');
            return;
        }
        
        try {
            // Create transaction
            const transaction = {
                to: toAddress,
                amount: amount
            };
            
            // Send transaction
            const result = await this.wallet.sendTransaction(chain, transaction);
            
            // Close modal
            this.closeModal(document.getElementById('sendModal'));
            
            // Show success message
            this.showNotification(`Transaction sent: ${result.hash.substring(0, 10)}...`, 'success');
            
            // Refresh dashboard
            this.initDashboard();
            
        } catch (error) {
            console.error('Failed to send transaction:', error);
            this.showError(`Failed to send transaction: ${error.message}`);
        }
    }
    
    /**
     * Copy address to clipboard
     */
    async copyAddressToClipboard() {
        const addressElement = document.getElementById('receiveAddress');
        if (!addressElement) return;
        
        const address = addressElement.textContent;
        const success = await Helpers.copyToClipboard(address);
        
        if (success) {
            this.showNotification('Address copied to clipboard', 'success');
        } else {
            this.showError('Failed to copy address');
        }
    }
    
    /**
     * Create new wallet
     */
    async onCreateWallet() {
        const password = document.getElementById('walletPassword')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        
        if (!password || !confirmPassword) {
            this.showError('Please enter password');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }
        
        if (password.length < 8) {
            this.showError('Password must be at least 8 characters');
            return;
        }
        
        try {
            // Create wallet
            await this.wallet.createWallet(password);
            
            // Show mnemonic screen
            this.showMnemonicScreen();
            
        } catch (error) {
            console.error('Failed to create wallet:', error);
            this.showError('Failed to create wallet');
        }
    }
    
    /**
     * Show mnemonic screen
     */
    showMnemonicScreen() {
        if (!this.wallet.wallet || !this.wallet.wallet.mnemonic) {
            this.showError('No mnemonic available');
            return;
        }
        
        const mnemonic = this.wallet.wallet.mnemonic;
        const words = mnemonic.split(' ');
        
        // Display mnemonic words
        const mnemonicGrid = document.getElementById('mnemonicGrid');
        if (mnemonicGrid) {
            mnemonicGrid.innerHTML = '';
            
            words.forEach((word, index) => {
                const wordElement = document.createElement('div');
                wordElement.className = 'mnemonic-word';
                wordElement.innerHTML = `
                    <span class="index">${index + 1}</span>
                    ${word}
                `;
                mnemonicGrid.appendChild(wordElement);
            });
        }
        
        // Set up verification
        this.setupMnemonicVerification(words);
        
        // Show mnemonic screen
        this.showScreen('mnemonic');
    }
    
    /**
     * Set up mnemonic verification
     */
    setupMnemonicVerification(words) {
        const verificationGrid = document.getElementById('verificationGrid');
        if (!verificationGrid) return;
        
        verificationGrid.innerHTML = '';
        
        // Select random words for verification
        const verificationWords = Mnemonic.getVerificationWords(words.join(' '), 3);
        
        verificationWords.forEach((item, index) => {
            const container = document.createElement('div');
            container.className = 'verification-container';
            container.innerHTML = `
                <p>Word #${item.index}:</p>
                <div class="verification-options">
                    ${item.options.map((option, optIndex) => `
                        <button class="verification-word" 
                                data-correct="${option === item.word}"
                                data-word-index="${index}"
                                data-option-index="${optIndex}">
                            ${option}
                        </button>
                    `).join('')}
                </div>
            `;
            verificationGrid.appendChild(container);
        });
        
        // Set up verification event listeners
        this.setupVerificationListeners(verificationWords);
    }
    
    /**
     * Set up verification listeners
     */
    setupVerificationListeners(verificationWords) {
        let selectedWords = new Array(verificationWords.length).fill(null);
        
        document.querySelectorAll('.verification-word').forEach(button => {
            button.addEventListener('click', () => {
                const wordIndex = parseInt(button.dataset.wordIndex);
                const isCorrect = button.dataset.correct === 'true';
                
                // Update selected word
                selectedWords[wordIndex] = isCorrect;
                
                // Update button style
                button.classList.add('selected');
                
                // Disable other options for this word
                const container = button.closest('.verification-options');
                container.querySelectorAll('.verification-word').forEach(btn => {
                    if (btn !== button) {
                        btn.disabled = true;
                    }
                });
                
                // Check if all words are correctly selected
                const allCorrect = selectedWords.every(correct => correct === true);
                const confirmBtn = document.getElementById('confirmMnemonicBtn');
                if (confirmBtn) {
                    confirmBtn.disabled = !allCorrect;
                }
            });
        });
        
        // Confirm button
        const confirmBtn = document.getElementById('confirmMnemonicBtn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.onMnemonicConfirmed();
            });
        }
    }
    
    /**
     * Mnemonic confirmed
     */
    onMnemonicConfirmed() {
        // Lock wallet to require password unlock
        this.wallet.lock();
        
        // Show unlock screen
        this.showScreen('unlock');
        this.showNotification('Wallet created successfully!', 'success');
    }
    
    /**
     * Unlock wallet
     */
    async onUnlockWallet() {
        const password = document.getElementById('unlockPassword')?.value;
        
        if (!password) {
            this.showError('Please enter password');
            return;
        }
        
        try {
            await this.wallet.unlock(password);
            
            // Clear password field
            document.getElementById('unlockPassword').value = '';
            
            // Show dashboard
            this.showScreen('dashboard');
            this.showNotification('Wallet unlocked', 'success');
            
        } catch (error) {
            console.error('Failed to unlock wallet:', error);
            this.showError('Invalid password');
        }
    }
    
    /**
     * Show recovery phrase
     */
    async showRecoveryPhrase() {
        if (this.wallet.isLocked) {
            this.showError('Wallet is locked');
            return;
        }
        
        // In production, this would require password confirmation
        // For security, we don't show the recovery phrase directly
        this.showNotification('Recovery phrase access requires additional security check');
    }
    
    /**
     * Clear wallet data
     */
    async clearWalletData() {
        if (confirm('Are you sure? This will delete ALL wallet data.')) {
            try {
                await this.wallet.clearWallet();
                this.showScreen('welcome');
                this.showNotification('Wallet data cleared', 'success');
            } catch (error) {
                console.error('Failed to clear wallet:', error);
                this.showError('Failed to clear wallet data');
            }
        }
    }
    
    /**
     * Update password strength indicator
     */
    updatePasswordStrength(password) {
        const strengthBar = document.querySelector('.password-strength');
        if (!strengthBar) return;
        
        let strength = 0;
        
        // Length check
        if (password.length >= 8) strength += 25;
        if (password.length >= 12) strength += 25;
        
        // Character variety
        if (/[a-z]/.test(password)) strength += 15;
        if (/[A-Z]/.test(password)) strength += 15;
        if (/[0-9]/.test(password)) strength += 10;
        if (/[^a-zA-Z0-9]/.test(password)) strength += 10;
        
        // Update bar
        strengthBar.style.setProperty('--strength-width', `${strength}%`);
        
        // Update color
        if (strength < 50) {
            strengthBar.style.setProperty('--strength-color', 'var(--danger-color)');
        } else if (strength < 75) {
            strengthBar.style.setProperty('--strength-color', 'var(--warning-color)');
        } else {
            strengthBar.style.setProperty('--strength-color', 'var(--success-color)');
        }
    }
    
    /**
     * Toggle password visibility
     */
    togglePasswordVisibility(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        
        const type = input.getAttribute('type');
        input.setAttribute('type', type === 'password' ? 'text' : 'password');
    }
    
    /**
     * Focus unlock password field
     */
    focusUnlockPassword() {
        const input = document.getElementById('unlockPassword');
        if (input) {
            input.focus();
        }
    }
    
    /**
     * Switch chain
     */
    switchChain(chain) {
        // Update active tab
        document.querySelectorAll('.chain-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[data-chain="${chain}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        // Update assets for chain
        // This would load chain-specific assets
        console.log(`Switched to ${chain} chain`);
    }
    
    /**
     * Set up auto-lock
     */
    setupAutoLock() {
        // Auto-lock on page hidden
        this.resetAutoLock();
    }
    
    /**
     * Reset auto-lock timer
     */
    resetAutoLock() {
        if (this.userActivityTimer) {
            clearTimeout(this.userActivityTimer);
        }
        
        // Set new timer (5 minutes default)
        this.userActivityTimer = setTimeout(() => {
            if (!this.wallet.isLocked && document.hidden) {
                this.wallet.lock();
                this.showScreen('unlock');
                this.showNotification('Wallet auto-locked due to inactivity');
            }
        }, 5 * 60 * 1000); // 5 minutes
    }
    
    /**
     * Page hidden event
     */
    onPageHidden() {
        // Consider locking wallet if auto-lock is enabled
        console.log('Page hidden');
    }
    
    /**
     * Page visible event
     */
    onPageVisible() {
        // Reset auto-lock timer
        this.resetAutoLock();
        console.log('Page visible');
    }
    
    /**
     * Initialize theme
     */
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
    
    /**
     * Toggle theme
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }
    
    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notifications = document.getElementById('notificationArea');
        if (!notifications) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        notifications.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
    
    /**
     * Show error
     */
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    /**
     * Show success
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new EternaWalletApp();
});

// Register PWA install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Show install button (optional)
    console.log('PWA install available');
});