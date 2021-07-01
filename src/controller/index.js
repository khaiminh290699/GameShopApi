const express = require("express");
const auth = require("./auth")
const category = require("./category")
const product = require("./product")
const prmotion = require("./promotion");
const file = require("./file");
const order = require("./order");

const router = express.Router();
router.use("/auth", auth)
router.use("/category", category)
router.use("/product", product)
router.use("/promotion", prmotion)
router.use("/file", file)
router.use("/order", order)

module.exports = router;