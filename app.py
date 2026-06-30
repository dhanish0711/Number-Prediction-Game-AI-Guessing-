import os
from flask import Flask, render_template, request, jsonify, session

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = os.urandom(24)  # Secure random key for session signature

@app.route('/')
def index():
    """Serves the main application page."""
    return render_template('index.html')

@app.route('/api/start', methods=['POST'])
def start_game():
    """Initializes/resets the game state in the session."""
    session['low'] = 1
    session['high'] = 100
    session['attempts'] = 1
    
    # Calculate the first guess using binary search
    first_guess = (session['low'] + session['high']) // 2
    session['current_guess'] = first_guess
    session['history'] = [first_guess]
    session['cheat_detected'] = False
    session['game_over'] = False

    return jsonify({
        "guess": first_guess,
        "attempts": 1,
        "history": session['history'],
        "game_over": False,
        "cheat_detected": False,
        "low": session['low'],
        "high": session['high']
    })

@app.route('/api/respond', methods=['POST'])
def respond():
    """Updates search boundaries based on user feedback and computes the next guess."""
    if 'low' not in session or 'high' not in session or 'current_guess' not in session:
        return jsonify({"error": "Game has not been started. Please start the game first."}), 400

    data = request.get_json() or {}
    feedback = data.get('feedback')

    if feedback not in ['higher', 'lower', 'correct']:
        return jsonify({"error": "Invalid feedback type. Must be 'higher', 'lower', or 'correct'."}), 400

    # If game is already over or a cheat was detected, return the current state directly
    if session.get('game_over') or session.get('cheat_detected'):
        return jsonify({
            "guess": session.get('current_guess'),
            "attempts": session.get('attempts'),
            "history": session.get('history'),
            "game_over": session.get('game_over'),
            "cheat_detected": session.get('cheat_detected'),
            "low": session.get('low'),
            "high": session.get('high')
        })

    current_guess = session['current_guess']

    if feedback == 'correct':
        session['game_over'] = True
    elif feedback == 'higher':
        session['low'] = current_guess + 1
    elif feedback == 'lower':
        session['high'] = current_guess - 1

    # Check for contradictions/cheating
    # e.g., low is greater than high, which means the secret number cannot exist
    if session['low'] > session['high']:
        session['cheat_detected'] = True

    # If the game is still active, compute the next guess
    if not session['game_over'] and not session['cheat_detected']:
        next_guess = (session['low'] + session['high']) // 2
        session['current_guess'] = next_guess
        session['attempts'] += 1
        session['history'].append(next_guess)

    return jsonify({
        "guess": session.get('current_guess'),
        "attempts": session.get('attempts'),
        "history": session.get('history'),
        "game_over": session.get('game_over'),
        "cheat_detected": session.get('cheat_detected'),
        "low": session.get('low'),
        "high": session.get('high')
    })

if __name__ == '__main__':
    # Run the server on localhost:5000
    app.run(host='127.0.0.1', port=5000, debug=True)
