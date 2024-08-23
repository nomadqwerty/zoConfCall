const getUserMedia = async (
  navigator,
  setSocketId,
  setSocket,
  socketObj,
  setVideoDevices,
  setAudioDevices
) => {
  if (navigator.mediaDevices) {
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      media.getTracks().forEach((track) => {
        if (track.kind === "video") {
          const videoEl = document.getElementById("local-video");
          const newVideoStream = new MediaStream([track]);
          videoEl.srcObject = newVideoStream;
        }
        if (track.kind === "audio") {
          const audioEl = document.getElementById("local-audio");
          const newAudioStream = new MediaStream([track]);
          audioEl.srcObject = newAudioStream;
        }
      });
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = [];
      const audioDevices = [];
      for (let i = 0; i < mediaDevices.length; i++) {
        if (mediaDevices[i].kind === "videoinput") {
          videoDevices.push(mediaDevices[i]);
        }
        if (mediaDevices[i].kind === "audioinput") {
          audioDevices.push(mediaDevices[i]);
        }
      }

      setVideoDevices([...videoDevices]);
      setAudioDevices([...audioDevices]);

      setSocketId(socketObj.id);
      setSocket(socketObj);
    } catch (error) {
      console.log(error.message);
    }
  }
};

const onTypeMessage = (setMessageInput) => {
  return (e) => {
    try {
      setMessageInput(e.target.value);
    } catch (error) {
      console.log(error.message);
    }
  };
};
const onSendMessage = (
  accessKey,
  socketId,
  messageInput,
  setMessageInput,
  userName,
  messages,
  setMessages,
  socket
) => {
  return (e) => {
    try {
      e.preventDefault();

      if (messageInput.length > 0) {
        const msgObj = {
          time: Date.now(),
          message: messageInput,
          type: "send",
          from: userName,
        };
        messages.push(msgObj);
        const newMessages = messages;
        setMessages([...newMessages]);
        console.log(msgObj);
        socket.emit("newMessage", {
          userName,
          accessKey,
          socketId,
          msgObj,
        });
        setMessageInput("");
      }
    } catch (error) {
      console.log(error.message);
    }
  };
};

const addVideoStream = (videoEls) => {
  try {
    if (videoEls.length > 0) {
      console.log(videoEls);
      for (let i = 0; i < videoEls.length; i++) {
        if (!videoEls[i]?.isLoaded) {
          const videoEl = document.getElementById(
            `${videoEls[i].fromId}-video`
          );
          console.log(`${videoEls[i].fromId}-video`);
          const videoFeed = new MediaStream([videoEls[i].track]);

          videoEl.srcObject = videoFeed;
          videoEls[i].isLoaded = true;
        }
      }
    }
  } catch (error) {
    console.log(error.message);
  }
};

const addAudioStream = (audioEls) => {
  try {
    if (audioEls.length > 0) {
      console.log(audioEls);
      for (let i = 0; i < audioEls.length; i++) {
        if (!audioEls[i]?.isLoaded) {
          const audioEl = document.getElementById(
            `${audioEls[i].fromId}-audio`
          );
          console.log(`${audioEls[i].fromId}-audio`);
          const audioFeed = new MediaStream([audioEls[i].track]);

          audioEl.srcObject = audioFeed;
          audioEls[i].isLoaded = true;
        }
      }
    }
  } catch (error) {
    console.log(error.message);
  }
};

const addScreenStream = (screenEls) => {
  try {
    if (screenEls.length > 0) {
      console.log(screenEls);
      for (let i = 0; i < screenEls.length; i++) {
        if (!screenEls[i]?.isLoaded) {
          const screenEl = document.getElementById(
            `${screenEls[i].fromId}-screen`
          );

          screenEl.style.display = "block";

          console.log(`${screenEls[i].fromId}-screen`);
          const videoFeed = new MediaStream([screenEls[i].track]);

          screenEl.srcObject = videoFeed;
          screenEls[i].isLoaded = true;
        }
      }
    }
  } catch (error) {
    console.log(error.message);
  }
};

const resetScreen = (
  screenReset,
  screenEls,
  setScreenEls,
  setRemoteScreenStream
) => {
  try {
    if (screenReset.length > 0) {
      console.log(screenEls);
      let idx;
      for (let i = 0; i < screenEls.length; i++) {
        console.log(screenEls[i], screenReset);
        if (screenEls[i].fromId === screenReset) {
          idx = i;
        }
      }

      if (idx) {
        screenEls.splice(idx, 1);
        console.log(screenEls, idx);
        setRemoteScreenStream([...screenEls]);
        setScreenEls([...screenEls]);
      }
    }
  } catch (error) {
    console.log(error.message);
  }
};
const testUserMedia = async (navigator, videoDevice, audioDevice, type) => {
  if (navigator.mediaDevices) {
    try {
      console.log(type);
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: audioDevice.deviceId },
        video: { deviceId: videoDevice.deviceId },
      });

      media.getTracks().forEach((track) => {
        if (track.kind === "video" && type === "video") {
          const videoEl = document.getElementById("test-video");
          const newVideoStream = new MediaStream([track]);
          videoEl.srcObject = newVideoStream;
        }
        if (track.kind === "audio" && type === "audio") {
          const audioEl = document.getElementById("test-audio");
          const newAudioStream = new MediaStream([track]);
          audioEl.srcObject = newAudioStream;
        }
      });
    } catch (error) {
      console.log(error.message);
    }
  }
};

const onSetVideoDevice = (idx, setSelectedVideoDevice) => {
  try {
    return (e) => {
      setSelectedVideoDevice(idx);
    };
  } catch (error) {
    console.log(error.message);
  }
};
const onSetAudioDevice = (idx, setSelectedAudioDevice) => {
  try {
    return (e) => {
      setSelectedAudioDevice(idx);
    };
  } catch (error) {
    console.log(error.message);
  }
};

const stopTesting = (setSelectedVideoDevice, setSelectedAudioDevice) => {
  return () => {
    try {
      const videoEl = document.getElementById(`test-video`);
      const audioEl = document.getElementById(`test-audio`);

      if (videoEl) {
        videoEl.srcObject = null;
      }
      if (audioEl) {
        audioEl.srcObject = null;
      }
      setSelectedVideoDevice(null);
      setSelectedAudioDevice(null);
    } catch (error) {
      console.log(error.message);
    }
  };
};
export {
  getUserMedia,
  onSendMessage,
  onTypeMessage,
  addVideoStream,
  addAudioStream,
  addScreenStream,
  resetScreen,
  testUserMedia,
  onSetVideoDevice,
  onSetAudioDevice,
  stopTesting,
};
