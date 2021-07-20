const express = require("express");
const apiResponse = require("../ultilities/apiResponse"); 
const Connection = require("../connection/Connection");

const router = express.Router();

router.post("/create", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Coupons, CouponApply } = connection.models;
  const transaction = await connection.transaction();
  try{
    const { title, discount , max_discount, current, amount, min_total_price, effect_at, expiry_at, code, banner_image, product_apply, product_no_apply, category_apply, category_no_apply } = req.body;
  } catch(err) {
    await transaction.rollback();
    next(err)
  }
});

module.exports = router;