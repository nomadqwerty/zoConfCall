const express = require("express");
const { createServer } = require("node:http");
const fs = require("node:fs/promises");
const { Server } = require("socket.io");
const cors = require("cors");
const { join } = require("node:path");
const {
  onJoinRoom,
  onCreateRtcTransport,
  getProducers,
  transportConnect,
  transportProduce,
  createRcvTransport,
  rcvTransportConnect,
  onConsume,
} = require("./utils/socketHandlers");
const PORT = 3050;
const {
  findRoom,
  createWorker,
  createRoomRouters,
  createRtcTransport,
  findParticipant,
  viewObject,
} = require("./utils/mediaSoupUtils");
const { access } = require("node:fs");

const confObjPath = join(__dirname, "./objectView/conferenceTxt");
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

    consumers:{

      video:[],
      audio:[],
      screen:[]

        }
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
  socket.on("disconnect", async () => {
    console.log("socket left id: ", socket.id);
    for (let i = 0; i < conferences.length; i++) {
      let participants = conferences[i].participants;
      for (let j = 0; j < participants.length; j++) {
        let roomId = conferences[i].roomId;
        if (participants[j].participantId === socket.id) {
          participants.splice(j, 1);
          console.log(roomId);
          await viewObject(confObjPath, conferences[i]);
          socket.to(roomId).emit("participantLeft", {
            participantId: socket.id,
          });
        }
      }
    }
  });
  // join room;
  socket.on(
    "joinConferenceRoom",
    onJoinRoom(findRoom, createRoomRouters, conferences, workers, socket)
  );

  // createWebRtcTransport
  socket.on(
    "createWebRtcTransport",
    onCreateRtcTransport(
      findRoom,
      findParticipant,
      createRtcTransport,
      conferences
    )
  );

  // Return all available producers.
  socket.on(
    "getAvailableProducers",
    getProducers(conferences, findRoom, findParticipant)
  );

  // Rtc producer transport handler;
  // connect
  socket.on(
    "transport-connect",
    transportConnect(conferences, findRoom, findParticipant)
  );
  // produce
  socket.on(
    "transport-produce",
    transportProduce(conferences, findRoom, findParticipant, socket)
  );

  // Rtc producer transport handler;
  // rcv tp
  socket.on(
    "createRcvTransport",
    createRcvTransport(conferences, findRoom, findParticipant)
  );

  socket.on("deleteRcvTransport", async (data) => {
    const { accessKey, userName, socketId, participantId } = data;
    const conference = findRoom(conferences, accessKey);
    const participant = findParticipant(
      conference.participants,
      socketId,
      userName
    );

    if (participant) {
      const consumers = participant.consumers;
      const keys = Object.keys(consumers);
      for (let i = 0; i < keys.length; i++) {
        let consumerList = consumers[keys[i]];
        for (let j = 0; j < consumerList.length; j++) {
          if (consumerList[j].fromId === participantId) {
            consumerList.splice(j, 1);
          }
        }
      }
      await viewObject(confObjPath, conference);
    }
  });

  // rcv connect
  socket.on(
    "transport-recv-connect",
    rcvTransportConnect(conferences, findRoom, findParticipant)
  );
  // rcv consume
  socket.on("consume", onConsume(conferences, findRoom, findParticipant));

  // resume consume;
  socket.on("consumerResume", async (data) => {
    const { fromId, type, accessKey, socketId, userName } = data;
    console.log("resume consumer for", fromId, type);
    const conference = findRoom(conferences, accessKey);
    if (conference) {
      const participant = findParticipant(
        conference.participants,
        socketId,
        userName
      );

      if (participant && type) {
        const consumerList = participant.consumers[type];

        for (let i = 0; i < consumerList.length; i++) {
          const consumer = consumerList[i].consumer;
          await consumer.resume();
          console.log("resumed ", type, " stream for: ", fromId);
        }
      }
    }
  });

  socket.on("stoppedScreenShare", (data) => {
    const { accessKey, userName, socketId } = data;

    const conference = findRoom(conferences, accessKey);
    if (conference) {
      let roomId = conference.roomId;
      const participants = conference.participants;
      for (let i = 0; i < participants.length; i++) {
        const screens = participants[i].consumers.screen;

        for (let j = 0; j < screens.length; j++) {
          if (screens[j].fromId === socketId) {
            screens.splice(j, 1);
          }
        }
      }

      socket.to(roomId).emit("stopScreenConsumer", {
        participantName: userName,
        participantId: socketId,
      });
    }
  });

  socket.on("newMessage", (data) => {
    const { accessKey } = data;
    console.log(data);
    socket.to(accessKey).emit("incomingMessage", data);
  });
});

// io.compress(true);

server.listen(PORT, () =>
  console.log(`My server is actively running on port ${PORT}`)
);
// }

// main();
