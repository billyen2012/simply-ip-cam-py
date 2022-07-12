const FEAME_PER_SECOND = 30;

const socket = io();

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioCtx.createAnalyser();

const player = new PCMPlayer({
  inputCodec: "Int32",
  channels: 1,
  sampleRate: 44000,
  flushTime: 1000,
});

const GlobalStore = {
  recorder: null,
  audioListenController: new AbortController(),
};

const blobToBase64 = (blob) => {
  return new Promise((resolve, _) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
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

const startListen = (audioVisualizerCanvasCtx) => {
  /**
   * @param {byte[]} buffer
   */
  const draw = (buffer = []) => {
    let WIDTH = audioVisualizerCanvasCtx.clientWidth;
    let HEIGHT = audioVisualizerCanvasCtx.clientHeight;
    // clear canvas
    audioVisualizerCanvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
    const barWidth = (WIDTH / buffer.length) * 2.5;
    const VOLUME_THRESHOLD = 100;
    let barHeight;
    let x = 0;
    let previous = null;
    for (let i = 0; i < buffer.length; i++) {
      barHeight = buffer[i];
      if (barHeight > VOLUME_THRESHOLD) continue; // skip noise

      if (barHeight > previous && barHeight > previous + 1) {
        barHeight = previous + 1;
      } else if (barHeight < previous && barHeight < previous - 1) {
        barHeight = previous - 1;
      }

      previous = barHeight;
      audioVisualizerCanvasCtx.fillStyle = "rgb(0,255,0)";
      audioVisualizerCanvasCtx.fillRect(x, HEIGHT, barWidth, -barHeight);
      x += barWidth;
    }
  };
  // set new abortcontroller instance
  GlobalStore.audioListenController = new AbortController();
  // no need to memorize this, just copy and paste like a pro (https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams)
  fetch("/api/mic/listen", {
    signal: GlobalStore.audioListenController.signal,
  })
    // Retrieve its body as ReadableStream
    .then(async (response) => {
      const reader = response.body.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        player.feed(value.buffer);
        draw(value);
      }
    })
    .catch((err) => {
      if (err.message.includes("aborted")) return;
      console.log(err);
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
  const onlineUserDiv = document.getElementById("online-user");
  const contrastFilterRange = document.getElementById("contrast-filter-range");
  const audioVisualizerCanvas = document.getElementById(
    "audio-visualizer-canvas"
  );
  const audioVisualizerCanvasCtx = audioVisualizerCanvas.getContext("2d");
  audioVisualizerCanvasCtx.clientWidth =
    audioVisualizerCanvas.getAttribute("width");
  audioVisualizerCanvasCtx.clientHeight =
    audioVisualizerCanvas.getAttribute("height");
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
          startListen(audioVisualizerCanvasCtx);
          player.volume(1);
          startBtn.disabled = true;
          stopBtn.disabled = false;
          muteBtn.disabled = false;
          micStatus.style.display = "block";
          audioVisualizerCanvas.style.display = "block";
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
        GlobalStore.audioListenController.abort();
        if (res.status === 200) {
          player.volume(0);
          startBtn.disabled = false;
          stopBtn.disabled = true;
          muteBtn.disabled = true;
          micStatus.style.display = "none";
          // reset mute event
          muteBtn.textContent = "mute";
          muteMessage.style.display = "none";
          audioVisualizerCanvas.style.display = "none";
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

  contrastFilterRange.addEventListener("input", (e) => {
    let value = parseInt(e.target.value);
    recordingImg.style.filter = `brightness(${value / 50})`;
  });

  const getTotalOnlineUser = async () => {
    const totalUser = await fetch("/api/total-users")
      .then(async (res) => res.text())
      .catch((err) => "error");
    if (totalUser !== "error") {
      onlineUserDiv.textContent = `在線人數: ${
        parseInt(totalUser) == 0 ? "" : totalUser
      }`;
    }
  };

  // get online user
  getTotalOnlineUser();
  // then update total online user every 5 second
  setInterval(getTotalOnlineUser, 5000);
};

init();
