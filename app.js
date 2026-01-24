/**
 * Daggle - Internal Data Science Platform
 * Interactive Frontend
 */

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initSearchModal();
    initVoting();
    initFilters();
    initAnimations();
});

/**
 * Navigation between views
 */
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const views = document.querySelectorAll('.view');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = link.dataset.view;

            // Update active nav link
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Show corresponding view
            views.forEach(view => {
                view.classList.remove('active');
                if (view.id === `view-${viewId}`) {
                    view.classList.add('active');
                }
            });
        });
    });
}

/**
 * Search modal functionality
 */
function initSearchModal() {
    const searchTrigger = document.querySelector('.search-trigger');
    const modal = document.getElementById('search-modal');
    const modalInput = modal?.querySelector('input');

    // Open modal
    searchTrigger?.addEventListener('click', () => {
        modal.classList.add('active');
        modalInput?.focus();
    });

    // Close modal on overlay click
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Cmd/Ctrl + K to open search
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            modal.classList.add('active');
            modalInput?.focus();
        }

        // Escape to close
        if (e.key === 'Escape') {
            modal.classList.remove('active');
        }
    });
}

/**
 * Discussion voting functionality
 */
function initVoting() {
    const voteButtons = document.querySelectorAll('.vote-btn');

    voteButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const votesContainer = btn.closest('.discussion-votes');
            const countEl = votesContainer?.querySelector('.vote-count');

            if (!countEl) return;

            const isUpvote = btn.querySelector('polyline[points*="18,15"]') !== null;
            const isAlreadyVoted = btn.classList.contains('upvoted');

            if (isUpvote) {
                if (isAlreadyVoted) {
                    btn.classList.remove('upvoted');
                    countEl.textContent = parseInt(countEl.textContent) - 1;
                } else {
                    btn.classList.add('upvoted');
                    countEl.textContent = parseInt(countEl.textContent) + 1;
                }
            }
        });
    });
}

/**
 * Filter buttons functionality
 */
function initFilters() {
    // Competition filters
    const filterGroups = document.querySelectorAll('.filter-group');
    filterGroups.forEach(group => {
        const buttons = group.querySelectorAll('.filter-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    });

    // Pills filters (datasets, discussions)
    const pillGroups = document.querySelectorAll('.filter-pills');
    pillGroups.forEach(group => {
        const pills = group.querySelectorAll('.pill');
        pills.forEach(pill => {
            pill.addEventListener('click', () => {
                pills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
            });
        });
    });
}

/**
 * Subtle entrance animations
 */
function initAnimations() {
    // Animate getting started banner
    const gettingStarted = document.querySelector('.getting-started');
    if (gettingStarted) {
        gettingStarted.style.opacity = '0';
        gettingStarted.style.transform = 'translateY(-10px)';

        setTimeout(() => {
            gettingStarted.style.transition = 'all 0.4s ease';
            gettingStarted.style.opacity = '1';
            gettingStarted.style.transform = 'translateY(0)';
        }, 100);
    }

    // Animate competition tiles with stagger
    const tiles = document.querySelectorAll('.competition-tile');
    tiles.forEach((tile, index) => {
        tile.style.opacity = '0';
        tile.style.transform = 'translateY(16px)';

        setTimeout(() => {
            tile.style.transition = 'all 0.4s ease';
            tile.style.opacity = '1';
            tile.style.transform = 'translateY(0)';
        }, 200 + (index * 80));
    });

    // Animate stat cards on load (for other views)
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(10px)';

        setTimeout(() => {
            card.style.transition = 'all 0.4s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 + (index * 50));
    });

    // Intersection observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Observe sections for scroll reveal
    document.querySelectorAll('.section, .sidebar-section').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'all 0.5s ease';
        observer.observe(section);
    });
}

// Add visible class styles dynamically
const style = document.createElement('style');
style.textContent = `
    .section.visible,
    .sidebar-section.visible {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
`;
document.head.appendChild(style);

/**
 * Interactive card hover effects
 */
document.querySelectorAll('.competition-card, .competition-tile, .discussion-card, .work-item').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.cursor = 'pointer';
    });
});

/**
 * Notification simulation
 */
function simulateNotification() {
    const dot = document.querySelector('.notification-dot');
    if (dot) {
        dot.style.animation = 'pulse 2s infinite';
    }
}

// Add pulse animation
const pulseStyle = document.createElement('style');
pulseStyle.textContent = `
    @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.8; }
    }
`;
document.head.appendChild(pulseStyle);

// Initialize notification pulse
setTimeout(simulateNotification, 1000);

/**
 * Time ago formatting (for future dynamic content)
 */
function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
        }
    }

    return 'just now';
}

/**
 * Format numbers with commas
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Countdown timer for competitions
 */
function updateCountdowns() {
    const countdowns = document.querySelectorAll('.countdown');
    // In a real app, this would update based on actual deadline dates
    // For now, it's static
}

// Update countdowns every minute
setInterval(updateCountdowns, 60000);

console.log('Daggle initialized successfully');
