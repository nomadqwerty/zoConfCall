const onJoinRoom = (roomRouterRtp, setRoomRouterRtp) => {
  return (data) => {
    if (
      data?.audioRtpCapabilities &&
      data?.videoRtpCapabilities &&
      data?.screenRtpCapabilities
    ) {
      if (roomRouterRtp === null) {
        console.log(data);
        setRoomRouterRtp(data);
      }
    }
    // room is set up start setting up to produce streams (video, audio).
  };
};

const onCreateProducerTP = (
  producerDevices,
  producerTransports,
  setProducerTransports
) => {
  return (data) => {
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
  remoteMediaStreams,
  setRemoteMediaStreamId
) => {
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
        console.log(`setup ${type} consumer device for: `, remoteProducer.from);
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
                      remoteProducer.videoStreamObject = consumerData;
                      setRemoteMediaStreamId(
                        `${remoteProducer.from}&${remoteProducer.producerId}&${type}`
                      );
                    }
                    if (remoteProducer.kind === "audio" && type === "audio") {
                      remoteProducer.audioStreamObject = consumerData;
                      setRemoteMediaStreamId(
                        `${remoteProducer.from}&${remoteProducer.producerId}&${type}`
                      );
                    }
                    // console.log(remoteMediaStreams);
                  }
                }
              );
            }
          }
        );
      }
    }
  }
};
export {
  onJoinRoom,
  onCreateProducerTP,
  onGetProducers,
  onNewProducer,
  onConsumeState,
};
