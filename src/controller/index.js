const express = require("express");
const auth = require("./auth")
const category = require("./category")
const product = require("./product")
const file = require("./file");
const order = require("./order");
const statistic = require("./statistic")
const coupon = require("./coupon")

const router = express.Router();
router.use("/auth", auth)
router.use("/category", category)
router.use("/product", product)
router.use("/file", file)
router.use("/order", order)
router.use("/statistic", statistic)
router.use("/coupon", coupon)

module.exports = router;