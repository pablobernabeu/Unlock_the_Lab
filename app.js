// Application State
let currentPage = 0;
let papers = [];
let glossary = [];
let rubric = [];
let sessionId = null;
let userRatings = {};

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
    
    // Show first page
    showPage(0);
});

// Generate unique session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
                        <h3>Rate This Study (1-7)</h3>
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
                            Submit Rating
                        </button>
                    </div>
                    
                    <div class="results-box" id="results-${index}" style="display: none;">
                        <h3>✅ Rating Submitted!</h3>
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
        // Show help button on paper pages
        document.getElementById('help-button').classList.add('visible');
    } else {
        targetPage = document.getElementById('page-final');
        // Hide help button on final page
        document.getElementById('help-button').classList.remove('visible');
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

// Enable submit button when rating is selected
function enableSubmit(paperIndex) {
    document.getElementById(`submit-${paperIndex}`).disabled = false;
}

// Submit rating to Firebase
async function submitRating(paperIndex, paperId) {
    const selectedRating = document.querySelector(`input[name="rating-${paperIndex}"]:checked`);
    
    if (!selectedRating) {
        alert('Please select a rating before submitting.');
        return;
    }
    
    const rating = parseInt(selectedRating.value);
    
    try {
        // Disable submit button and show loading
        const submitBtn = document.getElementById(`submit-${paperIndex}`);
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        
        // Save rating to Firebase
        await database.ref(`ratings/${paperId}/${sessionId}`).set({
            rating: rating,
            timestamp: Date.now()
        });
        
        // Store locally
        userRatings[paperId] = rating;
        
        // Hide rating section
        document.getElementById(`rating-section-${paperIndex}`).style.display = 'none';
        
        // Show results
        showResults(paperIndex, paperId, rating);
        
    } catch (error) {
        console.error('Error submitting rating:', error);
        alert('Error submitting rating. Please try again.');
        
        // Re-enable submit button
        const submitBtn = document.getElementById(`submit-${paperIndex}`);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Rating';
    }
}

// Show results with real-time average
async function showResults(paperIndex, paperId, userRating) {
    const resultsBox = document.getElementById(`results-${paperIndex}`);
    resultsBox.style.display = 'block';
    
    // Display user's rating
    document.getElementById(`your-rating-${paperIndex}`).textContent = userRating;
    
    // Listen for real-time updates to calculate average
    database.ref(`ratings/${paperId}`).on('value', (snapshot) => {
        const ratings = snapshot.val();
        
        if (ratings) {
            const ratingValues = Object.values(ratings).map(r => r.rating);
            const average = ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length;
            const participantCount = ratingValues.length;
            
            // Update display
            document.getElementById(`avg-rating-${paperIndex}`).textContent = average.toFixed(1);
            document.getElementById(`count-${paperIndex}`).textContent = 
                `Based on ${participantCount} participant${participantCount !== 1 ? 's' : ''}`;
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
