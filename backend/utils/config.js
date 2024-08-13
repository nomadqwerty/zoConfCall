let audioCodec = {
  kind: "audio",
  mimeType: "audio/opus",
  clockRate: 48000,
  channels: 2,
};

let videoCodec = {
  kind: "video",
  mimeType: "video/vp8",
  clockRate: 90000,
  parameters: {
    "x-google-start-bitrate": 1000,
  },
};

let screenCodec = {
  kind: "video",
  mimeType: "video/vp8",
  clockRate: 90000,
  parameters: {
    "x-google-start-bitrate": 1000,
  },
};

const webRtcTransport_options = {
  listenIps: [
    {
      ip: "0.0.0.0", // replace with relevant IP address
      announcedIp: "127.0.0.1",
    },
  ],
  enableUdp: true,
  enableTcp: true,
  preferUdp: true,
};

module.exports = {
  videoCodec,
  audioCodec,
  screenCodec,
  webRtcTransport_options,
};
