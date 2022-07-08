from concurrent.futures import thread
from time import sleep
import cv2
import base64
import os


class VideoProvider:
    started = False
    camera = None
    emit = None

    def __new__(cls):
        if not hasattr(cls, 'instance'):
            cls.instance = super(VideoProvider, cls).__new__(cls)
        return cls.instance

    def start(self):
        if self.started == False:
            self.camera = cv2.VideoCapture(0)
            self.started = True
            self.startBroadcastImage()

    def startBroadcastImage(self):
        while self.started:
            print("broadcasting....")
            frame = self.getFrameBase64()
            self.emit("image", frame, broadcast=True)
            sleep(1 / int(os.getenv("FRAME_PER_SECOND")))

    def stop(self):
        if self.started:
            self.camera.release()
            self.started = False

    def getFrameBase64(self):
        retval, image = self.camera.read()
        retval, buffer = cv2.imencode('.jpg', image)
        text = base64.b64encode(buffer).decode('utf-8')
        return 'data:image/jpeg;base64,' + " " + text
