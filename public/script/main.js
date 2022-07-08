const FEAME_PER_SECOND = 30;

const socket = io();

const blobToBase64 = (blob) => {
  return new Promise((resolve, _) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};

const player = new PCMPlayer({
  inputCodec: "Int32",
  channels: 1,
  sampleRate: 44000,
  flushTime: 1000,
});

player.volume(1);

const GlobalStore = {
  recorder: null,
};

const streamingCamera = () => {
  const recordingImg = document.getElementById("recording");
  setInterval(async () => {
    const base64 = await fetch("/api/image/capture")
      .then(async (res) => res.text())
      .catch((err) => false);

    if (base64) recordingImg.src = base64;
  }, 1000 / FEAME_PER_SECOND);
};

const StartRecording = async () => {
  const micStream = await window.navigator.mediaDevices.getUserMedia({
    video: false,
    audio: true,
  });

  const mediaRecorder = new MediaRecorder(micStream);
  // Create a buffer to store the incoming data.
  let chunks = [];
  let type = {};
  mediaRecorder.ondataavailable = (event) => {
    type = event.data.type;
    chunks.push(event.data);
  };

  mediaRecorder.onstop = async () => {
    // A "blob" combines all the audio chunks into a single entity
    const blob = new Blob(chunks, { type });
    chunks = []; // clear buffer
    const audioBase64 = await blobToBase64(blob);
    // send recording to backend
    fetch("/api/recorder", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: audioBase64,
    });
    // One of many ways to use the blob
    // const audio = new Audio();
    // const audioURL = window.URL.createObjectURL(blob);
    // audio.src = audioURL;
    // audio.play();
  };

  mediaRecorder.onstart = () => {
    console.log("mic stream start");
  };

  return {
    stop() {
      mediaRecorder.stop();
    },
    start() {
      mediaRecorder.start();
    },
  };
};

const startListen = () => {
  // no need to memorize this, just copy and paste like a pro (https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams)
  fetch("/api/mic/listen")
    // Retrieve its body as ReadableStream
    .then((response) => {
      const reader = response.body.getReader();
      return new ReadableStream({
        start(controller) {
          return pump();
          function pump() {
            return reader.read().then(({ done, value }) => {
              // When no more data needs to be consumed, close the stream
              if (done) {
                controller.close();
                return;
              }
              // feed the buffer to pcm player
              setTimeout(player.feed(value.buffer), 30);
              return pump();
            });
          }
        },
      });
    });
};

const init = () => {
  const startBtn = document.getElementById("start-listen");
  const stopBtn = document.getElementById("stop-listen");
  const muteBtn = document.getElementById("mute");
  const micStatus = document.getElementById("mic-status");
  const muteMessage = document.getElementById("mute-message");
  const recordingImg = document.getElementById("recording");
  const recorderBtn = document.getElementById("recorder-btn");
  const recorderBtnStop = document.getElementById("recorder-btn-stop");
  // disabled stop button initially
  stopBtn.disabled = true;
  muteBtn.disabled = true;
  muteBtn.value = 0;
  // event binding
  startBtn.addEventListener("click", () => {
    // activate api microphone
    fetch("/api/mic/start")
      .then((res) => {
        if (res.status === 200) {
          startListen();
          startBtn.disabled = true;
          stopBtn.disabled = false;
          muteBtn.disabled = false;
          micStatus.style.display = "block";
          return;
        }
        throw new Error();
      })
      .catch((err) => {
        alert(
          "something went wrong while trying to start the microphone on server"
        );
      });
  });
  // event binding
  stopBtn.addEventListener("click", () => {
    fetch("/api/mic/stop")
      .then((res) => {
        if (res.status === 200) {
          startBtn.disabled = false;
          stopBtn.disabled = true;
          muteBtn.disabled = true;
          micStatus.style.display = "none";
          // reset mute event
          player.volume(1);
          muteBtn.textContent = "mute";
          muteMessage.style.display = "none";
          return;
        }
        throw new Error();
      })
      .catch((err) => {
        alert(
          "something went wrong while trying to start the microphone on server"
        );
      });
  });

  muteBtn.addEventListener("click", () => {
    if (muteBtn.value == 0) {
      player.volume(0);
      muteBtn.textContent = "unmute";
      muteMessage.style.display = "block";
    } else {
      player.volume(1);
      muteBtn.textContent = "mute";
      muteMessage.style.display = "none";
    }
    muteBtn.value = muteBtn.value == 0 ? 1 : 0;
  });

  recorderBtn.addEventListener("click", async () => {
    if (!GlobalStore.recorder) GlobalStore.recorder = await StartRecording();
    GlobalStore.recorder.start();
    recorderBtn.style.display = "none";
    recorderBtnStop.style.display = "flex";
  });

  recorderBtnStop.addEventListener("click", () => {
    GlobalStore.recorder.stop();
    recorderBtn.style.display = "flex";
    recorderBtnStop.style.display = "none";
  });

  // start streaming picture
  //streamingCamera();
  socket.on("image", (base64) => {
    recordingImg.src = base64;
  });
};

init();
