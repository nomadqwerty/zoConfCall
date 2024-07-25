"use client";
import { createContext, useState } from "react";

const conferenceContext = createContext();

const ConferenceProvider = ({ children }) => {
  // mediaSoup objects
  const [producerDevices, setProducerDevices] = useState([]);
  const [roomRouterRtp, setRoomRouterRtp] = useState([]);

  let state = {
    mediaSoup: {
      producerDevices,
      setProducerDevices,
      roomRouterRtp,
      setRoomRouterRtp,
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
