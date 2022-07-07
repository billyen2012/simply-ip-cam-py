import pyaudio

CHUNK_SIZE = 1024
FORMAT = pyaudio.paInt16
RATE = 22000

_p = pyaudio.PyAudio()
Speaker = _p.open(format=FORMAT,
                  channels=1,
                  rate=RATE,
                  output=True)

Mic = _p.open(format=FORMAT,
              channels=1,
              rate=RATE,
              input=True)
