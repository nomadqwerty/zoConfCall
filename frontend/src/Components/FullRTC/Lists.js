const mediaList = (remoteVideoStream) => {
  try {
    return remoteVideoStream.map((vid, i) => {
      return vid.component;
    });
  } catch (error) {
    console.log(error.message);
    return <></>;
  }
};

const screenArray = (remoteScreenStream) => {
  try {
    let showing = {};
    return remoteScreenStream.map((screen, i) => {
      console.log(screen);
      if (!showing[screen.fromId]) {
        showing[screen.fromId] = screen;
        return screen.component;
      } else {
        delete showing[screen.fromId];
        return <></>;
      }
    });
  } catch (error) {
    console.log(error.message);
    return <></>;
  }
};

const messagesArray = (messages) => {
  try {
    return messages.map((message, i) => {
      return (
        <div className="chatFeed" key={message.time}>
          <p>{message.from}</p>
          <p>{message.message}</p>
          <time>{message.time}</time>
        </div>
      );
    });
  } catch (error) {
    console.log(error.message);
    return <></>;
  }
};

const mediaDeviceList = (devices, onSetMediaDevice, setSelectedMediaDevice) => {
  return devices.map((device, i) => {
    try {
      return (
        <li onClick={onSetMediaDevice(i, setSelectedMediaDevice)} key={i}>
          {device.label}
        </li>
      );
    } catch (error) {
      console.log(error.message);
      return <></>;
    }
  });
};

export { mediaList, screenArray, messagesArray, mediaDeviceList };
