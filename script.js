// Game Data - will be loaded from JSON
let gameData = [];

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
    try {
        const response = await fetch('words-data.json');
        const data = await response.json();
        gameData = data;
        
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

// Game State
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
        this.usedWords = new Set(); // Track used words to avoid repetition
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
        // Don't reset usedWords - keep variety across games
        
        // Reshuffle data for new game
        gameData = shuffleArray(gameData);
    }

    nextDefinition() {
        this.currentDefinitionIndex++;
        // Check if we've run out of definitions for current word
        if (this.currentDefinitionIndex >= gameData[this.currentWordIndex].definitions.length) {
            // If we've used all definitions without finding the correct one, move to next word
            this.nextWord();
        }
    }

    nextWord() {
        // Get the current word before moving to next
        const currentWord = gameData[this.currentWordIndex]?.word;
        
        // Mark current word as used
        this.usedWords.add(this.currentWordIndex);
        
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
    }
}

// Initialize game state
const game = new GameState();

// DOM Elements
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

// Learnt Words DOM Elements
const learntWordsBtn = document.getElementById('learntWordsBtn');
const learntWordsModal = document.getElementById('learntWordsModal');
const closeLearntWordsBtn = document.getElementById('closeLearntWordsBtn');
const learntWordsCount = document.getElementById('learntWordsCount');
const learntWordsList = document.getElementById('learntWordsList');
const clearWordsBtn = document.getElementById('clearWordsBtn');
const backToGameBtn = document.getElementById('backToGameBtn');

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
    if (game.isGameOver || game.currentWordIndex >= gameData.length || gameData.length === 0) {
        return;
    }

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
    document.getElementById('finalScore').textContent = game.score;
    document.getElementById('finalCorrect').textContent = game.correct;
    document.getElementById('finalIncorrect').textContent = game.incorrect;
    document.getElementById('finalStreak').textContent = game.maxStreak;
    
    gameOverModal.classList.add('show');
}

function hideGameOverModal() {
    gameOverModal.classList.remove('show');
}

// Event Listeners
playAgainBtn.addEventListener('click', () => {
    hideGameOverModal();
    setTimeout(initGame, 300);
});

// Dictionary modal continue button
continueBtn.addEventListener('click', () => {
    hideDictionaryModal();
    // Continue with the game - create next card for the new word
    setTimeout(() => {
        if (!game.isGameOver) {
            updateWordDisplay();
            createNextCard();
        }
    }, 300);
});

// Learnt Words Event Listeners
learntWordsBtn.addEventListener('click', () => {
    showLearntWordsModal();
});

closeLearntWordsBtn.addEventListener('click', () => {
    hideLearntWordsModal();
});

backToGameBtn.addEventListener('click', () => {
    hideLearntWordsModal();
});

clearWordsBtn.addEventListener('click', () => {
    clearAllLearntWords();
});

// Close learnt words modal when clicking outside
learntWordsModal.addEventListener('click', (e) => {
    if (e.target === learntWordsModal) {
        hideLearntWordsModal();
    }
});

// Keyboard controls (optional)
document.addEventListener('keydown', (e) => {
    // Don't trigger keyboard controls when modal is open
    if (dictionaryModal.classList.contains('show') || gameOverModal.classList.contains('show') || learntWordsModal.classList.contains('show')) {
        if (e.key === 'Enter' || e.key === ' ') {
            if (dictionaryModal.classList.contains('show')) {
                continueBtn.click();
            } else if (gameOverModal.classList.contains('show')) {
                playAgainBtn.click();
            } else if (learntWordsModal.classList.contains('show')) {
                backToGameBtn.click();
            }
        } else if (e.key === 'Escape') {
            if (learntWordsModal.classList.contains('show')) {
                hideLearntWordsModal();
            } else if (dictionaryModal.classList.contains('show')) {
                hideDictionaryModal();
            }
        }
        return;
    }

    const topCard = document.querySelector('.card:last-child');
    if (!topCard || topCard.classList.contains('swipe-left') || topCard.classList.contains('swipe-right')) {
        return;
    }

    if (e.key === 'ArrowLeft') {
        const cardInstance = topCard.cardInstance;
        if (cardInstance) {
            cardInstance.swipe('left');
        }
    } else if (e.key === 'ArrowRight') {
        const cardInstance = topCard.cardInstance;
        if (cardInstance) {
            cardInstance.swipe('right');
        }
    }
});

// Add card instance reference for keyboard controls
const originalCreateElement = Card.prototype.createElement;
Card.prototype.createElement = function() {
    const element = originalCreateElement.call(this);
    element.cardInstance = this;
    return element;
};

// Initialize the game when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadGameData(); // Load data first, then init game
    
    // Initialize App Store badge functionality
    initAppStoreBadge();
});

// App Store Badge functionality
function initAppStoreBadge() {
    const appStoreBadge = document.getElementById('appStoreBadge');
    if (appStoreBadge) {
        appStoreBadge.addEventListener('click', (e) => {
            e.preventDefault();
            
            // You can replace this URL with your actual App Store link
            const appStoreUrl = 'https://apps.apple.com/us/app/play-parlance/id6748587583';
            
            // Open App Store in new tab
            window.open(appStoreUrl, '_blank');
            
            // Add click feedback
            appStoreBadge.style.transform = 'scale(0.95)';
            setTimeout(() => {
                appStoreBadge.style.transform = '';
            }, 150);
        });
    }
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