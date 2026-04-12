
class ConsistencyCheckerUI {
    constructor() {
        // Robust API Base detection
        this.apiBase = window.location.origin === 'http://localhost:3000' || window.location.origin === 'http://127.0.0.1:3000'
            ? '/api'
            : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                ? 'http://localhost:3000/api' 
                : '/api');

        this.isChecking = false;
        this.currentReport = null;
        this.initialized = false;
        
        this.initializeElements();
        this.setupTheme();
        this.attachEventListeners();
        this.loadInitialData();
        this.setupRevealAnimations();
        this.checkLoginStatus();
        this.initialized = true;
    }

    initializeElements() {
        // Layout elements
        this.sections = document.querySelectorAll('section, header, footer');
        this.bgVisuals = document.getElementById('bg-visuals');
        this.themeToggle = document.getElementById('theme-toggle');
        this.loginScreen = document.getElementById('login-screen');
        this.dashboardContainer = document.getElementById('dashboard-container');

        // Status indicators
        this.statusIndicator = document.getElementById('status-indicator');
        this.statusText = document.querySelector('.status-text');
        this.lastCheckTime = document.getElementById('last-check-time');
        this.lastConsistentTime = document.getElementById('last-consistent-time');
        this.statusDot = this.statusIndicator ? this.statusIndicator.querySelector('.status-dot') : null;
        
        // Active check elements
        this.checkStatus = document.getElementById('check-status');
        this.checkText = document.getElementById('check-text');
        this.checkIndicator = this.checkStatus ? this.checkStatus.querySelector('.check-indicator') : null;

        // Button controls
        this.runCheckBtn = document.getElementById('run-check-btn');
        this.refreshStatusBtn = document.getElementById('refresh-status-btn');
        this.viewReportsBtn = document.getElementById('view-reports-btn');
        
        // Loading state
        this.loadingSection = document.getElementById('loading-section');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');
        
        // Report sections
        this.latestReportContent = document.getElementById('latest-report-content');
        this.reportsHistorySection = document.getElementById('reports-history-section');
        this.reportsList = document.getElementById('reports-list');
        this.collectionFilter = document.getElementById('collection-filter');
        this.refreshReportsBtn = document.getElementById('refresh-reports-btn');
        
        // Stats
        this.totalChecks = document.getElementById('total-checks');
        this.totalDocuments = document.getElementById('total-documents');
        this.totalInconsistencies = document.getElementById('total-inconsistencies');
        this.totalRepairs = document.getElementById('total-repairs');
        
        // Modals & Notifications
        this.reportModal = document.getElementById('report-modal');
        this.modalClose = document.getElementById('modal-close');
        this.modalBody = document.getElementById('modal-body');
        this.notification = document.getElementById('notification');
        this.notificationIcon = document.getElementById('notification-icon');
        this.notificationMessage = document.getElementById('notification-message');
        
        // Auth elements
        this.loginForm = document.getElementById('login-form');
        this.loginIdInput = document.getElementById('login-id');
        this.loginPasswordInput = document.getElementById('login-password');
        this.userNameTooltip = document.querySelector('.user-name-text');
        this.logoutBtn = document.getElementById('logout-btn');

        // Chatbot
        this.chatbotToggle = document.getElementById('chatbot-toggle');
        this.chatbotWindow = document.getElementById('chatbot-window');
        this.closeChat = document.getElementById('close-chat');
        this.chatInput = document.getElementById('chat-input');
        this.sendChat = document.getElementById('send-chat');
        this.chatMessages = document.getElementById('chat-messages');
    }

    attachEventListeners() {
        if (this.runCheckBtn) this.runCheckBtn.addEventListener('click', () => this.runConsistencyCheck());
        if (this.refreshStatusBtn) this.refreshStatusBtn.addEventListener('click', () => this.loadStatus());
        if (this.viewReportsBtn) this.viewReportsBtn.addEventListener('click', () => this.toggleReportsHistory());
        if (this.refreshReportsBtn) this.refreshReportsBtn.addEventListener('click', () => this.loadReports());
        if (this.collectionFilter) this.collectionFilter.addEventListener('change', () => this.loadReports());
        if (this.modalClose) this.modalClose.addEventListener('click', () => this.closeModal());
        
        if (this.chatbotToggle) this.chatbotToggle.addEventListener('click', () => this.toggleChatbot());
        if (this.closeChat) this.closeChat.addEventListener('click', () => this.toggleChatbot());
        if (this.sendChat) this.sendChat.addEventListener('click', () => this.sendMessage());
        if (this.chatInput) {
            this.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendMessage();
            });
        }

        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        if (this.reportModal) {
            this.reportModal.addEventListener('click', (e) => {
                if (e.target === this.reportModal) this.closeModal();
            });
        }
        
        // Auto-refresh status every 30 seconds
        setInterval(() => {
            if (!this.isChecking && this.initialized) {
                this.loadStatus();
            }
        }, 30000);
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeIcon(newTheme);
    }

    updateThemeIcon(theme) {
        if (this.themeToggle) {
            const icon = this.themeToggle.querySelector('.btn-icon');
            if (icon) icon.textContent = theme === 'dark' ? '🌙' : '☀️';
        }
    }

    setupRevealAnimations() {
        const options = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => entry.target.classList.add('revealed'), index * 100);
                    observer.unobserve(entry.target);
                }
            });
        }, options);

        this.sections.forEach((section) => {
            section.classList.add('reveal-on-scroll');
            observer.observe(section);
        });
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadStatus(),
                this.loadLatestReport(),
                this.loadStatistics()
            ]);
        } catch (err) {
            console.error('Error loading initial data:', err);
        }
    }

    async loadStatus() {
        try {
            const response = await fetch(`${this.apiBase}/status`);
            if (!response.ok) throw new Error('Status fetch failed');
            const data = await response.json();
            
            if (data.success) {
                this.updateStatusDisplay(data.data);
            }
        } catch (error) {
            console.error('Error loading status:', error);
            // Don't show notification for every background failure to avoid spam
            if (!this.initialized) this.showNotification('Backend not reachable', 'error');
        }
    }

    updateStatusDisplay(status) {
        if (!this.statusDot || !this.statusText) return;

        if (status.isConsistent) {
            this.statusDot.className = 'status-dot consistent';
            this.statusText.textContent = 'Consistent';
        } else {
            this.statusDot.className = 'status-dot inconsistent';
            this.statusText.textContent = 'Inconsistent';
        }
        
        if (this.lastCheckTime) this.lastCheckTime.textContent = this.formatDateTime(status.lastCheckTime);
        if (this.lastConsistentTime) this.lastConsistentTime.textContent = this.formatDateTime(status.lastConsistentTime);
        
        if (status.isActive) {
            if (this.checkIndicator) this.checkIndicator.className = 'check-indicator active';
            if (this.checkText) this.checkText.textContent = 'Check in progress...';
            this.isChecking = true;
            if (this.runCheckBtn) this.runCheckBtn.disabled = true;
            this.showLoadingSection();
        } else {
            if (this.checkIndicator) this.checkIndicator.className = 'check-indicator';
            if (this.checkText) this.checkText.textContent = 'No active check';
            this.isChecking = false;
            if (this.runCheckBtn) this.runCheckBtn.disabled = false;
            this.hideLoadingSection();
        }
    }

    async runConsistencyCheck() {
        if (this.isChecking) return;
        
        this.isChecking = true;
        this.runCheckBtn.disabled = true;
        this.showLoadingSection();
        this.updateProgress(10, 'Starting synchronization...');
        
        try {
            this.updateProgress(30, 'Scanning database collections...');
            
            const response = await fetch(`${this.apiBase}/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ collection: 'users' })
            });
            
            if (!response.ok) throw new Error('Check failed');
            
            this.updateProgress(80, 'Finalizing report...');
            const data = await response.json();
            this.updateProgress(100, 'Check Complete!');
            
            if (data.success) {
                this.currentReport = data.data;
                this.showNotification('Data consistency check successful', 'success');
                await this.loadInitialData();
            } else {
                this.showNotification(`Operation failed: ${data.message}`, 'error');
            }
        } catch (error) {
            console.error('Error running check:', error);
            this.showNotification('Connection to backend failed', 'error');
        } finally {
            setTimeout(() => {
                this.hideLoadingSection();
                this.isChecking = false;
                if (this.runCheckBtn) this.runCheckBtn.disabled = false;
            }, 1000);
        }
    }

    showLoadingSection() {
        if (this.loadingSection) this.loadingSection.classList.remove('hidden');
        this.updateProgress(0, 'Initializing diagnostics...');
    }

    hideLoadingSection() {
        if (this.loadingSection) this.loadingSection.classList.add('hidden');
    }

    updateProgress(percent, text) {
        if (this.progressFill) this.progressFill.style.width = `${percent}%`;
        if (this.progressText) this.progressText.textContent = text;
    }

    async loadLatestReport() {
        try {
            const response = await fetch(`${this.apiBase}/report/latest`);
            if (!response.ok) return;
            const data = await response.json();
            
            if (data.success && data.data) {
                this.displayLatestReport(data.data);
            } else {
                this.latestReportContent.innerHTML = '<p class="no-data">No diagnostic reports available. Run a check to begin.</p>';
            }
        } catch (error) {
            console.error('Error loading latest report:', error);
            this.latestReportContent.innerHTML = '<p class="no-data">Backend synchronization error.</p>';
        }
    }

    displayLatestReport(report) {
        if (!report) return;
        this.latestReportContent.innerHTML = this.createReportCard(report, true);
        this.attachReportEventListeners();
    }

    createReportCard(report, isLatest = false) {
        const id = report.id || report._id || 'N/A';
        const statusClass = (report.status || 'partial').toLowerCase();
        const duration = report.durationFormatted || this.formatDuration(report.duration);
        
        return `
            <div class="report-card" data-report-id="${id}">
                <div class="report-header">
                    <div class="report-title">
                        ${isLatest ? 'Latest System Report' : `Diagnostic #${id.substring(0, 8)}`}
                        <br><small>${this.formatDateTime(report.timestamp)}</small>
                    </div>
                    <div class="report-status ${statusClass}">${report.status}</div>
                </div>
                
                <div class="report-metrics">
                    <div class="metric">
                        <div class="metric-value">${report.totalDocuments}</div>
                        <div class="metric-label">Objects</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${report.inconsistenciesFound}</div>
                        <div class="metric-label">Issues</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${report.repairsApplied}</div>
                        <div class="metric-label">Repairs</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${report.documentsDeleted}</div>
                        <div class="metric-label">Purged</div>
                    </div>
                </div>
                
                <div class="report-details">
                    <p><strong>Registry:</strong> ${report.collectionName || 'Main'}</p>
                    <p><strong>Latency:</strong> ${duration}</p>
                </div>
                
                <div class="report-actions">
                    <button class="btn btn-small btn-primary view-details-btn" data-report-id="${id}">
                        Details
                    </button>
                    ${!isLatest ? `<button class="btn btn-small btn-secondary delete-report-btn" data-report-id="${id}">Delete</button>` : ''}
                </div>
            </div>
        `;
    }

    attachReportEventListeners() {
        document.querySelectorAll('.view-details-btn').forEach(btn => {
            // Remove old listeners to avoid duplicates
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', (e) => {
                const reportId = e.currentTarget.dataset.reportId;
                this.viewReportDetails(reportId);
            });
        });
    }

    async viewReportDetails(reportId) {
        try {
            if (this.currentReport && (this.currentReport.id === reportId || this.currentReport._id === reportId)) {
                this.showReportModal(this.currentReport);
                return;
            }

            const response = await fetch(`${this.apiBase}/reports`);
            const data = await response.json();
            if (data.success) {
                const report = data.data.find(r => r.id === reportId || r._id === reportId);
                if (report) this.showReportModal(report);
                else this.showNotification('Report metadata not found', 'error');
            }
        } catch (error) {
            console.error('Error viewing report:', error);
            this.showNotification('Failed to retrieve report details', 'error');
        }
    }

    showReportModal(report) {
        if (!this.modalBody) return;
        
        const detailsHtml = `
            <div class="report-details-full">
                <h4>Diagnostic Data Overview</h4>
                <p><strong>Identifier:</strong> ${report.id}</p>
                <p><strong>Collection:</strong> ${report.collectionName}</p>
                <p><strong>Timestamp:</strong> ${this.formatDateTime(report.timestamp)}</p>
                <p><strong>Duration:</strong> ${report.durationFormatted || this.formatDuration(report.duration)}</p>
                
                <div class="report-metrics" style="margin: 20px 0;">
                    <div class="metric">
                        <div class="metric-value">${report.totalDocuments}</div>
                        <div class="metric-label">Objects</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${report.inconsistenciesFound}</div>
                        <div class="metric-label">Inconsistencies</div>
                    </div>
                </div>
                
                ${report.details && report.details.length > 0 ? `
                    <h4>Patch Details</h4>
                    <div class="details-list">
                        ${report.details.map(d => `
                            <div class="detail-item" style="padding: 10px; border-bottom: 1px solid var(--border-color);">
                                <small>ID: ${d.documentId}</small><br>
                                <strong>Issue:</strong> ${d.issue}<br>
                                <strong>Action:</strong> ${d.action}
                            </div>
                        `).join('')}
                    </div>
                ` : '<p>No patches required.</p>'}
            </div>
        `;
        
        this.modalBody.innerHTML = detailsHtml;
        if (this.reportModal) this.reportModal.classList.remove('hidden');
    }

    closeModal() {
        if (this.reportModal) this.reportModal.classList.add('hidden');
    }

    async toggleReportsHistory() {
        if (!this.reportsHistorySection || !this.viewReportsBtn) return;

        if (this.reportsHistorySection.classList.contains('hidden')) {
            this.reportsHistorySection.classList.remove('hidden');
            await this.loadReports();
            this.viewReportsBtn.innerHTML = '<span class="btn-icon">✖</span> Hide History';
        } else {
            this.reportsHistorySection.classList.add('hidden');
            this.viewReportsBtn.innerHTML = '<span class="btn-icon">📊</span> View All Reports';
        }
    }

    async loadReports() {
        try {
            const collection = this.collectionFilter ? this.collectionFilter.value : '';
            const url = collection ? `${this.apiBase}/reports?collection=${collection}` : `${this.apiBase}/reports`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) this.displayReports(data.data);
        } catch (error) {
            console.error('Error loading reports:', error);
        }
    }

    displayReports(reports) {
        if (!this.reportsList) return;
        if (reports.length === 0) {
            this.reportsList.innerHTML = '<p class="no-data">Historical logs empty.</p>';
            return;
        }
        
        this.reportsList.innerHTML = reports.map(r => this.createReportCard(r, false)).join('');
        this.attachReportEventListeners();
    }

    async loadStatistics() {
        try {
            const response = await fetch(`${this.apiBase}/stats`);
            const data = await response.json();
            if (data.success) this.updateStatisticsDisplay(data.data);
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    updateStatisticsDisplay(stats) {
        if (this.totalChecks) this.totalChecks.textContent = stats.totalChecks || 0;
        if (this.totalDocuments) this.totalDocuments.textContent = stats.totalDocuments || 0;
        if (this.totalInconsistencies) this.totalInconsistencies.textContent = stats.totalInconsistencies || 0;
        if (this.totalRepairs) this.totalRepairs.textContent = stats.totalRepairs || 0;
    }

    showNotification(message, type = 'info') {
        if (!this.notification) return;

        this.notificationMessage.textContent = message;
        this.notification.className = `notification ${type}`;
        
        const icons = { 'success': '✅', 'error': '❌', 'warning': '⚠️', 'info': 'ℹ️' };
        if (this.notificationIcon) this.notificationIcon.textContent = icons[type] || icons.info;
        
        this.notification.classList.remove('hidden');
        setTimeout(() => this.notification.classList.add('hidden'), 4000);
    }

    formatDateTime(dateString) {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleString('en-IN', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }

    formatDuration(ms) {
        if (!ms) return '0ms';
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    }

    toggleChatbot() {
        if (this.chatbotWindow) {
            this.chatbotWindow.classList.toggle('hidden');
            if (!this.chatbotWindow.classList.contains('hidden')) this.chatInput.focus();
        }
    }

    sendMessage() {
        const text = this.chatInput.value.trim();
        if (!text) return;

        this.appendMessage('user', text);
        this.chatInput.value = '';
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

        setTimeout(() => {
            const response = this.getBotResponse(text);
            this.appendMessage('bot', response);
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 800);
    }

    appendMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        // Support for simple line breaks in bot responses
        msgDiv.innerHTML = text.replace(/\n/g, '<br>');
        this.chatMessages.appendChild(msgDiv);
    }

    getBotResponse(text) {
        const q = text.toLowerCase().trim();
        const userName = localStorage.getItem('currentUser') || 'User';
        
        // Define exact data from stats
        const totalDocs = this.totalDocuments?.textContent || '0';
        const totalIssues = this.totalInconsistencies?.textContent || '0';
        const totalFixes = this.totalRepairs?.textContent || '0';
        const statusStr = this.statusText?.textContent || 'Offline';

        // 1. Greetings
        if (q === 'hi' || q === 'hello') {
            return `Hi ${userName}, welcome. How can I assist you today?\n\nPlease select an option:\n1. Total System Reports\n2. Project/Collection Details\n3. Database Health Summary`;
        }

        // 2. Farewell
        if (q === 'bye') {
            return "Thank you for having a conversation with us. Have a great day.";
        }

        // 3. Menu Options
        if (q === '1' || q.includes('report')) {
            return `Total Statistics:\n- Documents Scanned: ${totalDocs}\n- Inconsistencies Found: ${totalIssues}\n- Successful Repairs: ${totalFixes}`;
        }

        if (q === '2' || q.includes('project') || q.includes('detail')) {
            return "Project Information:\nName: Data-Consistency-Checker\nPlatform: MongoDB Monitoring Engine\nCapabilities: Automated fsck, Repair Logic, Real-time Dashboard.";
        }

        if (q === '3' || q.includes('health')) {
            return `System Health: ${statusStr}\nLast Check: ${this.lastCheckTime?.textContent || 'Never'}\nStability: ${statusStr === 'Consistent' ? '100%' : 'Needs Attention'}`;
        }

        // 4. Fallback for unrelated input
        return "Message not readable. Please select a valid option (1, 2, or 3).";
    }

    checkLoginStatus() {
        const user = localStorage.getItem('currentUser');
        if (user) {
            this.applyLogin(user);
        } else {
            this.loginScreen.classList.remove('hidden');
            this.dashboardContainer.classList.add('hidden');
        }
    }

    handleLogin() {
        const userId = this.loginIdInput.value.trim();
        const password = this.loginPasswordInput ? this.loginPasswordInput.value.trim() : '';

        if (!userId) {
            this.showNotification('Please enter a name or email', 'warning');
            return;
        }

        if (!password) {
            this.showNotification('Please enter any password', 'warning');
            return;
        }

        // We accept any credentials as per user request
        localStorage.setItem('currentUser', userId);
        this.applyLogin(userId);
        this.showNotification(`Authorized: Welcome ${userId}`, 'success');
    }

    applyLogin(userId) {
        if (this.userNameTooltip) this.userNameTooltip.textContent = userId;
        
        this.loginScreen.style.opacity = '0';
        setTimeout(() => {
            this.loginScreen.classList.add('hidden');
            this.dashboardContainer.classList.remove('hidden');
            if (this.bgVisuals) this.bgVisuals.classList.remove('hidden');
            this.dashboardContainer.style.animation = 'slideUpFade 0.6s var(--transition-timing) forwards';
        }, 500);
    }

    handleLogout() {
        localStorage.removeItem('currentUser');
        location.reload();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.ui = new ConsistencyCheckerUI();
});
