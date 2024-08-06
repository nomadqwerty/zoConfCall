"use client";
// import styles from "./FullRtc.module.scss";
import "./fullrtc.css";
import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import conferenceContext from "@/context/conference.context";
import { Device } from "mediasoup-client";
import { videoParams, audioParams } from "@/utils/config";
import { onJoinRoom, onCreateProducerTP } from "@/utils/socketHandlers";
import { createProducerDevices } from "@/utils/mediaSoupUtils";

// import Link from "next/link";

let accessKey = "123asdf";
let userName = "dave";
let socketObj = io(process.env.NEXT_PUBLIC_SIGNAL_HOST, {
  transports: ["websocket"],
});

const FullRtc = () => {
  const [socket, setSocket] = useState(null);
  const [socketId, setSocketId] = useState(null);
  const router = useRouter();
  const confState = useContext(conferenceContext);

  const {
    roomRouterRtp,
    setRoomRouterRtp,
    producerDevices,
    setProducerDevices,
    producerTransports,
    setProducerTransports,
  } = confState.mediaSoup;

  useEffect(() => {
    setSocketId(socketObj.id);
    setSocket(socketObj);
  }, []);
  useEffect(() => {
    if (socket && confState) {
      console.log(socketId);
      socket.emit(
        "joinConferenceRoom",
        {
          userName,
          accessKey,
          socketId,
        },
        onJoinRoom(roomRouterRtp, setRoomRouterRtp)
      );
    }
  }, [socket]);

  // when room router's rtp is set.
  useEffect(() => {
    if (roomRouterRtp) {
      (async () => {
        await createProducerDevices(
          producerDevices,
          roomRouterRtp,
          Device,
          setProducerDevices
        );
      })();
    }
  }, [roomRouterRtp]);

  useEffect(() => {
    if (producerDevices) {
      const videoDeviceRtpCapabilities =
        producerDevices.videoDevice.rtpCapabilities;
      const audioDeviceRtpCapabilities =
        producerDevices.audioDevice.rtpCapabilities;
      const screenDeviceRtpCapabilities =
        producerDevices.screenDevice.rtpCapabilities;
      if (
        videoDeviceRtpCapabilities &&
        audioDeviceRtpCapabilities &&
        screenDeviceRtpCapabilities
      ) {
        socket.emit(
          "createWebRtcTransport",
          { producer: true, consumer: false, accessKey, userName, socketId },
          onCreateProducerTP(
            producerDevices,
            producerTransports,
            setProducerTransports
          )
        );
      }
    }
  }, [producerDevices]);

  useEffect(() => {
    // add listeners for video audio producers
    if (producerTransports) {
      console.log(producerTransports);

      // video TP: connect events
      producerTransports.videoProducerTransport.on(
        "connect",
        async ({ dtlsParameters }, callback, errback) => {
          try {
            // Signal local DTLS parameters to the server side transport
            // see server's socket.on('transport-connect', ...)
            await socket.emit("transport-connect", {
              dtlsParameters,
              producer: true,
              consumer: false,
              accessKey,
              userName,
              socketId,
              isVideo: true,
              isAudio: false,
              isScreen: false,
            });

            // Tell the transport that parameters were transmitted.
            callback();
          } catch (error) {
            errback(error);
          }
        }
      );

      // TODO: audioTP
      producerTransports.audioProducerTransport.on(
        "connect",
        async ({ dtlsParameters }, callback, errback) => {
          try {
            // Signal local DTLS parameters to the server side transport
            // see server's socket.on('transport-connect', ...)
            await socket.emit("transport-connect", {
              dtlsParameters,
              producer: true,
              consumer: false,
              accessKey,
              userName,
              socketId,
              isVideo: false,
              isAudio: true,
              isScreen: false,
            });

            // Tell the transport that parameters were transmitted.
            callback();
          } catch (error) {
            errback(error);
          }
        }
      );

      // TODO: screen TP
      producerTransports.screenProducerTransport.on(
        "connect",
        async ({ dtlsParameters }, callback, errback) => {
          try {
            // Signal local DTLS parameters to the server side transport
            // see server's socket.on('transport-connect', ...)
            await socket.emit("transport-connect", {
              dtlsParameters,
              producer: true,
              consumer: false,
              accessKey,
              userName,
              socketId,
              isVideo: false,
              isAudio: false,
              isScreen: true,
            });

            // Tell the transport that parameters were transmitted.
            callback();
          } catch (error) {
            errback(error);
          }
        }
      );
      //////////////////////////////////////////////////
      //
      // video Producer: produce event
      producerTransports.videoProducerTransport.on(
        "produce",
        async (parameters, callback, errback) => {
          try {
            // Signal local DTLS parameters to the server side transport
            // see server's socket.on('transport-connect', ...)
            await socket.emit(
              "transport-produce",
              {
                kind: parameters.kind,
                rtpParameters: parameters.rtpParameters,
                appData: parameters.appData,
                producer: true,
                consumer: false,
                accessKey,
                userName,
                socketId,
                isVideo: true,
                isAudio: false,
                isScreen: false,
              },
              ({ id }) => {
                // Tell the transport that parameters were transmitted.
                console.log(id);
                callback(id);
              }
            );
          } catch (error) {
            errback(error);
          }
        }
      );

      // TODO: audio Producer
      producerTransports.audioProducerTransport.on(
        "produce",
        async (parameters, callback, errback) => {
          try {
            // Signal local DTLS parameters to the server side transport
            // see server's socket.on('transport-connect', ...)
            await socket.emit(
              "transport-produce",
              {
                kind: parameters.kind,
                rtpParameters: parameters.rtpParameters,
                appData: parameters.appData,
                producer: true,
                consumer: false,
                accessKey,
                userName,
                socketId,
                isVideo: false,
                isAudio: true,
                isScreen: false,
              },
              ({ id }) => {
                // Tell the transport that parameters were transmitted.
                console.log(id);
                callback(id);
              }
            );
          } catch (error) {
            errback(error);
          }
        }
      );

      // TODO: screen Producer
      producerTransports.screenProducerTransport.on(
        "produce",
        async (parameters, callback, errback) => {
          try {
            // Signal local DTLS parameters to the server side transport
            // see server's socket.on('transport-connect', ...)
            await socket.emit(
              "transport-produce",
              {
                kind: parameters.kind,
                rtpParameters: parameters.rtpParameters,
                appData: parameters.appData,
                producer: true,
                consumer: false,
                accessKey,
                userName,
                socketId,
                isVideo: false,
                isAudio: false,
                isScreen: true,
              },
              ({ id }) => {
                // Tell the transport that parameters were transmitted.
                console.log(id);
                callback(id);
              }
            );
          } catch (error) {
            errback(error);
          }
        }
      );

      // produce test;
      // navigator.mediaDevices
      //   .getUserMedia({ video: true, audio: true })
      //   .then((res) => {
      //     res.getTracks().forEach((track) => {
      //       if (track.kind === "video") {
      //         const vidParams = {
      //           track: track,
      //           ...videoParams,
      //         };

      //         producerTransports.videoProducerTransport
      //           .produce(vidParams)
      //           .then((res) => {
      //             console.log(res);
      //           })
      //           .catch((err) => console.log(err.message));
      //       } else if (track.kind === "audio") {
      //         const audParams = {
      //           track: track,
      //           ...audioParams,
      //         };

      //         producerTransports.audioProducerTransport
      //           .produce(audParams)
      //           .then((res) => {
      //             console.log(res);
      //           })
      //           .catch((err) => console.log(err.message));
      //       }
      //     });
      //   })
      //   .catch((err) => console.log(err.message));

      // navigator.mediaDevices.getDisplayMedia().then((res) => {
      //   res.getTracks().forEach((track) => {
      //     if (track.kind === "video") {
      //       const screenParams = {
      //         track: track,
      //         ...videoParams,
      //       };

      //       producerTransports.screenProducerTransport
      //         .produce(screenParams)
      //         .then((res) => {
      //           console.log(res);
      //         })
      //         .catch((err) => console.log(err.message));
      //     }
      //   });
      // });
    }
  }, [producerTransports]);

  const produceVideoStream = async () => {
    if (navigator?.mediaDevices) {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        // TODO: add local stream to local video object:
        console.log(videoStream);
        // TODO: produce track from stream over media soup:
        videoStream.getTracks().forEach((track) => {
          if (track.kind === "video") {
            const vidParams = {
              track: track,
              ...videoParams,
            };
            // TODO: store producer and and track state
            producerTransports.videoProducerTransport.produce(vidParams);

            // TODO: after producing stream, emit to server to return list of existing producers on the current router
          }
        });
      } catch (err) {}
    }
  };

  const produceAudioStream = async () => {
    if (navigator?.mediaDevices) {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        // TODO: add local stream to local video object:
        console.log(audioStream);
        // TODO: produce track from stream over media soup:
        audioStream.getTracks().forEach((track) => {
          if (track.kind === "audio") {
            const audParams = {
              track: track,
              ...audioParams,
            };
            // TODO: store producer and and track state
            producerTransports.audioProducerTransport.produce(audParams);
            // TODO: after producing stream, emit to server to return list of existing producers on the current router
          }
        });
      } catch (err) {}
    }
  };

  const produceScreenStream = async () => {
    if (navigator?.mediaDevices) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia();
        // TODO: add local stream to local video object:
        console.log(screenStream);
        // TODO: produce track from stream over media soup:
        screenStream.getTracks().forEach((track) => {
          if (track.kind === "video") {
            const screenParams = {
              track: track,
              ...videoParams,
            };
            // TODO: store producer and and track state
            producerTransports.screenProducerTransport.produce(screenParams);
            // TODO: after producing stream, emit to server to return list of existing producers on the current router
          }
        });
      } catch (err) {}
    }
  };

  // ///////////////////////////////////////////////////////////////////////// consume media

  useEffect(() => {
    if (socket) {
      socket.on("new-video", (data) => {
        console.log("someone is producing a video stream");
        console.log(data);
      });
      socket.on("new-audio", (data) => {
        console.log("someone is producing an audio stream");
        console.log(data);
      });
      socket.on("new-screen", (data) => {
        console.log("someone is producing a screen stream");
        console.log(data);
      });
    }
  }, [socket]);

  return (
    <main className="containerr m-0 p-0">
      <div className="mediaWrap m-0 p-0">
        <div className="videoMediaWrap">
          <div className="remoteVideos">
            <div className="remoteVideo"></div>
          </div>
          <div className="localVideo"></div>
        </div>
        <div className="screenMediaWrap">
          <div className="remoteScreens">
            <div className="remoteScreen"></div>
          </div>
          <div className="localScreen"></div>
        </div>
        <div className="chatMediaWrap">
          <div className="chatFeeds">
            <div className="chatFeed"></div>
          </div>
        </div>
      </div>
      <div className="mediaControlWrap m-0 p-0">
        <div className="logoControlWrap"></div>
        <div className="videoControlWrap">
          <div className="mediaBtnWrap">
            <div className="mediaBtn">
              <button onClick={produceVideoStream}>video</button>
            </div>
            <div className="mediaBtn">
              <button onClick={produceAudioStream}>audio</button>
            </div>
            <div className="mediaBtn">
              <button onClick={produceScreenStream}>screen</button>
            </div>
          </div>
        </div>
        <div className="chatControlWrap"></div>
      </div>
    </main>
  );
};

export { FullRtc };
