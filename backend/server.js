const express = require("express");
const { createServer } = require("node:http");
const fs = require("node:fs/promises");
const { Server } = require("socket.io");
const cors = require("cors");
const PORT = 3050;
const {
  findRoom,
  createWorker,
  createRoomRouters,
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
  //listen for roomAccesskey event on socket join and add socket to the provided acceskey
  console.log("some one connected", socket.id);
  socket.on("joinConferenceRoom", async (data, callback) => {
    const { userName, accessKey, socketId } = data;

    let existingConference = findRoom(conferences, accessKey) || false;

    console.log(
      "is there a room for: ",
      socket.id,
      existingConference ? true : false
    );

    if (existingConference) {
      // TODO: add to conference room;

      // 2: create participant object
      const participantId = socketId || socket.id;
      const participantName = userName;

      const newParticipant = {
        participantId: participantId,
        participantName: participantName,
      };

      // 3: add participant to conference:
      existingConference.participants.push(newParticipant);

      // 5: return room routers rtp capabilities and tell new participant to start producing;
      const rtpCapabilities = {};

      rtpCapabilities.videoRtpCapabilities =
        existingConference.routers.videoRouter.rtpCapabilities;

      rtpCapabilities.screenRtpCapabilities =
        existingConference.routers.screenRouter.rtpCapabilities;

      rtpCapabilities.audioRtpCapabilities =
        existingConference.routers.audioRouter.rtpCapabilities;

      callback(rtpCapabilities);
    } else {
      // TODO: create conference and add participant to conference room;
      // 1: create room.
      const roomId = accessKey;
      const roomRouters = await createRoomRouters(workers[0]);
      const newConferenceRoom = {
        roomId: roomId,
        participants: [],
        routers: roomRouters,
      };

      // 2: create participant object
      const participantId = socketId || socket.id;
      const participantName = userName;

      const newParticipant = {
        participantId: participantId,
        participantName: participantName,
      };

      // 3: add participant to conference:
      newConferenceRoom.participants.push(newParticipant);

      await fs.writeFile("./conferenceTxt", JSON.stringify(newConferenceRoom));

      // 4: add conference to conferences list;
      conferences.push(newConferenceRoom);

      // 5: return room routers rtp capabilities and tell new participant to start producing;
      const rtpCapabilities = {};

      rtpCapabilities.videoRtpCapabilities =
        newConferenceRoom.routers.videoRouter.rtpCapabilities;

      rtpCapabilities.screenRtpCapabilities =
        newConferenceRoom.routers.screenRouter.rtpCapabilities;

      rtpCapabilities.audioRtpCapabilities =
        newConferenceRoom.routers.audioRouter.rtpCapabilities;

      callback(rtpCapabilities);
    }

    try {
    } catch (e) {
      console.log("could not join roomAccessKey", e);
    }
  });
});

// io.compress(true);

server.listen(PORT, () =>
  console.log(`My server is actively running on port ${PORT}`)
);
// }

// main();
