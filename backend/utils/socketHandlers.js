const fs = require("node:fs/promises");
const { join } = require("node:path");
const { viewObject } = require("./mediaSoupUtils");

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
  };
};

module.exports = { onJoinRoom, onCreateRtcTransport };
