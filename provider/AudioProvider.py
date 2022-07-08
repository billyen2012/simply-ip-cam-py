import pyaudio

CHUNK_SIZE = 1024
FORMAT = pyaudio.paInt32
RATE = 48000

_p = pyaudio.PyAudio()
Speaker = _p.open(format=FORMAT,
                  channels=1,
                  rate=RATE,
                  output=True)


class Mic:
    instance = _p.open(format=pyaudio.paInt32,
                       channels=1,
                       rate=44000,
                       input=True)

    def getNewMicInstance(self):
        try:
            self.instance.close()
        finally:
            self.instance = _p.open(format=pyaudio.paInt32,
                                    channels=1,
                                    rate=44000,
                                    input=True)
