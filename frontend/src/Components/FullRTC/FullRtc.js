"use client";
// import styles from "./FullRtc.module.scss";
import "./fullrtc.css";
import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import conferenceContext from "@/context/conference.context";
import { Device } from "mediasoup-client";
import { videoParams, audioParams } from "@/utils/config";
import {
  onJoinRoom,
  onCreateProducerTP,
  onGetProducers,
  onNewProducer,
  onConsumeState,
} from "@/utils/socketHandlers";
import {
  createProducerDevices,
  producerTransportListeners,
} from "@/utils/mediaSoupUtils";

// import Link from "next/link";

let accessKey = "123asdf";
let userName = "dave";
let socketObj = io(process.env.NEXT_PUBLIC_SIGNAL_HOST, {
  transports: ["websocket"],
});

let remoteVideoProducers = {};
let remoteAudioProducers = {};
let remoteScreenProducers = {};
const FullRtc = () => {
  const [socket, setSocket] = useState(null);
  const [consumeVideoState, setConsumeVideoState] = useState("");
  const [consumeAudioState, setConsumeAudioState] = useState("");
  const [consumeScreenState, setConsumeScreenState] = useState("");
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
      producerTransportListeners(
        accessKey,
        userName,
        socketId,
        producerTransports,
        socket
      );
      // TODO: request for all producers
      socket.emit(
        "getAvailableProducers",
        {
          accessKey,
          userName,
          socketId,
        },
        onGetProducers(
          remoteVideoProducers,
          remoteAudioProducers,
          remoteScreenProducers,
          setConsumeVideoState,
          setConsumeAudioState,
          setConsumeScreenState
        )
      );

      socket.on("participantLeft", (data) => {
        console.log("participantLeft id: ", data.participantId);
        if (
          remoteVideoProducers[data.participantId] ||
          remoteAudioProducers[data.participantId] ||
          remoteScreenProducers[data.participantId]
        ) {
          socket.emit("deleteRcvTransport", {
            accessKey,
            userName,
            socketId,
            participantId: data.participantId,
          });
        }
        if (remoteVideoProducers[data.participantId]) {
          delete remoteVideoProducers[data.participantId];
          console.log(remoteVideoProducers);
        }
        if (remoteAudioProducers[data.participantId]) {
          delete remoteAudioProducers[data.participantId];
          console.log(remoteAudioProducers);
        }
        if (remoteScreenProducers[data.participantId]) {
          delete remoteScreenProducers[data.participantId];
          console.log(remoteScreenProducers);
        }
      });
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
          }
        });
      } catch (err) {}
    }
  };

  // ///////////////////////////////////////////////////////////////////////// consume media

  useEffect(() => {
    if (socket) {
      onNewProducer(
        remoteVideoProducers,
        remoteAudioProducers,
        remoteScreenProducers,
        setConsumeVideoState,
        setConsumeAudioState,
        setConsumeScreenState,
        socket
      );
    }
  }, [socket]);

  useEffect(() => {
    const isVideo = true;
    const isAudio = false;
    const isScreen = false;
    console.log(remoteVideoProducers);
    onConsumeState(
      consumeVideoState,
      remoteVideoProducers,
      isVideo,
      isAudio,
      isScreen,
      accessKey,
      userName,
      socketId,
      socket,
      Device
    );
  }, [consumeVideoState]);

  useEffect(() => {
    const isVideo = false;
    const isAudio = true;
    const isScreen = false;
    // console.log(remoteAudioProducers);
    onConsumeState(
      consumeAudioState,
      remoteAudioProducers,
      isVideo,
      isAudio,
      isScreen,
      accessKey,
      userName,
      socketId,
      socket,
      Device
    );
  }, [consumeAudioState]);

  useEffect(() => {
    const isVideo = false;
    const isAudio = false;
    const isScreen = true;
    onConsumeState(
      consumeScreenState,
      remoteScreenProducers,
      isVideo,
      isAudio,
      isScreen,
      accessKey,
      userName,
      socketId,
      socket,
      Device
    );
  }, [consumeScreenState]);

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
