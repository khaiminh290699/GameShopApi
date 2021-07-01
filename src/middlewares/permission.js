const apiResponse = require("../ultilities/apiResponse");
const apis = require("../setup/api");

const permission = (req, res, next) => {
  const { user } = req;
  if (apis[req.originalUrl] && apis[req.originalUrl].permission && apis[req.originalUrl].permission > user.permission ) {
    return res.send(apiResponse(400, "NonPermissionError"))
  }

  return next();
}

module.exports = permission;