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
  const [mediaEls, setMediaEls] = useState([]);
  const [playMedia, setPlayMedia] = useState("");
  const [removeMedia, setRemoveMedia] = useState("");
  const router = useRouter();
  const confState = useContext(conferenceContext);

  const {
    roomRouterRtp,
    setRoomRouterRtp,
    producerDevices,
    setProducerDevices,
    producerTransports,
    setProducerTransports,
    remoteMediaStreamId,
    setRemoteMediaStreamId,
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

        setRemoveMedia(data.participantId);
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
      remoteMediaStreamId,
      setRemoteMediaStreamId
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
      remoteMediaStreamId,
      setRemoteMediaStreamId
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
    if (remoteMediaStreamId.length > 0) {
      const info = remoteMediaStreamId.split("&");
      const fromId = info[0];
      const producerId = info[1];
      const type = info[2];
      if (fromId && producerId && type) {
        console.log(fromId, producerId);
        console.log(remoteVideoProducers[fromId]);
        console.log(remoteAudioProducers[fromId]);

        let mediaElem = (
          <div className="remoteVideo" key={fromId}>
            <video
              className="VideoElem"
              id={`${fromId}-video`}
              autoPlay
              playsInline
            ></video>{" "}
            <audio
              className="VideoElem"
              id={`${fromId}-audio`}
              autoPlay
              playsInline
            ></audio>
          </div>
        );

        socket.emit("consumerResume", {
          fromId,
          type,
          accessKey,
          socketId,
          userName,
        });

        if (mediaEls.length < 1) {
          const els = [
            ...mediaEls,
            { from: fromId, component: mediaElem, type },
          ];
          setMediaEls(els);
          setPlayMedia(`${fromId}&${type}`);
        }
        if (mediaEls.length >= 1) {
          let hasEl;
          for (let i = 0; i < mediaEls.length; i++) {
            if (mediaEls[i].from === fromId) {
              hasEl = true;
              mediaEls[i].type = type;
              setMediaEls([...mediaEls]);
              setPlayMedia(`${fromId}&${type}`);
            }
          }
          if (!hasEl) {
            const els = [
              ...mediaEls,
              { from: fromId, component: mediaElem, type },
            ];
            setMediaEls(els);
            setPlayMedia(`${fromId}&${type}`);
          }
        }
      }
    }
  }, [remoteMediaStreamId]);

  const mediaElemList = mediaEls.map((el, i) => {
    return el.component;
  });

  useEffect(() => {
    if (playMedia.length > 0) {
      console.log(playMedia);
      const fromId = playMedia.split("&")[0];
      const type = playMedia.split("&")[1];

      if (type === "video") {
        const vidEl = document.getElementById(`${fromId}-video`);
        const track = remoteVideoProducers[fromId]?.videoStreamObject?.track;

        if (track) {
          const videoFeed = new MediaStream([track]);
          vidEl.srcObject = videoFeed;
          console.log(vidEl.srcObject);
        }
      }
      if (type === "audio") {
        const audEl = document.getElementById(`${fromId}-audio`);
        const track = remoteAudioProducers[fromId]?.audioStreamObject?.track;
        if (track) {
          const audioFeed = new MediaStream([track]);
          audEl.srcObject = audioFeed;
          console.log(audEl.srcObject);
        }
      }
    }
  }, [playMedia]);

  useEffect(() => {
    if (removeMedia.length > 0) {
      console.log(mediaEls);
      for (let i = 0; i < mediaEls.length; i++) {
        if (mediaEls[i].from === removeMedia) {
          console.log(mediaEls[i]);
          mediaEls.splice(i, 1);

          setMediaEls([...mediaEls]);
        }
      }
    }
  }, [removeMedia]);

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
          <div className="remoteVideos">{mediaElemList}</div>
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
