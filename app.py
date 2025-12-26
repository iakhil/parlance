from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import psycopg2
import os
import json
import random
import string
import time
from datetime import datetime
from threading import Lock

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
CORS(app)
# Configure SocketIO for production (eventlet) and development (threading)
# For Render/production: use eventlet with gunicorn
# For local dev: can use threading
socketio = SocketIO(
    app, 
    cors_allowed_origins="*", 
    async_mode='eventlet',  # Use eventlet for production with gunicorn
    logger=False,  # Disable verbose logging in production
    engineio_logger=False,
    allow_upgrades=True,
    transports=['websocket', 'polling']
)

# Database connection
def get_db_connection():
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        return None
    try:
        conn = psycopg2.connect(database_url)
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

# In-memory game rooms (for production, consider Redis)
rooms = {}
rooms_lock = Lock()

# Load words data
def load_words_data():
    try:
        with open('static/js/words-data.json', 'r') as f:
            return json.load(f)
    except:
        return []

WORDS_DATA = load_words_data()

def generate_room_code():
    """Generate a 6-character room code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def create_game_room(player_id, player_name):
    """Create a new game room"""
    room_code = generate_room_code()
    words = random.sample(WORDS_DATA, min(5, len(WORDS_DATA)))
    
    room = {
        'room_code': room_code,
        'player1': {
            'id': player_id,
            'name': player_name,
            'score': 0,
            'current_word_index': 0,
            'word_scores': [],
            'ready': False,
            'finished': False
        },
        'player2': None,
        'words': words,
        'status': 'waiting',
        'created_at': time.time()
    }
    
    with rooms_lock:
        rooms[room_code] = room
    
    return room_code, room

def join_game_room(room_code, player_id, player_name):
    """Join an existing game room"""
    with rooms_lock:
        if room_code not in rooms:
            return None, None
        
        room = rooms[room_code]
        
        if room['status'] != 'waiting':
            return None, None
        
        if room['player2'] is not None:
            return None, None
        
        room['player2'] = {
            'id': player_id,
            'name': player_name,
            'score': 0,
            'current_word_index': 0,
            'word_scores': [],
            'ready': False,
            'finished': False
        }
        
        return room_code, room

def calculate_score(is_correct, swipe_time_ms, streak):
    """Calculate score with speed bonus"""
    if not is_correct:
        return 0
    
    base_score = 10
    streak_bonus = streak
    
    # Speed bonus: faster = more points (max 20 bonus)
    # Formula: bonus decreases linearly from 20 to 0 as time increases
    # For swipe times: 0-500ms = 20 bonus, 500-2000ms = 20-0 bonus, 2000ms+ = 0 bonus
    speed_bonus = max(0, 20 - (swipe_time_ms / 100))
    
    total_score = base_score + streak_bonus + speed_bonus
    return int(total_score)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'socketio': 'enabled'}), 200

@app.route('/static/<path:path>')
def serve_static(path):
    return app.send_static_file(path)

@app.route('/api/submit-score', methods=['POST'])
def submit_score():
    try:
        data = request.json
        player_name = data.get('player_name', '').strip()
        score = data.get('score', 0)
        words_learned = data.get('words_learned', 0)
        
        if not player_name or len(player_name) > 100:
            return jsonify({'error': 'Invalid player name'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO leaderboard (player_name, score, words_learned) VALUES (%s, %s, %s) RETURNING id",
            (player_name, score, words_learned)
        )
        conn.commit()
        cursor.close()
        conn.close()
        
        # Get rank
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COUNT(*) + 1 FROM leaderboard WHERE score > %s",
            (score,)
        )
        rank = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        
        return jsonify({'rank': rank, 'message': 'Score submitted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        cursor.execute("""
            SELECT player_name, score, words_learned, game_date,
                   ROW_NUMBER() OVER (ORDER BY score DESC, game_date DESC) as rank
            FROM leaderboard
            ORDER BY score DESC, game_date DESC
            LIMIT 50
        """)
        
        rows = cursor.fetchall()
        leaderboard = []
        for row in rows:
            leaderboard.append({
                'rank': row[4],
                'player_name': row[0],
                'score': row[1],
                'words_learned': row[2],
                'time_ago': format_time_ago(row[3])
            })
        
        cursor.close()
        conn.close()
        
        return jsonify({'leaderboard': leaderboard})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                COUNT(*) as total_games,
                COALESCE(MAX(score), 0) as highest_score,
                COALESCE(AVG(score), 0) as average_score,
                COALESCE(SUM(words_learned), 0) as total_words_learned
            FROM leaderboard
        """)
        
        row = cursor.fetchone()
        stats = {
            'total_games': row[0] or 0,
            'highest_score': int(row[1] or 0),
            'average_score': int(row[2] or 0),
            'total_words_learned': row[3] or 0
        }
        
        cursor.close()
        conn.close()
        
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def format_time_ago(timestamp):
    """Format timestamp as time ago string"""
    if not timestamp:
        return "Just now"
    
    now = datetime.now()
    diff = now - timestamp
    
    if diff.days > 0:
        return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
    elif diff.seconds >= 3600:
        hours = diff.seconds // 3600
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    elif diff.seconds >= 60:
        minutes = diff.seconds // 60
        return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
    else:
        return "Just now"

# WebSocket Events
@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")
    emit('connected', {'message': 'Connected to server'})

@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")
    # Clean up rooms if player disconnects
    with rooms_lock:
        for room_code, room in list(rooms.items()):
            if room['player1']['id'] == request.sid:
                if room['player2']:
                    socketio.emit('opponent_disconnected', {'message': 'Opponent disconnected'}, room=room_code)
                del rooms[room_code]
            elif room['player2'] and room['player2']['id'] == request.sid:
                socketio.emit('opponent_disconnected', {'message': 'Opponent disconnected'}, room=room_code)
                room['player2'] = None
                room['status'] = 'waiting'

@socketio.on('rejoin_room')
def handle_rejoin_room(data):
    room_code = data.get('room_code', '').upper()
    with rooms_lock:
        if room_code in rooms:
            room = rooms[room_code]
            # Rejoin the room
            join_room(room_code)
            emit('room_rejoined', {'room_code': room_code, 'status': room['status']})
        else:
            emit('rejoin_error', {'message': 'Room not found'})

@socketio.on('create_game')
def handle_create_game(data):
    player_name = data.get('player_name', 'Player').strip()[:20]
    if not player_name:
        player_name = 'Player'
    
    room_code, room = create_game_room(request.sid, player_name)
    join_room(room_code)
    
    emit('room_created', {
        'room_code': room_code,
        'player_name': player_name
    })
    
    print(f"Game room created: {room_code} by {player_name}")

@socketio.on('join_game')
def handle_join_game(data):
    room_code = data.get('room_code', '').upper().strip()
    player_name = data.get('player_name', 'Player').strip()[:20]
    if not player_name:
        player_name = 'Player'
    
    room_code, room = join_game_room(room_code, request.sid, player_name)
    
    if not room:
        emit('join_error', {'message': 'Invalid room code or room is full'})
        return
    
    join_room(room_code)
    
    emit('room_joined', {
        'room_code': room_code,
        'player_name': player_name,
        'opponent_name': room['player1']['name']
    })
    
    # Notify player1 that opponent joined
    socketio.emit('opponent_joined', {
        'opponent_name': player_name
    }, room=room_code)
    
    print(f"Player {player_name} joined room {room_code}")

@socketio.on('player_ready')
def handle_player_ready(data):
    room_code = data.get('room_code', '').upper()
    
    with rooms_lock:
        if room_code not in rooms:
            emit('error', {'message': 'Room not found'})
            return
        
        room = rooms[room_code]
        
        # Set player ready
        if room['player1']['id'] == request.sid:
            room['player1']['ready'] = True
        elif room['player2'] and room['player2']['id'] == request.sid:
            room['player2']['ready'] = True
        else:
            emit('error', {'message': 'Player not in room'})
            return
        
        # Check if both players are ready
        if room['player2'] and room['player1']['ready'] and room['player2']['ready']:
            room['status'] = 'playing'
            
            # Send game start to both players
            socketio.emit('game_start', {
                'words': room['words'],
                'opponent_name': room['player2']['name'] if room['player1']['id'] == request.sid else room['player1']['name']
            }, room=room_code)
            
            print(f"Game started in room {room_code}")

@socketio.on('swipe_action')
def handle_swipe_action(data):
    room_code = data.get('room_code', '').upper()
    word_index = data.get('word_index', 0)
    definition_index = data.get('definition_index', 0)
    direction = data.get('direction', '')  # 'left' or 'right'
    swipe_time_ms = data.get('swipe_time_ms', 0)
    is_correct = data.get('is_correct', False)
    
    with rooms_lock:
        if room_code not in rooms:
            emit('error', {'message': 'Room not found'})
            return
        
        room = rooms[room_code]
        
        if room['status'] != 'playing':
            emit('error', {'message': 'Game not in progress'})
            return
        
        # Determine which player
        is_player1 = room['player1']['id'] == request.sid
        player = room['player1'] if is_player1 else room['player2']
        
        if not player:
            emit('error', {'message': 'Player not found'})
            return
        
        # Validate word index
        if word_index >= len(room['words']) or word_index < 0:
            emit('error', {'message': 'Invalid word index'})
            return
        
        # Calculate score
        current_streak = len([ws for ws in player['word_scores'] if ws['score'] > 0])
        score = calculate_score(is_correct, swipe_time_ms, current_streak)
        
        # Update player state
        player['word_scores'].append({
            'word_index': word_index,
            'score': score,
            'time_ms': swipe_time_ms,
            'is_correct': is_correct
        })
        player['score'] += score
        player['current_word_index'] = word_index + 1
        
        # Check if player finished all words
        if player['current_word_index'] >= len(room['words']):
            player['finished'] = True
        
        # Notify opponent
        opponent = room['player2'] if is_player1 else room['player1']
        socketio.emit('opponent_progress', {
            'opponent_score': player['score'],
            'opponent_word_index': player['current_word_index'],
            'opponent_finished': player['finished']
        }, room=room_code, skip_sid=request.sid)
        
        # Check if game should end
        if player['finished'] and opponent and opponent['finished']:
            room['status'] = 'finished'
            
            # Determine winner
            if player['score'] > opponent['score']:
                winner = player['name']
            elif opponent['score'] > player['score']:
                winner = opponent['name']
            else:
                winner = None  # Tie
            
            socketio.emit('game_end', {
                'your_score': player['score'],
                'opponent_score': opponent['score'],
                'winner': winner,
                'is_tie': winner is None
            }, room=room_code)
            
            # Clean up room after 30 seconds
            def cleanup_room():
                time.sleep(30)
                with rooms_lock:
                    if room_code in rooms:
                        del rooms[room_code]
            
            import threading
            threading.Thread(target=cleanup_room, daemon=True).start()
        
        # Confirm action to player
        emit('swipe_confirmed', {
            'score': score,
            'total_score': player['score'],
            'word_index': word_index
        })

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
