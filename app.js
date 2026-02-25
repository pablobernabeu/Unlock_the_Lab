// Import Firebase modules
import { database, auth } from './firebase-config.js';
import { ref, set, get, onValue } from 'firebase/database';
import { signInAnonymously } from 'firebase/auth';
import Chart from 'chart.js/auto';
import glossaryData from './public/glossary.json';
import rubricData from './public/rubric.json';
import papersData from './public/papers.json';

// Application State
let firebaseUid = null; // Set after anonymous auth on init
let currentPage = 0;
let papers = [];
let glossary = [];
let rubric = [];
let sessionId = null;
let userRatings = {}; // Personal ratings
let userPredictions = {}; // Predicted average ratings
let paperScores = {}; // Individual scores per paper (for restoring after refresh)
let totalScore = 0;
let userName = '';
let hasUsedBackButton = false; // Track if user has used their one-time back navigation
let celebratedPapers = new Set(); // Track papers where 90%+ was achieved
let pageDisplayTimestamps = {}; // Track when each paper page is displayed for response time calculation
let isViewingResults = false; // Flag to indicate viewing someone else's results (read-only mode)

// Criterion token allocation (20 tokens distributed across 6 criteria)
let criterionTokens = { title: 0, access: 0, source: 0, theory: 0, methods: 0, conclusion: 0 };
const CRITERIA = [
    { key: 'title',      label: '📰 Title' },
    { key: 'access',     label: '📚 Access' },
    { key: 'source',     label: '🏛️ Source' },
    { key: 'theory',     label: '🔬 Theory' },
    { key: 'methods',    label: '📊 Methods & Data' },
    { key: 'conclusion', label: '📝 Conclusion' }
];

// Session timeout configuration — inactivity-based disconnect
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // Disconnect after 10 minutes of inactivity
const INACTIVITY_WARNING = 5 * 60 * 1000;  // Warn when 5 minutes of inactivity remain
const ABSOLUTE_MAX_DURATION = 50 * 60 * 1000; // Hard cap: disconnect after 50 minutes regardless
const ACTIVITY_RESET_DEBOUNCE = 5000; // Avoid resetting timers too frequently
const ACTIVITY_EVENTS = ['click', 'keydown', 'touchstart', 'scroll', 'mousemove'];
let lastActivityTime = null;
let sessionTimeoutId = null;
let warningTimeoutId = null;
let absoluteTimeoutId = null;
let inactivityWarningShown = false;
let firebaseListeners = []; // Track all Firebase listeners for cleanup

// Seed scores (vetted expert ratings) - weighted as 100 participants each
// Distribution: ~7 papers per quality score (1-7) for balanced assessment
const seedScores = {
    // Score 1 (Predatory/Pseudoscience) - 8 papers
    'STUDY-1': 1,   // Chocolate boosts math scores - predatory journal, tiny sample
    'STUDY-4': 1,   // Herbal tea prevents Alzheimer's - predatory journal, folk medicine
    'STUDY-29': 1,  // Vaccine injury conspiracy - misinterprets data, dangerous
    'STUDY-32': 1,  // 5G causes cancer/autism - physics-defying conspiracy
    'STUDY-34': 1,  // Alkaline foods - pure pseudoscience, no research
    'STUDY-40': 1,  // Chemtrails mind control - pure fabrication
    'STUDY-46': 1,  // Detox tea - fraudulent marketing, no study
    'STUDY-48': 1,  // Magnet arthritis - pseudoscience, product website, testimonials only
    
    // Score 2 (Marketing/Severe Conflicts) - 9 papers
    'STUDY-7': 2,   // AI hiring tool - corporate white paper, biased data
    'STUDY-11': 2,  // Tall men as CEOs - preprint, evolutionary psych overreach
    'STUDY-17': 2,  // Remote work - corporate marketing report, major conflict of interest
    'STUDY-20': 2,  // Bitcoin stabilizes economy - non-peer-reviewed, crypto advocacy
    'STUDY-28': 2,  // Energy drink performance - corporate funded, cherry-picked
    'STUDY-36': 2,  // Probiotic yogurt - company press release, vague claims
    'STUDY-38': 2,  // GMO safety panel - industry bias, cherry-picked literature
    'STUDY-42': 2,  // Testosterone therapy - clinic advertising, profit motive
    'STUDY-44': 2,  // Organic diet - organic trade association, industry-funded, no controls
    
    // Score 3 (Weak but Legitimate Attempt) - 5 papers
    'STUDY-9': 3,   // Violent video games - small sample, not preregistered
    'STUDY-12': 3,  // Lavender insomnia - small trial, weak controls, aromatherapy basis
    'STUDY-15': 3,  // Classical music raises IQ - Mozart effect rehash, tiny effect
    'STUDY-23': 3,  // Peptide cream - company trial, self-assessment, no blinding
    'STUDY-25': 3,  // Crystal water - alternative medicine trial, weak methodology
    
    // Score 4 (Decent but Limited) - 5 papers
    'STUDY-6': 4,   // Instagram anxiety - large survey but correlation not causation
    'STUDY-18': 4,  // Gut bacteria depression - good mouse study, overblown conclusions
    'STUDY-26': 4,  // Alzheimer's drug - high dropout rate, pharma funded
    'STUDY-30': 4,  // Mediterranean diet - good observational study, self-reported
    'STUDY-35': 4,  // Green space mental health - correlation only, income confounders
    
    // Score 5 (Good Methods with Limitations) - 8 papers
    'STUDY-3': 5,   // Screens delay sleep - good theory, large sample, self-reported
    'STUDY-5': 5,   // Pesticide bees - field trial, preregistered, specific claims
    'STUDY-13': 5,  // Urban foxes diet - rigorous methods, respected journal
    'STUDY-14': 5,  // Mars soil crops - rigorous methods, open data, cautious conclusion
    'STUDY-16': 5,  // EV battery cold - solid physics, government research
    'STUDY-21': 5,  // Vertical farms - life-cycle assessment, trade-offs acknowledged
    'STUDY-27': 5,  // Income inequality health - top-tier journal, pre-registered, public data
    'STUDY-45': 5,  // Sitting breaks - randomized crossover, short-term only
    
    // Score 6 (Rigorous, Top Journals) - 9 papers
    'STUDY-2': 6,   // Aircraft alloy - rigorous testing, patent data withheld, cautious conclusion
    'STUDY-8': 6,   // Solar cells - independent replication, top journal, but key data withheld pending patent
    'STUDY-10': 6,  // Microplastics blood - novel method, contamination controls, alarming but careful
    'STUDY-22': 6,  // Smartphone sleep tracking - objective measures, preregistered, top journal
    'STUDY-31': 6,  // Reading to infants - cluster RCT, blinded assessment, open data
    'STUDY-33': 6,  // AI cancer detection - external validation, appropriately cautious
    'STUDY-37': 6,  // Psilocybin therapy - double-blind RCT, standardized protocol, conservative
    'STUDY-41': 6,  // PrEP HIV prevention - prospective cohort, emphasizes adherence
    'STUDY-43': 6,  // CRISPR sickle cell - N=15 single-arm, off-target edits detected, overclaiming title
    
    // Score 7 (Gold Standard) - 4 papers
    'STUDY-19': 7,  // Climate reconstruction - thousands of datasets, rigorous stats, NOAA archived
    'STUDY-24': 7,  // Mindfulness pain - Cochrane systematic review, meta-analysis, gold standard
    'STUDY-39': 7,  // Sea level rise - multi-model ensemble, uncertainty quantified, archived
    'STUDY-47': 7   // Participatory budgeting - mixed methods, preregistered, nuanced conclusions
};
const seedWeight = 100; // Each seed score counts as 100 participants

function extractValidRatings(ratingsData) {
    if (!ratingsData || typeof ratingsData !== 'object') {
        return [];
    }

    return Object.values(ratingsData)
        .map(entry => {
            if (typeof entry === 'number') return entry;
            if (entry && typeof entry === 'object') return entry.rating;
            return null;
        })
        .filter(rating => Number.isFinite(rating) && rating >= 1 && rating <= 7);
}

// Helper function to get performance icon based on percentage
function getPerformanceIcon(percentage) {
    if (percentage >= 90) return '🏆'; // Trophy/Cup
    if (percentage >= 75) return '🥇'; // Gold medal
    if (percentage >= 60) return '🥈'; // Silver medal
    return '🥉'; // Bronze medal
}

// Setup animation for a single logo
function setupLogoAnimation(logoId) {
    const logo = document.getElementById(logoId);
    if (!logo) return;
    
    let isAnimating = false;
    let hoverTimer = null;
    
    // Define drop types
    const dropTypes = ['droplet', 'droplet-star', 'droplet-heart', 'droplet-sparkle', 'droplet-bubble'];
    
    // Trigger animation after 900ms of hover (desktop)
    logo.addEventListener('mouseenter', () => {
        if (isAnimating) return;
        
        hoverTimer = setTimeout(() => {
            startAnimation(logo);
        }, 900);
    });
    
    logo.addEventListener('mouseleave', () => {
        if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
        }
    });
    
    // Trigger animation on click (desktop)
    logo.addEventListener('click', (e) => {
        if (isAnimating) return;
        e.preventDefault();
        if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
        }
        startAnimation(logo);
    });
    
    // Trigger animation immediately on touch/tap (mobile)
    logo.addEventListener('touchstart', (e) => {
        if (isAnimating) return;
        e.preventDefault(); // Prevent double firing with mouse events
        startAnimation(logo);
    }, { passive: false });
    
    // Listen for celebration event (triggered when score >= 90%)
    logo.addEventListener('celebrate', () => {
        startAnimation(logo, 'celebration');
    });
    
    // Periodic shake increase every 8 seconds for 2 seconds (for main logo and navbar logo)
    if (logoId === 'logo-icon' || logoId === 'navbar-logo') {
        setInterval(() => {
            if (!isAnimating) {
                logo.classList.add('shake-intense');
                setTimeout(() => {
                    logo.classList.remove('shake-intense');
                }, 2000);
            }
        }, 8000);
    }
    
    function startAnimation(logoElement, dropType = 'mixed') {
            if (isAnimating && dropType !== 'celebration') return; // Allow celebration to override
            isAnimating = true;
            
            // Define drop types
            const dropTypes = ['droplet', 'droplet-star', 'droplet-heart', 'droplet-sparkle', 'droplet-bubble'];
            
            // Check if this is a celebration animation
            const isCelebration = dropType === 'celebration';
            
            // Add flip animation with accelerated shake to logo
            logoElement.classList.add('flipping');
            
            // Store original src and swap to inverted version when upside down
            const originalSrc = logoElement.src;
            const invertedSrc = originalSrc.replace('unlock-lab-icon.svg', 'unlock-lab-icon-inverted.svg');
            
            // Swap to inverted image when logo is upside down (at 15% of 4s animation = 600ms)
            setTimeout(() => {
                logoElement.src = invertedSrc;
            }, 600);
            
            // Refill step: drops rain from top into logo (starts at 2500ms, before final rotation)
            // Skip refill for celebration animations
            if (!isCelebration) {
                setTimeout(() => {
                const refillRect = logoElement.getBoundingClientRect();
                const targetX = refillRect.left + refillRect.width; // Upper right corner X
                const targetY = refillRect.top; // Upper right corner Y
                
                const refillDropCount = dropType === 'celebration' ? 20 : 12;
                const startTopPosition = 0; // Start from top of viewport
                
                for (let i = 0; i < refillDropCount; i++) {
                    const refillDrop = document.createElement('div');
                    
                    // For celebration refills, use a special class that does not repeat the main animation
                    if (isCelebration) {
                        refillDrop.className = 'droplet droplet-celebration-refill droplet-refill';
                    } else if (dropType === 'mixed') {
                        const randomType = dropTypes[Math.floor(Math.random() * dropTypes.length)];
                        refillDrop.className = `droplet ${randomType} droplet-refill`;
                    } else {
                        refillDrop.className = `droplet ${dropType} droplet-refill`;
                    }
                    
                    // Start from random positions at top of screen, spread horizontally
                    const startX = targetX + (Math.random() - 0.5) * window.innerWidth * 0.4;
                    const jitterTargetX = (Math.random() - 0.5) * 20;
                    const jitterTargetY = (Math.random() - 0.5) * 20;
                    
                    // Calculate distance drop needs to travel from top to logo
                    const travelDistance = targetY - startTopPosition + jitterTargetY;
                    
                    refillDrop.style.left = `${startX}px`;
                    refillDrop.style.top = `${startTopPosition}px`;
                    refillDrop.style.width = `${2 + Math.random() * 0.5}vw`;
                    refillDrop.style.height = `${(2 + Math.random() * 0.5) * 1.2}vw`;
                    refillDrop.style.setProperty('--travel-distance', `${travelDistance}px`);
                    refillDrop.style.animationDelay = `${i * 45}ms`;
                    
                    dropletContainer.appendChild(refillDrop);
                }
                }, 2500);
            } // End of refill section (skipped for celebration)
            
            // Swap back to original after refill completes (at 3800ms, before final rotation)
            // This happens for both regular and celebration animations
            setTimeout(() => {
                logoElement.src = originalSrc;
            }, 3800);
            
            // Create droplet container
            const dropletContainer = document.createElement('div');
            dropletContainer.className = 'droplet-container';
            document.body.appendChild(dropletContainer);
            
            // Get logo position
            const logoRect = logoElement.getBoundingClientRect();
            
            // Adjust drop count and size for celebration
            const dropCount = dropType === 'celebration' ? 15 : 8;
            
            // For celebration, drops fall from top center of screen
            // For regular animations, drops come from logo position
            const upperRightX = isCelebration ? window.innerWidth / 2 : logoRect.left + logoRect.width;
            const upperRightY = isCelebration ? 0 : logoRect.top;
            
            // Create drops boiling out from upper right corner
            for (let i = 0; i < dropCount; i++) {
                const droplet = document.createElement('div');
                
                // Assign drop class based on type
                if (isCelebration) {
                    droplet.className = 'droplet droplet-celebration';
                } else if (dropType === 'mixed') {
                    // Randomly pick a drop type
                    const randomType = dropTypes[Math.floor(Math.random() * dropTypes.length)];
                    droplet.className = `droplet ${randomType}`;
                } else {
                    droplet.className = `droplet ${dropType}`;
                }
                
                // Small random spread around upper right corner
                // For celebration, spread drops across full viewport width
                const jitterX = isCelebration 
                    ? (Math.random() - 0.5) * window.innerWidth * 1.5
                    : (Math.random() - 0.5) * 20;
                const jitterY = (Math.random() - 0.5) * (isCelebration ? 40 : 20);
                // Use viewport-relative sizing for growth
                const size = isCelebration ? 1.5 + Math.random() : 1 + Math.random() * 0.5;
                const delay = i * (isCelebration ? 40 : 50); // Faster stagger for celebration
                
                droplet.style.left = `${upperRightX + jitterX}px`;
                droplet.style.top = `${upperRightY + jitterY}px`;
                droplet.style.width = `${size}vw`;
                droplet.style.height = `${size * 1.2}vw`;
                droplet.style.animationDelay = `${delay}ms`;
                
                dropletContainer.appendChild(droplet);
            }
            
            // After flip (600ms), create drops from bottom left corner
            setTimeout(() => {
                const updatedRect = logoElement.getBoundingClientRect();
                const bottomLeftX = updatedRect.left;
                const bottomLeftY = updatedRect.top + updatedRect.height;
                
                for (let i = 0; i < dropCount; i++) {
                    const droplet = document.createElement('div');
                    
                    // Assign drop class based on type
                    if (isCelebration) {
                        droplet.className = 'droplet droplet-celebration';
                    } else if (dropType === 'mixed') {
                        const randomType = dropTypes[Math.floor(Math.random() * dropTypes.length)];
                        droplet.className = `droplet ${randomType}`;
                    } else {
                        droplet.className = `droplet ${dropType}`;
                    }
                    
                    const jitterX = isCelebration 
                        ? (Math.random() - 0.5) * window.innerWidth * 1.5
                        : (Math.random() - 0.5) * 20;
                    const jitterY = (Math.random() - 0.5) * (isCelebration ? 40 : 20);
                    // Use viewport-relative sizing for growth
                    const size = isCelebration ? 1.5 + Math.random() : 1 + Math.random() * 0.5;
                    
                    droplet.style.left = `${bottomLeftX + jitterX}px`;
                    droplet.style.top = `${bottomLeftY + jitterY}px`;
                    droplet.style.width = `${size}vw`;
                    droplet.style.height = `${size * 1.2}vw`;
                    
                    dropletContainer.appendChild(droplet);
                }
            }, 600);
            
            // Clean up after animation completes
            setTimeout(() => {
                logoElement.classList.remove('flipping');
                dropletContainer.remove();
                if (dropType !== 'celebration') {
                    isAnimating = false;
                } else {
                    // Allow immediate new animation after celebration
                    setTimeout(() => { isAnimating = false; }, 500);
                }
            }, 4000);
        }
}

// Initialize animations for main logos
function initLogoAnimation() {
    const logos = ['logo-icon', 'navbar-logo', 'guide-logo', 'final-logo'];
    logos.forEach(logoId => setupLogoAnimation(logoId));
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize logo animation
    initLogoAnimation();
    
    // Check if viewing results from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const sessionParam = urlParams.get('session');
    
    if (sessionParam) {
        // Hide welcome page immediately to prevent flash
        document.getElementById('page-welcome').classList.remove('active');
        // Load and display results for specified session
        await loadSessionResults(sessionParam);
        return;
    }
    
    // Load saved state first
    const hasState = loadState();
    
    // Generate or restore session ID
    if (!sessionId) {
        sessionId = generateSessionId();
    }

    // Load content and build all pages SYNCHRONOUSLY before any async work.
    // This ensures papers[], glossary, and rubric are ready before the page is
    // shown and before any user interaction can occur.
    await loadContent();
    generatePaperPages();

    // Initialize animations for all paper page logos
    papers.forEach((paper, index) => {
        setupLogoAnimation(`paper-logo-${index}`);
    });

    // Render guide-page content (glossary + rubric)
    renderGlossary();
    renderRubric();

    // Restore previously submitted ratings if resuming
    if (hasState && Object.keys(userRatings).length > 0) {
        restoreSubmittedRatings();
    }

    // Update score display if resuming with existing score
    if (totalScore > 0) {
        const scoreDisplay = document.getElementById('total-score-header');
        if (scoreDisplay) {
            const ratedCount = Object.keys(userRatings).length;
            const percentageScore = ratedCount > 0 ? Math.round(totalScore / ratedCount) : 0;
            const icon = getPerformanceIcon(percentageScore);
            scoreDisplay.innerHTML = `<span class="medal-icon">${icon}</span> ${percentageScore}%`;
            document.getElementById('score-banner').style.display = 'flex';
        }
    }

    // Show the correct page NOW — content is ready, no race condition possible
    const pageToShow = (hasState && currentPage > 0) ? currentPage : 0;
    showPage(pageToShow);

    // === Async work that must not block page display ===

    // Sign in anonymously so all subsequent Firebase writes carry a verified auth token.
    // auth.currentUser persists across page reloads via Firebase's local persistence.
    if (auth.currentUser) {
        firebaseUid = auth.currentUser.uid;
    } else {
        const cred = await signInAnonymously(auth);
        firebaseUid = cred.user.uid;
    }

    // Generate or retrieve username (may require a Firebase round-trip)
    userName = localStorage.getItem('userName');
    if (!userName) {
        userName = await generateUniqueUsername();
        localStorage.setItem('userName', userName);
    }

    // Update username placeholders now that the value is known
    displayUsername();

    // Start session timeout
    startSessionTimeout();

    // Track active participants
    trackParticipant();

    // Update participant count
    updateParticipantCount();
});

// Expose functions to global scope for HTML onclick handlers
window.nextPage = nextPage;
window.previousPage = previousPage;
window.enableSubmit = enableSubmit;
window.submitRating = submitRating;
window.showHelp = showHelp;
window.closeHelp = closeHelp;
window.showTab = showTab;
window.finishEarly = finishEarly;

// Generate unique session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Generate child-friendly username with two-digit number
function generateUsername() {
    const adjectives = [
        'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Teal',
        'Brave', 'Wise', 'Swift', 'Tall', 'Happy', 'Clever', 'Bright', 'Quick',
        'Mighty', 'Gentle', 'Bold', 'Cheerful', 'Curious', 'Friendly', 'Kind', 'Peaceful'
    ];
    
    const animals = [
        'Fox', 'Raccoon', 'Owl', 'Sparrow', 'Robin', 'Falcon', 'Eagle', 'Hawk',
        'Rabbit', 'Squirrel', 'Deer', 'Bear', 'Wolf', 'Otter', 'Badger', 'Hedgehog',
        'Dolphin', 'Seal', 'Penguin', 'Panda', 'Koala', 'Tiger', 'Lion', 'Leopard'
    ];
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    const number = Math.floor(Math.random() * 100).toString().padStart(2, '0'); // 00-99
    
    return `${adjective} ${animal} ${number}`;
}

// Generate a unique username by checking against existing leaderboard usernames
async function generateUniqueUsername() {
    const leaderboardRef = ref(database, 'leaderboard');
    
    try {
        const snapshot = await get(leaderboardRef);
        const existingUsernames = new Set();
        
        if (snapshot.exists()) {
            const leaderboardData = snapshot.val();
            Object.values(leaderboardData).forEach(entry => {
                if (entry.userName) {
                    existingUsernames.add(entry.userName);
                }
            });
        }
        
        // Attempt to generate a unique username (max 500 attempts)
        let attempts = 0;
        let username;
        
        do {
            username = generateUsername();
            attempts++;
            
            // Fallback: if maximum attempts reached, append a counter to ensure uniqueness
            if (attempts >= 500) {
                const baseUsername = generateUsername();
                let counter = 1;
                username = `${baseUsername}-${counter}`;
                while (existingUsernames.has(username)) {
                    counter++;
                    username = `${baseUsername}-${counter}`;
                }
                break;
            }
        } while (existingUsernames.has(username));
        
        return username;
    } catch (error) {
        console.error('Error checking username uniqueness:', error);
        // Fallback to regular generation if Firebase check fails
        return generateUsername();
    }
}

// Save application state to localStorage
function saveState() {
    const state = {
        currentPage,
        userRatings,
        userPredictions,
        paperScores,
        totalScore,
        sessionId,
        hasUsedBackButton,
        celebratedPapers: Array.from(celebratedPapers),
        pageDisplayTimestamps,
        criterionTokens
    };
    localStorage.setItem('workshopState', JSON.stringify(state));
}

// Load application state from localStorage
function loadState() {
    try {
        const saved = localStorage.getItem('workshopState');
        if (saved) {
            const state = JSON.parse(saved);
            currentPage = state.currentPage || 0;
            userRatings = state.userRatings || {};
            userPredictions = state.userPredictions || {};
            paperScores = state.paperScores || {};
            totalScore = state.totalScore || 0;
            sessionId = state.sessionId || null;
            hasUsedBackButton = state.hasUsedBackButton || false;
            celebratedPapers = new Set(state.celebratedPapers || []);
            pageDisplayTimestamps = state.pageDisplayTimestamps || {};
            criterionTokens = state.criterionTokens || { title: 0, access: 0, source: 0, theory: 0, methods: 0, conclusion: 0 };
            return true; // State was loaded
        }
    } catch (error) {
        console.error('Error loading state:', error);
    }
    return false; // No state to load
}

// Restore submitted ratings UI for previously rated papers
function restoreSubmittedRatings() {
    Object.keys(userRatings).forEach(paperId => {
        // Find paper index
        const paperIndex = papers.findIndex(p => p.id === paperId);
        if (paperIndex >= 0) {
            // Hide rating section, show results
            const ratingSection = document.getElementById(`rating-section-${paperIndex}`);
            const resultsBox = document.getElementById(`results-${paperIndex}`);
            if (ratingSection) ratingSection.style.display = 'none';
            if (resultsBox) {
                resultsBox.style.display = 'block';
                
                // Restore the score display if we have it saved
                const savedScore = paperScores[paperId];
                if (savedScore !== undefined) {
                    const scoreElement = document.getElementById(`score-${paperIndex}`);
                    if (scoreElement) {
                        scoreElement.textContent = `${savedScore}%`;
                        scoreElement.style.fontSize = '2rem';
                        scoreElement.style.fontWeight = 'bold';
                    }
                }
                
                // Re-fetch and show results
                const rating = userRatings[paperId];
                const prediction = userPredictions[paperId];
                if (rating && prediction) {
                    showResults(paperIndex, paperId, rating, prediction, true);
                }
            }
        }
    });
}

// Display username only on results page
function displayUsername() {
    // Update navbar username display (will be shown/hidden by showPage)
    const navbarUsername = document.getElementById('navbar-username');
    if (navbarUsername) {
        navbarUsername.textContent = userName;
    }
    
    // Update username in Save Your Results section
    const usernameSaveDisplay = document.getElementById('username-display-save');
    if (usernameSaveDisplay) {
        usernameSaveDisplay.textContent = userName;
    }
    
    // Also update the inline username reference
    const usernameInline = document.getElementById('username-display-inline');
    if (usernameInline) {
        usernameInline.textContent = userName;
    }
}

// Start session timeout to prevent excessive Firebase usage
function startSessionTimeout() {
    lastActivityTime = Date.now();
    resetInactivityTimer();

    // Listen for user activity to reset the inactivity timer
    ACTIVITY_EVENTS.forEach(event => {
        document.addEventListener(event, onUserActivity, { passive: true });
    });

    // Hard cap: end session after 50 minutes regardless of activity
    absoluteTimeoutId = setTimeout(() => {
        endSession();
    }, ABSOLUTE_MAX_DURATION);

    // Update timer display every 30 seconds
    setInterval(updateTimerDisplay, 30000);
    updateTimerDisplay();
}

// Called on any user interaction — resets the inactivity countdown
function onUserActivity() {
    const now = Date.now();
    if (lastActivityTime && (now - lastActivityTime) < ACTIVITY_RESET_DEBOUNCE) {
        return;
    }

    lastActivityTime = now;
    inactivityWarningShown = false;
    resetInactivityTimer();
}

function getRemainingInactivityMs() {
    if (!lastActivityTime) return INACTIVITY_TIMEOUT;
    return INACTIVITY_TIMEOUT - (Date.now() - lastActivityTime);
}

// (Re)start the inactivity disconnect timer
function resetInactivityTimer() {
    if (sessionTimeoutId) clearTimeout(sessionTimeoutId);
    if (warningTimeoutId) clearTimeout(warningTimeoutId);

    // Warn at 5 minutes of inactivity
    warningTimeoutId = setTimeout(() => {
        const remaining = getRemainingInactivityMs();
        if (!inactivityWarningShown && remaining > 0 && remaining <= INACTIVITY_WARNING) {
            inactivityWarningShown = true;
            alert('⏰ 5 minutes until your session disconnects due to inactivity.');
        }
    }, INACTIVITY_TIMEOUT - INACTIVITY_WARNING);

    // Disconnect at 10 minutes of inactivity
    sessionTimeoutId = setTimeout(() => {
        endSession();
    }, INACTIVITY_TIMEOUT);
}

// Update timer display
function updateTimerDisplay() {
    const remaining = getRemainingInactivityMs();
    const minutes = Math.max(0, Math.floor(remaining / 60000));

    // Calculate papers remaining
    const papersRated = Object.keys(userRatings).length;
    const totalPapers = papers.length || 48;
    const papersRemaining = Math.max(0, totalPapers - papersRated);

    const timerEl = document.getElementById('session-timer');
    if (timerEl) {
        if (remaining > 0) {
            timerEl.textContent = `${minutes} min | ${papersRemaining} paper${papersRemaining !== 1 ? 's' : ''} left`;
            timerEl.style.color = remaining <= 5 * 60000 ? '#f56565' : '';
        } else {
            timerEl.textContent = 'Session ending...';
            timerEl.style.color = '#f56565';
        }
    }
}
function endSession() {
    // Stop all Firebase listeners
    firebaseListeners.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
            unsubscribe();
        }
    });
    firebaseListeners = [];
    
    // Remove from active participants
    if (sessionId) {
        const participantRef = ref(database, `active/${sessionId}`);
        set(participantRef, null);
    }
    
    // Clear all timeouts
    if (sessionTimeoutId) clearTimeout(sessionTimeoutId);
    if (warningTimeoutId) clearTimeout(warningTimeoutId);
    if (absoluteTimeoutId) clearTimeout(absoluteTimeoutId);

    // Remove activity listeners
    ACTIVITY_EVENTS.forEach(event => {
        document.removeEventListener(event, onUserActivity);
    });
    
    // Show message and disable interaction
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        color: white;
        text-align: center;
        padding: 20px;
    `;
    
    overlay.innerHTML = `
        <div>
            <h2 style="margin-bottom: 20px; color: white;">⏰ Session Disconnected</h2>
            <p style="margin-bottom: 20px; color: white;">
                Your session ended due to inactivity.<br>
                Thank you for participating!
            </p>
            <button onclick="location.reload()" style="
                background: #667eea;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
            ">Start New Session</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

// Track active participants
function trackParticipant() {
    const participantRef = ref(database, `active/${sessionId}`);
    
    // Mark as active
    set(participantRef, {
        joinedAt: Date.now(),
        lastActive: Date.now(),
        uid: firebaseUid
    });
    
    // Update activity every 30 seconds
    setInterval(() => {
        set(participantRef, {
            joinedAt: Date.now(),
            lastActive: Date.now(),
            uid: firebaseUid
        });
    }, 30000);
    
    // Remove on page unload
    window.addEventListener('beforeunload', () => {
        set(participantRef, null);
    });
}

// Update participant count display
function updateParticipantCount() {
    const counter = document.getElementById('participant-counter');
    
    // Hide counter initially
    if (counter) {
        counter.style.display = 'none';
    }
    
    const activeRef = ref(database, 'active');
    const unsubscribe = onValue(activeRef, (snapshot) => {
        const active = snapshot.val();
        
        if (counter) {
            if (active && Object.keys(active).length > 0) {
                // Count only participants active in the last 60 seconds
                const activeCount = Object.keys(active).filter(key => {
                    const timestamp = active[key].timestamp;
                    return timestamp && (Date.now() - timestamp < 60000);
                }).length;
                
                if (activeCount > 0) {
                    counter.textContent = `${activeCount} participant${activeCount !== 1 ? 's' : ''} active`;
                    counter.style.display = 'inline-block';
                } else {
                    counter.style.display = 'none';
                }
            } else {
                counter.style.display = 'none';
            }
        }
    }, (error) => {
        // Handle Firebase connection errors - hide counter
        console.error('Error updating participant count:', error);
        if (counter) {
            counter.style.display = 'none';
        }
    });
    
    // Track listener for cleanup
    firebaseListeners.push(unsubscribe);
}

// Shuffle papers array using Fisher-Yates algorithm with seeded randomization
function shufflePapers() {
    // Safety check
    if (!papers || !papers.length || !sessionId) {
        console.warn('Cannot shuffle papers: papers or sessionId not initialized');
        return;
    }
    
    // Use session ID as seed for consistent randomization per participant
    let seed = 0;
    for (let i = 0; i < sessionId.length; i++) {
        seed = ((seed << 5) - seed) + sessionId.charCodeAt(i);
        seed = seed & seed; // Convert to 32-bit integer
    }
    
    // Seeded random number generator
    function seededRandom() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    }
    
    // Fisher-Yates shuffle with seeded random
    for (let i = papers.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom() * (i + 1));
        [papers[i], papers[j]] = [papers[j], papers[i]];
    }
}

// Load content from bundled JSON imports
async function loadContent(shouldShuffle = true) {
    try {
        glossary = glossaryData;
        rubric = rubricData;
        papers = [...papersData]; // spread to avoid mutating the import
        
        // Shuffle papers for this participant (consistent across page reloads)
        // Skip shuffling if loading session results (no sessionId yet)
        if (shouldShuffle && sessionId) {
            shufflePapers();
        }
        
        // Update total papers count on final page (will be updated when results load)
        const totalPapersElement = document.getElementById('total-papers');
        if (totalPapersElement) {
            totalPapersElement.textContent = Object.keys(userRatings).length || 0;
        }
    } catch (error) {
        console.error('Error loading content:', error);
        alert(`Error loading workshop content: ${error.message}\n\nPlease try:\n1. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)\n2. Clear browser cache\n3. Contact support if issue persists`);
    }
}

// Render glossary
function renderGlossary() {
    console.log('renderGlossary called');
    const glossaryContent = document.getElementById('glossary-content');
    const modalGlossary = document.getElementById('modal-glossary');
    
    console.log('Glossary content element:', glossaryContent);
    console.log('Modal glossary element:', modalGlossary);
    console.log('Glossary data:', glossary);
    
    if (!glossary || glossary.length === 0) {
        console.error('Glossary data not loaded or empty', glossary);
        const errorHTML = '<p style="color: red;">Error: Glossary data failed to load. Please refresh the page.</p>';
        if (glossaryContent) glossaryContent.innerHTML = errorHTML;
        if (modalGlossary) modalGlossary.innerHTML = errorHTML;
        return;
    }
    
    const glossaryHTML = glossary.map(item => `
        <div class="glossary-item">
            <div class="glossary-term">${item.term}</div>
            <div class="glossary-definition">${item.definition}</div>
        </div>
    `).join('');
    
    console.log('Generated glossary HTML length:', glossaryHTML.length);
    console.log('Generated glossary HTML (first 200 chars):', glossaryHTML.substring(0, 200));
    
    if (glossaryContent) {
        glossaryContent.innerHTML = glossaryHTML;
        console.log('Glossary content updated. Element now contains:', glossaryContent.innerHTML.substring(0, 200));
    } else {
        console.error('glossary-content element not found in DOM');
    }
    
    if (modalGlossary) {
        modalGlossary.innerHTML = glossaryHTML;
        console.log('Modal glossary updated');
    } else {
        console.warn('modal-glossary element not found in DOM (this is OK if modal not on current page)');
    }
}

// Render rubric
function renderRubric() {
    console.log('renderRubric called');
    const rubricContent = document.getElementById('rubric-content');
    const modalRubric = document.getElementById('modal-rubric');
    
    console.log('Rubric content element:', rubricContent);
    console.log('Modal rubric element:', modalRubric);
    console.log('Rubric data:', rubric);
    
    if (!rubric || rubric.length === 0) {
        console.error('Rubric data not loaded or empty', rubric);
        const errorHTML = '<p style="color: red;">Error: Rubric data failed to load. Please refresh the page.</p>';
        if (rubricContent) rubricContent.innerHTML = errorHTML;
        if (modalRubric) modalRubric.innerHTML = errorHTML;
        return;
    }
    
    // Helper function to bold text up to and including the first colon
    const boldUpToColon = (text) => {
        const colonIndex = text.indexOf(':');
        if (colonIndex === -1) return text; // No colon found, return as is
        const beforeColon = text.substring(0, colonIndex + 1); // Include the colon
        const afterColon = text.substring(colonIndex + 1);
        return `<strong>${beforeColon}</strong>${afterColon}`;
    };
    
    const rubricHTML = `
        <div class="info-box" style="margin-bottom: 1rem; background: #f3e5f5; border-left: 4px solid #9c27b0;">
            <p style="margin: 0;"><strong>💡 Scoring Strategy:</strong> You can freely weigh some criteria more strongly than others when forming your overall rating.</p>
        </div>
        <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
            <table class="rubric-table">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Low (1-2)</th>
                        <th>Medium (3-5)</th>
                        <th>High (6-7)</th>
                    </tr>
                </thead>
                <tbody>
                    ${rubric.map(category => `
                        <tr>
                            <td><strong>${category.name}</strong></td>
                            <td>${boldUpToColon(category.low)}</td>
                            <td>${boldUpToColon(category.medium)}</td>
                            <td>${boldUpToColon(category.high)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    console.log('Generated rubric HTML length:', rubricHTML.length);
    console.log('Generated rubric HTML (first 200 chars):', rubricHTML.substring(0, 200));
    
    if (rubricContent) {
        rubricContent.innerHTML = rubricHTML;
        console.log('Rubric content updated. Element now contains:', rubricContent.innerHTML.substring(0, 200));
    } else {
        console.error('rubric-content element not found in DOM');
    }
    
    if (modalRubric) {
        modalRubric.innerHTML = rubricHTML;
        console.log('Modal rubric updated');
    } else {
        console.warn('modal-rubric element not found in DOM (this is OK if modal not on current page)');
    }
}

// Generate paper pages dynamically
function generatePaperPages() {
    const paperPagesContainer = document.getElementById('paper-pages');
    
    // Fixed feature order for all participants: Title, Access, Source, Theory, Methods & Data, Conclusion
    const fixedFeatureOrder = ['title', 'access', 'source', 'overview', 'methods', 'conclusion'];
    const fixedFeatureLabels = ['📰 Title', '📚 Access', '🏛️ Source', '🔬 Study Overview', '📊 Methods & Data', '📝 Conclusion'];
    
    papers.forEach((paper, index) => {
        // Generate paper sections in fixed order
        // Filter out 'title' feature since it is already displayed in the header
        const paperSectionsHTML = fixedFeatureOrder
            .map((feature, originalPosition) => {
                // Skip title feature since it is already displayed in the header
                if (feature === 'title') return '';
                
                const label = fixedFeatureLabels[originalPosition];
                const content = (paper[feature] || '').replace('Data availability:', '<strong>Data availability:</strong>');
                return `
                        <div class="paper-section">
                            <h3>${label}</h3>
                            <p>${content}</p>
                        </div>`;
            })
            .filter(html => html !== '') // Remove empty strings
            .join('');
        
        const pageHTML = `
            <div class="page" id="page-paper-${index}">
                <div class="container">
                    <button class="back-to-previous-btn" onclick="goBackToPreviousStudy()" style="${hasUsedBackButton || index === 0 ? 'display: none;' : ''}" title="Go back to previous study (one-time use)">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                        <span>Back to Previous Study</span>
                    </button>
                    <div class="paper-card">
                        <div class="paper-header">
                            <h1 class="paper-title">${paper.title}</h1>
                        </div>
                        ${paperSectionsHTML}
                    </div>
                    
                    <div class="rating-section" id="rating-section-${index}">
                        <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #ff9800;">
                            <h3 style="margin: 0 0 10px 0; color: #f57c00;">1️⃣ Predict the Crowd</h3>
                            <p style="font-size: 0.95rem; color: #444; margin: 0;">Guess: What will the AVERAGE rating be from all workshop participants? How do you think others will judge the overall quality of this study?</p>
                        </div>
                        <div class="rating-scale">
                            ${[1, 2, 3, 4, 5, 6, 7].map(value => `
                                <div class="rating-option">
                                    <input type="radio" id="prediction-${index}-${value}" 
                                           name="prediction-${index}" value="${value}"
                                           onchange="enableSubmit(${index})">
                                    <label for="prediction-${index}-${value}">${value}</label>
                                </div>
                            `).join('')}
                        </div>
                        <div class="rating-labels">
                            <span>Low Average</span>
                            <span>High Average</span>
                        </div>
                        
                        <div style="background: #f0f4ff; padding: 15px; border-radius: 8px; margin: 30px 0 15px 0; border-left: 4px solid #667eea;">
                            <h3 style="margin: 0 0 10px 0; color: #667eea;">2️⃣ Your Scientific Assessment</h3>
                            <p style="font-size: 0.95rem; color: #444; margin: 0;">Review all six rubric criteria. Then assign your overall quality rating:</p>
                        </div>
                        <div class="rating-scale">
                            ${[1, 2, 3, 4, 5, 6, 7].map(value => `
                                <div class="rating-option">
                                    <input type="radio" id="rating-${index}-${value}" 
                                           name="rating-${index}" value="${value}"
                                           onchange="enableSubmit(${index})">
                                    <label for="rating-${index}-${value}">${value}</label>
                                </div>
                            `).join('')}
                        </div>
                        <div class="rating-labels">
                            <span>Poor Quality</span>
                            <span>Excellent Quality</span>
                        </div>
                        
                        <button class="submit-rating" id="submit-${index}" 
                                onclick="submitRating(${index}, '${paper.id}')" disabled>
                            Submit Both Ratings
                        </button>
                    </div>
                    
                    <div class="results-box" id="results-${index}" style="display: none;">
                        <h3>✅ Rating Submitted!</h3>
                        <div class="score-earned">
                            <div class="score-value" id="score-${index}"></div>
                            <div class="score-message" id="score-msg-${index}"></div>
                        </div>
                        <div class="rating-comparison">
                            <div class="rating-scale-grid">
                                <div class="scale-label">Average Rating</div>
                                <div class="scale-row" id="avg-rating-scale-${index}">
                                    ${[1, 2, 3, 4, 5, 6, 7].map(val => `<div class="scale-cell" data-value="${val}"></div>`).join('')}
                                </div>
                            </div>
                            <div class="rating-scale-grid">
                                <div class="scale-label">Your Rating</div>
                                <div class="scale-row" id="your-rating-scale-${index}">
                                    ${[1, 2, 3, 4, 5, 6, 7].map(val => `<div class="scale-cell" data-value="${val}"></div>`).join('')}
                                </div>
                            </div>
                        </div>
                        <div class="participant-count" id="count-${index}">
                            Calculating...
                        </div>
                        <div class="navigation-buttons" style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1.5rem;">
                            <button class="btn-primary" onclick="nextPage()">
                                ${index < papers.length - 1 ? 'Next Paper' : 'View Results'}
                            </button>
                            <button class="btn-finish" id="finish-btn-${index}" onclick="finishEarly()" style="display: none;">
                                Finish & View Results
                            </button>
                        </div>
                    </div>
                    
                    <div class="page-logo-footer">
                        <img id="paper-logo-${index}" src="unlock-lab-icon.svg" alt="Logo" class="page-logo">
                    </div>
                </div>
            </div>
        `;
        
        paperPagesContainer.innerHTML += pageHTML;
    });
}

// Page navigation
function showPage(pageIndex) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    // Determine which page to show
    let targetPage;
    const paperNumberElement = document.getElementById('navbar-paper-number');
    const navbarUsername = document.getElementById('navbar-username');
    
    if (pageIndex === 0) {
        targetPage = document.getElementById('page-welcome');
        if (paperNumberElement) paperNumberElement.style.display = 'none';
        if (navbarUsername) navbarUsername.style.display = 'none';
        // Hide help button on welcome page
        document.getElementById('help-button').classList.remove('visible');
    } else if (pageIndex === 1) {
        targetPage = document.getElementById('page-guide');
        if (paperNumberElement) paperNumberElement.style.display = 'none';
        if (navbarUsername) navbarUsername.style.display = 'none';
        // Hide help button on guide page
        document.getElementById('help-button').classList.remove('visible');
        // Always ensure glossary/rubric content is rendered when this page is shown
        if (glossary && glossary.length > 0) renderGlossary();
        if (rubric && rubric.length > 0) renderRubric();
    } else if (pageIndex <= papers.length + 1) {
        const paperIndex = pageIndex - 2;
        targetPage = document.getElementById(`page-paper-${paperIndex}`);
        // Show help button on paper pages
        document.getElementById('help-button').classList.add('visible');
        // Record timestamp when paper page is displayed (for response time tracking)
        const paperId = papers[paperIndex].id;
        pageDisplayTimestamps[paperId] = Date.now();
        // Update paper count in navbar (show number of papers rated)
        if (paperNumberElement) {
            const ratedCount = Object.keys(userRatings).length;
            paperNumberElement.textContent = `${ratedCount}`;
            paperNumberElement.style.display = 'inline';
        }
        // Hide username on paper pages
        if (navbarUsername) navbarUsername.style.display = 'none';
        // Only show score banner if there's a score > 0
        const ratedCount = Object.keys(userRatings).length;
        const percentageScore = ratedCount > 0 ? Math.round(totalScore / ratedCount) : 0;
        if (percentageScore > 0) {
            document.getElementById('score-banner').style.display = 'flex';
        }
    } else if (pageIndex === papers.length + 2) {
        targetPage = document.getElementById('page-ranking');
        document.getElementById('help-button').classList.remove('visible');
        if (paperNumberElement) paperNumberElement.style.display = 'none';
        if (navbarUsername) navbarUsername.style.display = 'none';
        // Initialise token allocator on first visit
        const grid = document.getElementById('criteria-token-grid');
        if (grid && !grid.hasChildNodes()) {
            initTokenAllocator();
        } else {
            updateTokenUI();
        }
    } else {
        targetPage = document.getElementById('page-final');
        // Hide help button on final page
        document.getElementById('help-button').classList.remove('visible');
        // Hide paper number on final page
        if (paperNumberElement) {
            paperNumberElement.style.display = 'none';
        }
        // Show username on final page
        if (navbarUsername) navbarUsername.style.display = 'inline';
        // Show final score and leaderboard
        showFinalResults();
    }
    
    if (targetPage) {
        targetPage.classList.add('active');
        window.scrollTo(0, 0);
    } else {
        console.error('Target page not found for pageIndex:', pageIndex);
    }
    
    currentPage = pageIndex;
    saveState();
}

function nextPage() {
    const totalPages = papers.length + 4; // welcome + guide + papers + ranking + final
    if (currentPage < totalPages - 1) {
        showPage(currentPage + 1);
    }
}

function previousPage() {
    if (currentPage > 0) {
        showPage(currentPage - 1);
    }
}

// Finish early
function finishEarly() {
    const totalRated = Object.keys(userRatings).length;
    if (totalRated < 1) {
        alert('Please rate at least one study before finishing.');
        return;
    }
    
    // Navigate to criterion ranking page before final results
    const rankingPageIndex = papers.length + 2;
    showPage(rankingPageIndex);
}

// ===== Token Allocator =====

function initTokenAllocator() {
    criterionTokens = { title: 0, access: 0, source: 0, theory: 0, methods: 0, conclusion: 0 };
    const grid = document.getElementById('criteria-token-grid');
    if (!grid) return;
    grid.innerHTML = CRITERIA.map(c => `
        <div class="criterion-token-row">
            <div class="criterion-token-label">
                <span>${c.label}</span>
                <span class="token-count-badge" id="token-count-${c.key}">0</span>
            </div>
            <div class="token-boxes" id="token-boxes-${c.key}">
                ${Array.from({ length: 20 }, (_, i) =>
                    `<div class="token-box" data-criterion="${c.key}" data-index="${i + 1}"
                        onclick="handleTokenClick('${c.key}', ${i + 1})"></div>`
                ).join('')}
            </div>
        </div>
    `).join('');
    updateTokenUI();

    // Hover: highlight all preceding (unfilled) boxes to preview click outcome
    grid.querySelectorAll('.token-box').forEach(box => {
        box.addEventListener('mouseenter', () => {
            if (box.classList.contains('disabled')) return;
            const criterion = box.dataset.criterion;
            const boxIndex = parseInt(box.dataset.index);
            document.querySelectorAll(`#token-boxes-${criterion} .token-box`).forEach((b, i) => {
                b.classList.toggle('hover-fill', i + 1 < boxIndex);
            });
        });
        box.addEventListener('mouseleave', () => {
            const criterion = box.dataset.criterion;
            document.querySelectorAll(`#token-boxes-${criterion} .token-box`).forEach(b => b.classList.remove('hover-fill'));
        });
    });
}

window.handleTokenClick = function(criterion, boxIndex) {
    const currentVal = criterionTokens[criterion];
    const totalUsed = Object.values(criterionTokens).reduce((a, b) => a + b, 0);
    const othersTotal = totalUsed - currentVal;
    const maxForThis = 20 - othersTotal;

    if (boxIndex > maxForThis) return; // Cannot exceed total budget

    // Tap same position as current → toggle to 0 (clear criterion)
    if (boxIndex === currentVal) {
        criterionTokens[criterion] = 0;
    } else {
        criterionTokens[criterion] = boxIndex;
    }
    updateTokenUI();
};

function updateTokenUI() {
    const totalUsed = Object.values(criterionTokens).reduce((a, b) => a + b, 0);

    CRITERIA.forEach(c => {
        const val = criterionTokens[c.key];
        const othersTotal = totalUsed - val;
        const maxForThis = 20 - othersTotal;

        const badge = document.getElementById(`token-count-${c.key}`);
        if (badge) {
            badge.textContent = val;
            badge.classList.toggle('complete', val > 0);
        }

        const boxes = document.querySelectorAll(`[data-criterion="${c.key}"]`);
        boxes.forEach((box, i) => {
            const boxNum = i + 1;
            box.classList.toggle('filled', boxNum <= val);
            box.classList.toggle('disabled', boxNum > maxForThis);
        });
    });

    const usedDisplay = document.getElementById('tokens-used-display');
    if (usedDisplay) usedDisplay.textContent = totalUsed;

    const progressFill = document.getElementById('token-progress-fill');
    if (progressFill) progressFill.style.width = `${(totalUsed / 20) * 100}%`;

    const submitBtn = document.getElementById('submit-ranking-btn');
    if (submitBtn) {
        const allUsed = totalUsed === 20;
        submitBtn.disabled = !allUsed;
        submitBtn.style.opacity = allUsed ? '1' : '0.5';
        submitBtn.textContent = allUsed
            ? 'Submit & View My Results →'
            : `Allocate all 20 tokens to continue (${20 - totalUsed} remaining)`;
    }
}

window.submitRanking = async function() {
    const totalUsed = Object.values(criterionTokens).reduce((a, b) => a + b, 0);
    if (totalUsed !== 20) return;

    try {
        const rankingRef = ref(database, `rankings/${sessionId}`);
        await set(rankingRef, {
            ...criterionTokens,
            userName: userName,
            timestamp: Date.now(),
            uid: firebaseUid
        });
    } catch (error) {
        console.error('Error saving criterion ranking:', error);
        // Non-blocking – proceed to results even if save fails
    }

    // Navigate to final results page
    showPage(papers.length + 3);
};

// Go back to previous study (one-time use only)
function goBackToPreviousStudy() {
    if (hasUsedBackButton) {
        return; // Already used their one back action
    }
    
    if (currentPage > 2) { // Can only go back if on a paper page (page 2 is first paper)
        hasUsedBackButton = true;
        saveState();
        
        // Hide all back buttons
        const backButtons = document.querySelectorAll('.back-to-previous-btn');
        backButtons.forEach(btn => {
            btn.style.display = 'none';
        });
        
        showPage(currentPage - 1);
    }
}

window.goBackToPreviousStudy = goBackToPreviousStudy;

// Enable submit button when both rating and prediction are selected
function enableSubmit(paperIndex) {
    const hasRating = document.querySelector(`input[name="rating-${paperIndex}"]:checked`);
    const hasPrediction = document.querySelector(`input[name="prediction-${paperIndex}"]:checked`);
    const submitBtn = document.getElementById(`submit-${paperIndex}`);
    submitBtn.disabled = !(hasRating && hasPrediction);
}

// Submit rating to Firebase
async function submitRating(paperIndex, paperId) {
    const selectedRating = document.querySelector(`input[name="rating-${paperIndex}"]:checked`);
    const selectedPrediction = document.querySelector(`input[name="prediction-${paperIndex}"]:checked`);
    
    if (!selectedRating || !selectedPrediction) {
        alert('Please provide both your rating and your prediction before submitting.');
        return;
    }
    
    const rating = parseInt(selectedRating.value);
    const prediction = parseInt(selectedPrediction.value);
    
    try {
        // Disable submit button and show loading
        const submitBtn = document.getElementById(`submit-${paperIndex}`);
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        
        // First, get current average WITHOUT user's rating to calculate fair prediction score
        const ratingsRef = ref(database, `ratings/${paperId}`);
        const snapshot = await get(ratingsRef);
        const currentRatings = snapshot.val();
        
        let averageWithoutUser = 4; // Default if no ratings yet
        if (currentRatings) {
            const ratingValues = extractValidRatings(currentRatings);
            const seedScore = seedScores[paperId] || 4;
            const totalRatings = ratingValues.reduce((a, b) => a + b, 0) + (seedScore * seedWeight);
            const totalCount = ratingValues.length + seedWeight;
            averageWithoutUser = totalRatings / totalCount;
        } else {
            // No ratings yet, use seed score
            const seedScore = seedScores[paperId] || 4;
            averageWithoutUser = seedScore;
        }
        
        // Store locally
        userRatings[paperId] = rating;
        userPredictions[paperId] = prediction;
        
        // Save state
        saveState();
        
        // Hide rating section
        document.getElementById(`rating-section-${paperIndex}`).style.display = 'none';
        
        // Show results with pre-calculated average (for fair scoring)
        showResults(paperIndex, paperId, rating, prediction, false, averageWithoutUser);
        
        // Calculate response time (time from page display to submission)
        const responseTime = pageDisplayTimestamps[paperId] 
            ? Date.now() - pageDisplayTimestamps[paperId]
            : null; // null if timestamp was not recorded (should not occur)
        
        // Ensure anonymous auth is ready before writing (auth may still be resolving on page load)
        if (!firebaseUid) {
            if (auth.currentUser) {
                firebaseUid = auth.currentUser.uid;
            } else {
                const cred = await signInAnonymously(auth);
                firebaseUid = cred.user.uid;
            }
        }

        // NOW save rating to Firebase (after calculating prediction score)
        const userRatingRef = ref(database, `ratings/${paperId}/${sessionId}`);
        await set(userRatingRef, {
            rating: rating,
            prediction: prediction,
            responseTime: responseTime, // Time in milliseconds from page display to submission
            timestamp: Date.now(),
            uid: firebaseUid
        });
        
    } catch (error) {
        console.error('Error submitting rating:', error);
        console.error('Error details:', error.code, error.message);
        alert(`Error submitting rating: ${error.message}\n\nPlease check the browser console for details.`);
        
        // Re-enable submit button
        const submitBtn = document.getElementById(`submit-${paperIndex}`);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Both Ratings';
    }
}

// Show results with real-time average
async function showResults(paperIndex, paperId, userRating, userPrediction, isRestoring = false, preCalculatedAverage = null) {
    const resultsBox = document.getElementById(`results-${paperIndex}`);
    resultsBox.style.display = 'block';
    
    // If we have a pre-calculated average (from first submission), use it for scoring immediately
    if (preCalculatedAverage !== null) {
        const scoreElement = document.getElementById(`score-${paperIndex}`);
        if (!scoreElement.textContent) {
            const difference = Math.abs(userPrediction - preCalculatedAverage);
            const score = Math.max(0, 100 - Math.round(difference * 12));
                paperScores[paperId] = score; // Store individual score for this paper
            // Display score with detailed feedback
            scoreElement.textContent = `${score}%`;
            scoreElement.style.fontSize = '2rem';
            scoreElement.style.fontWeight = 'bold';
            // Color is white (from CSS) for best contrast against orange/yellow gradient background
            
            const msgElement = document.getElementById(`score-msg-${paperIndex}`);
            msgElement.innerHTML = 
                difference === 0 ? `<strong>🎯 Perfect prediction!</strong><br>You nailed it: ${userPrediction} = ${preCalculatedAverage.toFixed(1)}` :
                difference <= 0.5 ? `<strong>⭐ Outstanding!</strong><br>Predicted ${userPrediction}, actual ${preCalculatedAverage.toFixed(1)} — spot on!` :
                difference <= 1 ? `<strong>🎪 Excellent work!</strong><br>Predicted ${userPrediction}, actual ${preCalculatedAverage.toFixed(1)} — very close!` :
                difference <= 1.5 ? `<strong>👍 Great prediction!</strong><br>Predicted ${userPrediction}, actual ${preCalculatedAverage.toFixed(1)} — well done!` :
                difference <= 2.5 ? `<strong>👌 Good attempt!</strong><br>Predicted ${userPrediction}, actual ${preCalculatedAverage.toFixed(1)} — getting there!` :
                `<strong>💪 Keep learning!</strong><br>Predicted ${userPrediction}, actual ${preCalculatedAverage.toFixed(1)} — science perception is tricky!`;
            msgElement.style.fontSize = '0.95rem';
            msgElement.style.lineHeight = '1.5';
            
            // Trigger celebration animation if score >= 90% and not already celebrated for this paper
            if (score >= 90 && !celebratedPapers.has(paperId)) {
                celebratedPapers.add(paperId);
                
                // Find the paper page logo for this specific paper
                const paperLogo = document.getElementById(`paper-logo-${paperIndex}`);
                if (paperLogo) {
                    // Delay briefly to let score display first
                    setTimeout(() => {
                        paperLogo.dispatchEvent(new CustomEvent('celebrate'));
                    }, 500);
                }
            }
            
            // Update total score display with animation
            const scoreDisplay = document.getElementById('total-score-header');
            const scoreBanner = document.getElementById('score-banner');
            if (scoreDisplay) {
                const ratedCount = Object.keys(userRatings).length;
                const percentageScore = ratedCount > 0 ? Math.round(totalScore / ratedCount) : 0;
                if (percentageScore > 0) {
                    const icon = getPerformanceIcon(percentageScore);
                    scoreDisplay.innerHTML = `<span class="medal-icon">${icon}</span> ${percentageScore}%`;
                    scoreDisplay.style.animation = 'scoreUpdate 0.5s ease';
                    setTimeout(() => scoreDisplay.style.animation = '', 500);
                    if (scoreBanner) scoreBanner.style.display = 'flex';
                } else {
                    if (scoreBanner) scoreBanner.style.display = 'none';
                }
            }
            
            // Update timer to reflect papers remaining
            updateTimerDisplay();
            
            // Save state after score update
            saveState();
            
            // Show Finish Early button after any rating (if not on the last paper)
            const totalRated = Object.keys(userRatings).length;
            if (totalRated >= 1 && paperIndex < papers.length - 1) {
                const finishBtn = document.getElementById(`finish-btn-${paperIndex}`);
                if (finishBtn) {
                    finishBtn.style.display = 'block';
                }
            }

            // Special celebration at exactly 12 ratings milestone
            if (totalRated === 12) {
                const paperLogo = document.getElementById(`paper-logo-${paperIndex}`);
                if (paperLogo) {
                    setTimeout(() => {
                        paperLogo.dispatchEvent(new CustomEvent('celebrate'));
                    }, 800);
                }
                setTimeout(() => {
                    alert('🎉 You\'ve rated 12 studies! Feel free to keep going or finish early whenever you\'re ready.');
                }, 1200);
            }
        }
    }
    
    // Listen for real-time updates to display current average
    const ratingsRef = ref(database, `ratings/${paperId}`);
    const unsubscribe = onValue(ratingsRef, (snapshot) => {
        const ratings = snapshot.val();
        
        if (ratings) {
            const ratingValues = extractValidRatings(ratings);
            
            // Include seed score in average calculation (weighted as 100 participants)
            const seedScore = seedScores[paperId] || 4;
            const totalRatings = ratingValues.reduce((a, b) => a + b, 0) + (seedScore * seedWeight);
            const totalCount = ratingValues.length + seedWeight;
            const average = totalRatings / totalCount;
            const participantCount = ratingValues.length; // Actual human participants only
            
            // Update display with ordinal color scale
            const avgRounded = Math.round(average);
            const yourRatingScale = document.getElementById(`your-rating-scale-${paperIndex}`);
            const avgRatingScale = document.getElementById(`avg-rating-scale-${paperIndex}`);
            
            if (yourRatingScale && avgRatingScale) {
                // Clear all cells first - set default grey appearance
                yourRatingScale.querySelectorAll('.scale-cell').forEach(cell => {
                    cell.textContent = '';
                    cell.className = 'scale-cell';
                });
                avgRatingScale.querySelectorAll('.scale-cell').forEach(cell => {
                    cell.textContent = '';
                    cell.className = 'scale-cell';
                });
                
                // Highlight user rating only
                const yourCell = yourRatingScale.querySelector(`[data-value="${userRating}"]`);
                if (yourCell) {
                    yourCell.textContent = userRating;
                    yourCell.className = `scale-cell active rating-${userRating}`;
                }
                
                // Highlight average rating only
                const avgCell = avgRatingScale.querySelector(`[data-value="${avgRounded}"]`);
                if (avgCell) {
                    avgCell.textContent = average.toFixed(1);
                    avgCell.className = `scale-cell active rating-${avgRounded}`;
                }
            }
            
            document.getElementById(`count-${paperIndex}`).textContent = 
                `Based on ${participantCount} participant${participantCount !== 1 ? 's' : ''}`;
            
            // Calculate score based on prediction accuracy
            // Skip recalculation if already calculated (score element has content) or if restoring from saved state
            const scoreElement = document.getElementById(`score-${paperIndex}`);
            if (!scoreElement.textContent && !isRestoring) {
                const difference = Math.abs(userPrediction - average);
                // Improved scoring: 100 pts for perfect, loses 12 pts per point of error (gentler penalty)
                const score = Math.max(0, 100 - Math.round(difference * 12));
                paperScores[paperId] = score; // Store individual score for this paper
                totalScore += score;
                
                // Display score with detailed feedback
                scoreElement.textContent = `${score}%`;
                scoreElement.style.fontSize = '2rem';
                scoreElement.style.fontWeight = 'bold';
                scoreElement.style.color = score >= 88 ? '#10b981' : score >= 76 ? '#3b82f6' : score >= 64 ? '#f59e0b' : '#ef4444';
                
                const msgElement = document.getElementById(`score-msg-${paperIndex}`);
                msgElement.innerHTML = 
                    difference === 0 ? `<strong>🎯 Perfect prediction!</strong><br>You nailed it: ${userPrediction} = ${average.toFixed(1)}` :
                    difference <= 0.5 ? `<strong>⭐ Outstanding!</strong><br>Predicted ${userPrediction}, actual ${average.toFixed(1)} — spot on!` :
                    difference <= 1 ? `<strong>🎪 Excellent work!</strong><br>Predicted ${userPrediction}, actual ${average.toFixed(1)} — very close!` :
                    difference <= 1.5 ? `<strong>👍 Great prediction!</strong><br>Predicted ${userPrediction}, actual ${average.toFixed(1)} — well done!` :
                    difference <= 2.5 ? `<strong>👌 Good attempt!</strong><br>Predicted ${userPrediction}, actual ${average.toFixed(1)} — getting there!` :
                    `<strong>💪 Keep learning!</strong><br>Predicted ${userPrediction}, actual ${average.toFixed(1)} — science perception is tricky!`;
                msgElement.style.fontSize = '0.95rem';
                msgElement.style.lineHeight = '1.5';
                
                // Update total score display with animation
                const scoreDisplay = document.getElementById('total-score-header');
                const scoreBanner = document.getElementById('score-banner');
                if (scoreDisplay) {
                    const ratedCount = Object.keys(userRatings).length;
                    const percentageScore = ratedCount > 0 ? Math.round(totalScore / ratedCount) : 0;
                    if (percentageScore > 0) {
                        const icon = getPerformanceIcon(percentageScore);
                        scoreDisplay.innerHTML = `<span class="medal-icon">${icon}</span> ${percentageScore}%`;
                        scoreDisplay.style.animation = 'scoreUpdate 0.5s ease';
                        setTimeout(() => scoreDisplay.style.animation = '', 500);
                        if (scoreBanner) scoreBanner.style.display = 'flex';
                    } else {
                        if (scoreBanner) scoreBanner.style.display = 'none';
                    }
                }
                
                // Update timer to reflect papers remaining
                updateTimerDisplay();
                
                // Save state after score update
                saveState();
                
                // Progressively update leaderboard so all raters appear, not just those who reach the results page
                if (firebaseUid && sessionId && userName) {
                    const ratedCount = Object.keys(userRatings).length;
                    const partialRef = ref(database, `leaderboard/${sessionId}`);
                    set(partialRef, {
                        score: totalScore,
                        timestamp: Date.now(),
                        papersRated: ratedCount,
                        userName: userName,
                        uid: firebaseUid
                    }).catch(err => console.warn('[Leaderboard] Progressive update failed:', err));
                }
                
                // Show Finish Early button after any rating (if not on the last paper)
                const totalRated = Object.keys(userRatings).length;
                if (totalRated >= 1 && paperIndex < papers.length - 1) {
                    const finishBtn = document.getElementById(`finish-btn-${paperIndex}`);
                    if (finishBtn) {
                        finishBtn.style.display = 'block';
                    }
                }
            }
        }
    });
    
    // Track listener for cleanup
    firebaseListeners.push(unsubscribe);
}

// Help modal functions
function showHelp() {
    document.getElementById('help-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeHelp() {
    document.getElementById('help-modal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function showTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (tabName === 'glossary') {
        document.getElementById('modal-glossary').classList.add('active');
    } else {
        document.getElementById('modal-rubric').classList.add('active');
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('help-modal');
    if (event.target === modal) {
        closeHelp();
    }
}

// Close modal with ESC key
window.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('help-modal');
        if (modal && modal.classList.contains('active')) {
            closeHelp();
        }
    }
});

// Show final results and leaderboard
// Render criterion importance bars into a container element
function renderCriterionImportanceBars(tokens, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const total = CRITERIA.reduce((sum, c) => sum + (tokens[c.key] || 0), 0);
    if (total === 0) {
        container.innerHTML = '<p style="text-align: center; color: #9ca3af; margin: 0;">No weighting data available.</p>';
        return;
    }
    container.innerHTML = CRITERIA.map(c => {
        const val = tokens[c.key] || 0;
        const pct = Math.round((val / total) * 100);
        return `
            <div style="margin-bottom: 0.9rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                    <span style="font-weight: 600; font-size: 0.9rem;">${c.label}</span>
                    <span style="font-weight: 700; color: #d97706; font-size: 0.9rem;">${pct}%</span>
                </div>
                <div style="background: #e5e7eb; border-radius: 4px; height: 12px; overflow: hidden;">
                    <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, #f59e0b, #d97706); border-radius: 4px; transition: width 0.4s ease;"></div>
                </div>
            </div>`;
    }).join('');
}

function showFinalResults() {
    // Ensure glossary and rubric are rendered for the help modal
    renderGlossary();
    renderRubric();
    
    // Only recalculate totalScore from paperScores if NOT viewing read-only results
    if (!isViewingResults) {
        totalScore = Object.values(paperScores).reduce((sum, score) => sum + score, 0);
    }
    
    // Display final score as average prediction accuracy percentage
    const ratedCount = Object.keys(userRatings).length;
    const percentageScore = ratedCount > 0 ? Math.round(totalScore / ratedCount) : 0;
    document.getElementById('final-score').textContent = `${percentageScore}%`;
    
    // Update total papers count
    const totalPapersElement = document.getElementById('total-papers');
    if (totalPapersElement) {
        totalPapersElement.textContent = ratedCount;
    }
    
    // Render criterion importance bars — always load from Firebase as source of truth
    const criterionBarSessionId = sessionId;
    if (criterionBarSessionId) {
        get(ref(database, `rankings/${criterionBarSessionId}`)).then(snap => {
            if (snap.exists()) {
                renderCriterionImportanceBars(snap.val(), 'criterion-importance-bars');
            } else {
                // Firebase has no data — fall back to in-memory tokens if available
                const tokenTotal = Object.values(criterionTokens).reduce((a, b) => a + b, 0);
                if (tokenTotal > 0) {
                    renderCriterionImportanceBars(criterionTokens, 'criterion-importance-bars');
                } else {
                    // No data anywhere — hide the section entirely
                    const section = document.getElementById('criterion-importance-section');
                    if (section) section.style.display = 'none';
                }
            }
        }).catch(err => {
            console.error('[CriterionImportance] Firebase read error:', err);
        });
    }
    
    // Only save score to leaderboard if NOT viewing read-only results
    if (!isViewingResults) {
        const scoresRef = ref(database, `leaderboard/${sessionId}`);
        set(scoresRef, {
            score: totalScore,
            timestamp: Date.now(),
            papersRated: Object.keys(userRatings).length,
            userName: userName,
            uid: firebaseUid
        }).then(() => {
            // Show link copying and email buttons after save
            document.getElementById('save-results-link').style.display = 'inline-block';
            document.getElementById('email-results-link').style.display = 'inline-block';
            // Display username in Save Results section and inline
            document.getElementById('username-display-save').textContent = userName;
            document.getElementById('username-display-inline').textContent = userName;
        }).catch((error) => {
            console.error('Error saving score:', error);
        });
    } else {
        // In viewing mode, hide the save results section and update username displays
        const saveSection = document.getElementById('save-results-section');
        if (saveSection) {
            saveSection.style.display = 'none';
        }
        document.getElementById('username-display-save').textContent = userName;
        document.getElementById('username-display-inline').textContent = userName;
    }
    
    // Calculate rating analysis comparing user to crowd
    calculateRatingAnalysis();
    
    // Load and display leaderboard
    const leaderboardRef = ref(database, 'leaderboard');
    onValue(leaderboardRef, (snapshot) => {
        const scores = snapshot.val();
        
        if (scores) {
            const scoresArray = Object.entries(scores).map(([id, data]) => ({
                id,
                score: data.score,
                timestamp: data.timestamp,
                userName: data.userName || 'Anonymous',
                papersRated: data.papersRated || 0
            }));
            
            // Sort by score (descending)
            scoresArray.sort((a, b) => b.score - a.score);
            
            // Find user's rank
            const userRank = scoresArray.findIndex(s => s.id === sessionId) + 1;
            document.getElementById('score-rank').textContent = 
                `You ranked #${userRank} out of ${scoresArray.length} participant${scoresArray.length !== 1 ? 's' : ''}!`;
            
            // Display top 5
            const top5 = scoresArray.slice(0, 5);
            const leaderboardHTML = top5.map((entry, index) => {
                const isUser = entry.id === sessionId;
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                const percentageScore = entry.papersRated > 0 ? Math.round(entry.score / entry.papersRated) : 0;
                return `
                    <div class="leaderboard-entry ${isUser ? 'current-user' : ''}">
                        <span class="rank">${medal || `#${index + 1}`}</span>
                        <div class="username-container">
                            <span class="username">${entry.userName}</span>
                            ${isUser ? '<span class="you-badge">You!</span>' : ''}
                        </div>
                        <span class="score">${percentageScore}%</span>
                    </div>
                `;
            }).join('');
            
            document.getElementById('leaderboard-list').innerHTML = leaderboardHTML || '<p>Be the first to complete!</p>';
        }
    });
}

// Calculate and display personalized rating analysis
async function calculateRatingAnalysis() {
    try {
        // Collect average ratings for all papers
        const ratingsData = {};
        const analysisPromises = papers.map(async (paper) => {
            const ratingsRef = ref(database, `ratings/${paper.id}`);
            const snapshot = await get(ratingsRef);
            const ratings = snapshot.val();
            
            if (ratings) {
                const ratingValues = extractValidRatings(ratings);
                // Include seed scores
                const seedScore = seedScores[paper.id] || 4;
                const totalRatings = ratingValues.reduce((a, b) => a + b, 0) + (seedScore * seedWeight);
                const totalCount = ratingValues.length + seedWeight;
                const average = totalRatings / totalCount;
                
                ratingsData[paper.id] = {
                    average: average,
                    userRating: userRatings[paper.id] || null
                };
            }
        });
        
        await Promise.all(analysisPromises);
        
        // Calculate deviations
        const deviations = [];
        const userRatingsArr = [];
        const avgRatingsArr = [];
        const paperLabels = [];
        
        papers.forEach((paper) => {
            if (ratingsData[paper.id] && ratingsData[paper.id].userRating !== null) {
                const userRating = ratingsData[paper.id].userRating;
                const avgRating = ratingsData[paper.id].average;
                const deviation = userRating - avgRating;
                
                deviations.push(deviation);
                userRatingsArr.push(userRating);
                avgRatingsArr.push(avgRating);
                paperLabels.push(paper.id);
            }
        });
        
        if (deviations.length === 0) {
            return; // Not enough data
        }
        
        // Calculate statistics
        const meanDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
        const variance = deviations.reduce((a, d) => a + Math.pow(d - meanDeviation, 2), 0) / deviations.length;
        const stdDev = Math.sqrt(variance);
        const absDeviations = deviations.map(d => Math.abs(d));
        const meanAbsDeviation = absDeviations.reduce((a, b) => a + b, 0) / absDeviations.length;
        
        // Generate personalized summary
        let summaryText = '';
        
        if (meanAbsDeviation < 0.5 && stdDev < 0.8) {
            // High alignment with average ratings
            summaryText = `🎯 <strong>Spot-On Evaluator!</strong> Your ratings are remarkably well-aligned with the crowd. On average, you deviated by just ${meanAbsDeviation.toFixed(2)} points from other participants' ratings. Your assessments are well backed by both the baseline quality indicators and the collective wisdom of other evaluators. You're in sync with the scientific consensus!`;
        } else if (meanAbsDeviation < 1.0 && stdDev < 1.5) {
            // Close to average
            summaryText = `✓ <strong>Calibrated Scientist.</strong> Your ratings align well with the crowd, averaging ${meanAbsDeviation.toFixed(2)} points from the consensus. You're consistently backed by other participants' evaluations, showing you've developed a reliable eye for research quality that matches the collective assessment.`;
        } else if (meanAbsDeviation > 2.0 || stdDev > 2.5) {
            // Substantial deviation from average ratings
            summaryText = `🌟 <strong>Breaking the Mould!</strong> Your ratings deviate substantially from the crowd (average difference: ${meanAbsDeviation.toFixed(2)} points). You're seeing research quality through a unique lens—perhaps you're more critical of methodological flaws, or more generous with preliminary findings. Your independent perspective challenges the consensus!`;
        } else {
            // Moderately different
            summaryText = `⚖️ <strong>Balanced Contrarian.</strong> Your ratings show notable differences from the average (typical deviation: ${meanAbsDeviation.toFixed(2)} points). You're neither slavishly following the crowd nor wildly divergent—you're bringing a thoughtful, independent perspective whilst still engaging with the scientific consensus.`;
        }
        
        document.getElementById('analysis-summary').innerHTML = summaryText;
        document.getElementById('rating-analysis').style.display = 'block';
        
        // Create comparison chart
        createComparisonChart(paperLabels, userRatingsArr, avgRatingsArr);
        
    } catch (error) {
        console.error('Error calculating rating analysis:', error);
    }
}

// Create Chart.js visualization comparing user ratings to average
function createComparisonChart(labels, userRatings, avgRatings) {
    const ctx = document.getElementById('comparison-chart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Your Ratings',
                    data: userRatings,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    pointRadius: 5,
                    pointBackgroundColor: '#667eea',
                    tension: 0
                },
                {
                    label: 'Crowd Average',
                    data: avgRatings,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 4,
                    pointBackgroundColor: '#10b981',
                    tension: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 1,
                    max: 7,
                    title: {
                        display: true,
                        text: 'Rating (1-7 scale)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Studies',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        font: {
                            size: 9
                        }
                    }
                }
            }
        }
    });
}

// Copy results link to clipboard
function copyResultsLink() {
    const resultsUrl = `${window.location.origin}${window.location.pathname}?session=${sessionId}`;
    navigator.clipboard.writeText(resultsUrl).then(() => {
        document.getElementById('link-copied-msg').style.display = 'block';
        setTimeout(() => {
            document.getElementById('link-copied-msg').style.display = 'none';
        }, 3000);
    }).catch(err => {
        console.error('Failed to copy link:', err);
        alert('Failed to copy link. Please copy manually: ' + resultsUrl);
    });
}

window.copyResultsLink = copyResultsLink;

// Email results link to user
function emailResultsLink() {
    const resultsUrl = `${window.location.origin}${window.location.pathname}?session=${sessionId}`;
    const dashboardUrl = `${window.location.origin}/dashboard.html`;
    
    const subject = encodeURIComponent('Your Unlock the Lab Results');
    const body = encodeURIComponent(
        `Hello ${userName},\n\n` +
        `Here are your Unlock the Lab workshop results:\n\n` +
        `Your Username: ${userName}\n\n` +
        `Direct Link to Your Results:\n${resultsUrl}\n\n` +
        `You can also visit the Live Dashboard and enter your username to find your results:\n${dashboardUrl}\n\n` +
        `The dashboard shows real-time statistics and comparisons for all participants.\n\n` +
        `Thank you for participating!\n\n` +
        `---\n` +
        `Unlock the Lab Workshop\n` +
        `Dr Pablo Bernabeu, University of Oxford`
    );
    
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

window.emailResultsLink = emailResultsLink;

// Load and display results for a specific session
async function loadSessionResults(targetSessionId) {
    try {
        // Set flag to indicate viewing of read-only results
        isViewingResults = true;
        
        // Load basic content first (skip shuffling when viewing results)
        await loadContent(false);
        
        // Render glossary and rubric for the help modal
        renderGlossary();
        renderRubric();
        
        // Helper function to normalize username for comparison
        const normalizeUsername = (username) => {
            return username.toLowerCase().replace(/\s+/g, '');
        };
        
        // Try direct lookup first
        let leaderboardRef = ref(database, `leaderboard/${targetSessionId}`);
        let snapshot = await get(leaderboardRef);
        let actualSessionId = targetSessionId;
        
        // If not found, try fuzzy matching with normalized spaces
        if (!snapshot.exists()) {
            const normalizedInput = normalizeUsername(targetSessionId);
            const allLeaderboardRef = ref(database, 'leaderboard');
            const allSnapshot = await get(allLeaderboardRef);
            
            if (allSnapshot.exists()) {
                const allData = allSnapshot.val();
                // Find a matching username (case-insensitive, space-insensitive)
                const matchingKey = Object.keys(allData).find(key => 
                    normalizeUsername(key) === normalizedInput
                );
                
                if (matchingKey) {
                    actualSessionId = matchingKey;
                    leaderboardRef = ref(database, `leaderboard/${matchingKey}`);
                    snapshot = await get(leaderboardRef);
                }
            }
        }
        
        if (!snapshot.exists()) {
            alert('Username not found. Please check your username and try again.');
            window.location.href = window.location.pathname; // Remove query params
            return;
        }
        
        const sessionData = snapshot.val();
        sessionId = actualSessionId; // Use the actual matched session ID
        userName = sessionData.userName || 'Anonymous';
        totalScore = sessionData.score || 0;
        
        // Verify papers loaded successfully
        if (!papers || !papers.length) {
            throw new Error('Papers data failed to load');
        }
        
        // Load user's ratings from Firebase
        const ratingsPromises = papers.map(async (paper) => {
            const ratingRef = ref(database, `ratings/${paper.id}/${actualSessionId}`);
            const ratingSnap = await get(ratingRef);
            if (ratingSnap.exists()) {
                const data = ratingSnap.val();
                userRatings[paper.id] = data.rating;
                userPredictions[paper.id] = data.prediction;
            }
        });
        
        await Promise.all(ratingsPromises);
        
        // Show final results page
        document.getElementById('page-welcome').classList.remove('active');
        document.getElementById('page-final').classList.add('active');
        
        // Display results
        showFinalResults();
        
        // Update page title
        const totalPapersElement = document.getElementById('total-papers');
        if (totalPapersElement) {
            totalPapersElement.textContent = Object.keys(userRatings).length;
        }
        
    } catch (error) {
        console.error('Error loading session results:', error);
        alert('Error loading results. Please try again.');
        window.location.href = window.location.pathname;
    }
}

