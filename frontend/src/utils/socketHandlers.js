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

export { onJoinRoom, onCreateProducerTP };
