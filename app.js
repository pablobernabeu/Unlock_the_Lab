// Import Firebase modules
import { database } from './firebase-config.js';
import { ref, set, onValue } from 'firebase/database';

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

// Seed scores (vetted expert ratings) - weighted as 10 participants each
const seedScores = {
    'STUDY-001': 6,   // High quality
    'STUDY-002': 4,   // Medium quality
    'STUDY-003': 6,   // High quality
    'STUDY-004': 2,   // Low quality
    'STUDY-005': 4,   // Medium quality
    'STUDY-006': 2    // Low quality
};
const seedWeight = 10; // Each seed score counts as 10 participants

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Generate unique session ID for this participant
    sessionId = generateSessionId();
    
    // Load content
    await loadContent();
    
    // Initialize glossary and rubric on page 2
    renderGlossary();
    renderRubric();
    
    // Generate paper pages
    generatePaperPages();
    
    // Track active participants
    trackParticipant();
    
    // Update participant count
    updateParticipantCount();
    
    // Show first page
    showPage(0);
});

// Expose functions to global scope for HTML onclick handlers
window.nextPage = nextPage;
window.enableSubmit = enableSubmit;
window.submitRating = submitRating;
window.showHelp = showHelp;
window.closeHelp = closeHelp;
window.showTab = showTab;

// Generate unique session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
    const activeRef = ref(database, 'active');
    onValue(activeRef, (snapshot) => {
        const active = snapshot.val();
        const count = active ? Object.keys(active).length : 0;
        
        const counter = document.getElementById('participant-counter');
        if (counter) {
            counter.textContent = `${count} participant${count !== 1 ? 's' : ''} active`;
        }
    });
}

// Load content from JSON files
async function loadContent() {
    try {
        const [glossaryData, rubricData, papersData] = await Promise.all([
            fetch('glossary.json').then(r => r.json()),
            fetch('rubric.json').then(r => r.json()),
            fetch('papers.json').then(r => r.json())
        ]);
        
        glossary = glossaryData;
        rubric = rubricData;
        papers = papersData;
        
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
    
    const glossaryHTML = glossary.map(item => `
        <div class="glossary-item">
            <div class="glossary-term">${item.term}</div>
            <div class="glossary-definition">${item.definition}</div>
        </div>
    `).join('');
    
    glossaryContent.innerHTML = glossaryHTML;
    modalGlossary.innerHTML = glossaryHTML;
}

// Render rubric
function renderRubric() {
    const rubricContent = document.getElementById('rubric-content');
    const modalRubric = document.getElementById('modal-rubric');
    
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
    
    rubricContent.innerHTML = rubricHTML;
    modalRubric.innerHTML = rubricHTML;
}

// Generate paper pages dynamically
function generatePaperPages() {
    const paperPagesContainer = document.getElementById('paper-pages');
    
    papers.forEach((paper, index) => {
        const pageHTML = `
            <div class="page" id="page-paper-${index}">
                <div class="container">
                    <div class="paper-card">
                        <div class="paper-header">
                            <div class="paper-id">${paper.id}</div>
                            <h1 class="paper-title">${paper.headline}</h1>
                        </div>
                        
                        <div class="paper-section">
                            <h3>📰 Access</h3>
                            <p>${paper.access}</p>
                        </div>
                        
                        <div class="paper-section">
                            <h3>🔬 Study Overview</h3>
                            <p>${paper.overview}</p>
                        </div>
                        
                        <div class="paper-section">
                            <h3>📊 Methods & Data</h3>
                            <p>${paper.methods}</p>
                        </div>
                        
                        <div class="paper-section">
                            <h3>📝 Conclusion</h3>
                            <p>${paper.conclusion}</p>
                        </div>
                        
                        <div class="paper-section">
                            <h3>🏛️ Source</h3>
                            <p>${paper.source}</p>
                        </div>
                    </div>
                    
                    <div class="rating-section" id="rating-section-${index}">
                        <h3>1️⃣ Your Scientific Assessment</h3>
                        <p style="font-size: 0.9rem; color: #666; margin-bottom: 15px;">Based on the rubric, how would YOU rate this study's quality?</p>
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
                        
                        <h3 style="margin-top: 30px;">2️⃣ Predict the Crowd</h3>
                        <p style="font-size: 0.9rem; color: #666; margin-bottom: 15px;">What do you think the AVERAGE rating will be from all participants?</p>
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
                            <div class="rating-display">
                                <div class="label">Your Rating</div>
                                <div class="value" id="your-rating-${index}">-</div>
                            </div>
                            <div class="rating-display">
                                <div class="label">Average Rating</div>
                                <div class="value" id="avg-rating-${index}">-</div>
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
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    // Determine which page to show
    let targetPage;
    if (pageIndex === 0) {
        targetPage = document.getElementById('page-welcome');
    } else if (pageIndex === 1) {
        targetPage = document.getElementById('page-guide');
    } else if (pageIndex <= papers.length + 1) {
        targetPage = document.getElementById(`page-paper-${pageIndex - 2}`);
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
    }
    
    currentPage = pageIndex;
}

function nextPage() {
    const totalPages = papers.length + 3; // welcome + guide + papers + final
    if (currentPage < totalPages - 1) {
        showPage(currentPage + 1);
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
        
        // Save both rating and prediction to Firebase
        const ratingRef = ref(database, `ratings/${paperId}/${sessionId}`);
        await set(ratingRef, {
            rating: rating,
            prediction: prediction,
            timestamp: Date.now()
        });
        
        // Store locally
        userRatings[paperId] = rating;
        userPredictions[paperId] = prediction;
        
        // Hide rating section
        document.getElementById(`rating-section-${paperIndex}`).style.display = 'none';
        
        // Show results
        showResults(paperIndex, paperId, rating, prediction);
        
    } catch (error) {
        console.error('Error submitting rating:', error);
        alert('Error submitting rating. Please try again.');
        
        // Re-enable submit button
        const submitBtn = document.getElementById(`submit-${paperIndex}`);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Both Ratings';
    }
}

// Show results with real-time average
async function showResults(paperIndex, paperId, userRating, userPrediction) {
    const resultsBox = document.getElementById(`results-${paperIndex}`);
    resultsBox.style.display = 'block';
    
    // Display user's rating
    document.getElementById(`your-rating-${paperIndex}`).textContent = userRating;
    
    // Listen for real-time updates to calculate average
    const ratingsRef = ref(database, `ratings/${paperId}`);
    onValue(ratingsRef, (snapshot) => {
        const ratings = snapshot.val();
        
        if (ratings) {
            const ratingValues = Object.values(ratings).map(r => r.rating);
            
            // Include seed score in average calculation (weighted as 10 participants)
            const seedScore = seedScores[paperId] || 4;
            const totalRatings = ratingValues.reduce((a, b) => a + b, 0) + (seedScore * seedWeight);
            const totalCount = ratingValues.length + seedWeight;
            const average = totalRatings / totalCount;
            const participantCount = ratingValues.length;
            
            // Update display
            document.getElementById(`avg-rating-${paperIndex}`).textContent = average.toFixed(1);
            document.getElementById(`count-${paperIndex}`).textContent = 
                `Based on ${participantCount} participant${participantCount !== 1 ? 's' : ''}`;
            
            // Calculate score based on prediction accuracy (only once when we have at least 2 participants)
            if (participantCount >= 2 && !document.getElementById(`score-${paperIndex}`).textContent) {
                const difference = Math.abs(userPrediction - average);
                const score = Math.max(0, 100 - Math.round(difference * 15));
                totalScore += score;
                
                // Display score
                document.getElementById(`score-${paperIndex}`).textContent = `+${score} pts`;
                document.getElementById(`score-msg-${paperIndex}`).textContent = 
                    difference === 0 ? `Perfect prediction! 🎯 (You predicted ${userPrediction}, average is ${average.toFixed(1)})` :
                    difference <= 0.5 ? `Excellent prediction! ⭐ (Predicted ${userPrediction}, actual ${average.toFixed(1)})` :
                    difference <= 1 ? `Great prediction! 👍 (Predicted ${userPrediction}, actual ${average.toFixed(1)})` :
                    difference <= 2 ? `Good attempt! 👌 (Predicted ${userPrediction}, actual ${average.toFixed(1)})` :
                    `Keep practicing! 💪 (Predicted ${userPrediction}, actual ${average.toFixed(1)})`;
                
                // Update total score display
                const scoreDisplay = document.getElementById('total-score-header');
                if (scoreDisplay) {
                    scoreDisplay.textContent = `Score: ${totalScore}`;
                }
            }
        }
    });
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

// Show final results and leaderboard
function showFinalResults() {
    // Display final score
    document.getElementById('final-score').textContent = totalScore;
    
    // Save score to leaderboard
    const scoresRef = ref(database, `leaderboard/${sessionId}`);
    set(scoresRef, {
        score: totalScore,
        timestamp: Date.now(),
        papersRated: Object.keys(userRatings).length
    });
    
    // Load and display leaderboard
    const leaderboardRef = ref(database, 'leaderboard');
    onValue(leaderboardRef, (snapshot) => {
        const scores = snapshot.val();
        
        if (scores) {
            const scoresArray = Object.entries(scores).map(([id, data]) => ({
                id,
                score: data.score,
                timestamp: data.timestamp
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
                        <span class="score">${entry.score} pts</span>
                        ${isUser ? '<span class="you-badge">You!</span>' : ''}
                    </div>
                `;
            }).join('');
            
            document.getElementById('leaderboard-list').innerHTML = leaderboardHTML || '<p>Be the first to complete!</p>';
        }
    });
}
