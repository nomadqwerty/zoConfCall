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
  onDisconnect,
  onDeleteReceiver,
  onResumeConsumer,
  onStoppedScreen,
  onNewMessage,
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

const conferences = [];
const workers = [];

createWorker()
  .then((res) => workers.push(res))
  .catch((err) => console.log(err.message));

io.on("connection", async (socket) => {
  let socketLog = null;
  //listen for roomAccesskey event on socket join and add socket to the provided acceskey
  socketLog?.log("some one connected", socket.id);
  socket.on("disconnect", onDisconnect(conferences, socket));
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

  // delete rcv Transport
  socket.on(
    "deleteRcvTransport",
    onDeleteReceiver(conferences, findRoom, findParticipant)
  );

  // rcv connect
  socket.on(
    "transport-recv-connect",
    rcvTransportConnect(conferences, findRoom, findParticipant)
  );
  // rcv consume
  socket.on("consume", onConsume(conferences, findRoom, findParticipant));

  // resume consume;
  socket.on(
    "consumerResume",
    onResumeConsumer(conferences, findRoom, findParticipant)
  );

  // delete screen consumers
  socket.on(
    "stoppedScreenShare",
    onStoppedScreen(conferences, findRoom, socket)
  );

  // BC message to room
  socket.on("newMessage", onNewMessage(socket));
});

server.listen(PORT, () =>
  console.log(`My server is actively running on port ${PORT}`)
);
