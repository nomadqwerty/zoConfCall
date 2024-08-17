const mediaList = (remoteVideoStream) => {
  return remoteVideoStream.map((vid, i) => {
    return vid.component;
  });
};

const screenArray = (remoteScreenStream) => {
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
};

const messagesArray = (messages) => {
  return messages.map((message, i) => {
    return (
      <div className="chatFeed" key={message.time}>
        <p>{message.from}</p>
        <p>{message.message}</p>
        <time>{message.time}</time>
      </div>
    );
  });
};

export { mediaList, screenArray, messagesArray };
