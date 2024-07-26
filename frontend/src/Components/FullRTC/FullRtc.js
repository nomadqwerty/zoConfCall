"use client";
// import styles from "./FullRtc.module.scss";
import "./fullrtc.css";
import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import conferenceContext from "@/context/conference.context";
import { Device } from "mediasoup-client";

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
        (data) => {
          if (
            data?.audioRtpCapabilities &&
            data?.videoRtpCapabilities &&
            data?.screenRtpCapabilities
          ) {
            if (roomRouterRtp === null) {
              console.log(data);
              setRoomRouterRtp(data);
            }
          }
          // room is set up start setting up to produce streams (video, audio).
        }
      );
    }
  }, [socket]);

  // when room router's rtp is set.
  useEffect(() => {
    if (roomRouterRtp) {
      (async () => {
        if (producerDevices === null) {
          console.log(roomRouterRtp);
          const devices = {};
          const newVideoDevice = new Device();
          const newAudioDevice = new Device();
          const newScreenDevice = new Device();

          devices.videoDevice = newVideoDevice;
          devices.audioDevice = newAudioDevice;
          devices.screenDevice = newScreenDevice;

          await devices.videoDevice.load({
            routerRtpCapabilities: roomRouterRtp.videoRtpCapabilities,
          });

          await devices.audioDevice.load({
            routerRtpCapabilities: roomRouterRtp.audioRtpCapabilities,
          });

          await devices.screenDevice.load({
            routerRtpCapabilities: roomRouterRtp.screenRtpCapabilities,
          });

          // TODO: set devices for each router.

          setProducerDevices(devices);
        }
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
          (data) => {
            if (
              producerDevices.videoDevice &&
              producerDevices.audioDevice &&
              producerDevices.screenDevice
            ) {
              // create send transport on each producerDevice;
              const videoProducerTransport =
                producerDevices.videoDevice.createSendTransport(
                  data.params.videoParams
                );

              const audioProducerTransport =
                producerDevices.audioDevice.createSendTransport(
                  data.params.audioParams
                );

              const screenProducerTransport =
                producerDevices.screenDevice.createSendTransport(
                  data.params.screenParams
                );

              if (producerTransports === null) {
                const transports = {};
                transports.videoProducerTransport = videoProducerTransport;

                transports.audioProducerTransport = audioProducerTransport;

                transports.screenProducerTransport = screenProducerTransport;

                setProducerTransports(transports);
              }
            }
          }
        );
      }
    }
  }, [producerDevices]);

  useEffect(() => {
    if (producerTransports) {
      console.log(producerTransports);
    }
  }, [producerTransports]);

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
        <div className="videoControlWrap"></div>
        <div className="chatControlWrap"></div>
      </div>
    </main>
  );
};

export { FullRtc };
