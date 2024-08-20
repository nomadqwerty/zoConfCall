const fs = require("node:fs/promises");
const { join } = require("node:path");
const { viewObject } = require("./mediaSoupUtils");
const { webRtcTransport_options } = require("./config");

const confObjPath = join(__dirname, "../objectView/conferenceTxt");
const transObjPath = join(__dirname, "../objectView/transportTxt");

const onJoinRoom = (
  findRoom,
  createRoomRouters,
  conferences,
  workers,
  socket
) => {
  return async (data, callback) => {
    const { userName, accessKey, socketId } = data;

    let existingConference = findRoom(conferences, accessKey) || false;

    let boolConsole = null;

    boolConsole?.log(
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
        producers: {
          video: {},
          audio: {},
          screen: {},
        },
        consumers: {
          video: [],
          audio: [],
          screen: [],
        },
      };

      // 3: add participant to conference:
      if (existingConference.participants.length <= 5) {
        existingConference.participants.push(newParticipant);

        await viewObject(confObjPath, existingConference);
        // 4: add participant to room based on accessKey.
        socket.join(accessKey);

        // 5: return room routers rtp capabilities and tell new participant to start producing;
        const rtpCapabilities = {};

        rtpCapabilities.videoRtpCapabilities =
          existingConference.routers.videoRouter.rtpCapabilities;

        rtpCapabilities.screenRtpCapabilities =
          existingConference.routers.screenRouter.rtpCapabilities;

        rtpCapabilities.audioRtpCapabilities =
          existingConference.routers.audioRouter.rtpCapabilities;

        rtpCapabilities.messages = existingConference.messages;

        callback(rtpCapabilities);
      } else {
        console.log("participant count exeeded");
      }
    } else {
      // TODO: create conference and add participant to conference room;
      // 1: create room.
      const roomId = accessKey;
      const roomRouters = await createRoomRouters(workers[0]);
      const newConferenceRoom = {
        roomId: roomId,
        participants: [],
        routers: roomRouters,
        messages: [],
      };

      // 2: create participant object
      const participantId = socketId || socket.id;
      const participantName = userName;

      const newParticipant = {
        participantId: participantId,
        participantName: participantName,
        producers: {
          video: {},
          audio: {},
          screen: {},
        },
        consumers: {
          video: [],
          audio: [],
          screen: [],
        },
      };

      // 3: add participant to conference:
      newConferenceRoom.participants.push(newParticipant);

      await viewObject(confObjPath, newConferenceRoom);

      // 4: add conference to conferences list;
      conferences.push(newConferenceRoom);

      // 4B: add participant to room based on accessKey.
      socket.join(accessKey);

      // 5: return room routers rtp capabilities and tell new participant to start producing;
      const rtpCapabilities = {};

      rtpCapabilities.videoRtpCapabilities =
        newConferenceRoom.routers.videoRouter.rtpCapabilities;

      rtpCapabilities.screenRtpCapabilities =
        newConferenceRoom.routers.screenRouter.rtpCapabilities;

      rtpCapabilities.audioRtpCapabilities =
        newConferenceRoom.routers.audioRouter.rtpCapabilities;

      rtpCapabilities.messages = newConferenceRoom.messages;

      callback(rtpCapabilities);
    }

    try {
    } catch (e) {
      boolConsole?.log("could not join roomAccessKey", e);
    }
  };
};

const onCreateRtcTransport = (
  findRoom,
  findParticipant,
  createRtcTransport,
  conferences
) => {
  const transportLog = null;
  return async (
    { producer, consumer, accessKey, userName, socketId },
    callback
  ) => {
    const conference = findRoom(conferences, accessKey);
    if (producer === true && consumer === false && conference) {
      // create producer rtc transport for participant based on the room routers.
      // 1: find room and participant;
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
  };
};

const getProducers = (conferences, findRoom, findParticipant) => {
  return (data, callback) => {
    let gapLogger = null;
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
        gapLogger?.log(participants.length);
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

              // gapLogger?.log(avlVideoProducers);
            }
            if (participants[i]?.producers?.audio?.producer) {
              let avlProducer = participants[i].producers.audio.producer;

              avlAudioProducers[participants[i].participantId] = {
                from: participants[i].participantId,
                producerId: avlProducer.id,
                kind: "audio",
                rtpCapabilities: conference.routers.audioRouter.rtpCapabilities,
              };

              // gapLogger?.log(avlAudioProducers);
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

              // gapLogger?.log(avlScreenProducers);
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
  };
};

const transportConnect = (conferences, findRoom, findParticipant) => {
  return async (
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
  };
};

const transportProduce = (conferences, findRoom, findParticipant, socket) => {
  return async (
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
                rtpCapabilities: conference.routers.videoRouter.rtpCapabilities,
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
                rtpCapabilities: conference.routers.audioRouter.rtpCapabilities,
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
  };
};

//
const createRcvTransport = (conferences, findRoom, findParticipant) => {
  return async (
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
        if (isVideo === true && isAudio === false && isScreen === false) {
          rcvLogger?.log(participant.consumers.video);
          const newConsumer = {};
          newConsumer.fromId = participantId;
          newConsumer.consumerTransport =
            await conference.routers.videoRouter.createWebRtcTransport(
              webRtcTransport_options
            );

          rcvLogger?.log(
            "new video consumer transport id: ",
            newConsumer.consumerTransport.id
          );
          newConsumer.consumerTransport.on("dtlsstatechange", (dtlsState) => {
            if (dtlsState === "closed") {
              newConsumer.consumerTransport.close();
            }
          });
          newConsumer.consumerTransport.on("close", () => {
            rcvLogger?.log("transport closed");
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
        } else if (
          isVideo === false &&
          isAudio === true &&
          isScreen === false
        ) {
          rcvLogger?.log(participant.consumers.audio);
          const newConsumer = {};
          newConsumer.fromId = participantId;
          newConsumer.consumerTransport =
            await conference.routers.audioRouter.createWebRtcTransport(
              webRtcTransport_options
            );

          rcvLogger?.log(
            "new audio consumer transport id: ",
            newConsumer.consumerTransport.id
          );
          newConsumer.consumerTransport.on("dtlsstatechange", (dtlsState) => {
            if (dtlsState === "closed") {
              newConsumer.consumerTransport.close();
            }
          });
          newConsumer.consumerTransport.on("close", () => {
            rcvLogger?.log("transport closed");
          });
          participant.consumers.audio.push(newConsumer);

          callback({
            params: {
              id: newConsumer.consumerTransport.id,
              iceParameters: newConsumer.consumerTransport.iceParameters,
              iceCandidates: newConsumer.consumerTransport.iceCandidates,
              dtlsParameters: newConsumer.consumerTransport.dtlsParameters,
            },
          });
        } else if (
          isVideo === false &&
          isAudio === false &&
          isScreen === true
        ) {
          rcvLogger?.log(participant.consumers.screen);
          const newConsumer = {};
          newConsumer.fromId = participantId;
          newConsumer.consumerTransport =
            await conference.routers.screenRouter.createWebRtcTransport(
              webRtcTransport_options
            );

          rcvLogger?.log(
            "new screen consumer transport id: ",
            newConsumer.consumerTransport.id
          );
          newConsumer.consumerTransport.on("dtlsstatechange", (dtlsState) => {
            if (dtlsState === "closed") {
              newConsumer.consumerTransport.close();
            }
          });
          newConsumer.consumerTransport.on("close", () => {
            rcvLogger?.log("transport closed");
          });
          participant.consumers.screen.push(newConsumer);

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
  };
};

const rcvTransportConnect = (conferences, findRoom, findParticipant) => {
  return async (
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
        if (isVideo === true && isAudio === false && isScreen === false) {
          const videoConsumers = participant.consumers.video;
          for (let i = 0; i < videoConsumers.length; i++) {
            if (videoConsumers[i].fromId === participantId) {
              rcvLogger?.log(
                `DTLS PARAMS: ${dtlsParameters} for ${participantId}`
              );
              videoConsumers[i].consumerTransport.connect({
                dtlsParameters,
              });
            }
          }
        } else if (
          isVideo === false &&
          isAudio === true &&
          isScreen === false
        ) {
          const audioConsumers = participant.consumers.audio;
          for (let i = 0; i < audioConsumers.length; i++) {
            if (audioConsumers[i].fromId === participantId) {
              rcvLogger?.log(
                `DTLS PARAMS: ${dtlsParameters} for ${participantId}`
              );
              audioConsumers[i].consumerTransport.connect({
                dtlsParameters,
              });
            }
          }
        } else if (
          isVideo === false &&
          isAudio === false &&
          isScreen === true
        ) {
          const screenConsumers = participant.consumers.screen;
          for (let i = 0; i < screenConsumers.length; i++) {
            if (screenConsumers[i].fromId === participantId) {
              rcvLogger?.log(
                `DTLS PARAMS: ${dtlsParameters} for ${participantId}`
              );
              screenConsumers[i].consumerTransport.connect({
                dtlsParameters,
              });
            }
          }
        }
      }
    }
  };
};

const onConsume = (conferences, findRoom, findParticipant) => {
  return async (
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
        if (isVideo === true && isAudio === false && isScreen === false) {
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
                  rcvLogger?.log("transport close from consumer");
                });

                videoConsumers[i].consumer.on("producerclose", () => {
                  rcvLogger?.log("producer of consumer closed");
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
        } else if (
          isVideo === false &&
          isAudio === true &&
          isScreen === false
        ) {
          if (
            conference.routers.audioRouter.canConsume({
              producerId: remoteProducerId,
              rtpCapabilities,
            })
          ) {
            const audioConsumers = participant.consumers.audio;
            for (let i = 0; i < audioConsumers.length; i++) {
              if (audioConsumers[i].fromId === participantId) {
                audioConsumers[i].consumer = await audioConsumers[
                  i
                ].consumerTransport.consume({
                  producerId: remoteProducerId,
                  rtpCapabilities,
                  paused: true,
                });

                audioConsumers[i].consumer.on("transportclose", () => {
                  rcvLogger?.log("transport close from consumer");
                });

                audioConsumers[i].consumer.on("producerclose", () => {
                  rcvLogger?.log("producer of consumer closed");
                });
                await viewObject(confObjPath, conference);

                callback({
                  params: {
                    id: audioConsumers[i].consumer.id,
                    producerId: remoteProducerId,
                    kind: audioConsumers[i].consumer.kind,
                    rtpParameters: audioConsumers[i].consumer.rtpParameters,
                  },
                });
              }
            }
          }
        }
        if (isVideo === false && isAudio === false && isScreen === true) {
          if (
            conference.routers.screenRouter.canConsume({
              producerId: remoteProducerId,
              rtpCapabilities,
            })
          ) {
            const screenConsumers = participant.consumers.screen;
            for (let i = 0; i < screenConsumers.length; i++) {
              if (screenConsumers[i].fromId === participantId) {
                screenConsumers[i].consumer = await screenConsumers[
                  i
                ].consumerTransport.consume({
                  producerId: remoteProducerId,
                  rtpCapabilities,
                  paused: true,
                });

                screenConsumers[i].consumer.on("transportclose", () => {
                  rcvLogger?.log("transport close from consumer");
                });

                screenConsumers[i].consumer.on("producerclose", () => {
                  rcvLogger?.log("producer of consumer closed");
                });
                await viewObject(confObjPath, conference);

                callback({
                  params: {
                    id: screenConsumers[i].consumer.id,
                    producerId: remoteProducerId,
                    kind: screenConsumers[i].consumer.kind,
                    rtpParameters: screenConsumers[i].consumer.rtpParameters,
                  },
                });
              }
            }
          }
        }
      }
    }
  };
};

const onDisconnect = (conferences, socket) => {
  return async () => {
    const disConLog = console;
    disConLog.log("socket left id: ", socket.id);
    for (let i = 0; i < conferences.length; i++) {
      let participants = conferences[i].participants;
      for (let j = 0; j < participants.length; j++) {
        let roomId = conferences[i].roomId;
        if (participants[j].participantId === socket.id) {
          participants.splice(j, 1);
          disConLog.log(roomId);
          await viewObject(confObjPath, conferences[i]);
          socket.to(roomId).emit("participantLeft", {
            participantId: socket.id,
          });
        }
      }
    }
  };
};
const onDeleteReceiver = (conferences, findRoom, findParticipant) => {
  return async (data) => {
    const { accessKey, userName, socketId, participantId } = data;
    const disConLog = console;
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
            disConLog.log(
              `deleted ${keys[i]} consumer for ${socketId}, from ${participantId}'s ${keys[i]} producer`
            );
          }
        }
      }
      await viewObject(confObjPath, conference);
    }
  };
};

const onResumeConsumer = (conferences, findRoom, findParticipant) => {
  return async (data) => {
    const { fromId, type, accessKey, socketId, userName } = data;
    const rsConLogger = console;
    rsConLogger.log("resume consumer for", fromId, type);
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
          rsConLogger.log("resumed ", type, " stream for: ", fromId);
        }
      }
    }
  };
};

const onStoppedScreen = (conferences, findRoom, socket) => {
  return (data) => {
    const { accessKey, userName, socketId } = data;

    const conference = findRoom(conferences, accessKey);
    const screenLogger = console;
    if (conference) {
      let roomId = conference.roomId;
      const participants = conference.participants;
      for (let i = 0; i < participants.length; i++) {
        const screens = participants[i].consumers.screen;

        for (let j = 0; j < screens.length; j++) {
          if (screens[j].fromId === socketId) {
            screens.splice(j, 1);
            screenLogger.log(
              `deleted screen consumer for ${socketId}, for ${participants[i].participantId}`
            );
          }
        }
      }

      socket.to(roomId).emit("stopScreenConsumer", {
        participantName: userName,
        participantId: socketId,
      });
    }
  };
};

const onNewMessage = (socket, findRoom, conferences) => {
  return (data) => {
    const { accessKey } = data;
    const conference = findRoom(conferences, accessKey);
    if (conference) {
      console.log(`broadcast message to room ${accessKey}`);
      conference.messages.push(data);
      socket.to(accessKey).emit("incomingMessage", data);
    }
  };
};

module.exports = {
  onJoinRoom,
  onCreateRtcTransport,
  getProducers,
  transportConnect,
  transportProduce,
  createRcvTransport,
  rcvTransportConnect,
  onConsume,
  onDisconnect,
  onDeleteReceiver,
  onResumeConsumer,
  onStoppedScreen,
  onNewMessage,
};
