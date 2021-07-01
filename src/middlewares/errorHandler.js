const { ValidationError } = require("joi");
const { UniqueConstraintError, ForeignKeyConstraintError } = require("sequelize")
const apiResponse = require("../ultilities/apiResponse")

function errorHandler (err, req, res, next) {
  console.log(err)
  if (err instanceof ValidationError) {
    return res.send(apiResponse(500, "ValidationError", {}, err.details[0].message))
  }
  if (err instanceof UniqueConstraintError) {
    console.log(err.errors)
    return res.send(apiResponse(500, "UniqueConstraintError", {}, err.errors[0].message))
  }
  if (err instanceof ForeignKeyConstraintError) {
    return res.send(apiResponse(500, "ForeignKeyConstraintError", {}, err.errors))
  }
}

module.exports = errorHandler;