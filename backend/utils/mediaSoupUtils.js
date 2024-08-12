const mediaSoup = require("mediasoup");
const fs = require("node:fs/promises");

const {
  videoCodec,
  audioCodec,
  screenCodec,
  webRtcTransport_options,
} = require("./config");

const findRoom = (conferences, accessKey) => {
  for (let i = 0; i < conferences.length; i++) {
    if (conferences[i].roomId === accessKey) {
      return conferences[i];
    }
  }
};

const createWorker = async () => {
  try {
    let worker = await mediaSoup.createWorker({
      rtcMinPort: 3000,
      rtcMaxPort: 3100,
    });
    console.log(`worker pid ${worker.pid}`);

    worker.on("died", (error) => {
      // This implies something serious happened, so kill the application
      console.error("mediaSoup worker has died");
      setTimeout(() => process.exit(1), 2000); // exit in 2 seconds
    });

    return worker;
  } catch (err) {
    console.log(err.message);
    return false;
  }
};

const createRoomRouters = async (worker) => {
  const roomRouters = {};
  try {
    let videoRouter = await worker.createRouter({
      mediaCodecs: [videoCodec],
    });
    let screenRouter = await worker.createRouter({
      mediaCodecs: [screenCodec],
    });
    let audioRouter = await worker.createRouter({
      mediaCodecs: [audioCodec],
    });

    roomRouters.videoRouter = videoRouter;
    roomRouters.screenRouter = screenRouter;
    roomRouters.audioRouter = audioRouter;

    return roomRouters;
  } catch (err) {
    console.log(err.message);
    return false;
  }
};

const createRtcTransport = async (conference) => {
  try {
    if (conference.routers) {
      const rtcTransports = {};

      const videoRtcTransport =
        await conference.routers.videoRouter.createWebRtcTransport(
          webRtcTransport_options
        );

      const audioRtcTransport =
        await conference.routers.audioRouter.createWebRtcTransport(
          webRtcTransport_options
        );
      const screenRtcTransport =
        await conference.routers.screenRouter.createWebRtcTransport(
          webRtcTransport_options
        );

      rtcTransports.videoRtcTransport = videoRtcTransport;
      rtcTransports.audioRtcTransport = audioRtcTransport;
      rtcTransports.screenRtcTransport = screenRtcTransport;

      // params
      const transportParams = {};

      transportParams.videoParams = {
        id: rtcTransports.videoRtcTransport.id,
        iceParameters: rtcTransports.videoRtcTransport.iceParameters,
        iceCandidates: rtcTransports.videoRtcTransport.iceCandidates,
        dtlsParameters: rtcTransports.videoRtcTransport.dtlsParameters,
      };

      transportParams.audioParams = {
        id: rtcTransports.audioRtcTransport.id,
        iceParameters: rtcTransports.audioRtcTransport.iceParameters,
        iceCandidates: rtcTransports.audioRtcTransport.iceCandidates,
        dtlsParameters: rtcTransports.audioRtcTransport.dtlsParameters,
      };

      transportParams.screenParams = {
        id: rtcTransports.screenRtcTransport.id,
        iceParameters: rtcTransports.screenRtcTransport.iceParameters,
        iceCandidates: rtcTransports.screenRtcTransport.iceCandidates,
        dtlsParameters: rtcTransports.screenRtcTransport.dtlsParameters,
      };

      rtcTransports.params = transportParams;

      // dtls change event
      rtcTransports.videoRtcTransport.on("dtlsstatechange", (dtlsState) => {
        if (dtlsState === "closed") {
          rtcTransports.videoRtcTransport.close();
        }
      });

      rtcTransports.audioRtcTransport.on("dtlsstatechange", (dtlsState) => {
        if (dtlsState === "closed") {
          rtcTransports.audioRtcTransport.close();
        }
      });

      rtcTransports.screenRtcTransport.on("dtlsstatechange", (dtlsState) => {
        if (dtlsState === "closed") {
          rtcTransports.screenRtcTransport.close();
        }
      });

      // close transport event
      rtcTransports.videoRtcTransport.on("close", () => {
        console.log(
          `video transport closed for participant: ${userName} with id of ${socketId}`
        );
      });
      rtcTransports.audioRtcTransport.on("close", () => {
        console.log(
          `audio transport closed for participant: ${userName} with id of ${socketId}`
        );
      });
      rtcTransports.screenRtcTransport.on("close", () => {
        console.log(
          `screen transport closed for participant: ${userName} with id of ${socketId}`
        );
      });

      return rtcTransports;
    }
  } catch (err) {
    console.log(err.message);
    return false;
  }
};

const findParticipant = (participants, participantId, participantName) => {
  try {
    let participant;
    for (let i = 0; i < participants.length; i++) {
      if (
        participants[i].participantId === participantId &&
        participants[i].participantName === participantName
      ) {
        participant = participants[i];
      }
    }
    return participant || false;
  } catch (err) {
    console.log(err.message);
    return false;
  }
};

const viewObject = async (path, data) => {
  try {
    await fs.writeFile(path, JSON.stringify(data));
  } catch (error) {
    console.log(error.message);
  }
};
module.exports = {
  findRoom,
  createWorker,
  createRoomRouters,
  createRtcTransport,
  findParticipant,
  viewObject,
};
