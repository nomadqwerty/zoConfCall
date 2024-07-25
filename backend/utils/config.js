let audioCodec = {
  kind: "audio",
  mimeType: "audio/opus",
  clockRate: 48000,
  channels: 2,
};

let videoCodec = {
  kind: "video",
  mimeType: "video/VP8",
  clockRate: 90000,
  parameters: {
    "x-google-start-bitrate": 1000,
  },
};

module.exports = { videoCodec, audioCodec };
