const socketIO = require("socket.io")


const createSocket = (httpServer) => {

  const io = require("socket.io")(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "OPTIONS", "POST", "PUT", "DELETE"],
      credentials: true,
    }
  });

  const socketChannel = io.of("/socket").use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    console.log(token);
    next();
  });
  
  socketChannel.on("connection", async (socket) => {
    socket.on("import_goods", (data) => {
      const { import_id } = data;
      console.log(data);
      socketChannel.emit(`import_goods_${import_id}`, data)
    })
  
    socket.on("disconnect", async () => {
      
    });
  })
  
}

module.exports = createSocket;
