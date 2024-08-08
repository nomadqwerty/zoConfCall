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
  socket.on("getAvailableProducers", (data, callback) => {
    let gapLogger = console;
    const { accessKey, userName, socketId } = data;
    if (accessKey && userName && socketId) {
      const conference = findRoom(conferences, accessKey);
      const participant = findParticipant(
        conference.participants,
        socketId,
        userName
      );

      if (conference && participant) {
        const participants = conference.participants;
        gapLogger.log(participants.length);
        const avlVideoProducers = {};
        const avlAudioProducers = {};
        const avlScreenProducers = {};
        for (let i = 0; i < participants.length; i++) {
          if (participants[i].participantId !== socketId) {
            if (participants[i]?.producers?.video?.producer) {
              let avlProducer = participants[i].producers.video.producer;

              avlVideoProducers[participants[i].participantId] = {
                from: participants[i].participantId,
                producerId: avlProducer.id,
                kind: "video",
                rtpCapabilities: conference.routers.videoRouter.rtpCapabilities,
              };

              // gapLogger.log(avlVideoProducers);
            }
            if (participants[i]?.producers?.audio?.producer) {
              let avlProducer = participants[i].producers.audio.producer;

              avlAudioProducers[participants[i].participantId] = {
                from: participants[i].participantId,
                producerId: avlProducer.id,
                kind: "audio",
                rtpCapabilities: conference.routers.audioRouter.rtpCapabilities,
              };

              // gapLogger.log(avlAudioProducers);
            }
            if (participants[i]?.producers?.screen?.producer) {
              let avlProducer = participants[i].producers.screen.producer;

              avlScreenProducers[participants[i].participantId] = {
                from: participants[i].participantId,
                producerId: avlProducer.id,
                kind: "screen",
                rtpCapabilities:
                  conference.routers.screenRouter.rtpCapabilities,
              };

              // gapLogger.log(avlScreenProducers);
            }
          }
        }
        //
        callback({
          avlVideoProducers,
          avlAudioProducers,
          avlScreenProducers,
        });
      }
    }
  });

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
      let tpLogger = null;
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
            tpLogger?.log(
              "connect video producer-TransPort for : ",
              participant.participantId
            );
            const videoProducerTp = participant?.producers.video?.producerTP;
            if (videoProducerTp) {
              tpLogger?.log("Video DTLS PARAMS... ", { dtlsParameters });
              await videoProducerTp.connect({ dtlsParameters });
            }
          } else if (
            isVideo === false &&
            isAudio === true &&
            isScreen === false
          ) {
            tpLogger?.log(
              "connect audio producer-TransPort for : ",
              participant.participantId
            );

            const audioProducerTp = participant?.producers.audio?.producerTP;
            if (audioProducerTp) {
              tpLogger?.log("audio DTLS PARAMS... ", { dtlsParameters });
              await audioProducerTp.connect({ dtlsParameters });
            }
          } else if (
            isVideo === false &&
            isAudio === false &&
            isScreen === true
          ) {
            tpLogger?.log(
              "connect screen producer-TransPort for : ",
              participant.participantId
            );

            const screenProducerTp = participant?.producers.screen?.producerTP;
            if (screenProducerTp) {
              tpLogger?.log("screen DTLS PARAMS... ", { dtlsParameters });
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
      let pLogger = null;
      pLogger?.log(isVideo, isAudio, isScreen, "producing");
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
            pLogger?.log("produce video for : ", participant.participantId);
            const videoProducerTp = participant?.producers.video?.producerTP;
            const videoObject = participant?.producers.video;
            if (videoProducerTp) {
              const videoProducer = await videoProducerTp.produce({
                kind,
                rtpParameters,
              });
              if (videoProducer) {
                pLogger?.log(
                  "Producer ID: ",
                  videoProducer.id,
                  videoProducer.kind
                );

                videoProducer.on("transportclose", () => {
                  pLogger?.log("transport for this videoProducer closed ");
                  videoProducer.close();
                });

                videoObject.producer = videoProducer;

                await viewObject(confObjPath, conference);

                socket.to(accessKey).emit("new-video", {
                  from: socketId,
                  producerId: videoObject.producer.id,
                  kind: "video",
                  rtpCapabilities:
                    conference.routers.videoRouter.rtpCapabilities,
                });

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
            pLogger?.log("produce audio for : ", participant.participantId);
            const audioProducerTp = participant?.producers.audio?.producerTP;
            const audioObject = participant?.producers.audio;
            if (audioProducerTp) {
              const audioProducer = await audioProducerTp.produce({
                kind,
                rtpParameters,
              });
              if (audioProducer) {
                pLogger?.log(
                  "Producer ID: ",
                  audioProducer.id,
                  audioProducer.kind
                );

                audioProducer.on("transportclose", () => {
                  pLogger?.log("transport for this audioProducer closed ");
                  audioProducer.close();
                });

                audioObject.producer = audioProducer;

                await viewObject(confObjPath, conference);

                socket.to(accessKey).emit("new-audio", {
                  from: socketId,
                  producerId: audioObject.producer.id,
                  kind: "audio",
                  rtpCapabilities:
                    conference.routers.audioRouter.rtpCapabilities,
                });

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
            pLogger?.log("produce screen for : ", participant.participantId);
            const screenProducerTp = participant?.producers.screen?.producerTP;
            const screenObject = participant?.producers.screen;
            if (screenProducerTp) {
              const screenProducer = await screenProducerTp.produce({
                kind,
                rtpParameters,
              });
              if (screenProducer) {
                pLogger?.log(
                  "Producer ID: ",
                  screenProducer.id,
                  screenProducer.kind
                );

                screenProducer.on("transportclose", () => {
                  pLogger?.log("transport for this screenProducer closed ");
                  screenProducer.close();
                });

                screenObject.producer = screenProducer;

                await viewObject(confObjPath, conference);

                socket.to(accessKey).emit("new-screen", {
                  from: socketId,
                  producerId: screenObject.producer.id,
                  kind: "screen",
                  rtpCapabilities:
                    conference.routers.screenRouter.rtpCapabilities,
                });

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

  socket.on(
    "createRcvTransport",
    async (
      {
        producer,
        consumer,
        accessKey,
        userName,
        socketId,
        isVideo,
        isAudio,
        isScreen,
        participantId,
      },
      callback
    ) => {
      const rcvLogger = console;
      rcvLogger?.log("creating consumers for: ", participantId);
      if (producer === false && consumer === true) {
        const conference = findRoom(conferences, accessKey);
        const participant = findParticipant(
          conference.participants,
          socketId,
          userName
        );
        if (participant) {
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
          if (isVideo === true) {
            rcvLogger.log(participant.consumers.video);
            const newConsumer = {};
            newConsumer.fromId = participantId;
            newConsumer.consumerTransport =
              await conference.routers.videoRouter.createWebRtcTransport(
                webRtcTransport_options
              );

            rcvLogger.log(
              "new video consumer transport id: ",
              newConsumer.consumerTransport.id
            );
            newConsumer.consumerTransport.on("dtlsstatechange", (dtlsState) => {
              if (dtlsState === "closed") {
                newConsumer.consumerTransport.close();
              }
            });
            newConsumer.consumerTransport.on("close", () => {
              rcvLogger.log("transport closed");
            });
            participant.consumers.video.push(newConsumer);

            callback({
              params: {
                id: newConsumer.consumerTransport.id,
                iceParameters: newConsumer.consumerTransport.iceParameters,
                iceCandidates: newConsumer.consumerTransport.iceCandidates,
                dtlsParameters: newConsumer.consumerTransport.dtlsParameters,
              },
            });
          }
        }
        await viewObject(confObjPath, conference);
      }
    }
  );
  socket.on(
    "transport-recv-connect",
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
        participantId,
      },
      callback
    ) => {
      const rcvLogger = console;
      rcvLogger?.log("connecting consumer for: ", participantId);
      if (producer === false && consumer === true) {
        const conference = findRoom(conferences, accessKey);
        const participant = findParticipant(
          conference.participants,
          socketId,
          userName
        );
        if (participant) {
          if (isVideo === true) {
            const videoConsumers = participant.consumers.video;
            for (let i = 0; i < videoConsumers.length; i++) {
              if (videoConsumers[i].fromId === participantId) {
                console.log(
                  `DTLS PARAMS: ${dtlsParameters} for ${participantId}`
                );
                videoConsumers[i].consumerTransport.connect({
                  dtlsParameters,
                });
              }
            }
          }
        }
      }
    }
  );

  socket.on(
    "consume",
    async (
      {
        rtpCapabilities,
        producer,
        consumer,
        accessKey,
        userName,
        socketId,
        isVideo,
        isAudio,
        isScreen,
        participantId,
        remoteProducerId,
      },
      callback
    ) => {
      const rcvLogger = console;
      rcvLogger?.log("starting consumers for: ", participantId);
      if (producer === false && consumer === true) {
        const conference = findRoom(conferences, accessKey);
        const participant = findParticipant(
          conference.participants,
          socketId,
          userName
        );
        if (participant) {
          if (isVideo === true) {
            if (
              conference.routers.videoRouter.canConsume({
                producerId: remoteProducerId,
                rtpCapabilities,
              })
            ) {
              const videoConsumers = participant.consumers.video;
              for (let i = 0; i < videoConsumers.length; i++) {
                if (videoConsumers[i].fromId === participantId) {
                  videoConsumers[i].consumer = await videoConsumers[
                    i
                  ].consumerTransport.consume({
                    producerId: remoteProducerId,
                    rtpCapabilities,
                    paused: true,
                  });

                  videoConsumers[i].consumer.on("transportclose", () => {
                    console.log("transport close from consumer");
                  });

                  videoConsumers[i].consumer.on("producerclose", () => {
                    console.log("producer of consumer closed");
                  });
                  await viewObject(confObjPath, conference);

                  callback({
                    params: {
                      id: videoConsumers[i].consumer.id,
                      producerId: remoteProducerId,
                      kind: videoConsumers[i].consumer.kind,
                      rtpParameters: videoConsumers[i].consumer.rtpParameters,
                    },
                  });
                }
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
