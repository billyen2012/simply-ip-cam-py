import base64
import os
import threading
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

socketio = SocketIO(app, cors_allowed_origins='*')
socketio.client_count = 0
video_provider = VideoProvider()
video_provider.emit = socketio.emit
mic_provider = Mic()


@auth.verify_password
def verify_password(username, password):
    if not(username, password):
        return False
    return username == os.getenv("USER_NAME") and password == os.getenv("USER_PASSWORD")

###################
#     Socket      #
###################


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

###################
#     RESTapi     #
###################

###### static ######


@app.route('/<path:path>')
@auth.login_required
def public_folder(path):
    return send_from_directory('public', path)


@app.route("/")
@auth.login_required
def default_html():
    return send_file("public/index.html")

####### Microphone ########


@app.route("/api/mic/start")
@auth.login_required
def mic_start():
    try:
        if mic_provider.instance.is_active():
            return "OK"
        mic_provider.instance.start_stream()
        return "OK"
    except:
        # if there is error, try to get a new mic instances
        mic_provider.getNewMicInstance()
        return Response("an error has occured, please reload the page and try again", status=500)


@app.route("/api/mic/stop")
@auth.login_required
def mic_stop():
    mic_provider.instance.stop_stream()
    return "OK"


@app.route("/api/mic/listen")
@auth.login_required
def mic_listen():

    def mic_stream_generator():
        while mic_provider.instance.is_active():
            data = mic_provider.instance.read(CHUNK_SIZE, False)
            yield (data)

    return Response(mic_stream_generator(), mimetype="audio/wav")

###### play remote sound ######


@app.route("/api/recorder", methods=["POST"])
@auth.login_required
def receive_recording():

    data = request.get_data().decode()
    audio_info, audio_base64_str = data.split("base64,")
    audio_type = audio_info.split(";")[0].strip().replace("data:", "")
    if audio_type not in ["audio/ogg", "audio/webm", "audio/mp4"]:
        return Response(response="audio type not recognized(only ogg, mp4 and webm)", status=400)

    decode = base64.b64decode(audio_base64_str)

    def get_tranform():
        if "audio/ogg" in audio_type:
            return AudioSegment.from_ogg(BytesIO(decode))
        elif "audio/webm" in audio_type:
            return AudioSegment.from_file(
                BytesIO(decode), codec="opus").set_frame_rate(96000)
        elif "audio/mp4" in audio_type:
            return AudioSegment.from_file(
                BytesIO(decode), format="m4a").set_frame_rate(96000)

    def process_sound_and_send():
        transform = get_tranform()
        # # convert ogg to wav in memory
        memoBuffer = BytesIO()
        transform.export(memoBuffer, format="wav")
        wav = memoBuffer.getvalue()
        # pass wav to the speaker
        Speaker.write(wav)

    # send tranform process to thread
    threading.Thread(target=process_sound_and_send).start()
    return "OK"

#####  INFO #####


@app.route("/api/total-users", methods=["GET"])
@auth.login_required
def total_user():
    return str(socketio.client_count)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000, threaded=True, ssl_context=(
        'certificate/cert.pem', 'certificate/key.pem'))
    # socketio.run(app, port=3000, ssl_context=(
    #     'certificate/cert.pem', 'certificate/key.pem'))
