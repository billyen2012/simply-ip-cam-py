# Simple Ip Cam

Version V1.3.1
## Dependencies

`pip install Flask` <br>
`pip install python-dotenv` <br>
`pip install python-socketio` <br>
`pip install Flask-HTTPAuth` <br>
`pip install Flask-Compress` <br>
`pip install pydub` <br>
`pip install opencv-python` <br>
`pip install PyAudio` see below for Mac installation <br>

## Install PyAudio

For mac user

1. install `portaudio`

```console
$ brew install portaudio
```

2. then use following command to install `pyaudio`

```console
$ pip install --global-option='build_ext' --global-option="-I$(brew --prefix)/include" --global-option="-L$(brew --prefix)/lib" pyaudio
```

## Deployment

### Linux

fist install `gunicorn`

```console
$ pip install gunicorn
```

Then run the following command to start the server.

```console
$ gunicorn --certfile=certificate/cert.pem  --keyfile=certificate/key.pem --bind 127.0.0.1:3000 --threads 4 --workers 1 --reuse-port  main:app
```

Note: only use 1 work since this is a stateful application.

### Window

for Window, just leverage on `pm2` of `node.js`

once `node.js` and `pm2` is installed, run the following command to start the application

```console
$ pm2 start main.py -i 2
```

Note: `-i` is cluster option for the `pm2`, the value is recommanded to be `cpu count / 2`