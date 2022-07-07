import asyncio
import os
import threading

from provider.VideoProvider import VideoProvider
from flask import Flask, send_file, send_from_directory
from flask_socketio import SocketIO
from flask_httpauth import HTTPBasicAuth
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
auth = HTTPBasicAuth()

socketio = SocketIO(app)
socketio.client_count = 0
video_provider = VideoProvider()
video_provider.emit = socketio.emit


@auth.verify_password
def verify_password(username, password):
    if not(username, password):
        return False
    return username == os.getenv("USER_NAME") and password == os.getenv("USER_PASSWORD")


@socketio.on('connect')
def connect():
    socketio.client_count += 1
    t = threading.Thread(target=video_provider.start, daemon=True)
    t.start()


@socketio.on('disconnect')
def disconnect():
    socketio.client_count -= 1
    if socketio.client_count == 0:
        video_provider.stop()


@app.route('/<path:path>')
@auth.login_required
def send_report(path):
    return send_from_directory('public', path)


@app.route("/")
@auth.login_required
def default_html():
    return send_file("public/index.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000)
    socketio.run(app)
