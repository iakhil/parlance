# Parlance - Competitive Word Game

A competitive vocabulary game where players swipe through definitions to match words. Test your knowledge and compete on the global leaderboard!

## Game Rules

- **Objective**: Identify correct definitions for vocabulary words
- **Controls**: 
  - Swipe RIGHT ➡️ for CORRECT definitions
  - Swipe LEFT ⬅️ for INCORRECT definitions
- **Competitive Mode**: Game ends immediately when you make a wrong choice
- **Scoring**: Earn points for correct answers with streak bonuses
- **Leaderboard**: Submit your score and compete globally

## Features

- 🎮 **Competitive Gameplay**: One mistake ends the game
- 🏆 **Global Leaderboard**: Compete with players worldwide
- 📚 **100 Sophisticated Words**: Uncommon but useful vocabulary
- 📖 **Dictionary Integration**: Learn pronunciations and detailed definitions
- 🎨 **Elegant Dark Theme**: Beautiful modern UI
- 📱 **Mobile Responsive**: Optimized for all devices
- ✨ **Smooth Animations**: Engaging visual feedback
- 💾 **Progress Tracking**: Save and review learned words

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Flask (Python)
- **Database**: PostgreSQL
- **Deployment**: Render
- **APIs**: Dictionary API for word definitions

## Local Development

### Prerequisites

- Python 3.11+
- PostgreSQL
- pip

### Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd parlance
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up PostgreSQL database:
```bash
# Create database
createdb parlance_db

# Set environment variable
export DATABASE_URL=postgresql://localhost/parlance_db
```

4. Run the application:
```bash
python app.py
```

5. Open http://localhost:5000 in your browser

## Deployment to Render

### Option 1: Using render.yaml (Recommended)

1. Push your code to GitHub
2. Connect your repository to Render
3. Render will automatically detect `render.yaml` and set up:
   - Web service with Flask app
   - PostgreSQL database
   - Environment variables

### Option 2: Manual Setup

1. **Create Web Service**:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app`
   - Environment: Python 3.11

2. **Create PostgreSQL Database**:
   - Plan: Free
   - Database Name: `parlance_production`

3. **Environment Variables**:
   - `DATABASE_URL`: (auto-generated from database)

## API Endpoints

- `GET /` - Serve the game
- `POST /api/submit-score` - Submit player score
- `GET /api/leaderboard` - Get top scores
- `GET /api/stats` - Get game statistics

## Database Schema

### leaderboard table
```sql
CREATE TABLE leaderboard (
    id SERIAL PRIMARY KEY,
    player_name VARCHAR(100) NOT NULL,
    score INTEGER NOT NULL,
    words_learned INTEGER DEFAULT 0,
    game_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Game Architecture

### Frontend (Static Files)
- `templates/index.html` - Main game interface
- `static/css/styles.css` - Styling and animations
- `static/js/script.js` - Game logic and interactions
- `static/js/words-data.json` - Vocabulary database

### Backend (Flask)
- `app.py` - Main Flask application
- Database operations for leaderboard
- RESTful API endpoints
- Static file serving

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Dictionary definitions from [Free Dictionary API](https://dictionaryapi.dev/)
- Vocabulary words curated for educational value
- Modern UI design inspired by mobile gaming trends 