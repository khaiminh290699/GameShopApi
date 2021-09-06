const io = require("socket.io-client");

function connectSocket(namespace, token) {
  return new Promise((resolve, reject) => {
    const socket = io(`${process.env.SOCKET_SERVER || "http://localhost:8080"}/${namespace}`, {
      auth: { token },
      transports: ["polling"],
    });
  
    socket.on("connect", () => {
      return resolve(socket);
    });

    socket.on("connect_error", (err) => {
      return reject(err);
    });

  })
}
module.exports = connectSocket;