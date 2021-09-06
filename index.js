const express = require("express");
const http = require("http")
const Setup = require("./src/connection/Setup");
const middleware = require("./src/middlewares/index");
const controller = require("./src/controller/index");
const errorHandler = require("./src/middlewares/errorHandler");
const createSocket = require("./src/middlewares/socket");

const app = express();

app.use("/public",express.static("./public"))
app.use(middleware);
app.use(controller);

app.use(errorHandler)

const server = http.createServer(app);
createSocket(server);
server.listen(process.env.PORT || 8080, async () => {
  await new Setup().setup();
})