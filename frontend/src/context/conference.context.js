"use client";
import { createContext, useState } from "react";

const conferenceContext = createContext();

const ConferenceProvider = ({ children }) => {
  // mediaSoup objects
  const [producerDevices, setProducerDevices] = useState(null);
  const [roomRouterRtp, setRoomRouterRtp] = useState(null);
  const [producerTransports, setProducerTransports] = useState(null);
  const [remoteVideoProducers, setRemoteVideoProducers] = useState({});
  const [remoteAudioProducers, setRemoteAudioProducers] = useState({});
  const [remoteScreenProducers, setRemoteScreenProducers] = useState({});
  const [remoteVideoStream, setRemoteVideoStream] = useState([]);
  const [remoteAudioStream, setRemoteAudioStream] = useState([]);

  let state = {
    mediaSoup: {
      producerDevices,
      setProducerDevices,
      roomRouterRtp,
      setRoomRouterRtp,
      producerTransports,
      setProducerTransports,
      remoteVideoProducers,
      setRemoteVideoProducers,
      remoteAudioProducers,
      setRemoteAudioProducers,
      remoteScreenProducers,
      setRemoteScreenProducers,
      remoteVideoStream,
      setRemoteVideoStream,
      remoteAudioStream,
      setRemoteAudioStream,
    },
  };

  return (
    <conferenceContext.Provider value={state}>
      {children}
    </conferenceContext.Provider>
  );
};

export { ConferenceProvider };

export default conferenceContext;
