from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
import json
import threading
import time
from simulation import SimulationEngine
import database
import datetime
from pathfinding import Pathfinding

database.init_db()

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

sim_engine = SimulationEngine()
pathfinder = Pathfinding()

# Initial obstacles (buildings)
# Assuming simple grid for demo
for x in range(-5, 5):
    for y in range(-5, 5):
        if x % 2 == 0 and y % 2 == 0:
            pathfinder.add_obstacle(x, y)

thread = None
thread_lock = threading.Lock()
current_session_id = None

@app.route('/dashboard')
def dashboard():
    sessions = database.get_all_sessions()
    # Format timestamp
    formatted_sessions = []
    for s in sessions:
        s_dict = dict(s)
        s_dict['timestamp'] = datetime.datetime.fromtimestamp(s['timestamp']).strftime('%Y-%m-%d %H:%M:%S')
        formatted_sessions.append(s_dict)
    return render_template('dashboard.html', sessions=formatted_sessions)

def background_thread():
    """Example of how to send server generated events to clients."""
    while True:
        socketio.sleep(1)
        with thread_lock:
            state = sim_engine.update()
            if state:
                socketio.emit('status_update', state)

@app.route('/')
def index():
    return "VR Disaster Trainer Backend Running"

# Multi-user tracking
connected_clients = {}

@socketio.on('connect')
def test_connect():
    global thread
    with thread_lock:
        if thread is None:
            thread = socketio.start_background_task(background_thread)
    print(f'Client connected: {request.sid}')
    emit('status_update', {'data': 'Connected to AI Backend', 'id': request.sid})

@socketio.on('join_game')
def handle_join():
    client_id = request.sid
    connected_clients[client_id] = {'pos': [0, 0, 0], 'rot': [0, 0, 0]}
    
    # Tell new client about existing players
    emit('current_players', connected_clients)
    # Tell others about new client
    emit('new_player', {'id': client_id, 'data': connected_clients[client_id]}, broadcast=True, include_self=False)

@socketio.on('player_update')
def handle_player_update(data):
    client_id = request.sid
    if client_id in connected_clients:
        connected_clients[client_id] = data
        # Broadcast to others (exclude sender)
        emit('player_moved', {'id': client_id, 'data': data}, broadcast=True, include_self=False)

@socketio.on('request_path')
def handle_path_request(data):
    start = (data['start']['x'], data['start']['z'])
    goal = (data['goal']['x'], data['goal']['z'])
    path = pathfinder.find_path(start, goal)
    
    # Convert path to 3D points
    waypoints = [{'x': p[0], 'y': 0, 'z': p[1]} for p in path]
    emit('path_result', {'agent_id': data['agent_id'], 'path': waypoints})

@socketio.on('start_simulation')
def handle_start_simulation(data):
    global current_session_id
    print('Starting Simulation:', data)
    disaster_type = data.get('type', 'fire')
    current_session_id = database.log_session_start(disaster_type)
    
    initial_state = sim_engine.start_disaster(disaster_type)
    emit('simulation_started', initial_state)

@socketio.on('submit_decision')
def handle_decision(data):
    action = data.get('action')
    result = sim_engine.evaluate_decision(action)
    
    if current_session_id:
        database.log_decision(current_session_id, action, result['feedback'], result['score'])
        
    emit('decision_feedback', result)

@socketio.on('disconnect')
def test_disconnect():
    client_id = request.sid
    if client_id in connected_clients:
        del connected_clients[client_id]
        emit('player_disconnected', {'id': client_id}, broadcast=True)
    print(f'Client disconnected: {client_id}')

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)
