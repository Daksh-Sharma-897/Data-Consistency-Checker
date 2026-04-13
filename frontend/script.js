// Data Consistency Checker Frontend Script

class ConsistencyCheckerUI {
    constructor() {
        this.apiBase = '/api';
        this.isChecking = false;
        this.currentReport = null;
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeTheme();
        this.loadInitialData();
    }

    initializeElements() {
        // Status elements
        this.statusIndicator = document.getElementById('status-indicator');
        this.statusText = this.statusIndicator.querySelector('.status-text');
        this.lastCheckTime = document.getElementById('last-check-time');
        this.lastConsistentTime = document.getElementById('last-consistent-time');
        this.checkStatus = document.getElementById('check-status');
        this.checkText = document.getElementById('check-text');
        
        // Control elements
        this.runCheckBtn = document.getElementById('run-check-btn');
        this.refreshStatusBtn = document.getElementById('refresh-status-btn');
        this.viewReportsBtn = document.getElementById('view-reports-btn');
        
        // Loading elements
        this.loadingSection = document.getElementById('loading-section');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');
        
        // Report elements - Latest Report
        this.latestReportContent = document.getElementById('latest-report-content');
        this.latestReportCard = document.getElementById('latest-report-card');
        this.latestReportStatus = document.getElementById('latest-report-status');
        this.latestReportStatusText = this.latestReportStatus.querySelector('.status-text');
        this.latestReportEmpty = document.getElementById('latest-report-empty');
        this.latestReportDetails = document.getElementById('latest-report-details');
        this.latestReportCollection = document.getElementById('latest-report-collection');
        this.latestReportDocs = document.getElementById('latest-report-docs');
        this.latestReportIssues = document.getElementById('latest-report-issues');
        this.latestReportRepairs = document.getElementById('latest-report-repairs');
        this.latestReportActions = document.getElementById('latest-report-actions');
        this.latestViewDetailsBtn = document.getElementById('latest-view-details-btn');
        
        // Reports History
        this.reportsHistorySection = document.getElementById('reports-history-section');
        this.reportsList = document.getElementById('reports-list');
        this.collectionFilter = document.getElementById('collection-filter');
        this.refreshReportsBtn = document.getElementById('refresh-reports-btn');
        
        // Statistics elements
        this.totalChecks = document.getElementById('total-checks');
        this.totalDocuments = document.getElementById('total-documents');
        this.totalInconsistencies = document.getElementById('total-inconsistencies');
        this.totalRepairs = document.getElementById('total-repairs');
        
        // Modal elements
        this.reportModal = document.getElementById('report-modal');
        this.modalClose = document.getElementById('modal-close');
        this.modalBody = document.getElementById('modal-body');
        
        // Notification elements
        this.notification = document.getElementById('notification');
        this.notificationIcon = document.getElementById('notification-icon');
        this.notificationMessage = document.getElementById('notification-message');
        this.notificationClose = this.notification.querySelector('.notification-close');
        
        // Theme toggle
        this.themeToggle = document.getElementById('theme-toggle');
    }

    // Theme Management
    initializeTheme() {
        // Check for saved theme preference or default to dark
        const savedTheme = localStorage.getItem('theme') || 'dark';
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    attachEventListeners() {
        this.runCheckBtn.addEventListener('click', () => this.runConsistencyCheck());
        this.refreshStatusBtn.addEventListener('click', () => this.loadStatus());
        this.viewReportsBtn.addEventListener('click', () => this.toggleReportsHistory());
        this.refreshReportsBtn.addEventListener('click', () => this.loadReports());
        this.collectionFilter.addEventListener('change', () => this.loadReports());
        this.modalClose.addEventListener('click', () => this.closeModal());
        
        // Theme toggle
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Notification close
        this.notificationClose.addEventListener('click', () => {
            this.notification.classList.add('hidden');
        });
        
        // Close modal on outside click
        this.reportModal.addEventListener('click', (e) => {
            if (e.target === this.reportModal || e.target.classList.contains('modal-overlay')) {
                this.closeModal();
            }
        });
        
        // Auto-refresh status every 30 seconds
        setInterval(() => {
            if (!this.isChecking) {
                this.loadStatus();
            }
        }, 30000);
    }

    async loadInitialData() {
        await Promise.all([
            this.loadStatus(),
            this.loadLatestReport(),
            this.loadStatistics()
        ]);
    }

    async loadStatus() {
        try {
            const response = await fetch(`${this.apiBase}/status`);
            const data = await response.json();
            
            if (data.success) {
                this.updateStatusDisplay(data.data);
            } else {
                this.showNotification('Failed to load status', 'error');
            }       
        } catch (error) {
            console.error('Error loading status:', error);
            this.showNotification('Error loading status', 'error');
        }
    }

    updateStatusDisplay(status) {
        // Update consistency status
        if (status.isConsistent) {
            this.statusIndicator.className = 'status-badge consistent';
            this.statusText.textContent = 'Consistent';
        } else {
            this.statusIndicator.className = 'status-badge inconsistent';
            this.statusText.textContent = 'Inconsistent';
        }
        
        // Update last check time
        if (status.lastCheckTime) {
            this.lastCheckTime.textContent = this.formatDateTime(status.lastCheckTime);
        } else {
            this.lastCheckTime.textContent = 'Never';
        }
        
        // Update last consistent time
        if (status.lastConsistentTime) {
            this.lastConsistentTime.textContent = this.formatDateTime(status.lastConsistentTime);
        } else {
            this.lastConsistentTime.textContent = 'Never';
        }
        
        // Update active check status
        if (status.isActive) {
            this.checkStatus.className = 'check-status active';
            this.checkText.textContent = 'In Progress';
            this.isChecking = true;
            this.runCheckBtn.disabled = true;
            this.showLoadingSection();
        } else {
            this.checkStatus.className = 'check-status';
            this.checkText.textContent = 'Idle';
            this.isChecking = false;
            this.runCheckBtn.disabled = false;
            this.hideLoadingSection();
        }
    }

    async runConsistencyCheck() {
        if (this.isChecking) return;
        
        this.isChecking = true;
        this.runCheckBtn.disabled = true;
        this.showLoadingSection();
        this.updateProgress(10, 'Starting consistency check...');
        
        try {
            this.updateProgress(25, 'Scanning collection...');
            
            const response = await fetch(`${this.apiBase}/check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ collection: 'users' })
            });
            
            this.updateProgress(75, 'Processing results...');
            
            const data = await response.json();
            
            this.updateProgress(100, 'Complete!');
            
            if (data.success) {
                this.currentReport = data.report;
                this.showNotification('Consistency check completed successfully', 'success');
                
                // Refresh all data
                await Promise.all([
                    this.loadStatus(),
                    this.displayLatestReport(data.report),
                    this.loadStatistics()
                ]);
            } else {
                this.showNotification(`Check failed: ${data.error}`, 'error');
            }
        } catch (error) {
            console.error('Error running consistency check:', error);
            this.showNotification('Error running consistency check', 'error');
        } finally {
            setTimeout(() => {
                this.hideLoadingSection();
                this.isChecking = false;
                this.runCheckBtn.disabled = false;
            }, 1000);
        }
    }

    showLoadingSection() {
        this.loadingSection.classList.remove('hidden');
        this.updateProgress(0, 'Initializing...');
    }

    hideLoadingSection() {
        this.loadingSection.classList.add('hidden');
    }

    updateProgress(percent, text) {
        this.progressFill.style.width = `${percent}%`;
        this.progressText.textContent = text;
    }

    async loadLatestReport() {
        try {
            const response = await fetch(`${this.apiBase}/report/latest`);
            const data = await response.json();
            
            if (data.success && data.data) {
                this.displayLatestReport(data.data);
            } else {
                this.latestReportContent.innerHTML = '<p class="no-data">No reports available. Run a consistency check to generate a report.</p>';
            }
        } catch (error) {
            console.error('Error loading latest report:', error);
            this.latestReportContent.innerHTML = '<p class="no-data">Error loading reports.</p>';
        }
    }

    displayLatestReport(report) {
        if (!report) {
            // Show empty state
            this.latestReportEmpty.classList.remove('hidden');
            this.latestReportDetails.classList.add('hidden');
            this.latestReportActions.classList.add('hidden');
            this.latestReportStatus.className = 'status-badge';
            this.latestReportStatusText.textContent = 'No Report';
            return;
        }
        
        // Hide empty state, show details
        this.latestReportEmpty.classList.add('hidden');
        this.latestReportDetails.classList.remove('hidden');
        this.latestReportActions.classList.remove('hidden');
        
        // Update status badge
        const statusColors = {
            'clean': 'consistent',
            'repaired': 'consistent',
            'error': 'inconsistent',
            'partial': 'inconsistent'
        };
        const statusClass = statusColors[report.status] || '';
        this.latestReportStatus.className = `status-badge ${statusClass}`;
        this.latestReportStatusText.textContent = report.status.charAt(0).toUpperCase() + report.status.slice(1);
        
        // Update detail values
        this.latestReportCollection.textContent = report.collection;
        this.latestReportDocs.textContent = report.totalDocuments;
        this.latestReportIssues.textContent = report.inconsistenciesFound;
        this.latestReportRepairs.textContent = report.repairsApplied;
        
        // Attach view details button listener
        this.latestViewDetailsBtn.onclick = () => this.viewReportDetails(report.id);
    }

    createReportCard(report, isLatest = false) {
        const statusClass = this.getReportStatusClass(report.status);
        const duration = report.durationFormatted || this.formatDuration(report.duration);
        const statusColors = {
            'clean': '#22c55e',
            'repaired': '#6366f1',
            'error': '#ef4444',
            'partial': '#f59e0b'
        };
        const statusColor = statusColors[report.status] || '#f59e0b';
        
        return `
            <div class="report-card glass-card" data-report-id="${report.id}" style="padding: 24px; margin-bottom: 16px;">
                <div class="report-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                    <div class="report-title" style="flex: 1;">
                        <div style="font-size: 1.125rem; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">
                            ${isLatest ? 'Latest Report' : `Report #${report.id}`}
                        </div>
                        <div style="font-size: 0.875rem; color: var(--text-muted);">${this.formatDateTime(report.timestamp)}</div>
                    </div>
                    <div class="report-status" style="padding: 6px 12px; border-radius: 50px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; background: ${statusColor}20; color: ${statusColor};">
                        ${report.status}
                    </div>
                </div>
                
                <div class="report-metrics" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; padding: 16px; background: var(--bg-secondary); border-radius: 12px;">
                    <div class="metric" style="text-align: center;">
                        <div class="metric-value" style="font-size: 1.5rem; font-weight: 700; color: var(--accent-primary);">${report.totalDocuments}</div>
                        <div class="metric-label" style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Total Docs</div>
                    </div>
                    <div class="metric" style="text-align: center;">
                        <div class="metric-value" style="font-size: 1.5rem; font-weight: 700; color: var(--accent-warning);">${report.inconsistenciesFound}</div>
                        <div class="metric-label" style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Inconsistencies</div>
                    </div>
                    <div class="metric" style="text-align: center;">
                        <div class="metric-value" style="font-size: 1.5rem; font-weight: 700; color: var(--accent-success);">${report.repairsApplied}</div>
                        <div class="metric-label" style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Repairs</div>
                    </div>
                    <div class="metric" style="text-align: center;">
                        <div class="metric-value" style="font-size: 1.5rem; font-weight: 700; color: var(--accent-error);">${report.documentsDeleted}</div>
                        <div class="metric-label" style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Deleted</div>
                    </div>
                </div>
                
                <div class="report-details" style="margin-bottom: 16px; padding: 12px 16px; background: var(--bg-tertiary); border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.875rem; margin-bottom: 8px;">
                        <span style="color: var(--text-muted);">Collection:</span>
                        <span style="color: var(--text-primary); font-weight: 500;">${report.collection}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.875rem;">
                        <span style="color: var(--text-muted);">Duration:</span>
                        <span style="color: var(--text-primary); font-weight: 500;">${duration}</span>
                    </div>
                    ${report.errors.length > 0 ? `<div style="display: flex; justify-content: space-between; font-size: 0.875rem; margin-top: 8px;"><span style="color: var(--accent-error);">Errors:</span><span style="color: var(--accent-error); font-weight: 600;">${report.errors.length}</span></div>` : ''}
                </div>
                
                <div class="report-actions" style="display: flex; gap: 12px;">
                    <button class="btn btn-small view-details-btn" data-report-id="${report.id}" style="flex: 1;">
                        View Details
                    </button>
                    ${!isLatest ? `<button class="btn btn-small btn-secondary delete-report-btn" data-report-id="${report.id}">Delete</button>` : ''}
                </div>
            </div>
        `;
    }

    getReportStatusClass(status) {
        const statusMap = {
            'clean': 'clean',
            'repaired': 'repaired',
            'error': 'error',
            'partial': 'partial'
        };
        return statusMap[status] || 'partial';
    }

    attachReportEventListeners() {
        // View details buttons
        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reportId = e.target.dataset.reportId;
                this.viewReportDetails(reportId);
            });
        });
        
        // Delete report buttons
        document.querySelectorAll('.delete-report-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reportId = e.target.dataset.reportId;
                this.deleteReport(reportId);
            });
        });
    }

    async viewReportDetails(reportId) {
        try {
            // Find the report in the current data or fetch it
            let report = null;
            
            if (this.currentReport && this.currentReport.id === reportId) {
                report = this.currentReport;
            } else {
                // For now, we'll show a simplified view
                // In a real implementation, you might want an endpoint to get full report details
                const response = await fetch(`${this.apiBase}/reports`);
                const data = await response.json();
                if (data.success) {
                    report = data.data.find(r => r.id === reportId);
                }
            }
            
            if (report) {
                this.showReportModal(report);
            } else {
                this.showNotification('Report not found', 'error');
            }
        } catch (error) {
            console.error('Error viewing report details:', error);
            this.showNotification('Error loading report details', 'error');
        }
    }

    showReportModal(report) {
        const statusConfig = {
            'clean': { color: '#22c55e', class: 'consistent', icon: '✓' },
            'repaired': { color: '#6366f1', class: 'consistent', icon: '🔧' },
            'error': { color: '#ef4444', class: 'inconsistent', icon: '✗' },
            'partial': { color: '#f59e0b', class: 'inconsistent', icon: '⚠' }
        };
        const config = statusConfig[report.status] || statusConfig['partial'];
        
        const detailsHtml = `
            <div class="modal-report-content" style="color: var(--text-primary);">
                <!-- Status Header -->
                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding: 20px; background: var(--bg-secondary); border-radius: var(--radius-lg);">
                    <div style="width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background: ${config.color}20; color: ${config.color};">
                        ${config.icon}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Report Status</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: ${config.color}; text-transform: capitalize;">${report.status}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.75rem; color: var(--text-muted);">Report #${report.id}</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">${this.formatDateTime(report.timestamp)}</div>
                    </div>
                </div>

                <!-- Info Cards Grid -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px;">
                    <div style="padding: 16px; background: var(--bg-tertiary); border-radius: var(--radius-md);">
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Collection</div>
                        <div style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">${report.collection}</div>
                    </div>
                    <div style="padding: 16px; background: var(--bg-tertiary); border-radius: var(--radius-md);">
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Duration</div>
                        <div style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">${report.durationFormatted || this.formatDuration(report.duration)}</div>
                    </div>
                </div>
                
                <!-- Summary Stats -->
                <div style="margin-bottom: 24px;">
                    <h4 style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">Summary Statistics</h4>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
                        <div style="text-align: center; padding: 16px 12px; background: rgba(99, 102, 241, 0.1); border-radius: var(--radius-md);">
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--accent-primary);">${report.totalDocuments}</div>
                            <div style="font-size: 0.6875rem; color: var(--text-muted); text-transform: uppercase;">Documents</div>
                        </div>
                        <div style="text-align: center; padding: 16px 12px; background: rgba(245, 158, 11, 0.1); border-radius: var(--radius-md);">
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--accent-warning);">${report.inconsistenciesFound}</div>
                            <div style="font-size: 0.6875rem; color: var(--text-muted); text-transform: uppercase;">Issues</div>
                        </div>
                        <div style="text-align: center; padding: 16px 12px; background: rgba(34, 197, 94, 0.1); border-radius: var(--radius-md);">
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--accent-success);">${report.repairsApplied}</div>
                            <div style="font-size: 0.6875rem; color: var(--text-muted); text-transform: uppercase;">Repairs</div>
                        </div>
                        <div style="text-align: center; padding: 16px 12px; background: rgba(239, 68, 68, 0.1); border-radius: var(--radius-md);">
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--accent-error);">${report.documentsDeleted}</div>
                            <div style="font-size: 0.6875rem; color: var(--text-muted); text-transform: uppercase;">Deleted</div>
                        </div>
                    </div>
                </div>
                
                ${report.errors.length > 0 ? `
                    <div style="margin-bottom: 24px;">
                        <h4 style="font-size: 0.75rem; font-weight: 600; color: var(--accent-error); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                            <span>⚠</span> Errors (${report.errors.length})
                        </h4>
                        <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: var(--radius-md); padding: 12px 16px;">
                            ${report.errors.map(error => `
                                <div style="padding: 8px 0; color: var(--accent-error); font-size: 0.875rem; border-bottom: 1px solid rgba(239, 68, 68, 0.1);">
                                    ${error}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${report.details && report.details.length > 0 ? `
                    <div>
                        <h4 style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
                            Repair Details (${report.details.length})
                        </h4>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            ${report.details.map(detail => `
                                <div style="background: var(--bg-secondary); border-radius: var(--radius-md); padding: 16px; border-left: 3px solid var(--accent-primary);">
                                    <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; font-size: 0.875rem; margin-bottom: 8px;">
                                        <span style="color: var(--text-muted);">Document:</span>
                                        <span style="font-weight: 500; font-family: monospace; color: var(--text-primary);">${detail.documentId}</span>
                                        <span style="color: var(--text-muted);">Issue:</span>
                                        <span style="color: var(--accent-warning);">${detail.issue}</span>
                                        <span style="color: var(--text-muted);">Action:</span>
                                        <span style="color: var(--accent-success); font-weight: 500;">${detail.action}</span>
                                    </div>
                                    ${detail.oldValue !== undefined || detail.newValue !== undefined ? `
                                        <div style="display: flex; gap: 12px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);">
                                            ${detail.oldValue !== undefined ? `
                                                <div style="flex: 1; padding: 8px 12px; background: rgba(239, 68, 68, 0.08); border-radius: var(--radius-sm);">
                                                    <span style="font-size: 0.6875rem; color: var(--accent-error); text-transform: uppercase;">Before</span>
                                                    <div style="font-size: 0.875rem; color: var(--accent-error); font-family: monospace;">${detail.oldValue}</div>
                                                </div>
                                            ` : ''}
                                            ${detail.newValue !== undefined ? `
                                                <div style="flex: 1; padding: 8px 12px; background: rgba(34, 197, 94, 0.08); border-radius: var(--radius-sm);">
                                                    <span style="font-size: 0.6875rem; color: var(--accent-success); text-transform: uppercase;">After</span>
                                                    <div style="font-size: 0.875rem; color: var(--accent-success); font-family: monospace;">${detail.newValue}</div>
                                                </div>
                                            ` : ''}
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        this.modalBody.innerHTML = detailsHtml;
        this.reportModal.classList.remove('hidden');
    }

    closeModal() {
        this.reportModal.classList.add('hidden');
    }

    async toggleReportsHistory() {
        if (this.reportsHistorySection.classList.contains('hidden')) {
            this.reportsHistorySection.classList.remove('hidden');
            await this.loadReports();
            this.viewReportsBtn.querySelector('.btn-text').textContent = 'Hide Reports';
        } else {
            this.reportsHistorySection.classList.add('hidden');
            this.viewReportsBtn.querySelector('.btn-text').textContent = 'View All Reports';
        }
    }

    async loadReports() {
        try {
            const collection = this.collectionFilter.value;
            const url = collection ? `${this.apiBase}/reports?collection=${collection}` : `${this.apiBase}/reports`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                this.displayReports(data.data);
            } else {
                this.showNotification('Failed to load reports', 'error');
            }
        } catch (error) {
            console.error('Error loading reports:', error);
            this.showNotification('Error loading reports', 'error');
        }
    }

    displayReports(reports) {
        if (reports.length === 0) {
            this.reportsList.innerHTML = '<p class="no-data">No reports found.</p>';
            return;
        }
        
        const reportsHtml = reports.map(report => this.createReportCard(report, false)).join('');
        this.reportsList.innerHTML = reportsHtml;
        
        this.attachReportEventListeners();
    }

    async loadStatistics() {
        try {
            const response = await fetch(`${this.apiBase}/stats`);
            const data = await response.json();
            
            if (data.success) {
                console.log(data);

                this.updateStatisticsDisplay(data.data);
            }
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }
s

    updateStatisticsDisplay(stats) {
        
       this.totalChecks.textContent = stats.totalChecks || 0;
       this.totalDocuments.textContent = stats.totalDocuments || 0;
       this.totalInconsistencies.textContent = stats.totalInconsistencies || 0;
       this.totalRepairs.textContent = stats.totalRepairs || 0;

        
       

        
    }

    showNotification(message, type = 'info') {
        this.notificationMessage.textContent = message;
        this.notification.className = `notification ${type}`;
        
        // Set icon based on type
        const icons = {
            'success': '✓',
            'error': '✗',
            'warning': '⚠',
            'info': 'ℹ'
        };
        this.notificationIcon.textContent = icons[type] || icons.info;
        
        this.notification.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.notification.classList.add('hidden');
        }, 5000);
    }

    formatDateTime(dateString) {
        if (!dateString) return 'Never';
        
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDuration(ms) {
        if (ms < 1000) {
            return `${ms}ms`;
        } else if (ms < 60000) {
            return `${(ms / 1000).toFixed(2)}s`;
        } else {
            return `${(ms / 60000).toFixed(2)}m`;
        }
    }

    async deleteReport(reportId) {
        if (!confirm('Are you sure you want to delete this report?')) {
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBase}/reports/${reportId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Report deleted successfully', 'success');
                // Refresh the reports list
                await this.loadReports();
                // Also refresh statistics
                await this.loadStatistics();
            } else {
                this.showNotification(`Failed to delete report: ${data.error}`, 'error');
            }
        } catch (error) {
            console.error('Error deleting report:', error);
            this.showNotification('Error deleting report', 'error');
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ConsistencyCheckerUI();
});
