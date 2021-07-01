const express = require("express");

const cors = require("./cors")
const authorize = require("./authorize");
const permission = require("./permission")
const validator = require("./validator");

module.exports = [
  cors,
  express.urlencoded({extended:true}),
  express.json(),
  authorize,
  permission,
  validator
]