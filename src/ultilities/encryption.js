const brcyptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");

module.exports.hash = (key) => {
  return brcyptjs.hash(key, 10);
}

module.exports.compare = (key, hash) => {
  return brcyptjs.compare(key, hash);
}

module.exports.sign = (payload) => {
  return new Promise((resolve, reject) => {
    jwt.sign(payload, process.env.PRIVATE_KEY, {
      algorithm: "HS256"
    }, (err, encoded) => {
      if (err) return reject(err);
      return resolve(encoded);
    })
  });
}

module.exports.verify = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.PRIVATE_KEY, {
      algorithms: ["HS256"]
    }, (err, decoded) => {
      if (err) return reject(err);
      return resolve(decoded);
    })
  });
}