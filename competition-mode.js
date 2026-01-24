/**
 * Competition Mode Management
 *
 * Handles mode-based views of the competition page:
 * - discovery: Not enrolled (default)
 * - participant: Enrolled + active
 * - sponsor: Competition creator/host (future)
 * - admin: Platform admin (future)
 *
 * Mode is driven by user state and permissions, stored in the app container's
 * data-competition-mode attribute.
 */

// ============================================
// Mock Data (simulates API responses)
// ============================================

const MOCK_USER = {
    id: 'user_sarah_chen',
    name: 'Sarah Chen',
    isEnrolled: false, // Toggleable for demo
    enrolledAt: '2025-01-15T10:30:00Z',
};

const MOCK_PARTICIPANT_DATA = {
    bestScore: 0.8234,
    rank: 12,
    totalParticipants: 234,
    submissionsToday: 3,
    maxSubmissionsPerDay: 5,
    submissionsResetIn: '8 hours',
    percentile: 94, // Top 6%
    spotsFromTop10: 4,
};

const MOCK_SUBMISSIONS = [
    {
        id: 'sub_007',
        timestamp: '2025-01-23T14:22:00Z',
        score: 0.8234,
        status: 'scored',
        isBest: true,
        filename: 'xgb_tuned_v3.csv',
    },
    {
        id: 'sub_006',
        timestamp: '2025-01-23T11:45:00Z',
        score: 0.8156,
        status: 'scored',
        isBest: false,
        filename: 'xgb_tuned_v2.csv',
    },
    {
        id: 'sub_005',
        timestamp: '2025-01-22T16:30:00Z',
        score: 0.7892,
        status: 'scored',
        isBest: false,
        filename: 'random_forest_v1.csv',
    },
    {
        id: 'sub_004',
        timestamp: '2025-01-21T09:15:00Z',
        score: 0.7654,
        status: 'scored',
        isBest: false,
        filename: 'baseline_logreg.csv',
    },
    {
        id: 'sub_003',
        timestamp: '2025-01-20T14:00:00Z',
        score: null,
        status: 'error',
        isBest: false,
        filename: 'broken_format.csv',
        errorMessage: 'Missing churn_probability column',
    },
];

const MOCK_LEADERBOARD_AROUND_USER = [
    { rank: 10, name: 'Wei Zhang', score: 0.8312, isUser: false },
    { rank: 11, name: 'Alex Kim', score: 0.8289, isUser: false },
    { rank: 12, name: 'Sarah Chen', score: 0.8234, isUser: true },
    { rank: 13, name: 'Jordan Lee', score: 0.8198, isUser: false },
    { rank: 14, name: 'Taylor Nguyen', score: 0.8167, isUser: false },
];

// ============================================
// Admin/Sponsor Mock Data
// ============================================

const MOCK_ADMIN_USER = {
    id: 'user_marcus_johnson',
    name: 'Marcus Johnson',
    isSponsor: true,
    role: 'Competition Host'
};

const MOCK_COMPETITION_HEALTH = {
    participants: 234,
    submissionsTotal: 1847,
    submissionsToday: 47,
    successRate: 98.2,
    errorsLast24h: 3,
    daysRemaining: 12,
    avgSubmissionsPerParticipant: 7.9
};

const MOCK_SUBMISSION_ACTIVITY = [
    { date: '2025-01-17', count: 23 },
    { date: '2025-01-18', count: 45 },
    { date: '2025-01-19', count: 67 },
    { date: '2025-01-20', count: 89 },
    { date: '2025-01-21', count: 112 },
    { date: '2025-01-22', count: 78 },
    { date: '2025-01-23', count: 47 }
];

const MOCK_ERROR_BREAKDOWN = [
    { type: 'Format errors', count: 45, percentage: 2.4 },
    { type: 'Missing columns', count: 23, percentage: 1.2 },
    { type: 'Invalid values', count: 12, percentage: 0.6 }
];

const MOCK_DISCUSSION_THREADS = [
    { id: 1, title: 'Welcome & Competition Guidelines', author: 'Marcus Johnson', replies: 234, pinned: true, locked: false },
    { id: 2, title: 'Data leakage concern', author: 'Wei Zhang', replies: 12, pinned: false, locked: true },
    { id: 3, title: 'Best features for baseline model?', author: 'Alex Kim', replies: 45, pinned: false, locked: false },
    { id: 4, title: 'Question about evaluation metric', author: 'Jordan Lee', replies: 18, pinned: false, locked: false },
    { id: 5, title: 'Team formation thread', author: 'Taylor Nguyen', replies: 67, pinned: false, locked: false }
];

const MOCK_DATA_VERSIONS = [
    { version: 'v3', date: '2025-01-10', note: 'Fixed label encoding', current: true },
    { version: 'v2', date: '2025-01-08', note: 'Added demographic features', current: false },
    { version: 'v1', date: '2025-01-05', note: 'Initial upload', current: false }
];

const MOCK_TIMELINE_EVENTS = [
    { date: 'Jan 10', label: 'Competition launched', status: 'completed' },
    { date: 'Feb 5', label: 'Submission deadline', status: 'current', note: '12 days left' },
    { date: 'Feb 7', label: 'Results announced', status: 'upcoming' },
    { date: 'Feb 14', label: 'Winner presentations', status: 'upcoming' }
];

// ============================================
// Mode Manager
// ============================================

const CompetitionMode = {
    // Available modes (extensible for future modes)
    MODES: {
        DISCOVERY: 'discovery',
        PARTICIPANT: 'participant',
        SPONSOR: 'sponsor', // Future
        ADMIN: 'admin', // Future
    },

    currentMode: 'discovery',
    appContainer: null,

    /**
     * Initialize the mode system
     */
    init() {
        this.appContainer = document.querySelector('[data-competition-mode]');
        if (!this.appContainer) {
            console.warn('Competition mode container not found');
            return;
        }

        // Determine initial mode based on user state
        this.currentMode = this.determineMode();
        this.applyMode(this.currentMode);

        // Set up event listeners
        this.setupEventListeners();

        // Initialize tab functionality
        this.initTabs();
    },

    /**
     * Determine the appropriate mode based on user state and permissions
     */
    determineMode() {
        // In a real app, this would check:
        // 1. User permissions (sponsor, admin) - highest priority
        // 2. User enrollment status
        // 3. Competition status (active, ended, etc.)

        // Check if user is a sponsor (admin) for this competition
        if (MOCK_ADMIN_USER.isSponsor && this.isSponsorMode) {
            return this.MODES.SPONSOR;
        }

        if (MOCK_USER.isEnrolled) {
            return this.MODES.PARTICIPANT;
        }

        return this.MODES.DISCOVERY;
    },

    // Flag to track if sponsor mode is enabled (for demo toggle)
    isSponsorMode: false,

    /**
     * Apply a mode to the page
     */
    applyMode(mode) {
        this.currentMode = mode;
        this.appContainer.setAttribute('data-competition-mode', mode);

        // Update mode-specific content
        if (mode === this.MODES.PARTICIPANT) {
            this.populateParticipantData();
        } else if (mode === this.MODES.SPONSOR) {
            this.populateAdminData();
        }

        // Update tab visibility and default tab
        this.updateTabsForMode(mode);

        console.log(`Competition mode: ${mode}`);
    },

    /**
     * Switch to a different mode
     */
    switchMode(newMode) {
        if (newMode === this.currentMode) return;
        if (!Object.values(this.MODES).includes(newMode)) {
            console.warn(`Invalid mode: ${newMode}`);
            return;
        }

        this.applyMode(newMode);
    },

    /**
     * Update tabs based on current mode
     */
    updateTabsForMode(mode) {
        const tabNav = document.querySelector('.tab-nav');
        const tabPanels = document.querySelector('.tab-panels');

        if (mode === this.MODES.PARTICIPANT) {
            // In participant mode, Submissions tab is visible
            // Optionally switch to Submissions as default tab
            // (Keeping Overview as default per requirements - participant can access brief quickly)
        }

        if (mode === this.MODES.SPONSOR) {
            // In sponsor mode, switch to admin overview tab
            this.navigateToTab('admin-overview');
        } else {
            // When leaving sponsor mode, go to regular overview
            const currentTab = document.querySelector('.tab-btn.active');
            if (currentTab && currentTab.dataset.tab.startsWith('admin-')) {
                this.navigateToTab('overview');
            }
        }
    },

    /**
     * Populate participant-specific data
     */
    populateParticipantData() {
        const data = MOCK_PARTICIPANT_DATA;

        // Update status summary
        const bestScoreEl = document.getElementById('user-best-score');
        if (bestScoreEl) {
            bestScoreEl.textContent = data.bestScore.toFixed(4);
        }

        const rankEl = document.getElementById('user-rank');
        if (rankEl) {
            rankEl.innerHTML = `#${data.rank} <span class="rank-context">of ${data.totalParticipants}</span>`;
        }

        const submissionsEl = document.getElementById('submissions-remaining');
        if (submissionsEl) {
            const remaining = data.maxSubmissionsPerDay - data.submissionsToday;
            submissionsEl.innerHTML = `${remaining} / ${data.maxSubmissionsPerDay} <span class="submissions-context">remaining</span>`;
        }

        const leaderboardContextEl = document.getElementById('leaderboard-context');
        if (leaderboardContextEl) {
            leaderboardContextEl.textContent = `Top ${100 - data.percentile}% — ${data.spotsFromTop10} spots from top 10`;
        }

        // Populate submissions list
        this.renderSubmissionsList();

        // Populate mini leaderboard
        this.renderMiniLeaderboard();
    },

    /**
     * Populate admin/sponsor-specific data
     */
    populateAdminData() {
        const health = MOCK_COMPETITION_HEALTH;

        // Update admin status bar metrics
        this.updateAdminStatusBar(health);

        // Populate admin overview panel
        this.renderAdminOverview(health);

        // Populate data panel
        this.renderDataPanel();

        // Populate monitoring panel
        this.renderMonitoringPanel();

        // Populate discussions panel
        this.renderDiscussionsPanel();

        // Populate admin timeline
        this.renderAdminTimeline();
    },

    /**
     * Update the admin status bar with health metrics
     */
    updateAdminStatusBar(health) {
        const participantsEl = document.getElementById('admin-participants');
        const submissionsEl = document.getElementById('admin-submissions-today');
        const errorsEl = document.getElementById('admin-errors');
        const daysEl = document.getElementById('admin-days-left');

        if (participantsEl) participantsEl.textContent = health.participants + ' enrolled';
        if (submissionsEl) submissionsEl.textContent = health.submissionsToday + ' new';
        if (errorsEl) errorsEl.textContent = health.errorsLast24h + ' failures';
        if (daysEl) daysEl.textContent = health.daysRemaining;
    },

    /**
     * Render admin overview panel content
     */
    renderAdminOverview(health) {
        // Update metric cards
        const enrolledEl = document.getElementById('metric-enrolled');
        const totalSubsEl = document.getElementById('metric-total-submissions');
        const successRateEl = document.getElementById('metric-success-rate');
        const daysRemainingEl = document.getElementById('metric-days-remaining');

        if (enrolledEl) enrolledEl.textContent = health.participants;
        if (totalSubsEl) totalSubsEl.textContent = health.submissionsTotal.toLocaleString();
        if (successRateEl) successRateEl.textContent = health.successRate + '%';
        if (daysRemainingEl) daysRemainingEl.textContent = health.daysRemaining;
    },

    /**
     * Render data panel with versions
     */
    renderDataPanel() {
        const versionsList = document.getElementById('data-versions-list');
        if (!versionsList) return;

        versionsList.innerHTML = MOCK_DATA_VERSIONS.map(v => `
            <div class="version-item ${v.current ? 'current' : ''}">
                <span class="version-name">${v.version}</span>
                <span class="version-date">${v.date}</span>
                <span class="version-note">"${v.note}"</span>
                ${v.current ? '<span class="version-badge">Current</span>' : ''}
            </div>
        `).join('');
    },

    /**
     * Render monitoring panel with activity chart and errors
     */
    renderMonitoringPanel() {
        // Render simple bar chart
        const chartContainer = document.getElementById('activity-chart');
        if (chartContainer) {
            const maxCount = Math.max(...MOCK_SUBMISSION_ACTIVITY.map(d => d.count));
            chartContainer.innerHTML = MOCK_SUBMISSION_ACTIVITY.map(d => {
                const height = (d.count / maxCount) * 100;
                const day = new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' });
                return `
                    <div class="chart-bar-container">
                        <div class="chart-bar" style="height: ${height}%" title="${d.count} submissions">
                            <span class="chart-value">${d.count}</span>
                        </div>
                        <span class="chart-label">${day}</span>
                    </div>
                `;
            }).join('');
        }

        // Render error breakdown
        const errorsContainer = document.getElementById('error-breakdown');
        if (errorsContainer) {
            errorsContainer.innerHTML = MOCK_ERROR_BREAKDOWN.map(e => `
                <div class="error-item">
                    <span class="error-type">${e.type}</span>
                    <span class="error-stats">${e.count} (${e.percentage}%)</span>
                </div>
            `).join('');
        }
    },

    /**
     * Render discussions panel for moderation
     */
    renderDiscussionsPanel() {
        const threadsList = document.getElementById('discussions-list');
        if (!threadsList) return;

        threadsList.innerHTML = MOCK_DISCUSSION_THREADS.map(thread => `
            <div class="thread-item ${thread.pinned ? 'pinned' : ''} ${thread.locked ? 'locked' : ''}">
                <div class="thread-info">
                    <span class="thread-icon">${thread.pinned ? '📌' : thread.locked ? '🔒' : ''}</span>
                    <div class="thread-details">
                        <span class="thread-title">${thread.title}</span>
                        <span class="thread-meta">Started by ${thread.author} • ${thread.replies} replies</span>
                    </div>
                </div>
                <div class="thread-actions">
                    <button class="btn-small" data-action="${thread.pinned ? 'unpin' : 'pin'}" data-thread="${thread.id}">
                        ${thread.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button class="btn-small" data-action="${thread.locked ? 'unlock' : 'lock'}" data-thread="${thread.id}">
                        ${thread.locked ? 'Unlock' : 'Lock'}
                    </button>
                    ${!thread.pinned && !thread.locked ? '<button class="btn-small btn-danger" data-action="hide" data-thread="' + thread.id + '">Hide</button>' : ''}
                </div>
            </div>
        `).join('');
    },

    /**
     * Render admin timeline in overview
     */
    renderAdminTimeline() {
        const timelineContainer = document.getElementById('admin-timeline');
        if (!timelineContainer) return;

        timelineContainer.innerHTML = MOCK_TIMELINE_EVENTS.map(event => `
            <div class="admin-timeline-item ${event.status}">
                <span class="timeline-marker">${event.status === 'completed' ? '✓' : event.status === 'current' ? '●' : '○'}</span>
                <span class="timeline-date">${event.date}</span>
                <span class="timeline-label">${event.label}</span>
                ${event.note ? `<span class="timeline-note">(${event.note})</span>` : ''}
            </div>
        `).join('');
    },

    /**
     * Render the submissions list
     */
    renderSubmissionsList() {
        const container = document.getElementById('submissions-list');
        if (!container) return;

        container.innerHTML = MOCK_SUBMISSIONS.map(sub => this.renderSubmissionItem(sub)).join('');
    },

    /**
     * Render a single submission item
     */
    renderSubmissionItem(submission) {
        const timeAgo = this.formatTimeAgo(new Date(submission.timestamp));
        const statusClass = submission.status === 'error' ? 'submission-error' : '';
        const bestBadge = submission.isBest ? '<span class="best-badge">Best</span>' : '';

        if (submission.status === 'error') {
            return `
                <div class="submission-item ${statusClass}">
                    <div class="submission-main">
                        <div class="submission-file">${submission.filename}</div>
                        <div class="submission-time">${timeAgo}</div>
                    </div>
                    <div class="submission-result">
                        <span class="submission-status error">Error</span>
                        <span class="submission-error-msg">${submission.errorMessage}</span>
                    </div>
                </div>
            `;
        }

        return `
            <div class="submission-item ${statusClass}">
                <div class="submission-main">
                    <div class="submission-file">${submission.filename} ${bestBadge}</div>
                    <div class="submission-time">${timeAgo}</div>
                </div>
                <div class="submission-result">
                    <span class="submission-score">${submission.score.toFixed(4)}</span>
                </div>
            </div>
        `;
    },

    /**
     * Render the mini leaderboard (around user)
     */
    renderMiniLeaderboard() {
        const container = document.getElementById('mini-leaderboard');
        if (!container) return;

        container.innerHTML = MOCK_LEADERBOARD_AROUND_USER.map(entry => {
            const userClass = entry.isUser ? 'leaderboard-user' : '';
            return `
                <li class="leaderboard-mini-item ${userClass}">
                    <span class="lb-rank">#${entry.rank}</span>
                    <span class="lb-name">${entry.name}</span>
                    <span class="lb-score">${entry.score.toFixed(4)}</span>
                </li>
            `;
        }).join('');
    },

    /**
     * Format a date as relative time
     */
    formatTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);

        const intervals = {
            day: 86400,
            hour: 3600,
            minute: 60,
        };

        if (seconds < 60) return 'just now';

        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
            }
        }

        return 'just now';
    },

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Join button (discovery mode)
        const joinBtn = document.getElementById('join-btn');
        if (joinBtn) {
            joinBtn.addEventListener('click', () => this.handleJoin());
        }

        // Submit button (participant mode) - navigate to submissions tab
        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.navigateToTab('submissions'));
        }

        // View submissions button
        const viewSubmissionsBtn = document.getElementById('view-submissions-btn');
        if (viewSubmissionsBtn) {
            viewSubmissionsBtn.addEventListener('click', () => this.navigateToTab('submissions'));
        }

        // Demo mode toggle (radio buttons or select)
        const modeRadios = document.querySelectorAll('input[name="demo-mode"]');
        if (modeRadios.length > 0) {
            modeRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const selectedMode = e.target.value;
                    this.handleDemoModeChange(selectedMode);
                });
            });
        }

        // Legacy checkbox toggle (for backwards compatibility)
        const modeToggle = document.getElementById('mode-toggle');
        if (modeToggle) {
            modeToggle.addEventListener('change', (e) => {
                MOCK_USER.isEnrolled = e.target.checked;
                this.isSponsorMode = false;
                this.switchMode(e.target.checked ? this.MODES.PARTICIPANT : this.MODES.DISCOVERY);
            });
        }

        // Upload zone interactions
        this.setupUploadZone();
    },

    /**
     * Handle demo mode selection change
     */
    handleDemoModeChange(selectedMode) {
        // Reset flags
        MOCK_USER.isEnrolled = false;
        this.isSponsorMode = false;

        switch (selectedMode) {
            case 'discovery':
                // Default state
                break;
            case 'participant':
                MOCK_USER.isEnrolled = true;
                break;
            case 'sponsor':
                this.isSponsorMode = true;
                break;
        }

        this.switchMode(this.determineMode());
    },

    /**
     * Handle join competition action
     */
    handleJoin() {
        // In a real app, this would make an API call
        MOCK_USER.isEnrolled = true;
        MOCK_USER.enrolledAt = new Date().toISOString();

        // Update the demo toggle to reflect the change
        const modeToggle = document.getElementById('mode-toggle');
        if (modeToggle) {
            modeToggle.checked = true;
        }

        // Switch to participant mode
        this.switchMode(this.MODES.PARTICIPANT);

        // Navigate to submissions tab to encourage first submission
        setTimeout(() => {
            this.navigateToTab('submissions');
        }, 300);
    },

    /**
     * Initialize tab functionality
     */
    initTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabPanels = document.querySelectorAll('.tab-panel');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;

                // Skip if the tab is hidden (mode-specific)
                if (!this.isTabVisible(button)) {
                    return;
                }

                // Update buttons - only clear active state on visible tabs
                tabButtons.forEach(btn => {
                    if (this.isTabVisible(btn)) {
                        btn.classList.remove('active');
                        btn.setAttribute('aria-selected', 'false');
                    }
                });
                button.classList.add('active');
                button.setAttribute('aria-selected', 'true');

                // Update panels
                tabPanels.forEach(panel => {
                    panel.classList.remove('active');
                    if (panel.id === `panel-${targetTab}`) {
                        panel.classList.add('active');
                    }
                });
            });
        });

        // Keyboard navigation
        const tabNav = document.querySelector('.tab-nav');
        if (tabNav) {
            tabNav.addEventListener('keydown', (e) => {
                const visibleTabs = Array.from(tabButtons).filter(tab => this.isTabVisible(tab));
                const currentIndex = visibleTabs.findIndex(tab => tab.classList.contains('active'));

                if (e.key === 'ArrowRight') {
                    const nextIndex = (currentIndex + 1) % visibleTabs.length;
                    visibleTabs[nextIndex].click();
                    visibleTabs[nextIndex].focus();
                } else if (e.key === 'ArrowLeft') {
                    const prevIndex = (currentIndex - 1 + visibleTabs.length) % visibleTabs.length;
                    visibleTabs[prevIndex].click();
                    visibleTabs[prevIndex].focus();
                }
            });
        }
    },

    /**
     * Check if a tab button should be visible in the current mode
     */
    isTabVisible(tabButton) {
        // Participant-only tabs
        if (tabButton.classList.contains('mode-participant-only')) {
            return this.currentMode === this.MODES.PARTICIPANT;
        }
        // Sponsor-only tabs
        if (tabButton.classList.contains('mode-sponsor-only')) {
            return this.currentMode === this.MODES.SPONSOR;
        }
        // Discovery/participant tabs (hidden in sponsor mode)
        if (tabButton.classList.contains('mode-discovery-participant')) {
            return this.currentMode !== this.MODES.SPONSOR;
        }
        // Default: visible in all modes unless it's a base tab hidden in sponsor mode
        // Base tabs are hidden in sponsor mode
        if (!tabButton.classList.contains('mode-sponsor-only') && this.currentMode === this.MODES.SPONSOR) {
            // Check if it's a standard tab that should be hidden in sponsor mode
            const standardTabs = ['overview', 'task-data', 'evaluation', 'getting-started', 'rules-timeline', 'submissions'];
            return !standardTabs.includes(tabButton.dataset.tab);
        }
        return true;
    },

    /**
     * Navigate to a specific tab
     */
    navigateToTab(tabId) {
        const tabButton = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        if (tabButton) {
            tabButton.click();
        }
    },

    /**
     * Set up upload zone drag and drop
     */
    setupUploadZone() {
        const uploadZone = document.getElementById('upload-zone');
        if (!uploadZone) return;

        const browseBtn = uploadZone.querySelector('.upload-browse');

        // Create hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.csv';
        fileInput.style.display = 'none';
        uploadZone.appendChild(fileInput);

        // Browse button click
        if (browseBtn) {
            browseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                fileInput.click();
            });
        }

        // File selected
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        // Drag and drop events
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');

            if (e.dataTransfer.files.length > 0) {
                this.handleFileUpload(e.dataTransfer.files[0]);
            }
        });
    },

    /**
     * Handle file upload (mock)
     */
    handleFileUpload(file) {
        console.log('Uploading file:', file.name);

        // In a real app, this would:
        // 1. Validate the file
        // 2. Upload to the server
        // 3. Show progress
        // 4. Update submissions list

        // For demo, show an alert
        alert(`File "${file.name}" would be uploaded.\n\nThis is a mock interface - no actual upload occurs.`);
    },
};

// ============================================
// Initialize on DOM ready
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    CompetitionMode.init();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CompetitionMode,
        MOCK_USER,
        MOCK_PARTICIPANT_DATA,
        MOCK_SUBMISSIONS,
        MOCK_ADMIN_USER,
        MOCK_COMPETITION_HEALTH,
        MOCK_SUBMISSION_ACTIVITY,
        MOCK_ERROR_BREAKDOWN,
        MOCK_DISCUSSION_THREADS,
        MOCK_DATA_VERSIONS,
        MOCK_TIMELINE_EVENTS
    };
}
