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

export { createProducerDevices };
