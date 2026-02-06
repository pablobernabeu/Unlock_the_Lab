// Import Firebase modules
import { database } from './firebase-config.js';
import { ref, set, get, onValue } from 'firebase/database';

// Application State
let currentPage = 0;
let papers = [];
let glossary = [];
let rubric = [];
let sessionId = null;
let userRatings = {}; // Personal ratings
let userPredictions = {}; // Predicted average ratings
let totalScore = 0;
let userName = '';

// Counterbalancing state
let featureOrderConfig = [];
let assignedListId = null;
let featureOrder = [];
let featureLabels = [];

// Session timeout configuration (to prevent excessive Firebase costs)
const INITIAL_SESSION_DURATION = 30 * 60 * 1000; // 30 minutes initially
const EXTENSION_DURATION = 5 * 60 * 1000; // 5 minute extensions
const ABSOLUTE_MAX_DURATION = 50 * 60 * 1000; // 50 minutes absolute maximum
const WARNING_TIMES = [15 * 60 * 1000, 5 * 60 * 1000]; // Warnings at 15 min and 5 min remaining
const EXTENSION_PROMPT_TIME = 1 * 60 * 1000; // Ask to extend 1 min before end
let sessionStartTime = null;
let currentSessionEnd = INITIAL_SESSION_DURATION; // Current deadline (can be extended)
let sessionTimeoutId = null;
let extensionPromptTimeoutId = null;
let warningTimeouts = []; // Track multiple warning timeouts
let firebaseListeners = []; // Track all Firebase listeners for cleanup
let hasShownWarnings = new Set(); // Track which warnings have been shown

// Seed scores (vetted expert ratings) - weighted as 10 participants each
const seedScores = {
    'STUDY-101': 1,
    'STUDY-102': 5,
    'STUDY-103': 6,
    'STUDY-104': 1,
    'STUDY-105': 5,
    'STUDY-106': 4,
    'STUDY-107': 2,
    'STUDY-108': 7,
    'STUDY-109': 4,
    'STUDY-110': 6,
    'STUDY-111': 2,
    'STUDY-112': 1,
    'STUDY-113': 6,
    'STUDY-114': 5,
    'STUDY-115': 3,
    'STUDY-116': 5,
    'STUDY-117': 1,
    'STUDY-118': 4,
    'STUDY-119': 7,
    'STUDY-120': 2,
    'STUDY-121': 5,
    'STUDY-122': 6,
    'STUDY-123': 1
};
const seedWeight = 100; // Each seed score counts as 100 participants

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Try to load saved state first
    const hasState = loadState();
    
    // Generate or restore session ID
    if (!sessionId) {
        sessionId = generateSessionId();
    }
    
    // Generate or retrieve username
    userName = localStorage.getItem('userName');
    if (!userName) {
        userName = await generateUniqueUsername();
        localStorage.setItem('userName', userName);
    }
    
    // Start session timeout
    startSessionTimeout();
    
    // Load content - MUST complete before generating pages
    await loadContent();
    console.log('Content loaded. Papers:', papers.length);
    
    // Generate paper pages AFTER content is loaded
    generatePaperPages();
    console.log('Paper pages generated');
    
    // Initialize glossary and rubric AFTER pages exist
    renderGlossary();
    renderRubric();
    
    // Display username at bottom of all pages AFTER pages are generated
    displayUsername();
    
    // Restore previously submitted ratings if resuming
    if (hasState && Object.keys(userRatings).length > 0) {
        restoreSubmittedRatings();
    }
    
    // Track active participants
    trackParticipant();
    
    // Update participant count
    updateParticipantCount();
    
    // Update score display if resuming with existing score
    if (totalScore > 0) {
        const scoreDisplay = document.getElementById('total-score-header');
        if (scoreDisplay) {
            const totalPapers = papers.length || 23;
            const percentageScore = Math.round((totalScore / (totalPapers * 100)) * 100);
            scoreDisplay.innerHTML = `<span class="medal-icon">🏆</span> ${percentageScore}%`;
            document.getElementById('score-banner').style.display = 'flex';
        }
    }
    
    // IMPORTANT: Show saved page if state exists, otherwise start from beginning
    const pageToShow = (hasState && currentPage > 0) ? currentPage : 0;
    console.log('Showing page:', pageToShow, 'hasState:', hasState, 'currentPage:', currentPage);
    showPage(pageToShow);
});

// Expose functions to global scope for HTML onclick handlers
window.nextPage = nextPage;
window.previousPage = previousPage;
window.enableSubmit = enableSubmit;
window.submitRating = submitRating;
window.showHelp = showHelp;
window.closeHelp = closeHelp;
window.showTab = showTab;

// Generate unique session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Generate child-friendly username
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
    
    return `${adjective} ${animal}`;
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
        
        // Try generating a unique username (max 100 attempts)
        let attempts = 0;
        let username;
        
        do {
            username = generateUsername();
            attempts++;
            
            // If we've tried 100 times and still no unique name, append a number
            if (attempts >= 100) {
                const baseUsername = generateUsername();
                let counter = 1;
                username = `${baseUsername} ${counter}`;
                while (existingUsernames.has(username)) {
                    counter++;
                    username = `${baseUsername} ${counter}`;
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
        totalScore,
        sessionId
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
            totalScore = state.totalScore || 0;
            sessionId = state.sessionId || null;
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

// Display username at bottom of all pages
function displayUsername() {
    // Update home page username display
    const homeUsernameDisplay = document.getElementById('username-display-home');
    if (homeUsernameDisplay) {
        homeUsernameDisplay.innerHTML = `Your username is <span style="color: #667eea; font-weight: 600;">${userName}</span>`;
    }
    
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        // Skip home page and pages that already have username footer
        if (page.id === 'page-welcome' || page.querySelector('.username-footer')) return;
        
        const footer = document.createElement('div');
        footer.className = 'username-footer';
        footer.style.cssText = 'margin-top: 2rem; padding-top: 0.25rem; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 0.9rem;';
        footer.innerHTML = `Your username is <span style="color: #667eea; font-weight: 600;">${userName}</span>`;
        page.querySelector('.container').appendChild(footer);
    });
}

// Start session timeout to prevent excessive Firebase usage
function startSessionTimeout() {
    sessionStartTime = Date.now();
    currentSessionEnd = INITIAL_SESSION_DURATION;
    
    // Update timer display every minute
    updateTimerDisplay();
    const timerInterval = setInterval(() => {
        const elapsed = Date.now() - sessionStartTime;
        if (elapsed >= ABSOLUTE_MAX_DURATION) {
            clearInterval(timerInterval);
        }
        updateTimerDisplay();
    }, 60000); // Update every minute
    
    // Set up warning timeouts
    scheduleWarnings();
    
    // Set up extension prompt (1 minute before current deadline)
    scheduleExtensionPrompt();
    
    // Set session end timeout
    sessionTimeoutId = setTimeout(() => {
        clearInterval(timerInterval);
        endSession();
    }, currentSessionEnd);
}

// Schedule warning messages
function scheduleWarnings() {
    // Clear existing warnings
    warningTimeouts.forEach(id => clearTimeout(id));
    warningTimeouts = [];
    
    WARNING_TIMES.forEach(warningTime => {
        const triggerTime = currentSessionEnd - warningTime;
        if (triggerTime > 0 && !hasShownWarnings.has(warningTime)) {
            const timeoutId = setTimeout(() => {
                showSessionWarning(warningTime);
                hasShownWarnings.add(warningTime);
            }, triggerTime);
            warningTimeouts.push(timeoutId);
        }
    });
}

// Schedule extension prompt
function scheduleExtensionPrompt() {
    if (extensionPromptTimeoutId) {
        clearTimeout(extensionPromptTimeoutId);
    }
    
    const promptTime = currentSessionEnd - EXTENSION_PROMPT_TIME;
    if (promptTime > 0 && currentSessionEnd < ABSOLUTE_MAX_DURATION) {
        extensionPromptTimeoutId = setTimeout(() => {
            showExtensionPrompt();
        }, promptTime);
    }
}

// Show warning that time is running low
function showSessionWarning(remainingTime) {
    const minutes = Math.floor(remainingTime / 60000);
    alert(`⏰ ${minutes} minutes remaining in your session.`);
}

// Show extension prompt
function showExtensionPrompt() {
    const canExtend = currentSessionEnd < ABSOLUTE_MAX_DURATION;
    
    if (!canExtend) {
        alert('⏰ Your session will end in 1 minute. This is the maximum session duration.');
        return;
    }
    
    const totalMinutes = Math.floor(currentSessionEnd / 60000);
    const maxMinutes = Math.floor(ABSOLUTE_MAX_DURATION / 60000);
    const extensionMinutes = Math.floor(EXTENSION_DURATION / 60000);
    
    const extend = confirm(
        `⏰ Your ${totalMinutes}-minute session will end in 1 minute.\n\n` +
        `Would you like to extend for ${extensionMinutes} more minutes?\n` +
        `(Maximum total: ${maxMinutes} minutes)`
    );
    
    if (extend) {
        extendSession();
    }
}

// Extend the session
function extendSession() {
    // Clear current session timeout
    if (sessionTimeoutId) {
        clearTimeout(sessionTimeoutId);
    }
    
    // Extend the deadline
    const newDeadline = currentSessionEnd + EXTENSION_DURATION;
    
    // Cap at absolute maximum
    currentSessionEnd = Math.min(newDeadline, ABSOLUTE_MAX_DURATION);
    
    // Schedule new warnings and extension prompt
    scheduleWarnings();
    scheduleExtensionPrompt();
    
    // Set new session end timeout
    sessionTimeoutId = setTimeout(() => {
        endSession();
    }, currentSessionEnd);
    
    // Update timer display immediately
    updateTimerDisplay();
    
    const addedMinutes = Math.floor((currentSessionEnd - (newDeadline - EXTENSION_DURATION)) / 60000);
    if (addedMinutes > 0) {
        alert(`✅ Session extended! You have ${addedMinutes} more minutes.`);
    }
}

// Update timer display
function updateTimerDisplay() {
    const elapsed = Date.now() - sessionStartTime;
    const remaining = currentSessionEnd - elapsed;
    const minutes = Math.floor(remaining / 60000);
    
    // Calculate papers remaining
    const papersRated = Object.keys(userRatings).length;
    const totalPapers = papers.length || 48; // Fallback to 48 if papers not loaded yet
    const papersRemaining = Math.max(0, totalPapers - papersRated);
    
    const timerEl = document.getElementById('session-timer');
    if (timerEl && remaining > 0) {
        timerEl.textContent = `${minutes} min | ${papersRemaining} paper${papersRemaining !== 1 ? 's' : ''} left`;
        // Change color when time is running low
        if (remaining <= 5 * 60000) {
            timerEl.style.color = '#f56565';
        } else if (remaining <= 15 * 60000) {
            timerEl.style.color = '#fbbf24';
        } else {
            timerEl.style.color = '';
        }
    } else if (timerEl) {
        timerEl.textContent = 'Session ending...';
        timerEl.style.color = '#f56565';
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
    if (extensionPromptTimeoutId) clearTimeout(extensionPromptTimeoutId);
    warningTimeouts.forEach(id => clearTimeout(id));
    
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
    
    const totalMinutes = Math.floor((Date.now() - sessionStartTime) / 60000);
    overlay.innerHTML = `
        <div>
            <h2 style="margin-bottom: 20px;">⏰ Session Expired</h2>
            <p style="margin-bottom: 20px;">
                Your ${totalMinutes}-minute session has ended to conserve resources.<br>
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
        lastActive: Date.now()
    });
    
    // Update activity every 30 seconds
    setInterval(() => {
        set(participantRef, {
            joinedAt: Date.now(),
            lastActive: Date.now()
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

// Load content from JSON files
async function loadContent() {
    try {
        // First, load the feature order configuration
        const featureOrderResponse = await fetch('feature-order-config.json');
        featureOrderConfig = await featureOrderResponse.json();
        
        // Determine list assignment based on session ID
        // Extract numeric part from session ID for consistent assignment
        const sessionNumeric = parseInt(sessionId.split('_')[1]) || Date.now();
        assignedListId = (sessionNumeric % 6) + 1;
        
        // Store list assignment for consistency
        localStorage.setItem('assignedListId', assignedListId);
        
        // Get the feature order configuration for this participant
        const config = featureOrderConfig.find(c => c.listId === assignedListId);
        featureOrder = config.featureOrder;
        featureLabels = config.featureLabels;
        
        // Load appropriate rubric version
        const rubricFile = `rubric-v${assignedListId}.json`;
        
        // Load all content in parallel
        const [glossaryData, rubricData, papersData] = await Promise.all([
            fetch('glossary.json').then(r => r.json()),
            fetch(rubricFile).then(r => r.json()),
            fetch('papers.json').then(r => r.json())
        ]);
        
        glossary = glossaryData;
        rubric = rubricData;
        papers = papersData;
        
        // Log assignment for debugging
        console.log(`Participant assigned to List ${assignedListId}:`, featureOrder);
        
        // Update total papers count on final page
        document.getElementById('total-papers').textContent = papers.length;
    } catch (error) {
        console.error('Error loading content:', error);
        alert('Error loading workshop content. Please refresh the page.');
    }
}

// Render glossary
function renderGlossary() {
    const glossaryContent = document.getElementById('glossary-content');
    const modalGlossary = document.getElementById('modal-glossary');
    
    if (!glossary || glossary.length === 0) {
        console.error('Glossary data not loaded');
        return;
    }
    
    const glossaryHTML = glossary.map(item => `
        <div class="glossary-item">
            <div class="glossary-term">${item.term}</div>
            <div class="glossary-definition">${item.definition}</div>
        </div>
    `).join('');
    
    if (glossaryContent) glossaryContent.innerHTML = glossaryHTML;
    if (modalGlossary) modalGlossary.innerHTML = glossaryHTML;
}

// Render rubric
function renderRubric() {
    const rubricContent = document.getElementById('rubric-content');
    const modalRubric = document.getElementById('modal-rubric');
    
    if (!rubric || rubric.length === 0) {
        console.error('Rubric data not loaded');
        return;
    }
    
    const rubricHTML = `
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
                        <td>${category.low}</td>
                        <td>${category.medium}</td>
                        <td>${category.high}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    if (rubricContent) rubricContent.innerHTML = rubricHTML;
    if (modalRubric) modalRubric.innerHTML = rubricHTML;
}

// Generate paper pages dynamically
function generatePaperPages() {
    const paperPagesContainer = document.getElementById('paper-pages');
    
    papers.forEach((paper, index) => {
        // Generate paper sections in counterbalanced order
        const paperSectionsHTML = featureOrder.map((feature, position) => {
            const label = featureLabels[position];
            const content = paper[feature];
            return `
                        <div class="paper-section">
                            <h3>${label}</h3>
                            <p>${content}</p>
                        </div>`;
        }).join('');
        
        const pageHTML = `
            <div class="page" id="page-paper-${index}">
                <div class="container">
                    <div class="paper-card">
                        <div class="paper-header">
                            <div class="paper-id">${paper.id}</div>
                            <h1 class="paper-title">${paper.headline}</h1>
                        </div>
                        ${paperSectionsHTML}
                    </div>
                    
                    <div class="rating-section" id="rating-section-${index}">
                        <div style="background: #f0f4ff; padding: 15px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #667eea;">
                            <h3 style="margin: 0 0 10px 0; color: #667eea;">1️⃣ Your Scientific Assessment</h3>
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
                        
                        <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 30px 0 15px 0; border-left: 4px solid #ff9800;">
                            <h3 style="margin: 0 0 10px 0; color: #f57c00;">2️⃣ Predict the Crowd</h3>
                            <p style="font-size: 0.95rem; color: #444; margin: 0;">Now guess: What will the AVERAGE rating be from all workshop participants? Will others catch the same flaws you did?</p>
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
                                <div class="scale-label">Your Rating</div>
                                <div class="scale-row" id="your-rating-scale-${index}">
                                    ${[1, 2, 3, 4, 5, 6, 7].map(val => `<div class="scale-cell" data-value="${val}"></div>`).join('')}
                                </div>
                            </div>
                            <div class="rating-scale-grid">
                                <div class="scale-label">Average Rating</div>
                                <div class="scale-row" id="avg-rating-scale-${index}">
                                    ${[1, 2, 3, 4, 5, 6, 7].map(val => `<div class="scale-cell" data-value="${val}"></div>`).join('')}
                                </div>
                            </div>
                        </div>
                        <div class="participant-count" id="count-${index}">
                            Calculating...
                        </div>
                        <button class="btn-primary" onclick="nextPage()" style="margin-top: 1.5rem;">
                            ${index < papers.length - 1 ? 'Next Paper' : 'View Results'}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        paperPagesContainer.innerHTML += pageHTML;
    });
}

// Page navigation
function showPage(pageIndex) {
    console.log('showPage called with pageIndex:', pageIndex, 'papers.length:', papers.length);
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    // Determine which page to show
    let targetPage;
    if (pageIndex === 0) {
        targetPage = document.getElementById('page-welcome');
    } else if (pageIndex === 1) {
        targetPage = document.getElementById('page-guide');
    } else if (pageIndex <= papers.length + 1) {
        const paperIndex = pageIndex - 2;
        console.log('Trying to show paper page:', paperIndex);
        targetPage = document.getElementById(`page-paper-${paperIndex}`);
        console.log('Target page found:', !!targetPage);
        // Show help button and score banner on paper pages
        document.getElementById('help-button').classList.add('visible');
        document.getElementById('score-banner').style.display = 'flex';
    } else {
        targetPage = document.getElementById('page-final');
        // Hide help button on final page
        document.getElementById('help-button').classList.remove('visible');
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
    const totalPages = papers.length + 3; // welcome + guide + papers + final
    if (currentPage < totalPages - 1) {
        showPage(currentPage + 1);
    }
}

function previousPage() {
    if (currentPage > 0) {
        showPage(currentPage - 1);
    }
}

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
        
        console.log('Submitting rating:', { paperId, sessionId, rating, prediction });
        
        // Save both rating and prediction to Firebase
        const ratingRef = ref(database, `ratings/${paperId}/${sessionId}`);
        await set(ratingRef, {
            rating: rating,
            prediction: prediction,
            listId: assignedListId,
            timestamp: Date.now()
        });
        
        console.log('Rating submitted successfully');
        
        // Store locally
        userRatings[paperId] = rating;
        userPredictions[paperId] = prediction;
        
        // Save state
        saveState();
        
        // Hide rating section
        document.getElementById(`rating-section-${paperIndex}`).style.display = 'none';
        
        // Show results
        showResults(paperIndex, paperId, rating, prediction);
        
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
async function showResults(paperIndex, paperId, userRating, userPrediction, isRestoring = false) {
    const resultsBox = document.getElementById(`results-${paperIndex}`);
    resultsBox.style.display = 'block';
    
    // Listen for real-time updates to calculate average
    const ratingsRef = ref(database, `ratings/${paperId}`);
    const unsubscribe = onValue(ratingsRef, (snapshot) => {
        const ratings = snapshot.val();
        
        if (ratings) {
            const ratingValues = Object.values(ratings).map(r => r.rating);
            
            // Include seed score in average calculation (weighted as 10 participants)
            const seedScore = seedScores[paperId] || 4;
            const totalRatings = ratingValues.reduce((a, b) => a + b, 0) + (seedScore * seedWeight);
            const totalCount = ratingValues.length + seedWeight;
            const average = totalRatings / totalCount;
            const participantCount = ratingValues.length;
            const totalParticipants = totalCount; // Include seed weight in display
            
            // Update display with ordinal color scale
            const avgRounded = Math.round(average);
            const yourRatingScale = document.getElementById(`your-rating-scale-${paperIndex}`);
            const avgRatingScale = document.getElementById(`avg-rating-scale-${paperIndex}`);
            
            if (yourRatingScale && avgRatingScale) {
                // Clear previous highlights
                yourRatingScale.querySelectorAll('.scale-cell').forEach(cell => {
                    cell.textContent = '';
                    cell.className = 'scale-cell';
                });
                avgRatingScale.querySelectorAll('.scale-cell').forEach(cell => {
                    cell.textContent = '';
                    cell.className = 'scale-cell';
                });
                
                // Highlight user rating
                const yourCell = yourRatingScale.querySelector(`[data-value="${userRating}"]`);
                if (yourCell) {
                    yourCell.textContent = userRating;
                    yourCell.className = `scale-cell active rating-${userRating}`;
                }
                
                // Highlight average rating
                const avgCell = avgRatingScale.querySelector(`[data-value="${avgRounded}"]`);
                if (avgCell) {
                    avgCell.textContent = average.toFixed(1);
                    avgCell.className = `scale-cell active rating-${avgRounded}`;
                }
            }
            
            document.getElementById(`count-${paperIndex}`).textContent = 
                `Based on ${totalParticipants} participant${totalParticipants !== 1 ? 's' : ''}`;
            
            // Calculate score based on prediction accuracy
            // Skip recalculation if already calculated (score element has content) or if restoring from saved state
            const scoreElement = document.getElementById(`score-${paperIndex}`);
            if (!scoreElement.textContent && !isRestoring) {
                const difference = Math.abs(userPrediction - average);
                // Improved scoring: 100 pts for perfect, loses 12 pts per point of error (gentler penalty)
                const score = Math.max(0, 100 - Math.round(difference * 12));
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
                if (scoreDisplay) {
                    const totalPapers = papers.length || 23;
                    const percentageScore = Math.round((totalScore / (totalPapers * 100)) * 100);
                    scoreDisplay.innerHTML = `<span class="medal-icon">🏆</span> ${percentageScore}%`;
                    scoreDisplay.style.animation = 'scoreUpdate 0.5s ease';
                    setTimeout(() => scoreDisplay.style.animation = '', 500);
                }
                
                // Update timer to reflect papers remaining
                updateTimerDisplay();
                
                // Save state after score update
                saveState();
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
function showFinalResults() {
    // Display final score as percentage
    const totalPapers = papers.length || 23;
    const percentageScore = Math.round((totalScore / (totalPapers * 100)) * 100);
    document.getElementById('final-score').textContent = `${percentageScore}%`;
    
    console.log('Saving to leaderboard:', { sessionId, totalScore, userName });
    
    // Save score to leaderboard
    const scoresRef = ref(database, `leaderboard/${sessionId}`);
    set(scoresRef, {
        score: totalScore,
        timestamp: Date.now(),
        papersRated: Object.keys(userRatings).length,
        userName: userName,
        listId: assignedListId
    }).then(() => {
        console.log('Score saved successfully');
    }).catch((error) => {
        console.error('Error saving score:', error);
    });
    
    // Load and display leaderboard
    const leaderboardRef = ref(database, 'leaderboard');
    onValue(leaderboardRef, (snapshot) => {
        const scores = snapshot.val();
        console.log('Leaderboard data:', scores);
        
        if (scores) {
            const scoresArray = Object.entries(scores).map(([id, data]) => ({
                id,
                score: data.score,
                timestamp: data.timestamp,
                userName: data.userName || 'Anonymous'
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
                return `
                    <div class="leaderboard-entry ${isUser ? 'current-user' : ''}">
                        <span class="rank">${medal || `#${index + 1}`}</span>
                        <span class="username">${entry.userName}</span>
                        <span class="score">${entry.score} pts</span>
                        ${isUser ? '<span class="you-badge">You!</span>' : ''}
                    </div>
                `;
            }).join('');
            
            document.getElementById('leaderboard-list').innerHTML = leaderboardHTML || '<p>Be the first to complete!</p>';
        }
    });
}
