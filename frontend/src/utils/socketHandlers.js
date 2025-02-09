const onJoinRoom = (roomRouterRtp, setRoomRouterRtp, messages, setMessages) => {
  return (data) => {
    // room is set up start setting up to produce streams (video, audio).
    try {
      if (
        data?.audioRtpCapabilities &&
        data?.videoRtpCapabilities &&
        data?.screenRtpCapabilities
      ) {
        if (roomRouterRtp === null) {
          console.log(data);
          setRoomRouterRtp(data);
          console.log(data.messages);
          for (let message of data.messages) {
            console.log(message);
            message.msgObj.type = "received";
            messages.push(message.msgObj);
          }
          const newMessages = messages;
          setMessages([...newMessages]);
        }
      }
    } catch (error) {
      console.log(error.message);
    }
  };
};

const onCreateProducerTP = (
  producerDevices,
  producerTransports,
  setProducerTransports
) => {
  return (data) => {
    try {
      if (
        producerDevices.videoDevice &&
        producerDevices.audioDevice &&
        producerDevices.screenDevice
      ) {
        // create send transport on each producerDevice;
        const videoProducerTransport =
          producerDevices.videoDevice.createSendTransport(
            data.params.videoParams
          );

        const audioProducerTransport =
          producerDevices.audioDevice.createSendTransport(
            data.params.audioParams
          );

        const screenProducerTransport =
          producerDevices.screenDevice.createSendTransport(
            data.params.screenParams
          );

        if (producerTransports === null) {
          const transports = {};
          transports.videoProducerTransport = videoProducerTransport;

          transports.audioProducerTransport = audioProducerTransport;

          transports.screenProducerTransport = screenProducerTransport;

          setProducerTransports(transports);
        }
      }
    } catch (error) {
      console.log(error.message);
    }
  };
};

const onGetProducers = (
  remoteVideoProducers,
  remoteAudioProducers,
  remoteScreenProducers,
  setConsumeVideoState,
  setConsumeAudioState,
  setConsumeScreenState
) => {
  return (data) => {
    try {
      console.log("existing producers");
      console.log(data);

      const vidProd = Object.keys(data.avlVideoProducers);
      for (let i = 0; i < vidProd.length; i++) {
        remoteVideoProducers[vidProd[i]] = data.avlVideoProducers[vidProd[i]];
      }
      setConsumeVideoState("consumeAll");

      const audProd = Object.keys(data.avlAudioProducers);
      for (let i = 0; i < audProd.length; i++) {
        remoteAudioProducers[audProd[i]] = data.avlAudioProducers[audProd[i]];
      }
      setConsumeAudioState("consumeAll");

      const screenProd = Object.keys(data.avlScreenProducers);
      for (let i = 0; i < screenProd.length; i++) {
        remoteScreenProducers[screenProd[i]] =
          data.avlScreenProducers[screenProd[i]];
      }
      setConsumeScreenState("consumeAll");
    } catch (error) {
      console.log(error.message);
    }
  };
};

const onNewProducer = (
  remoteVideoProducers,
  remoteAudioProducers,
  remoteScreenProducers,
  setConsumeVideoState,
  setConsumeAudioState,
  setConsumeScreenState,
  socket
) => {
  try {
    socket.on("new-video", (data) => {
      console.log("someone is producing a video stream");
      console.log(data);
      remoteVideoProducers[data.from] = data;
      console.log(remoteVideoProducers);
      setConsumeVideoState(data.from);
    });
    socket.on("new-audio", (data) => {
      console.log("someone is producing an audio stream");
      remoteAudioProducers[data.from] = data;
      console.log(remoteAudioProducers);
      setConsumeAudioState(data.from);
    });
    socket.on("new-screen", (data) => {
      console.log("someone is producing a screen stream");
      console.log(data);
      remoteScreenProducers[data.from] = data;
      console.log(remoteScreenProducers);
      setConsumeScreenState(data.from);
    });
  } catch (error) {
    console.log(error.message);
  }
};

const onConsumeState = (
  consumeVideoState,
  remoteVideoProducers,
  isVideo,
  isAudio,
  isScreen,
  accessKey,
  userName,
  socketId,
  socket,
  Device,
  remoteStreams,
  setRemoteStream
) => {
  try {
    let type;
    if (isVideo) {
      type = "video";
    }
    if (isAudio) {
      type = "audio";
    }
    if (isScreen) {
      type = "screen";
    }
    if (consumeVideoState?.length > 0) {
      console.log(`reset ${type} consumer state`);
      const keys = Object.keys(remoteVideoProducers);

      // console.log(keys);
      for (let i = 0; i < keys.length; i++) {
        const remoteProducer = remoteVideoProducers[keys[i]];
        if (!remoteProducer?.consumerDevice) {
          console.log(
            `setup ${type} consumer device for: `,
            remoteProducer.from
          );
          socket.emit(
            "createRcvTransport",
            {
              producer: false,
              consumer: true,
              accessKey,
              userName,
              socketId,
              isVideo,
              isAudio,
              isScreen,
              participantId: remoteProducer.from,
            },
            async (data) => {
              console.log(data);
              let params = data?.params;
              if (params) {
                remoteProducer.consumerDevice = new Device();
                await remoteProducer.consumerDevice.load({
                  routerRtpCapabilities: remoteProducer.rtpCapabilities,
                });
                remoteProducer.consumerTransport =
                  remoteProducer.consumerDevice.createRecvTransport(params);
                console.log(
                  "created remote consumer tp for: ",
                  remoteProducer.from
                );
                // console.log(remoteProducer);
                remoteProducer.consumerTransport.on(
                  "connect",
                  async ({ dtlsParameters }, callback, errback) => {
                    try {
                      await socket.emit("transport-recv-connect", {
                        dtlsParameters,
                        producer: false,
                        consumer: true,
                        accessKey,
                        userName,
                        socketId,
                        isVideo,
                        isAudio,
                        isScreen,
                        participantId: remoteProducer.from,
                      });

                      callback();
                    } catch (error) {
                      errback(error);
                    }
                  }
                );
                socket.emit(
                  "consume",
                  {
                    rtpCapabilities:
                      remoteProducer.consumerDevice.rtpCapabilities,
                    producer: false,
                    consumer: true,
                    accessKey,
                    userName,
                    socketId,
                    isVideo,
                    isAudio,
                    isScreen,
                    participantId: remoteProducer.from,
                    remoteProducerId: remoteProducer.producerId,
                  },
                  async (data) => {
                    console.log(data);
                    const params = data.params;
                    if (params) {
                      let consumerData =
                        await remoteProducer.consumerTransport.consume({
                          id: params.id,
                          producerId: params.producerId,
                          kind: params.kind,
                          rtpParameters: params.rtpParameters,
                        });

                      if (remoteProducer.kind === "video" && type === "video") {
                        const videoEl = (
                          <video
                            className="VideoElem"
                            id={`${remoteProducer.from}-video`}
                            key={remoteProducer.from}
                            autoPlay
                            playsInline
                          ></video>
                        );

                        remoteProducer.videoStreamObject = consumerData;
                        socket.emit("consumerResume", {
                          fromId: remoteProducer.from,
                          type,
                          accessKey,
                          socketId,
                          userName,
                        });
                        const newStream = {
                          fromId: remoteProducer.from,
                          type,
                          track: remoteProducer.videoStreamObject.track,
                          component: videoEl,
                        };

                        const oldStreams = remoteStreams;
                        oldStreams.push(newStream);

                        const overWrite = [...oldStreams];

                        setRemoteStream(overWrite);
                      }
                      if (remoteProducer.kind === "audio" && type === "audio") {
                        const audioEl = (
                          <audio
                            className="audioElem"
                            id={`${remoteProducer.from}-audio`}
                            key={remoteProducer.from}
                            autoPlay
                            playsInline
                          ></audio>
                        );
                        remoteProducer.audioStreamObject = consumerData;
                        socket.emit("consumerResume", {
                          fromId: remoteProducer.from,
                          type,
                          accessKey,
                          socketId,
                          userName,
                        });
                        const newStream = {
                          fromId: remoteProducer.from,
                          type,
                          track: remoteProducer.audioStreamObject.track,
                          component: audioEl,
                        };

                        const oldStreams = remoteStreams;
                        oldStreams.push(newStream);

                        const overWrite = [...oldStreams];

                        setRemoteStream(overWrite);
                      }
                      // console.log(remoteMediaStreams);

                      if (
                        remoteProducer.kind === "screen" &&
                        type === "screen"
                      ) {
                        const videoEl = (
                          <video
                            className="VideoElem"
                            id={`${remoteProducer.from}-screen`}
                            key={remoteProducer.from}
                            autoPlay
                            playsInline
                          ></video>
                        );

                        remoteProducer.screenStreamObject = consumerData;
                        socket.emit("consumerResume", {
                          fromId: remoteProducer.from,
                          type,
                          accessKey,
                          socketId,
                          userName,
                        });
                        const newStream = {
                          fromId: remoteProducer.from,
                          type,
                          track: remoteProducer.screenStreamObject.track,
                          component: videoEl,
                        };

                        const oldStreams = remoteStreams;
                        oldStreams.push(newStream);

                        const overWrite = [...oldStreams];

                        setRemoteStream(overWrite);
                      }
                    }
                  }
                );
              }
            }
          );
        }
      }
    }
  } catch (error) {
    console.log(error.message);
  }
};

const onParticipantLeft = (
  remoteVideoProducers,
  remoteAudioProducers,
  remoteScreenProducers,
  accessKey,
  userName,
  socketId,
  socket
) => {
  return (data) => {
    try {
      console.log("participantLeft id: ", data.participantId);
      const videoEl = document.getElementById(`${data.participantId}-video`);
      const audioEl = document.getElementById(`${data.participantId}-audio`);
      const screenEl = document.getElementById(`${data.participantId}-screen`);

      if (videoEl) {
        videoEl.style.display = "none";
      }
      if (audioEl) {
        audioEl.style.display = "none";
      }
      if (screenEl) {
        screenEl.style.display = "none";
      }

      console.log(videoEl);
      console.log(audioEl);
      console.log(screenEl);

      if (
        remoteVideoProducers[data.participantId] ||
        remoteAudioProducers[data.participantId] ||
        remoteScreenProducers[data.participantId]
      ) {
        socket.emit("deleteRcvTransport", {
          accessKey,
          userName,
          socketId,
          participantId: data.participantId,
        });
      }
      if (remoteVideoProducers[data.participantId]) {
        delete remoteVideoProducers[data.participantId];
        console.log(remoteVideoProducers);
      }
      if (remoteAudioProducers[data.participantId]) {
        delete remoteAudioProducers[data.participantId];
        console.log(remoteAudioProducers);
      }
      if (remoteScreenProducers[data.participantId]) {
        delete remoteScreenProducers[data.participantId];
        console.log(remoteScreenProducers);
      }
    } catch (error) {
      console.log(error.message);
    }
  };
};

const onStoppedScreen = (
  remoteScreenProducers,
  setConsumeScreenState,
  setScreenReset
) => {
  return (data) => {
    try {
      console.log("stopped sharing screen for id: ", data.participantId);
      const screenEl = document.getElementById(`${data.participantId}-screen`);
      if (screenEl) {
        screenEl.style.display = "none";
      }
      console.log(screenEl);
      if (remoteScreenProducers[data.participantId]) {
        setConsumeScreenState("");
        setScreenReset(data.participantId);
        delete remoteScreenProducers[data.participantId];
      }
    } catch (error) {
      console.log(error.message);
    }
  };
};

const onIncomingMessage = (messages, setMessages) => {
  return (data) => {
    try {
      console.log(data);
      const msgObj = data.msgObj;
      msgObj.type = "received";
      messages.push(msgObj);
      const newMessages = messages;
      setMessages([...newMessages]);
    } catch (error) {
      console.log(error.message);
    }
  };
};

const ontoggleRemoteMedia = () => {
  return (data) => {
    console.log(data, "mute");
    const remoteMediaEl = document.getElementById(`${data.id}-${data.type}`);
    if (remoteMediaEl) {
      if (data.action === "play") {
        remoteMediaEl.play();
        alert(`${data.type} stream for ${data.id} has been unmuted`);
      }
      if (data.action === "pause") {
        remoteMediaEl.pause();
        alert(`${data.type} stream for ${data.id} has been muted`);
      }
    }
  };
};
export {
  onJoinRoom,
  onCreateProducerTP,
  onGetProducers,
  onNewProducer,
  onConsumeState,
  onParticipantLeft,
  onStoppedScreen,
  onIncomingMessage,
  ontoggleRemoteMedia,
};
