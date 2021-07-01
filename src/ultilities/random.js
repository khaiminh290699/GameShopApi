const crypto = require("crypto");

module.exports.randomString = () => {
  return crypto.randomBytes(20).toString("hex");
}