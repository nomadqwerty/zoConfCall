const express = require("express");
const { createServer } = require("node:http");
const fs = require("node:fs/promises");
const { Server } = require("socket.io");
const cors = require("cors");
const { join } = require("node:path");
const { onJoinRoom } = require("./utils/socketHandlers");
const PORT = 3050;
const {
  findRoom,
  createWorker,
  createRoomRouters,
  createRtcTransport,
  findParticipant,
  viewObject,
} = require("./utils/mediaSoupUtils");

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
  debug: true,
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());

/*
///////: single conference item in conferences list;
conference :{
  roomId:meetingAccessKey,
  participants:[],
  routers:{
    videoRouter:Obj,
    audioRouter:Obj,
    screenRouter:Obj,
    }
  }

///////: single participant item in conference.participants list;

  participant: {
    participantId:str,
    participantName:str,

    producers:{

      video: {
          producerTP:obj,
          produce:obj,
        },
      audio: {
          producerTP:obj,
          produce:obj,
        },
      screen: {
          producerTP:obj,
          produce:obj,
        },
      
      },

    consumers:[],
    }

    ///////: single consumer item in conference.participants[0].consumers list;

    consumer:{
      fromId:str,
      fromName:str,
      
      video: {
          consumerTP:obj,
          consume:obj,
        },

      audio: {
          consumerTP:obj,
          consume:obj,
        },

      screen: {
          consumerTP:obj,
          consume:obj,
        },
    }

  */

/*
    workers:[]

    ///////: single worker item in workers list;
    
    */
const conferences = [];
const workers = [];

createWorker()
  .then((res) => workers.push(res))
  .catch((err) => console.log(err.message));

io.on("connection", async (socket) => {
  let socketLog = null;
  //listen for roomAccesskey event on socket join and add socket to the provided acceskey
  socketLog?.log("some one connected", socket.id);

  // join room;
  socket.on(
    "joinConferenceRoom",
    onJoinRoom(findRoom, createRoomRouters, conferences, workers, socket)
  );

  // createWebRtcTransport
  const transportLog = console;
  socket.on(
    "createWebRtcTransport",
    async ({ producer, consumer, accessKey, userName, socketId }, callback) => {
      const transObjPath = join(__dirname, "./objectView/transportTxt");
      const confObjPath = join(__dirname, "./objectView/conferenceTxt");
      if (producer === true && consumer === false) {
        // create producer rtc transport for participant based on the room routers.
        // 1: find room and participant;
        const conference = findRoom(conferences, accessKey);
        transportLog?.log(conference.participants);
        const participant = findParticipant(
          conference.participants,
          socketId,
          userName
        );

        transportLog?.log(participant);

        // 2: create producer rtc transport for participant and add to their object

        const rtcTransports = await createRtcTransport(
          conference,
          userName,
          socketId
        );
        transportLog?.log(rtcTransports);

        await viewObject(transObjPath, rtcTransports);

        if (rtcTransports) {
          participant.producers.video.producerTP =
            rtcTransports.videoRtcTransport;

          participant.producers.audio.producerTP =
            rtcTransports.audioRtcTransport;

          participant.producers.screen.producerTP =
            rtcTransports.screenRtcTransport;

          await viewObject(confObjPath, conference);
          callback({
            params: rtcTransports.params,
          });
        }
      }
    }
  );
});

// io.compress(true);

server.listen(PORT, () =>
  console.log(`My server is actively running on port ${PORT}`)
);
// }

// main();
