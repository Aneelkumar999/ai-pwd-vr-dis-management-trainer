import sqlite3
import time

DB_NAME = "simulation_data.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    # Create table for sessions
    c.execute('''CREATE TABLE IF NOT EXISTS sessions
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  timestamp REAL, 
                  disaster_type TEXT, 
                  duration REAL, 
                  score INTEGER)''')
    
    # Create table for decisions
    c.execute('''CREATE TABLE IF NOT EXISTS decisions
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  session_id INTEGER, 
                  timestamp REAL, 
                  action TEXT, 
                  feedback TEXT, 
                  score_impact INTEGER)''')
    conn.commit()
    conn.close()

def log_session_start(disaster_type):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("INSERT INTO sessions (timestamp, disaster_type, duration, score) VALUES (?, ?, ?, ?)",
              (time.time(), disaster_type, 0, 0))
    session_id = c.lastrowid
    conn.commit()
    conn.close()
    return session_id

def log_decision(session_id, action, feedback, score):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("INSERT INTO decisions (session_id, timestamp, action, feedback, score_impact) VALUES (?, ?, ?, ?, ?)",
              (session_id, time.time(), action, feedback, score))
    conn.commit()
    conn.close()

def get_all_sessions():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM sessions ORDER BY timestamp DESC")
    rows = c.fetchall()
    conn.close()
    return rows
