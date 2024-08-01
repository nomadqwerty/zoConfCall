const express = require("express");
const { createServer } = require("node:http");
const fs = require("node:fs/promises");
const { Server } = require("socket.io");
const cors = require("cors");
const { join } = require("node:path");
const { onJoinRoom, onCreateRtcTransport } = require("./utils/socketHandlers");
const PORT = 3050;
const {
  findRoom,
  createWorker,
  createRoomRouters,
  createRtcTransport,
  findParticipant,
  viewObject,
} = require("./utils/mediaSoupUtils");

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
  socket.on(
    "createWebRtcTransport",
    onCreateRtcTransport(
      findRoom,
      findParticipant,
      createRtcTransport,
      conferences
    )
  );

  // Rtc transport handler;

  socket.on(
    "transport-connect",
    async (
      {
        dtlsParameters,
        producer,
        consumer,
        accessKey,
        userName,
        socketId,
        isVideo,
        isAudio,
        isScreen,
      },
      callback
    ) => {
      if (producer === true && consumer === false) {
        // create producer rtc transport for participant based on the room routers.
        // 1: find room and participant;
        const conference = findRoom(conferences, accessKey);

        const participant = findParticipant(
          conference.participants,
          socketId,
          userName
        );

        if (participant.participantId === socketId) {
          if (isVideo === true && isAudio === false && isScreen === false) {
            console.log(
              "connect video producer-TransPort for : ",
              participant.participantId
            );
            const videoProducerTp = participant?.producers.video?.producerTP;
            if (videoProducerTp) {
              console.log("Video DTLS PARAMS... ", { dtlsParameters });
              await videoProducerTp.connect({ dtlsParameters });
            }
          } else if (
            isVideo === false &&
            isAudio === true &&
            isScreen === false
          ) {
            console.log(
              "connect audio producer-TransPort for : ",
              participant.participantId
            );

            const audioProducerTp = participant?.producers.audio?.producerTP;
            if (audioProducerTp) {
              console.log("audio DTLS PARAMS... ", { dtlsParameters });
              await audioProducerTp.connect({ dtlsParameters });
            }
          } else if (
            isVideo === false &&
            isAudio === false &&
            isScreen === true
          ) {
            console.log(
              "connect screen producer-TransPort for : ",
              participant.participantId
            );

            const screenProducerTp = participant?.producers.screen?.producerTP;
            if (screenProducerTp) {
              console.log("screen DTLS PARAMS... ", { dtlsParameters });
              await screenProducerTp.connect({ dtlsParameters });
            }
          }
        }
      }
    }
  );

  socket.on(
    "transport-produce",
    async (
      {
        kind,
        rtpParameters,
        appData,
        producer,
        consumer,
        accessKey,
        userName,
        socketId,
        isVideo,
        isAudio,
        isScreen,
      },
      callback
    ) => {
      console.log(isVideo, isAudio, isScreen, "producing");
      if (producer === true && consumer === false) {
        // create producer rtc transport for participant based on the room routers.
        // 1: find room and participant;
        const conference = findRoom(conferences, accessKey);

        const participant = findParticipant(
          conference.participants,
          socketId,
          userName
        );

        if (participant.participantId === socket.id) {
          if (isVideo === true && isAudio === false && isScreen === false) {
            console.log("produce video for : ", participant.participantId);
            const videoProducerTp = participant?.producers.video?.producerTP;
            const videoObject = participant?.producers.video;
            if (videoProducerTp) {
              const videoProducer = await videoProducerTp.produce({
                kind,
                rtpParameters,
              });
              if (videoProducer) {
                console.log(
                  "Producer ID: ",
                  videoProducer.id,
                  videoProducer.kind
                );

                videoProducer.on("transportclose", () => {
                  console.log("transport for this videoProducer closed ");
                  videoProducer.close();
                });

                videoObject.producer = videoProducer;

                await viewObject(confObjPath, conference);

                callback({
                  id: videoProducer.id,
                });
              }
            }
          } else if (
            isVideo === false &&
            isAudio === true &&
            isScreen === false
          ) {
            console.log("produce audio for : ", participant.participantId);
            const audioProducerTp = participant?.producers.audio?.producerTP;
            const audioObject = participant?.producers.audio;
            if (audioProducerTp) {
              const audioProducer = await audioProducerTp.produce({
                kind,
                rtpParameters,
              });
              if (audioProducer) {
                console.log(
                  "Producer ID: ",
                  audioProducer.id,
                  audioProducer.kind
                );

                audioProducer.on("transportclose", () => {
                  console.log("transport for this audioProducer closed ");
                  audioProducer.close();
                });

                audioObject.producer = audioProducer;

                await viewObject(confObjPath, conference);

                callback({
                  id: audioProducer.id,
                });
              }
            }
          } else if (
            isVideo === false &&
            isAudio === false &&
            isScreen === true
          ) {
            console.log("produce screen for : ", participant.participantId);
            const screenProducerTp = participant?.producers.screen?.producerTP;
            const screenObject = participant?.producers.screen;
            if (screenProducerTp) {
              const screenProducer = await screenProducerTp.produce({
                kind,
                rtpParameters,
              });
              if (screenProducer) {
                console.log(
                  "Producer ID: ",
                  screenProducer.id,
                  screenProducer.kind
                );

                screenProducer.on("transportclose", () => {
                  console.log("transport for this screenProducer closed ");
                  screenProducer.close();
                });

                screenObject.producer = screenProducer;

                await viewObject(confObjPath, conference);

                callback({
                  id: screenProducer.id,
                });
              }
            }
          }
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
