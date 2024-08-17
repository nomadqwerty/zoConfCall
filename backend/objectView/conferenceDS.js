/*
///////: single conference item in conferences list;
conference :{
  roomId:meetingAccessKey,
  participants:[],
  routers:{
    videoRouter:Obj,
    audioRouter:Obj,
    screenRouter:Obj,
    }
  }

///////: single participant item in conference.participants list;

  participant: {
    participantId:str,
    participantName:str,

    producers:{

      video: {
          producerTP:obj,
          produce:obj,
        },
      audio: {
          producerTP:obj,
          produce:obj,
        },
      screen: {
          producerTP:obj,
          produce:obj,
        },
      
      },

    consumers:{

      video:[],
      audio:[],
      screen:[]

        }
    }

    ///////: single consumer item in conference.participants[0].consumers list;

    consumer:{
      fromId:str,
      fromName:str,
      
      video: {
          consumerTP:obj,
          consume:obj,
        },

      audio: {
          consumerTP:obj,
          consume:obj,
        },

      screen: {
          consumerTP:obj,
          consume:obj,
        },
    }

  */

/*
    workers:[]

    ///////: single worker item in workers list;
    
    */
