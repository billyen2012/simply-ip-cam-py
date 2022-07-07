from ast import Bytes
import base64
import os
import socket
import struct
import threading
from typing import Literal
import wave
from provider.AudioProvider import Speaker, Mic, CHUNK_SIZE
from provider.VideoProvider import VideoProvider
from flask import Flask, Response, request, send_file, send_from_directory
from flask_socketio import SocketIO
from flask_httpauth import HTTPBasicAuth
from io import BytesIO
from pydub import AudioSegment
import pyaudio
from dotenv import load_dotenv
load_dotenv()

# const
CHUNK_SIZE = 1024
FORMAT = pyaudio.paInt16
RATE = 22000

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
    # t = threading.Thread(target=video_provider.start, daemon=True)
    # t.start()


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


@app.route("/api/mic/start")
@auth.login_required
def mic_start():
    Mic.start_stream()
    Mic.started = True
    return "OK"


@app.route("/api/mic/listen")
@auth.login_required
def mic_listen():

    def mic_stream_generator():
        while Mic.started:
            data = Mic.read(CHUNK_SIZE)
            yield (data)

    return Response(mic_stream_generator())


@app.route("/api/recorder", methods=["POST"])
@auth.login_required
def receive_recording():

    data = request.get_data().decode()

    audio_base64_str = data.split("data:audio/ogg;base64,")[1]
    decode = base64.b64decode(audio_base64_str)
    # convert ogg to wav in memory
    ogg = AudioSegment.from_ogg(BytesIO(decode))
    memoBuffer = BytesIO()
    ogg.export(memoBuffer, format="wav")
    wav = memoBuffer.getvalue()
    # pass wav to the speaker
    Speaker.write(wav)
    return "OK"


@app.route("/api/mic/stop")
@auth.login_required
def mic_stop():
    try:
        Mic.stop_stream()
        Mic.started = False
        return "OK"
    except Exception:
        print(Exception)
        return Response(status=500)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000)
    socketio.run(app)
