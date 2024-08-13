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
  const [isStreamingVideo, setIsStreamingVideo] = useState(false);
  const [isStreamingAudio, setIsStreamingAudio] = useState(false);
  const [isStreamingScreen, setIsStreamingScreen] = useState(false);
  const [socketId, setSocketId] = useState(null);
  const [videoEls, setVideoEls] = useState([]);
  const [audioEls, setAudioEls] = useState([]);

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
  } = confState.mediaSoup;

  useEffect(() => {
    if (navigator.mediaDevices) {
      navigator.mediaDevices
        .getUserMedia({ audio: true, video: true })
        .then((res) => {
          console.log(res);
          res.getTracks().forEach((track) => {
            if (track.kind === "video") {
              const videoEl = document.getElementById("local-video");
              const newVideoStream = new MediaStream([track]);
              videoEl.srcObject = newVideoStream;
            }
            if (track.kind === "audio") {
              const audioEl = document.getElementById("local-audio");
              const newAudioStream = new MediaStream([track]);
              audioEl.srcObject = newAudioStream;
            }
          });
          setSocketId(socketObj.id);
          setSocket(socketObj);
        })
        .catch((err) => {
          console.log(err);
        });
    }
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
        const videoEl = document.getElementById(`${data.participantId}-video`);
        const audioEl = document.getElementById(`${data.participantId}-audio`);

        if (videoEl) {
          videoEl.style.display = "none";
        }
        if (audioEl) {
          audioEl.style.display = "none";
        }

        console.log(videoEl);
        console.log(audioEl);

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
        if (isStreamingVideo === false) {
          const mediaDevices = await navigator.mediaDevices.enumerateDevices();
          let selectedVideoDevice;

          mediaDevices.forEach((device, i) => {
            if (device.kind === "videoinput") {
              selectedVideoDevice = device;
              return;
            }
          });

          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: selectedVideoDevice.deviceId },
            audio: false,
          });
          // TODO: add local stream to local video object:
          console.log(videoStream);

          videoStream.getTracks().forEach((track) => {
            if (track.kind === "video") {
              const videoConstraints = track.getCapabilities();

              const height = videoConstraints.height.max * 0.8;
              const width = videoConstraints.width.max * 0.8;

              track.applyConstraints({
                height,
                width,
              });
              const vidParams = {
                track: track,
                ...videoParams,
              };
              // TODO: store producer and and track state
              producerTransports.videoProducerTransport.produce(vidParams);
              const videoEl = document.getElementById("local-video");
              const newVideoStream = new MediaStream([track]);
              videoEl.srcObject = newVideoStream;
            }
          });
          setIsStreamingVideo(true);
        } else {
          alert("already streaming video");
        }
      } catch (err) {}
    }
  };

  const produceAudioStream = async () => {
    if (navigator?.mediaDevices) {
      try {
        if (isStreamingAudio === false) {
          const mediaDevices = await navigator.mediaDevices.enumerateDevices();
          let selectedAudioDevice;

          mediaDevices.forEach((device, i) => {
            if (device.kind === "audioinput") {
              selectedAudioDevice = device;
              return;
            }
          });

          const audioStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: { deviceId: selectedAudioDevice.deviceId },
          });
          // TODO: add local stream to local video object:
          console.log(audioStream);
          audioStream.getTracks().forEach((track) => {
            if (track.kind === "audio") {
              const audParams = {
                track: track,
                ...audioParams,
              };
              // TODO: store producer and and track state
              producerTransports.audioProducerTransport.produce(audParams);
              const audioEl = document.getElementById("local-audio");
              const newAudioStream = new MediaStream([track]);
              audioEl.srcObject = newAudioStream;
            }
          });
          setIsStreamingAudio(true);
        } else {
          alert("already streaming audio");
        }
      } catch (err) {}
    }
  };

  const produceScreenStream = async () => {
    if (navigator?.mediaDevices) {
      try {
        if (isStreamingScreen === false) {
          const screenStream = await navigator.mediaDevices.getDisplayMedia();
          // TODO: add local stream to local video object:
          console.log(screenStream);
          screenStream.getTracks().forEach((track) => {
            if (track.kind === "video") {
              const videoConstraints = track.getCapabilities();

              const height = videoConstraints.height.max * 0.8;
              const width = videoConstraints.width.max * 0.8;

              track.applyConstraints({
                height,
                width,
              });
              const screenParams = {
                track: track,
                ...videoParams,
              };
              // TODO: store producer and and track state
              producerTransports.screenProducerTransport.produce(screenParams);
            }
          });
          setIsStreamingScreen(true);
        } else {
          alert("already streaming screen");
        }
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
    if (videoEls.length > 0) {
      console.log(videoEls);
      for (let i = 0; i < videoEls.length; i++) {
        if (!videoEls[i]?.isLoaded) {
          const videoEl = document.getElementById(
            `${videoEls[i].fromId}-video`
          );
          console.log(`${videoEls[i].fromId}-video`);
          const videoFeed = new MediaStream([videoEls[i].track]);

          videoEl.srcObject = videoFeed;
          videoEls[i].isLoaded = true;
        }
      }
    }
  }, [videoEls]);

  useEffect(() => {
    if (audioEls.length > 0) {
      console.log(audioEls);
      for (let i = 0; i < audioEls.length; i++) {
        if (!audioEls[i]?.isLoaded) {
          const audioEl = document.getElementById(
            `${audioEls[i].fromId}-audio`
          );
          console.log(`${audioEls[i].fromId}-audio`);
          const audioFeed = new MediaStream([audioEls[i].track]);

          audioEl.srcObject = audioFeed;
          audioEls[i].isLoaded = true;
        }
      }
    }
  }, [audioEls]);

  const videoList = remoteVideoStream.map((vid, i) => {
    return vid.component;
  });
  const audioList = remoteAudioStream.map((aud, i) => {
    return aud.component;
  });

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
