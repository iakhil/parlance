// Game Data - will be loaded from JSON
let gameData = [];

// API Base URL
const API_BASE_URL = window.location.origin;

// Learnt Words Management
class LearntWordsManager {
    constructor() {
        this.storageKey = 'parlance-learnt-words';
    }

    // Get all learnt words from localStorage
    getLearntWords() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error reading learnt words:', error);
            return [];
        }
    }

    // Add a word to learnt words
    addLearntWord(word, dictionaryData = null) {
        const learntWords = this.getLearntWords();
        
        // Check if word already exists
        const existingIndex = learntWords.findIndex(w => w.word.toLowerCase() === word.toLowerCase());
        
        const learntWord = {
            word: word,
            dateAdded: new Date().toISOString(),
            dictionaryData: dictionaryData
        };

        if (existingIndex >= 0) {
            // Update existing word with new dictionary data if provided
            if (dictionaryData) {
                learntWords[existingIndex].dictionaryData = dictionaryData;
                learntWords[existingIndex].dateAdded = new Date().toISOString();
            }
        } else {
            // Add new word
            learntWords.unshift(learntWord); // Add to beginning for recent-first order
        }

        this.saveLearntWords(learntWords);
        console.log(`Word "${word}" added to learnt words`);
    }

    // Save learnt words to localStorage
    saveLearntWords(words) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(words));
        } catch (error) {
            console.error('Error saving learnt words:', error);
        }
    }

    // Clear all learnt words
    clearAllWords() {
        localStorage.removeItem(this.storageKey);
        console.log('All learnt words cleared');
    }

    // Get count of learnt words
    getCount() {
        return this.getLearntWords().length;
    }
}

// Initialize learnt words manager
const learntWordsManager = new LearntWordsManager();

// Load game data from JSON file
async function loadGameData() {
    console.log('Loading game data...');
    try {
        const response = await fetch('/static/js/words-data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        gameData = data;
        console.log(`Loaded ${gameData.length} words`);
        
        // Shuffle the game data for variety
        gameData = shuffleArray(gameData);
        
        // Initialize the game once data is loaded
        setTimeout(initGame, 500);
    } catch (error) {
        console.error('Error loading game data:', error);
        // Fallback to original small dataset if JSON fails to load
        gameData = [
            {
                word: "Serendipity",
                definitions: [
                    { text: "The occurrence of events by chance in a happy way", correct: true },
                    { text: "A type of tropical fruit with sweet flesh", correct: false },
                    { text: "The study of ancient civilizations", correct: false },
                    { text: "A pleasant surprise or unexpected discovery", correct: true },
                    { text: "The fear of being in crowded places", correct: false }
                ]
            },
            {
                word: "Ephemeral",
                definitions: [
                    { text: "Lasting for a very short time", correct: true },
                    { text: "Related to ancient Greek philosophy", correct: false },
                    { text: "Extremely large in size", correct: false },
                    { text: "Having a fleeting or transitory nature", correct: true },
                    { text: "The practice of herbal medicine", correct: false }
                ]
            }
        ];
        console.log('Using fallback data');
        setTimeout(initGame, 500);
    }
}

// Utility function to shuffle array
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Game State - Modified for competitive leaderboard gameplay
class GameState {
    constructor() {
        this.currentWordIndex = 0;
        this.currentDefinitionIndex = 0;
        this.score = 0;
        this.correct = 0;
        this.incorrect = 0;
        this.streak = 0;
        this.maxStreak = 0;
        this.gameCards = [];
        this.isGameOver = false;
        this.usedWords = new Set();
        this.wordsLearned = 0; // Track for leaderboard
    }

    reset() {
        this.currentWordIndex = 0;
        this.currentDefinitionIndex = 0;
        this.score = 0;
        this.correct = 0;
        this.incorrect = 0;
        this.streak = 0;
        this.maxStreak = 0;
        this.gameCards = [];
        this.isGameOver = false;
        this.wordsLearned = 0;
        // Don't reset usedWords - keep variety across games
        
        // Reshuffle data for new game
        gameData = shuffleArray(gameData);
    }

    nextDefinition() {
        this.currentDefinitionIndex++;
        // Check if we've run out of definitions for current word
        if (this.currentDefinitionIndex >= gameData[this.currentWordIndex].definitions.length) {
            // If we've used all definitions without finding the correct one, game over
            this.endGame();
        }
    }

    nextWord() {
        // Get the current word before moving to next
        const currentWord = gameData[this.currentWordIndex]?.word;
        
        // Mark current word as used and increment words learned
        this.usedWords.add(this.currentWordIndex);
        this.wordsLearned++;
        
        this.currentWordIndex++;
        this.currentDefinitionIndex = 0; // Reset definition index for new word
        
        // Check if we've run out of words
        if (this.currentWordIndex >= gameData.length) {
            // If we've used all words, reshuffle and continue
            if (this.usedWords.size >= gameData.length) {
                this.usedWords.clear();
                gameData = shuffleArray(gameData);
                this.currentWordIndex = 0;
            } else {
                this.endGame();
                return;
            }
        }
        
        // Shuffle definitions for the new word to add variety
        gameData[this.currentWordIndex].definitions = shuffleArray(gameData[this.currentWordIndex].definitions);
        
        // Show dictionary information for the completed word and save to learnt words
        if (currentWord) {
            showDictionaryModalAndSave(currentWord);
        }
    }

    endGame() {
        this.isGameOver = true;
        this.maxStreak = Math.max(this.maxStreak, this.streak);
        showGameOverModal();
    }

    addScore(points) {
        this.score += points;
        updateScoreDisplay();
    }

    addCorrect() {
        this.correct++;
        this.streak++;
        this.maxStreak = Math.max(this.maxStreak, this.streak);
        this.addScore(10 + this.streak); // Bonus points for streaks
        showFeedback(true);
    }

    addIncorrect() {
        this.incorrect++;
        this.streak = 0;
        showFeedback(false);
        // Game ends on incorrect swipe in competitive mode (single player only)
        // In multiplayer, incorrect swipe just gives 0 points
        if (!multiplayerMode) {
            this.endGame();
        }
    }
}

// Initialize game state
const game = new GameState();

// DOM Elements - ensure they exist
const currentWordEl = document.getElementById('currentWord');
const cardStackEl = document.getElementById('cardStack');
const scoreEl = document.getElementById('score');
const correctEl = document.getElementById('correct');
const incorrectEl = document.getElementById('incorrect');
const streakEl = document.getElementById('streak');
const leftIndicator = document.getElementById('leftIndicator');
const rightIndicator = document.getElementById('rightIndicator');
const gameOverModal = document.getElementById('gameOverModal');
const playAgainBtn = document.getElementById('playAgainBtn');
const dictionaryModal = document.getElementById('dictionaryModal');
const continueBtn = document.getElementById('continueBtn');

// Check if essential DOM elements exist
if (!currentWordEl || !cardStackEl || !scoreEl) {
    console.error('Essential DOM elements not found. Make sure the HTML is loaded correctly.');
}

// Learnt Words DOM Elements
const learntWordsBtn = document.getElementById('learntWordsBtn');
const learntWordsModal = document.getElementById('learntWordsModal');
const closeLearntWordsBtn = document.getElementById('closeLearntWordsBtn');
const learntWordsCount = document.getElementById('learntWordsCount');
const learntWordsList = document.getElementById('learntWordsList');
const clearWordsBtn = document.getElementById('clearWordsBtn');
const backToGameBtn = document.getElementById('backToGameBtn');

// Leaderboard DOM Elements (may not exist in all versions)
const leaderboardBtn = document.getElementById('leaderboardBtn');
const leaderboardModal = document.getElementById('leaderboardModal');
const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
const leaderboardStats = document.getElementById('leaderboardStats');
const leaderboardList = document.getElementById('leaderboardList');
const refreshLeaderboardBtn = document.getElementById('refreshLeaderboardBtn');
const backFromLeaderboardBtn = document.getElementById('backFromLeaderboardBtn');

// Score Submission DOM Elements (may not exist in all versions)
const playerNameInput = document.getElementById('playerName');
const submitScoreBtn = document.getElementById('submitScoreBtn');
const finalWordsLearned = document.getElementById('finalWordsLearned');

// Card Management
class Card {
    constructor(definition, isCorrect) {
        this.definition = definition;
        this.isCorrect = isCorrect;
        this.element = this.createElement();
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.initialTransform = '';
        
        this.setupEventListeners();
    }

    createElement() {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<div class="card-definition">${this.definition}</div>`;
        return card;
    }

    setupEventListeners() {
        // Mouse events
        this.element.addEventListener('mousedown', this.handleStart.bind(this));
        document.addEventListener('mousemove', this.handleMove.bind(this));
        document.addEventListener('mouseup', this.handleEnd.bind(this));

        // Touch events
        this.element.addEventListener('touchstart', this.handleStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleEnd.bind(this));
    }

    handleStart(e) {
        if (this.element.classList.contains('swipe-left') || this.element.classList.contains('swipe-right')) {
            return;
        }

        this.isDragging = true;
        this.element.classList.add('dragging');

        const clientX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
        const clientY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;

        this.startX = clientX;
        this.startY = clientY;
        this.currentX = clientX;
        this.currentY = clientY;

        e.preventDefault();
    }

    handleMove(e) {
        if (!this.isDragging) return;

        const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
        const clientY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;

        this.currentX = clientX;
        this.currentY = clientY;

        const deltaX = this.currentX - this.startX;
        const deltaY = this.currentY - this.startY;
        const rotation = deltaX * 0.1;

        this.element.style.setProperty('--rotation', `${rotation}deg`);
        this.element.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.02) rotate(${rotation}deg)`;

        // Show indicators based on swipe direction
        const threshold = 50;
        if (Math.abs(deltaX) > threshold) {
            if (deltaX > 0) {
                rightIndicator.classList.add('show');
                leftIndicator.classList.remove('show');
            } else {
                leftIndicator.classList.add('show');
                rightIndicator.classList.remove('show');
            }
        } else {
            leftIndicator.classList.remove('show');
            rightIndicator.classList.remove('show');
        }

        e.preventDefault();
    }

    handleEnd(e) {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.element.classList.remove('dragging');

        const deltaX = this.currentX - this.startX;
        const threshold = 100;

        // Hide indicators
        leftIndicator.classList.remove('show');
        rightIndicator.classList.remove('show');

        if (Math.abs(deltaX) > threshold) {
            const swipeDirection = deltaX > 0 ? 'right' : 'left';
            this.swipe(swipeDirection);
        } else {
            // Snap back to center
            this.element.style.transform = '';
            this.element.style.setProperty('--rotation', '0deg');
        }
    }

    swipe(direction) {
        const isCorrectSwipe = (direction === 'right' && this.isCorrect) || (direction === 'left' && !this.isCorrect);
        
        this.element.classList.add(`swipe-${direction}`);
        
        // Process the swipe result
        setTimeout(() => {
            this.processSwipeResult(isCorrectSwipe);
            this.remove();
        }, 300);
    }

    processSwipeResult(isCorrect) {
        const wasCorrectDefinition = this.isCorrect;
        const swipeDirection = this.element.classList.contains('swipe-right') ? 'right' : 'left';
        
        // Show success animation if user swiped RIGHT on CORRECT definition
        if (wasCorrectDefinition && swipeDirection === 'right') {
            showSuccessAnimationWithFallback();
        }
        
        // Show failure animation for incorrect choices
        if (!isCorrect) {
            // Failure cases:
            // 1. Swiped LEFT on CORRECT definition (missed it)
            // 2. Swiped RIGHT on INCORRECT definition (thought it was correct)
            if ((wasCorrectDefinition && swipeDirection === 'left') || 
                (!wasCorrectDefinition && swipeDirection === 'right')) {
                showFailureAnimationWithFallback();
            }
        }
        
        if (isCorrect) {
            game.addCorrect();
        } else {
            game.addIncorrect();
        }
        
        updateStatsDisplay();
        
        // If this was the correct definition (regardless of swipe direction), move to next word
        if (wasCorrectDefinition) {
            game.nextWord();
            // Don't create next card here - dictionary modal will handle it
        } else {
            // If this was an incorrect definition, continue with next definition of same word
            game.nextDefinition();
            
            setTimeout(() => {
                if (!game.isGameOver) {
                    createNextCard();
                }
            }, 300);
        }
    }

    remove() {
        setTimeout(() => {
            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
        }, 600);
    }
}

// Game Functions
function initGame() {
    if (gameData.length === 0) {
        // Data not loaded yet
        return;
    }
    
    game.reset();
    updateWordDisplay();
    updateScoreDisplay();
    updateStatsDisplay();
    hideGameOverModal();
    createInitialCards();
}

function updateWordDisplay() {
    if (!currentWordEl) {
        console.error('currentWordEl not found');
        return;
    }
    if (game.currentWordIndex < gameData.length && gameData.length > 0) {
        currentWordEl.textContent = gameData[game.currentWordIndex].word;
        currentWordEl.classList.remove('loading');
    } else {
        currentWordEl.textContent = "Loading...";
        currentWordEl.classList.add('loading');
    }
}

function updateScoreDisplay() {
    scoreEl.textContent = game.score;
}

function updateStatsDisplay() {
    correctEl.textContent = game.correct;
    incorrectEl.textContent = game.incorrect;
    streakEl.textContent = game.streak;
}

function createInitialCards() {
    cardStackEl.innerHTML = '';
    createNextCard();
}

function createNextCard() {
    if (game.isGameOver || game.currentWordIndex >= gameData.length || gameData.length === 0) return;

    const currentWord = gameData[game.currentWordIndex];
    const currentDefinition = currentWord.definitions[game.currentDefinitionIndex];
    
    const card = new Card(currentDefinition.text, currentDefinition.correct);
    cardStackEl.appendChild(card.element);

    // Add entrance animation
    setTimeout(() => {
        card.element.style.transform = 'scale(1)';
    }, 50);
}

function showGameOverModal() {
    const finalScoreEl = document.getElementById('finalScore');
    const finalCorrectEl = document.getElementById('finalCorrect');
    const finalWordsLearnedEl = document.getElementById('finalWordsLearned');
    const finalStreakEl = document.getElementById('finalStreak');
    
    if (finalScoreEl) finalScoreEl.textContent = game.score;
    if (finalCorrectEl) finalCorrectEl.textContent = game.correct;
    if (finalWordsLearnedEl) finalWordsLearnedEl.textContent = game.wordsLearned;
    if (finalStreakEl) finalStreakEl.textContent = game.maxStreak;
    
    // Reset score submission form (if elements exist)
    if (playerNameInput) playerNameInput.value = '';
    if (submitScoreBtn) {
        submitScoreBtn.disabled = false;
        submitScoreBtn.textContent = 'Submit Score';
    }
    
    if (gameOverModal) {
        gameOverModal.classList.add('show');
    }
}

function hideGameOverModal() {
    gameOverModal.classList.remove('show');
}

// Event Listeners
playAgainBtn.addEventListener('click', () => {
    hideGameOverModal();
    game.reset();
    initGame();
});

// Score Submission Event Listeners (only if elements exist)
if (submitScoreBtn) {
    submitScoreBtn.addEventListener('click', handleScoreSubmission);
}

// Allow Enter key to submit score
if (playerNameInput) {
    playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleScoreSubmission();
        }
    });
}

// Leaderboard Event Listeners (only if elements exist)
if (leaderboardBtn) {
    leaderboardBtn.addEventListener('click', showLeaderboardModal);
}
if (closeLeaderboardBtn) {
    closeLeaderboardBtn.addEventListener('click', hideLeaderboardModal);
}
if (backFromLeaderboardBtn) {
    backFromLeaderboardBtn.addEventListener('click', hideLeaderboardModal);
}
if (refreshLeaderboardBtn) {
    refreshLeaderboardBtn.addEventListener('click', loadLeaderboard);
}

// Continue button (from dictionary modal)
continueBtn.addEventListener('click', () => {
    hideDictionaryModal();
    createCards();
});

// Learnt Words Event Listeners
learntWordsBtn.addEventListener('click', showLearntWordsModal);
closeLearntWordsBtn.addEventListener('click', hideLearntWordsModal);
backToGameBtn.addEventListener('click', hideLearntWordsModal);
clearWordsBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all learnt words? This cannot be undone.')) {
        learntWordsManager.clearAllWords();
        displayLearntWords();
        updateLearntWordsCount();
    }
});

// Close modals when clicking outside
[gameOverModal, dictionaryModal, learntWordsModal, leaderboardModal].filter(m => m !== null).forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if ((gameOverModal && gameOverModal.classList.contains('show')) || 
        (dictionaryModal && dictionaryModal.classList.contains('show')) || 
        (learntWordsModal && learntWordsModal.classList.contains('show')) ||
        (leaderboardModal && leaderboardModal.classList.contains('show'))) {
        return; // Don't handle game controls when modals are open
    }

    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            if (currentCard) swipeCard('left');
            break;
        case 'ArrowRight':
            e.preventDefault();
            if (currentCard) swipeCard('right');
            break;
        case 'Enter':
        case ' ':
            e.preventDefault();
            if (currentCard) swipeCard('right');
            break;
        case 'Escape':
            e.preventDefault();
            if (currentCard) swipeCard('left');
            break;
        case 'l':
        case 'L':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                showLearntWordsModal();
            }
            break;
        case 'b':
        case 'B':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                showLeaderboardModal();
            }
            break;
    }
});

// Initialize the game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadGameData);
} else {
    // DOM is already ready
    loadGameData();
}

// Add visual feedback for correct/incorrect answers
function showFeedback(isCorrect) {
    const feedback = document.createElement('div');
    feedback.className = `feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    feedback.textContent = isCorrect ? '+' + (10 + game.streak) : '✗';
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        feedback.style.opacity = '0';
        feedback.style.transform = 'translateY(-50px)';
    }, 100);
    
    setTimeout(() => {
        if (document.body.contains(feedback)) {
            document.body.removeChild(feedback);
        }
    }, 800);
}

// Mobile animation detection and fallback
function isMobileDevice() {
    return window.innerWidth <= 480 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function hasAnimationSupport() {
    const testEl = document.createElement('div');
    testEl.style.cssText = 'animation: test 1s;';
    return testEl.style.animation !== '';
}

// Simple fallback animation for mobile devices with limited animation support
function showSimpleSuccessAnimation() {
    console.log('Showing simple success animation fallback');
    
    const feedback = document.createElement('div');
    feedback.className = 'simple-success-feedback';
    feedback.innerHTML = '<div style="font-size: 4rem; color: #4ecdc4;">✓</div><div style="font-size: 1.5rem; color: #4ecdc4; margin-top: 10px;">Excellent!</div>';
    
    // Style the feedback
    feedback.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10000;
        text-align: center;
        pointer-events: none;
        background: rgba(0, 0, 0, 0.8);
        border-radius: 15px;
        padding: 30px;
        border: 2px solid #4ecdc4;
        opacity: 0;
        transition: opacity 0.3s ease, transform 0.3s ease;
    `;
    
    document.body.appendChild(feedback);
    
    // Animate in
    setTimeout(() => {
        feedback.style.opacity = '1';
        feedback.style.transform = 'translate(-50%, -50%) scale(1.1)';
    }, 50);
    
    // Animate out
    setTimeout(() => {
        feedback.style.opacity = '0';
        feedback.style.transform = 'translate(-50%, -50%) scale(0.9)';
    }, 800);
    
    // Remove
    setTimeout(() => {
        if (document.body.contains(feedback)) {
            document.body.removeChild(feedback);
        }
    }, 1100);
}

function showSimpleFailureAnimation() {
    console.log('Showing simple failure animation fallback');
    
    const feedback = document.createElement('div');
    feedback.className = 'simple-failure-feedback';
    feedback.innerHTML = '<div style="font-size: 4rem; color: #ff6b6b;">✗</div><div style="font-size: 1.5rem; color: #ff6b6b; margin-top: 10px;">Oops!</div>';
    
    // Style the feedback
    feedback.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10000;
        text-align: center;
        pointer-events: none;
        background: rgba(0, 0, 0, 0.8);
        border-radius: 15px;
        padding: 30px;
        border: 2px solid #ff6b6b;
        opacity: 0;
        transition: opacity 0.3s ease, transform 0.3s ease;
    `;
    
    document.body.appendChild(feedback);
    
    // Animate in with slight shake
    setTimeout(() => {
        feedback.style.opacity = '1';
        feedback.style.transform = 'translate(-50%, -50%) scale(1.1)';
    }, 50);
    
    // Add shake effect
    setTimeout(() => {
        feedback.style.transform = 'translate(-50%, -50%) scale(1.1) rotate(2deg)';
    }, 150);
    
    setTimeout(() => {
        feedback.style.transform = 'translate(-50%, -50%) scale(1.1) rotate(-2deg)';
    }, 250);
    
    setTimeout(() => {
        feedback.style.transform = 'translate(-50%, -50%) scale(1.1) rotate(0deg)';
    }, 350);
    
    // Animate out
    setTimeout(() => {
        feedback.style.opacity = '0';
        feedback.style.transform = 'translate(-50%, -50%) scale(0.9)';
    }, 800);
    
    // Remove
    setTimeout(() => {
        if (document.body.contains(feedback)) {
            document.body.removeChild(feedback);
        }
    }, 1100);
}

// Enhanced animation functions with fallback support
function showSuccessAnimationWithFallback() {
    const useFallback = isMobileDevice() && !hasAnimationSupport();
    
    if (useFallback) {
        showSimpleSuccessAnimation();
    } else {
        showSuccessAnimation();
    }
}

function showFailureAnimationWithFallback() {
    const useFallback = isMobileDevice() && !hasAnimationSupport();
    
    if (useFallback) {
        showSimpleFailureAnimation();
    } else {
        showFailureAnimation();
    }
}

// Success Animation Functions
function createParticle(x, y) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Random direction and distance
    const angle = Math.random() * 2 * Math.PI;
    const distance = 100 + Math.random() * 200;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.setProperty('--dx', dx + 'px');
    particle.style.setProperty('--dy', dy + 'px');
    
    // Random color variation
    const colors = ['#4ecdc4', '#44a08d', '#6bcf7f', '#ffd93d'];
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    
    document.body.appendChild(particle);
    
    // Start animation
    setTimeout(() => particle.classList.add('burst'), 10);
    
    // Remove particle after animation
    setTimeout(() => {
        if (document.body.contains(particle)) {
            document.body.removeChild(particle);
        }
    }, 1000);
}

function showSuccessAnimation() {
    console.log('Triggering success animation'); // Debug log
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'success-overlay';
    
    // Create success icon
    const icon = document.createElement('div');
    icon.className = 'success-icon';
    icon.textContent = '✓';
    
    // Create success text
    const text = document.createElement('div');
    text.className = 'success-text';
    text.textContent = 'Excellent!';
    
    overlay.appendChild(icon);
    overlay.appendChild(text);
    document.body.appendChild(overlay);
    
    // Force a reflow to ensure the element is rendered
    overlay.offsetHeight;
    
    // Show overlay with slight delay to ensure DOM is ready
    setTimeout(() => {
        overlay.classList.add('show');
        console.log('Success animation show class added'); // Debug log
    }, 10);
    
    // Create particles from center
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    // Reduce particle count on mobile for better performance
    const isMobile = window.innerWidth <= 480;
    const particleCount = isMobile ? 10 : 20;
    
    // Create multiple waves of particles
    for (let i = 0; i < particleCount; i++) {
        setTimeout(() => {
            createParticle(centerX, centerY);
        }, i * 50);
    }
    
    // Remove overlay after animation
    setTimeout(() => {
        if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
            console.log('Success animation overlay removed'); // Debug log
        }
    }, 1200);
}

// Failure Animation Functions
function createFailureParticle(x, y) {
    const particle = document.createElement('div');
    particle.className = 'failure-particle';
    
    // Random direction but mostly downward for "failure" feel
    const angle = Math.PI/4 + Math.random() * Math.PI/2; // Between 45-135 degrees (downward)
    const distance = 80 + Math.random() * 150;
    const dx = Math.cos(angle) * distance * (Math.random() > 0.5 ? 1 : -1);
    const dy = Math.sin(angle) * distance;
    
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.setProperty('--dx', dx + 'px');
    particle.style.setProperty('--dy', dy + 'px');
    
    // Red color variations
    const colors = ['#ff6b6b', '#ee5a52', '#ff4757', '#ff3838'];
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    
    document.body.appendChild(particle);
    
    // Force a reflow
    particle.offsetHeight;
    
    // Start animation
    setTimeout(() => particle.classList.add('drop'), 10);
    
    // Remove particle after animation
    setTimeout(() => {
        if (document.body.contains(particle)) {
            document.body.removeChild(particle);
        }
    }, 1200);
}

function showFailureAnimation() {
    console.log('Triggering failure animation'); // Debug log
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'failure-overlay';
    
    // Create failure icon
    const icon = document.createElement('div');
    icon.className = 'failure-icon';
    icon.textContent = '✗';
    
    // Create failure text
    const text = document.createElement('div');
    text.className = 'failure-text';
    text.textContent = 'Oops!';
    
    overlay.appendChild(icon);
    overlay.appendChild(text);
    document.body.appendChild(overlay);
    
    // Force a reflow to ensure the element is rendered
    overlay.offsetHeight;
    
    // Show overlay with slight delay to ensure DOM is ready
    setTimeout(() => {
        overlay.classList.add('show');
        console.log('Failure animation show class added'); // Debug log
    }, 10);
    
    // Create particles from center with failure pattern
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    // Reduce particle count on mobile for better performance
    const isMobile = window.innerWidth <= 480;
    const particleCount = isMobile ? 8 : 15;
    
    // Create fewer particles with downward motion
    for (let i = 0; i < particleCount; i++) {
        setTimeout(() => {
            createFailureParticle(centerX, centerY);
        }, i * 60);
    }
    
    // Remove overlay after animation
    setTimeout(() => {
        if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
            console.log('Failure animation overlay removed'); // Debug log
        }
    }, 1200);
}

// Add feedback styles dynamically
const feedbackStyles = `
.feedback {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 2rem;
    font-weight: bold;
    z-index: 1001;
    pointer-events: none;
    transition: all 0.7s ease;
}

.feedback.correct {
    color: #4ecdc4;
}

.feedback.incorrect {
    color: #ff6b6b;
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = feedbackStyles;
document.head.appendChild(styleSheet);

// Dictionary API Functions
async function fetchWordDefinition(word) {
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
        if (!response.ok) {
            throw new Error('Word not found');
        }
        const data = await response.json();
        return data[0]; // Return first result
    } catch (error) {
        console.error('Error fetching dictionary data:', error);
        return null;
    }
}

function displayDictionaryInfo(wordData, originalWord) {
    const dictWordEl = document.getElementById('dictWord');
    const dictPhoneticEl = document.getElementById('dictPhonetic');
    const dictContentEl = document.getElementById('dictContent');
    const audioBtn = document.getElementById('audioBtn');

    if (!wordData) {
        // Fallback if API fails
        dictWordEl.textContent = originalWord;
        dictPhoneticEl.textContent = '';
        dictContentEl.innerHTML = '<div class="loading-dictionary">Dictionary information not available</div>';
        audioBtn.style.display = 'none';
        return;
    }

    // Set word and phonetic
    dictWordEl.textContent = wordData.word || originalWord;
    dictPhoneticEl.textContent = wordData.phonetic || '';

    // Handle audio
    const audioUrl = wordData.phonetics?.find(p => p.audio)?.audio;
    if (audioUrl) {
        audioBtn.style.display = 'flex';
        audioBtn.onclick = () => {
            const audio = new Audio(audioUrl);
            audio.play().catch(e => console.log('Audio playback failed:', e));
        };
    } else {
        audioBtn.style.display = 'none';
    }

    // Build meanings content
    let contentHTML = '';
    if (wordData.meanings && wordData.meanings.length > 0) {
        wordData.meanings.forEach(meaning => {
            contentHTML += `<div class="part-of-speech">${meaning.partOfSpeech}</div>`;
            
            if (meaning.definitions && meaning.definitions.length > 0) {
                meaning.definitions.slice(0, 3).forEach((def, index) => { // Show max 3 definitions per part of speech
                    contentHTML += `
                        <div class="definition">
                            <div class="definition-text">${def.definition}</div>
                            ${def.example ? `<div class="example">"${def.example}"</div>` : ''}
                        </div>
                    `;
                });
            }
        });
    } else {
        contentHTML = '<div class="loading-dictionary">No definitions available</div>';
    }

    dictContentEl.innerHTML = contentHTML;
}

async function showDictionaryModal(word) {
    // Show modal with loading state
    document.getElementById('dictWord').textContent = word;
    document.getElementById('dictPhonetic').textContent = '';
    document.getElementById('dictContent').innerHTML = '<div class="loading-dictionary">Loading definition...</div>';
    document.getElementById('audioBtn').style.display = 'none';
    
    dictionaryModal.classList.add('show');
    
    // Fetch and display dictionary data
    const wordData = await fetchWordDefinition(word);
    displayDictionaryInfo(wordData, word);
}

function hideDictionaryModal() {
    dictionaryModal.classList.remove('show');
}

// Learnt Words Functions
function showLearntWordsModal() {
    updateLearntWordsDisplay();
    learntWordsModal.classList.add('show');
}

function hideLearntWordsModal() {
    learntWordsModal.classList.remove('show');
}

function updateLearntWordsCount() {
    const learntWords = learntWordsManager.getLearntWords();
    learntWordsCount.textContent = learntWords.length;
}

function updateLearntWordsDisplay() {
    const learntWords = learntWordsManager.getLearntWords();
    learntWordsCount.textContent = learntWords.length;

    if (learntWords.length === 0) {
        learntWordsList.innerHTML = `
            <div class="empty-learnt-words">
                <div class="empty-learnt-words-icon">📚</div>
                <p>No words learnt yet!</p>
                <p>Start playing to build your vocabulary.</p>
            </div>
        `;
        return;
    }

    let html = '';
    learntWords.forEach(wordItem => {
        const date = new Date(wordItem.dateAdded).toLocaleDateString();
        const dictData = wordItem.dictionaryData;
        
        html += `
            <div class="learnt-word-item">
                <div class="learnt-word-title">
                    ${wordItem.word}
                    ${dictData?.phonetic ? `<span class="learnt-word-phonetic">${dictData.phonetic}</span>` : ''}
                </div>
                <div class="learnt-word-date">Learnt on ${date}</div>
                <div class="learnt-word-definitions">
        `;

        if (dictData?.meanings && dictData.meanings.length > 0) {
            dictData.meanings.forEach(meaning => {
                html += `<div class="learnt-definition-pos">${meaning.partOfSpeech}</div>`;
                
                if (meaning.definitions && meaning.definitions.length > 0) {
                    meaning.definitions.slice(0, 2).forEach(def => { // Show max 2 definitions per part of speech
                        html += `
                            <div class="learnt-word-definition">
                                <div class="learnt-definition-text">${def.definition}</div>
                                ${def.example ? `<div class="learnt-definition-example">"${def.example}"</div>` : ''}
                            </div>
                        `;
                    });
                }
            });
        } else {
            html += `
                <div class="learnt-word-definition">
                    <div class="learnt-definition-text">Definition not available</div>
                </div>
            `;
        }

        html += `
                </div>
            </div>
        `;
    });

    learntWordsList.innerHTML = html;
}

function clearAllLearntWords() {
    if (confirm('Are you sure you want to clear all learnt words? This action cannot be undone.')) {
        learntWordsManager.clearAllWords();
        updateLearntWordsDisplay();
        console.log('All learnt words cleared by user');
    }
}

// Enhanced showDictionaryModal to save word data
async function showDictionaryModalAndSave(word) {
    // Show modal with loading state
    document.getElementById('dictWord').textContent = word;
    document.getElementById('dictPhonetic').textContent = '';
    document.getElementById('dictContent').innerHTML = '<div class="loading-dictionary">Loading definition...</div>';
    document.getElementById('audioBtn').style.display = 'none';
    
    dictionaryModal.classList.add('show');
    
    // Fetch and display dictionary data
    const wordData = await fetchWordDefinition(word);
    displayDictionaryInfo(wordData, word);
    
    // Add word to learnt words with dictionary data
    learntWordsManager.addLearntWord(word, wordData);
}

// Leaderboard API Functions
async function submitScore(playerName, score, wordsLearned) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/submit-score`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                player_name: playerName,
                score: score,
                words_learned: wordsLearned
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to submit score');
        }

        return data;
    } catch (error) {
        console.error('Error submitting score:', error);
        throw error;
    }
}

async function fetchLeaderboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/leaderboard`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch leaderboard');
        }

        return data;
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        throw error;
    }
}

async function fetchStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/stats`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch stats');
        }

        return data;
    } catch (error) {
        console.error('Error fetching stats:', error);
        throw error;
    }
}

// Score Submission Functions
function handleScoreSubmission() {
    if (!playerNameInput || !submitScoreBtn) {
        console.warn('Score submission elements not found');
        return;
    }
    
    const playerName = playerNameInput.value.trim();
    
    if (!playerName) {
        alert('Please enter your name');
        return;
    }

    if (playerName.length > 20) {
        alert('Name too long (max 20 characters)');
        return;
    }

    submitScoreBtn.disabled = true;
    submitScoreBtn.textContent = 'Submitting...';

    submitScore(playerName, game.score, game.wordsLearned)
        .then(result => {
            alert(`Score submitted! You ranked #${result.rank}`);
            playerNameInput.value = '';
            hideGameOverModal();
            if (leaderboardModal) {
                showLeaderboardModal(); // Show leaderboard after submission
            }
        })
        .catch(error => {
            alert(`Failed to submit score: ${error.message}`);
        })
        .finally(() => {
            if (submitScoreBtn) {
                submitScoreBtn.disabled = false;
                submitScoreBtn.textContent = 'Submit Score';
            }
        });
}

// Leaderboard Display Functions
async function showLeaderboardModal() {
    leaderboardModal.classList.add('show');
    await loadLeaderboard();
}

function hideLeaderboardModal() {
    leaderboardModal.classList.remove('show');
}

async function loadLeaderboard() {
    try {
        // Show loading state
        leaderboardList.innerHTML = '<div class="loading-leaderboard">Loading leaderboard...</div>';
        leaderboardStats.innerHTML = '<div class="loading-leaderboard">Loading stats...</div>';

        // Fetch data in parallel
        const [leaderboardData, statsData] = await Promise.all([
            fetchLeaderboard(),
            fetchStats()
        ]);

        // Display stats
        displayLeaderboardStats(statsData);
        
        // Display leaderboard
        displayLeaderboard(leaderboardData.leaderboard);

    } catch (error) {
        console.error('Error loading leaderboard:', error);
        leaderboardList.innerHTML = '<div class="empty-leaderboard">Failed to load leaderboard</div>';
        leaderboardStats.innerHTML = '<div class="empty-leaderboard">Failed to load stats</div>';
    }
}

function displayLeaderboardStats(stats) {
    leaderboardStats.innerHTML = `
        <div class="leaderboard-stat">
            <span class="leaderboard-stat-value">${stats.total_games}</span>
            <span class="leaderboard-stat-label">Total Games</span>
        </div>
        <div class="leaderboard-stat">
            <span class="leaderboard-stat-value">${stats.highest_score}</span>
            <span class="leaderboard-stat-label">High Score</span>
        </div>
        <div class="leaderboard-stat">
            <span class="leaderboard-stat-value">${stats.average_score}</span>
            <span class="leaderboard-stat-label">Avg Score</span>
        </div>
        <div class="leaderboard-stat">
            <span class="leaderboard-stat-value">${stats.total_words_learned}</span>
            <span class="leaderboard-stat-label">Words Learned</span>
        </div>
    `;
}

function displayLeaderboard(leaderboard) {
    if (leaderboard.length === 0) {
        leaderboardList.innerHTML = `
            <div class="empty-leaderboard">
                <div class="empty-leaderboard-icon">🏆</div>
                <p>No scores yet!</p>
                <p>Be the first to set a record.</p>
            </div>
        `;
        return;
    }

    let html = '';
    leaderboard.forEach(entry => {
        const rankClass = entry.rank <= 3 ? `top-3 rank-${entry.rank}` : '';
        
        html += `
            <div class="leaderboard-entry ${rankClass}">
                <div class="leaderboard-rank">#${entry.rank}</div>
                <div class="leaderboard-player">
                    <div class="leaderboard-player-name">${escapeHtml(entry.player_name)}</div>
                    <div class="leaderboard-player-info">${entry.words_learned} words learned</div>
                </div>
                <div class="leaderboard-score">
                    <div class="leaderboard-score-value">${entry.score}</div>
                    <div class="leaderboard-score-time">${entry.time_ago}</div>
                </div>
            </div>
        `;
    });

    leaderboardList.innerHTML = html;
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Swipe Handling - Updated for competitive mode
function handleSwipe(direction) {
    if (game.isGameOver || !currentCard) return;

    const currentWord = gameData[game.currentWordIndex];
    const currentDefinition = currentWord.definitions[game.currentDefinitionIndex];
    
    // Determine if the swipe was correct
    let isCorrect = false;
    
    if (direction === 'right' && currentDefinition.correct) {
        // Swiped right on correct definition - CORRECT
        isCorrect = true;
        game.addCorrect();
        // Trigger success animation
        showSuccessAnimation();
        // Move to next word after a delay
        setTimeout(() => {
            if (!game.isGameOver) {
                game.nextWord();
            }
        }, 1200);
    } else if (direction === 'left' && !currentDefinition.correct) {
        // Swiped left on incorrect definition - CORRECT
        isCorrect = true;
        game.addCorrect();
        // Continue with same word, next definition
        setTimeout(() => {
            if (!game.isGameOver) {
                game.nextDefinition();
                createCards();
            }
        }, 500);
    } else {
        // Wrong swipe - GAME OVER in competitive mode
        isCorrect = false;
        game.addIncorrect();
        // Trigger failure animation
        showFailureAnimation();
        // Game ends automatically via addIncorrect()
    }

    // Update display
    updateScoreDisplay();
    updateStatsDisplay();
}

function swipeCard(direction) {
    handleSwipe(direction);
    
    // Animate the card off screen
    if (currentCard) {
        currentCard.classList.add(`swipe-${direction}`);
        
        // Remove the card after animation
        setTimeout(() => {
            if (currentCard && currentCard.parentNode) {
                currentCard.parentNode.removeChild(currentCard);
            }
            currentCard = null;
        }, 600);
    }
}

// Card Creation - Updated for new game flow
let currentCard = null;

function createCards() {
    if (game.isGameOver) return;

    // Clear existing cards
    cardStackEl.innerHTML = '';
    currentCard = null;

    const currentWord = gameData[game.currentWordIndex];
    if (!currentWord) {
        game.endGame();
        return;
    }

    // Create single card for current definition
    const definition = currentWord.definitions[game.currentDefinitionIndex];
    if (!definition) {
        game.endGame();
        return;
    }

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <div class="card-definition">${definition.text}</div>
    `;

    // Add touch and mouse event listeners
    addCardInteraction(card);
    
    cardStackEl.appendChild(card);
    currentCard = card;
    
    // Update word display
    updateWordDisplay();
}

function addCardInteraction(card) {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let isDragging = false;

    // Touch Events
    card.addEventListener('touchstart', handleStart, { passive: true });
    card.addEventListener('touchmove', handleMove, { passive: false });
    card.addEventListener('touchend', handleEnd, { passive: true });

    // Mouse Events
    card.addEventListener('mousedown', handleStart);
    card.addEventListener('mousemove', handleMove);
    card.addEventListener('mouseup', handleEnd);
    card.addEventListener('mouseleave', handleEnd);

    function handleStart(e) {
        if (game.isGameOver) return;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        startX = clientX;
        startY = clientY;
        currentX = clientX;
        currentY = clientY;
        isDragging = true;
        
        card.classList.add('dragging');
        e.preventDefault();
    }

    function handleMove(e) {
        if (!isDragging || game.isGameOver) return;
        
        e.preventDefault();
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        currentX = clientX;
        currentY = clientY;
        
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;
        const rotation = deltaX * 0.1;
        
        card.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg)`;
        card.style.setProperty('--rotation', `${rotation}deg`);
        
        // Show indicators based on swipe direction
        const threshold = 50;
        if (Math.abs(deltaX) > threshold) {
            if (deltaX > 0) {
                rightIndicator.classList.add('show');
                leftIndicator.classList.remove('show');
            } else {
                leftIndicator.classList.add('show');
                rightIndicator.classList.remove('show');
            }
        } else {
            leftIndicator.classList.remove('show');
            rightIndicator.classList.remove('show');
        }
    }

    function handleEnd(e) {
        if (!isDragging || game.isGameOver) return;
        
        isDragging = false;
        card.classList.remove('dragging');
        
        const deltaX = currentX - startX;
        const threshold = 100;
        
        leftIndicator.classList.remove('show');
        rightIndicator.classList.remove('show');
        
        if (Math.abs(deltaX) > threshold) {
            const direction = deltaX > 0 ? 'right' : 'left';
            swipeCard(direction);
        } else {
            // Snap back to center
            card.style.transform = '';
            card.style.removeProperty('--rotation');
        }
    }
}

// Update displays
function updateWordDisplay() {
    if (game.isGameOver || !gameData[game.currentWordIndex]) return;
    currentWordEl.textContent = gameData[game.currentWordIndex].word;
}

function updateScoreDisplay() {
    scoreEl.textContent = game.score;
}

function updateStatsDisplay() {
    correctEl.textContent = game.correct;
    incorrectEl.textContent = game.incorrect;
    streakEl.textContent = game.streak;
}

// Initialize Game
function initGame() {
    game.reset();
    updateWordDisplay();
    updateScoreDisplay();
    updateStatsDisplay();
    updateLearntWordsCount();
    createCards();
}

// ==================== MULTIPLAYER MODE ====================

// Socket.IO connection
let socket = null;
let multiplayerMode = false;
let currentRoomCode = null;
let multiplayerGameState = {
    words: [],
    currentWordIndex: 0,
    wordStartTime: null,
    opponentScore: 0,
    opponentWordIndex: 0,
    opponentName: '',
    isReady: false
};

// Multiplayer DOM Elements
const multiplayerBtn = document.getElementById('multiplayerBtn');
const multiplayerLobbyModal = document.getElementById('multiplayerLobbyModal');
const multiplayerGameHeader = document.getElementById('multiplayerGameHeader');
const multiplayerResultsModal = document.getElementById('multiplayerResultsModal');

const createGameBtn = document.getElementById('createGameBtn');
const joinGameBtn = document.getElementById('joinGameBtn');
const createGameSection = document.getElementById('createGameSection');
const joinGameSection = document.getElementById('joinGameSection');
const readySection = document.getElementById('readySection');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const roomCodeInput = document.getElementById('roomCodeInput');
const multiplayerPlayerName = document.getElementById('multiplayerPlayerName');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const readyBtn = document.getElementById('readyBtn');
const opponentNameDisplay = document.getElementById('opponentNameDisplay');
const opponentNameInGame = document.getElementById('opponentNameInGame');
const opponentScore = document.getElementById('opponentScore');
const opponentWordIndex = document.getElementById('opponentWordIndex');
const connectionStatus = document.getElementById('connectionStatus');
const connectionText = document.getElementById('connectionText');
const statusDot = document.querySelector('.status-dot');

const cancelCreateBtn = document.getElementById('cancelCreateBtn');
const cancelJoinBtn = document.getElementById('cancelJoinBtn');
const cancelReadyBtn = document.getElementById('cancelReadyBtn');
const rematchBtn = document.getElementById('rematchBtn');
const backToMenuBtn = document.getElementById('backToMenuBtn');
const yourFinalScore = document.getElementById('yourFinalScore');
const opponentFinalScore = document.getElementById('opponentFinalScore');
const winnerAnnouncement = document.getElementById('winnerAnnouncement');
const resultsTitle = document.getElementById('resultsTitle');
const opponentResultLabel = document.getElementById('opponentResultLabel');

// Initialize Socket.IO
function initSocket() {
    if (socket && socket.connected) {
        return;
    }
    
    // For Render/production, try polling first as WebSocket might not be supported
    // Socket.IO will automatically upgrade to WebSocket if available
    socket = io({
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        transports: ['polling', 'websocket'],  // Try polling first, then upgrade to websocket
        upgrade: true,
        rememberUpgrade: true,
        timeout: 20000,
        forceNew: false
    });
    
    socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        updateConnectionStatus(false);
        // Show user-friendly error message
        if (multiplayerMode) {
            alert('Unable to connect to multiplayer server. Please check your connection and try again.');
        }
    });
    
    socket.on('connect', () => {
        console.log('Connected to server');
        updateConnectionStatus(true);
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        updateConnectionStatus(false);
        
        // Attempt reconnection
        if (multiplayerMode) {
            setTimeout(() => {
                if (!socket.connected) {
                    initSocket();
                }
            }, 2000);
        }
    });
    
    socket.on('reconnect', () => {
        console.log('Reconnected to server');
        updateConnectionStatus(true);
        
        // Rejoin room if in multiplayer mode
        if (multiplayerMode && currentRoomCode) {
            // Room state should be maintained, but we may need to re-sync
            socket.emit('rejoin_room', { room_code: currentRoomCode });
        }
    });
    
    socket.on('connected', (data) => {
        console.log('Server connected:', data);
    });
    
    socket.on('room_created', (data) => {
        currentRoomCode = data.room_code;
        roomCodeDisplay.textContent = data.room_code;
        createGameSection.style.display = 'block';
        document.getElementById('lobbyContent').style.display = 'none';
    });
    
    socket.on('opponent_joined', (data) => {
        multiplayerGameState.opponentName = data.opponent_name;
        opponentNameDisplay.textContent = data.opponent_name;
        opponentNameInGame.textContent = data.opponent_name;
        opponentResultLabel.textContent = data.opponent_name;
        document.getElementById('waitingText').textContent = `${data.opponent_name} joined! Click Ready when you're ready to start.`;
        readySection.style.display = 'block';
        createGameSection.style.display = 'none';
    });
    
    socket.on('room_joined', (data) => {
        currentRoomCode = data.room_code;
        multiplayerGameState.opponentName = data.opponent_name;
        opponentNameDisplay.textContent = data.opponent_name;
        opponentNameInGame.textContent = data.opponent_name;
        opponentResultLabel.textContent = data.opponent_name;
        readySection.style.display = 'block';
        joinGameSection.style.display = 'none';
    });
    
    socket.on('join_error', (data) => {
        alert(data.message || 'Failed to join game');
    });
    
    socket.on('game_start', (data) => {
        multiplayerGameState.words = data.words;
        multiplayerGameState.opponentName = data.opponent_name;
        opponentNameInGame.textContent = data.opponent_name;
        startMultiplayerGame();
    });
    
    socket.on('opponent_progress', (data) => {
        multiplayerGameState.opponentScore = data.opponent_score;
        multiplayerGameState.opponentWordIndex = data.opponent_word_index;
        updateOpponentDisplay();
        
        if (data.opponent_finished) {
            // Opponent finished, wait for player to finish
        }
    });
    
    socket.on('game_end', (data) => {
        endMultiplayerGame(data);
    });
    
    socket.on('opponent_disconnected', (data) => {
        alert('Opponent disconnected. Returning to menu.');
        exitMultiplayerMode();
    });
    
    socket.on('swipe_confirmed', (data) => {
        // Server confirmed the swipe
        game.score = data.total_score;
        updateScoreDisplay();
    });
    
    socket.on('error', (data) => {
        alert(data.message || 'An error occurred');
    });
}

function updateConnectionStatus(connected) {
    if (connected) {
        connectionText.textContent = 'Connected';
        statusDot.classList.remove('disconnected');
    } else {
        connectionText.textContent = 'Disconnected';
        statusDot.classList.add('disconnected');
    }
}

function updateOpponentDisplay() {
    opponentScore.textContent = multiplayerGameState.opponentScore;
    opponentWordIndex.textContent = multiplayerGameState.opponentWordIndex;
}

// Multiplayer Event Listeners
multiplayerBtn.addEventListener('click', () => {
    initSocket();
    showMultiplayerLobby();
});

createGameBtn.addEventListener('click', () => {
    const playerName = prompt('Enter your name:', 'Player') || 'Player';
    socket.emit('create_game', { player_name: playerName });
});

joinGameBtn.addEventListener('click', () => {
    joinGameSection.style.display = 'block';
    document.getElementById('lobbyContent').style.display = 'none';
});

joinRoomBtn.addEventListener('click', () => {
    const roomCode = roomCodeInput.value.trim().toUpperCase();
    const playerName = multiplayerPlayerName.value.trim() || 'Player';
    
    if (roomCode.length !== 6) {
        alert('Please enter a valid 6-character room code');
        return;
    }
    
    socket.emit('join_game', {
        room_code: roomCode,
        player_name: playerName
    });
});

readyBtn.addEventListener('click', () => {
    multiplayerGameState.isReady = true;
    socket.emit('player_ready', { room_code: currentRoomCode });
    readyBtn.disabled = true;
    readyBtn.textContent = 'Waiting for opponent...';
});

cancelCreateBtn.addEventListener('click', () => {
    exitMultiplayerMode();
});

cancelJoinBtn.addEventListener('click', () => {
    joinGameSection.style.display = 'none';
    document.getElementById('lobbyContent').style.display = 'block';
    roomCodeInput.value = '';
    multiplayerPlayerName.value = '';
});

cancelReadyBtn.addEventListener('click', () => {
    exitMultiplayerMode();
});

rematchBtn.addEventListener('click', () => {
    hideMultiplayerResults();
    showMultiplayerLobby();
});

backToMenuBtn.addEventListener('click', () => {
    exitMultiplayerMode();
});

function showMultiplayerLobby() {
    multiplayerLobbyModal.classList.add('show');
    document.getElementById('lobbyContent').style.display = 'block';
    createGameSection.style.display = 'none';
    joinGameSection.style.display = 'none';
    readySection.style.display = 'none';
}

function hideMultiplayerLobby() {
    multiplayerLobbyModal.classList.remove('show');
}

function startMultiplayerGame() {
    multiplayerMode = true;
    hideMultiplayerLobby();
    multiplayerGameHeader.style.display = 'block';
    
    // Reset game state for multiplayer
    game.reset();
    game.isGameOver = false; // Ensure game is not over
    multiplayerGameState.currentWordIndex = 0;
    multiplayerGameState.wordStartTime = Date.now();
    
    // Use multiplayer words
    gameData = multiplayerGameState.words;
    game.currentWordIndex = 0;
    game.currentDefinitionIndex = 0;
    
    // Shuffle definitions for each word
    gameData.forEach(word => {
        word.definitions = shuffleArray(word.definitions);
    });
    
    updateWordDisplay();
    updateScoreDisplay();
    updateStatsDisplay();
    updateOpponentDisplay();
    createCards();
}

function endMultiplayerGame(data) {
    multiplayerMode = false;
    multiplayerGameHeader.style.display = 'none';
    
    yourFinalScore.textContent = data.your_score;
    opponentFinalScore.textContent = data.opponent_score;
    
    if (data.is_tie) {
        winnerAnnouncement.textContent = "It's a tie!";
        winnerAnnouncement.style.color = '#ffd93d';
    } else if (data.winner === multiplayerGameState.opponentName) {
        winnerAnnouncement.textContent = `${data.winner} wins!`;
        winnerAnnouncement.style.color = '#ff6b6b';
    } else {
        winnerAnnouncement.textContent = 'You win! 🎉';
        winnerAnnouncement.style.color = '#4ecdc4';
    }
    
    showMultiplayerResults();
}

function showMultiplayerResults() {
    multiplayerResultsModal.classList.add('show');
}

function hideMultiplayerResults() {
    multiplayerResultsModal.classList.remove('show');
}

function exitMultiplayerMode() {
    multiplayerMode = false;
    currentRoomCode = null;
    multiplayerGameState = {
        words: [],
        currentWordIndex: 0,
        wordStartTime: null,
        opponentScore: 0,
        opponentWordIndex: 0,
        opponentName: '',
        isReady: false
    };
    
    hideMultiplayerLobby();
    hideMultiplayerResults();
    multiplayerGameHeader.style.display = 'none';
    
    // Reload game data for single player
    loadGameData();
}

// Override swipe handling for multiplayer
const originalHandleSwipe = handleSwipe;
handleSwipe = function(direction) {
    if (!multiplayerMode) {
        originalHandleSwipe(direction);
        return;
    }
    
    // Multiplayer swipe handling
    if (game.isGameOver || !currentCard) return;
    
    const currentWord = gameData[game.currentWordIndex];
    const currentDefinition = currentWord.definitions[game.currentDefinitionIndex];
    
    if (!currentWord || !currentDefinition) {
        return;
    }
    
    const swipeTime = Date.now() - multiplayerGameState.wordStartTime;
    const isCorrectSwipe = (direction === 'right' && currentDefinition.correct) || 
                           (direction === 'left' && !currentDefinition.correct);
    
    // Calculate score locally for immediate feedback
    const streak = game.streak;
    let score = 0;
    
    if (isCorrectSwipe) {
        const baseScore = 10;
        const streakBonus = streak;
        const speedBonus = Math.max(0, 20 - (swipeTime / 100));
        score = baseScore + streakBonus + speedBonus;
        
        game.addCorrect();
        game.addScore(score);
    } else {
        score = 0;
        game.addIncorrect();
        // In multiplayer, incorrect swipe doesn't end game, just gives 0 points
    }
    
    // Send to server
    socket.emit('swipe_action', {
        room_code: currentRoomCode,
        word_index: game.currentWordIndex,
        definition_index: game.currentDefinitionIndex,
        direction: direction,
        swipe_time_ms: swipeTime,
        is_correct: isCorrectSwipe
    });
    
    // Update UI immediately (optimistic update)
    updateScoreDisplay();
    updateStatsDisplay();
    
    // Handle card animation
    if (currentCard) {
        currentCard.classList.add(`swipe-${direction}`);
        
        setTimeout(() => {
            if (currentCard && currentCard.parentNode) {
                currentCard.parentNode.removeChild(currentCard);
            }
            currentCard = null;
        }, 600);
    }
    
    // Move to next word/definition
    if (isCorrectSwipe && currentDefinition.correct) {
        // Correct swipe on correct definition - move to next word
        game.nextWord();
        multiplayerGameState.currentWordIndex++;
        multiplayerGameState.wordStartTime = Date.now();
        
        if (multiplayerGameState.currentWordIndex >= multiplayerGameState.words.length) {
            // Finished all words - wait for server to end game
            game.isGameOver = true;
        } else {
            setTimeout(() => {
                if (!game.isGameOver) {
                    createCards();
                }
            }, 500);
        }
    } else {
        // Continue with next definition
        game.nextDefinition();
        setTimeout(() => {
            if (!game.isGameOver) {
                createCards();
            }
        }, 500);
    }
};

// Update word display to track word index in multiplayer
const originalUpdateWordDisplay = updateWordDisplay;
updateWordDisplay = function() {
    if (multiplayerMode) {
        if (game.currentWordIndex < gameData.length && gameData.length > 0) {
            const wordIndex = multiplayerGameState.currentWordIndex + 1;
            currentWordEl.textContent = `${gameData[game.currentWordIndex].word} (${wordIndex}/5)`;
            currentWordEl.classList.remove('loading');
        } else {
            currentWordEl.textContent = "Loading...";
            currentWordEl.classList.add('loading');
        }
    } else {
        originalUpdateWordDisplay();
    }
}; 