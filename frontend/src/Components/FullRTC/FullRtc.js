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
  getUserMedia,
  onSendMessage,
  onTypeMessage,
  addVideoStream,
  addAudioStream,
  addScreenStream,
  resetScreen,
} from "@/utils/utilFn";

import { messagesArray, mediaList, screenArray } from "./Lists";

import {
  onJoinRoom,
  onCreateProducerTP,
  onGetProducers,
  onNewProducer,
  onConsumeState,
  onParticipantLeft,
  onStoppedScreen,
  onIncomingMessage,
} from "@/utils/socketHandlers";

import {
  createProducerDevices,
  producerTransportListeners,
  produceVideoStream,
  produceAudioStream,
  produceScreenStream,
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
  const [isStreamingVideo, setIsStreamingVideo] = useState(false);
  const [isStreamingAudio, setIsStreamingAudio] = useState(false);
  const [isStreamingScreen, setIsStreamingScreen] = useState(false);
  const [socketId, setSocketId] = useState(null);
  const [videoEls, setVideoEls] = useState([]);
  const [audioEls, setAudioEls] = useState([]);
  const [screenEls, setScreenEls] = useState([]);
  const [screenReset, setScreenReset] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState([]);

  const router = useRouter();
  const confState = useContext(conferenceContext);

  const {
    roomRouterRtp,
    setRoomRouterRtp,
    producerDevices,
    setProducerDevices,
    producerTransports,
    setProducerTransports,
    remoteVideoStream,
    setRemoteVideoStream,
    remoteAudioStream,
    setRemoteAudioStream,
    remoteScreenStream,
    setRemoteScreenStream,
  } = confState.mediaSoup;

  useEffect(() => {
    (async () => {
      getUserMedia(navigator, setSocketId, setSocket, socketObj);
    })();
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
      socket.on("incomingMessage", onIncomingMessage(messages, setMessages));

      socket.on(
        "stopScreenConsumer",
        onStoppedScreen(
          remoteScreenProducers,
          setConsumeScreenState,
          setScreenReset
        )
      );

      socket.on(
        "participantLeft",
        onParticipantLeft(
          remoteVideoProducers,
          remoteAudioProducers,
          remoteScreenProducers,
          accessKey,
          userName,
          socketId,
          socket
        )
      );
    }
  }, [producerTransports]);

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
      Device,
      remoteVideoStream,
      setRemoteVideoStream
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
      Device,
      remoteAudioStream,
      setRemoteAudioStream
    );
  }, [consumeAudioState]);

  useEffect(() => {
    console.log(consumeScreenState);
    const isVideo = false;
    const isAudio = false;
    const isScreen = true;
    setScreenReset("");
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
      Device,
      remoteScreenStream,
      setRemoteScreenStream
    );
  }, [consumeScreenState]);

  // add stream to hmtl;

  useEffect(() => {
    if (remoteVideoStream.length > 0) {
      console.log(remoteVideoStream);

      setVideoEls([...remoteVideoStream]);
    }
  }, [remoteVideoStream]);

  useEffect(() => {
    if (remoteAudioStream.length > 0) {
      console.log(remoteAudioStream);

      setAudioEls([...remoteAudioStream]);
    }
  }, [remoteAudioStream]);

  useEffect(() => {
    if (remoteScreenStream.length > 0) {
      console.log(remoteScreenStream);

      setScreenEls([...remoteScreenStream]);
    }
  }, [remoteScreenStream]);

  useEffect(() => {
    addVideoStream(videoEls);
  }, [videoEls]);

  useEffect(() => {
    addAudioStream(audioEls);
  }, [audioEls]);

  useEffect(() => {
    addScreenStream(screenEls);
  }, [screenEls]);

  useEffect(() => {
    resetScreen(screenReset, screenEls, setScreenEls, setRemoteScreenStream);
  }, [screenReset]);

  // TODO:
  const videoList = mediaList(remoteVideoStream);
  const audioList = mediaList(remoteAudioStream);
  const screenList = screenArray(remoteScreenStream);
  const messagesList = messagesArray(messages);

  return (
    <main className="containerr m-0 p-0">
      <div className="mediaWrap m-0 p-0">
        <div className="videoMediaWrap">
          <div className="localVideo">
            <video
              className="VideoElem"
              id={`local-video`}
              autoPlay
              playsInline
            ></video>{" "}
            <audio
              className="VideoElem"
              id={`local-audio`}
              autoPlay
              playsInline
              muted={true}
            ></audio>
          </div>
          <div className="remoteVideos">{videoList}</div>
          <div className="remoteAudios">{audioList}</div>
        </div>
        <div className="screenMediaWrap">
          <div className="remoteScreens">{screenList}</div>
        </div>
        <div className="chatMediaWrap">
          <div className="chatFeeds">{messagesList}</div>
          <form
            className="chatInputWrap"
            onSubmit={onSendMessage(
              accessKey,
              socketId,
              messageInput,
              setMessageInput,
              userName,
              messages,
              setMessages,
              socket
            )}
          >
            <input
              type="text"
              className="chatInput"
              value={messageInput}
              onChange={onTypeMessage(setMessageInput)}
            ></input>
            <button type="submit" className="chatInputBtn">
              send
            </button>
          </form>
        </div>
      </div>
      <div className="mediaControlWrap m-0 p-0">
        <div className="logoControlWrap"></div>
        <div className="videoControlWrap">
          <div className="mediaBtnWrap">
            <div className="mediaBtn">
              <button
                onClick={produceVideoStream(
                  isStreamingVideo,
                  videoParams,
                  setIsStreamingVideo,
                  producerTransports
                )}
              >
                video
              </button>
            </div>
            <div className="mediaBtn">
              <button
                onClick={produceAudioStream(
                  isStreamingAudio,
                  audioParams,
                  setIsStreamingAudio,
                  producerTransports
                )}
              >
                audio
              </button>
            </div>
            <div className="mediaBtn">
              <button
                onClick={produceScreenStream(
                  accessKey,
                  userName,
                  socketId,
                  isStreamingVideo,
                  isStreamingAudio,
                  isStreamingScreen,
                  videoParams,
                  setIsStreamingScreen,
                  setScreenReset,
                  producerTransports,
                  socket
                )}
              >
                screen
              </button>
            </div>
          </div>
        </div>
        <div className="chatControlWrap"></div>
      </div>
    </main>
  );
};

export { FullRtc };
