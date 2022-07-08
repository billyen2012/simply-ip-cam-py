# Simple Ip Cam

## install pyaudio

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

use `gunicorn` with following command

fist install `gunicorn`

```console
$ pip install gunicorn
```

Then run the following command to start the server.

```console
$ gunicorn --certfile=certificate/cert.pem  --keyfile=certificate/key.pem --bind 127.0.0.1:3000 --threads 4 --workers 1 --reuse-port  main:app
```

Note: only use 1 work since this is a stateful application.
