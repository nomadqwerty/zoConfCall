const createProducerDevices = async (
  producerDevices,
  roomRouterRtp,
  Device,
  setProducerDevices
) => {
  if (producerDevices === null) {
    console.log(roomRouterRtp);
    const devices = {};
    const newVideoDevice = new Device();
    const newAudioDevice = new Device();
    const newScreenDevice = new Device();

    devices.videoDevice = newVideoDevice;
    devices.audioDevice = newAudioDevice;
    devices.screenDevice = newScreenDevice;

    await devices.videoDevice.load({
      routerRtpCapabilities: roomRouterRtp.videoRtpCapabilities,
    });

    await devices.audioDevice.load({
      routerRtpCapabilities: roomRouterRtp.audioRtpCapabilities,
    });

    await devices.screenDevice.load({
      routerRtpCapabilities: roomRouterRtp.screenRtpCapabilities,
    });

    // TODO: set devices for each router.

    setProducerDevices(devices);
  }
};

const producerTransportListeners = (
  accessKey,
  userName,
  socketId,
  producerTransports,
  socket
) => {
  console.log(producerTransports);

  // video TP: connect events
  producerTransports.videoProducerTransport.on(
    "connect",
    async ({ dtlsParameters }, callback, errback) => {
      try {
        // Signal local DTLS parameters to the server side transport
        // see server's socket.on('transport-connect', ...)
        await socket.emit("transport-connect", {
          dtlsParameters,
          producer: true,
          consumer: false,
          accessKey,
          userName,
          socketId,
          isVideo: true,
          isAudio: false,
          isScreen: false,
        });

        // Tell the transport that parameters were transmitted.
        callback();
      } catch (error) {
        errback(error);
      }
    }
  );

  // TODO: audioTP
  producerTransports.audioProducerTransport.on(
    "connect",
    async ({ dtlsParameters }, callback, errback) => {
      try {
        // Signal local DTLS parameters to the server side transport
        // see server's socket.on('transport-connect', ...)
        await socket.emit("transport-connect", {
          dtlsParameters,
          producer: true,
          consumer: false,
          accessKey,
          userName,
          socketId,
          isVideo: false,
          isAudio: true,
          isScreen: false,
        });

        // Tell the transport that parameters were transmitted.
        callback();
      } catch (error) {
        errback(error);
      }
    }
  );

  // TODO: screen TP
  producerTransports.screenProducerTransport.on(
    "connect",
    async ({ dtlsParameters }, callback, errback) => {
      try {
        // Signal local DTLS parameters to the server side transport
        // see server's socket.on('transport-connect', ...)
        await socket.emit("transport-connect", {
          dtlsParameters,
          producer: true,
          consumer: false,
          accessKey,
          userName,
          socketId,
          isVideo: false,
          isAudio: false,
          isScreen: true,
        });

        // Tell the transport that parameters were transmitted.
        callback();
      } catch (error) {
        errback(error);
      }
    }
  );
  //////////////////////////////////////////////////
  //
  // video Producer: produce event
  producerTransports.videoProducerTransport.on(
    "produce",
    async (parameters, callback, errback) => {
      try {
        // Signal local DTLS parameters to the server side transport
        // see server's socket.on('transport-connect', ...)
        await socket.emit(
          "transport-produce",
          {
            kind: parameters.kind,
            rtpParameters: parameters.rtpParameters,
            appData: parameters.appData,
            producer: true,
            consumer: false,
            accessKey,
            userName,
            socketId,
            isVideo: true,
            isAudio: false,
            isScreen: false,
          },
          ({ id }) => {
            // Tell the transport that parameters were transmitted.
            console.log(id);
            callback(id);
          }
        );
      } catch (error) {
        errback(error);
      }
    }
  );

  // TODO: audio Producer
  producerTransports.audioProducerTransport.on(
    "produce",
    async (parameters, callback, errback) => {
      try {
        // Signal local DTLS parameters to the server side transport
        // see server's socket.on('transport-connect', ...)
        await socket.emit(
          "transport-produce",
          {
            kind: parameters.kind,
            rtpParameters: parameters.rtpParameters,
            appData: parameters.appData,
            producer: true,
            consumer: false,
            accessKey,
            userName,
            socketId,
            isVideo: false,
            isAudio: true,
            isScreen: false,
          },
          ({ id }) => {
            // Tell the transport that parameters were transmitted.
            console.log(id);
            callback(id);
          }
        );
      } catch (error) {
        errback(error);
      }
    }
  );

  // TODO: screen Producer
  producerTransports.screenProducerTransport.on(
    "produce",
    async (parameters, callback, errback) => {
      try {
        // Signal local DTLS parameters to the server side transport
        // see server's socket.on('transport-connect', ...)
        await socket.emit(
          "transport-produce",
          {
            kind: parameters.kind,
            rtpParameters: parameters.rtpParameters,
            appData: parameters.appData,
            producer: true,
            consumer: false,
            accessKey,
            userName,
            socketId,
            isVideo: false,
            isAudio: false,
            isScreen: true,
          },
          ({ id }) => {
            // Tell the transport that parameters were transmitted.
            console.log(id);
            callback(id);
          }
        );
      } catch (error) {
        errback(error);
      }
    }
  );
};

export { createProducerDevices, producerTransportListeners };
