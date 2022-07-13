from time import sleep
import cv2
import base64
import os
from dotenv import load_dotenv
from datetime import datetime
load_dotenv()

IMAGE_WIDTH = int(os.getenv("IMAGE_WIDTH"))
IMAGE_HEIGHT = int(os.getenv("IMAGE_HEIGTH"))
CAL_SEND_INTERVAL = 1 / int(os.getenv("FRAME_PER_SECOND"))


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

    def addTimeToImage(self, image):
        now = datetime.now().strftime('%Y/%m/%d %H:%M:%S')

        image = cv2.putText(
            img=image,
            text=now,
            color=(0, 190, 0),
            thickness=1,
            org=(7, 20),
            fontFace=cv2.FONT_HERSHEY_SIMPLEX,
            fontScale=0.5,
        )
        return image

    def startBroadcastImage(self):
        while self.started:
            print("broadcasting....")
            frame = self.getFrameBase64()
            self.emit("image", frame, broadcast=True)
            sleep(CAL_SEND_INTERVAL)

    def stop(self):
        if self.started:
            self.camera.release()
            self.started = False

    def getFrameBase64(self):
        retval, image = self.camera.read()
        image = cv2.resize(image, (IMAGE_WIDTH, IMAGE_HEIGHT))
        image = self.addTimeToImage(image)
        retval, buffer = cv2.imencode('.jpg', image)
        text = base64.b64encode(buffer).decode('utf-8')
        return 'data:image/jpeg;base64,' + " " + text
