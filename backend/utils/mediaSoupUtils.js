const mediasoup = require("mediasoup");

const { videoCodec, audioCodec } = require("./config");

const findRoom = (conferences, accessKey) => {
  for (let i = 0; i < conferences.length; i++) {
    if (conferences[i].roomId === accessKey) {
      return conferences[i];
    }
  }
};

const createWorker = async () => {
  let worker = await mediasoup.createWorker({
    rtcMinPort: 3000,
    rtcMaxPort: 3100,
  });
  console.log(`worker pid ${worker.pid}`);

  worker.on("died", (error) => {
    // This implies something serious happened, so kill the application
    console.error("mediasoup worker has died");
    setTimeout(() => process.exit(1), 2000); // exit in 2 seconds
  });

  return worker;
};

const createRoomRouters = async (worker) => {
  const roomRouters = {};
  try {
    let videoRouter = await worker.createRouter({
      mediaCodecs: [videoCodec],
    });
    let screenRouter = await worker.createRouter({
      mediaCodecs: [videoCodec],
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

module.exports = { findRoom, createWorker, createRoomRouters };
