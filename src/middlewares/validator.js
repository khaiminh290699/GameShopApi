const joi = require("joi")
const apis = require("../setup/api");

const validator = (req, res, next) => {
  if (apis[req.originalUrl] && apis[req.originalUrl].schema) {
    const { error } = apis[req.originalUrl].schema.validate(req.body);
    if (error) {
      return next(error);
    }
  }
  next();
}

module.exports = validator;