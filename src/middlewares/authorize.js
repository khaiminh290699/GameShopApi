const apiResponse = require("../ultilities/apiResponse");
const apis = require("../setup/api");
const connection = require("../connection/Connection").getConnection();
const { verify } = require("../ultilities/encryption");

const authorize = async (req, res, next) => {
  if (!apis[req.originalUrl] || (apis[req.originalUrl] && !apis[req.originalUrl].authorize)) {
    return next();
  }
  const { authorization } = req.headers;

  if (!authorization) {
    return res.send(apiResponse(400, "InvalidTokenError"));
  }

  const token = authorization.split(" ")[1];

  if (!token) {
    return res.send(apiResponse(400, "InvalidTokenError"));
  }
  
  const payload = await verify(token);
  if (!payload) {
    return res.send(apiResponse(400, "InvalidTokenError"));
  }

  const { Contacts } = connection.models;
  const contact = await Contacts.findOne({
    where: { id: payload.id }
  })

  if (!contact) {
    return res.send(apiResponse(403, "UnauthorizeError"))
  }

  req.user = contact;

  return next();
}

module.exports = authorize;