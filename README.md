# AI-Powered VR Disaster Trainer (WebXR)

## Overview
This project is an AI-powered simulation for training disaster response. It uses **WebXR (A-Frame)** for the immersive frontend and **Python (Flask)** for the AI backend.

## Prerequisites
- Python 3.8+
- Modern Web Browser (Chrome/Firefox/Edge) or VR Headset (Oculus Quest)

## Installation

1.  **Install Python Dependencies:**
    ```bash
    pip install flask flask-socketio
    ```

## Running the Application

1.  **Start the Backend:**
    Navigate to `python_backend` and run:
    ```bash
    python app.py
    ```
    The server will start on `http://localhost:5000`.

2.  **Start the Frontend:**
    You need to serve the `webxr_app` directory. You can use Python's built-in HTTP server:
    ```bash
    cd webxr_app
    python -m http.server 8000
    ```

3.  **Access the Simulation:**
    Open `http://localhost:8000` in your browser.
    - If using a VR headset, ensure the computer and headset are on the same network and use the computer's IP address instead of `localhost`.

## Controls
- **WASD + Mouse:** Move and Look (Desktop)
- **VR Controllers:** Teleport and Interact (VR Mode)
- **Key 'S':** Start Fire Simulation (Debug Trigger)

## Project Structure
- `webxr_app/`: Frontend code (A-Frame, JS components).
- `python_backend/`: Server and AI logic (Flask, Simulation Engine).
