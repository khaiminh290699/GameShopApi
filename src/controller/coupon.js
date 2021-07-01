const express = require("express");
const apiResponse = require("../ultilities/apiResponse"); 
const Connection = require("../connection/Connection");
const { Op, Sequelize } = require("sequelize");
const createWhereCondition = require("../ultilities/compare");

const router = express.Router();

router.get("/id", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Coupons } = connection.models;
  try{
    const { id } = req.body;
    const coupons = await Coupons.findOne({ where: { id } });
    if (!coupons) {
      return res.send(apiResponse(404, "Coupon not found"))
    }
    return res.send(apiResponse(200, "Success", coupons))
  } catch(err) {
    next(err)
  }
});

router.post("/list", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Coupons } = connection.models;
  try{
    const { select = ["*"], wheres = {}, order, page = 0, limit = 50 } = req.body;
    const coupons = await Coupons.findAndCountAll({
      where: createWhereCondition(wheres),
      order,
      limit,
      attributes: select,
      offset: page * limit
    })
    return res.send(apiResponse(200, "Success", coupons))
  } catch(err) {
    next(err)
  }
});

router.post("/create", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Coupons } = connection.models;
  const transaction = await connection.transaction();
  try{
    const { title, banner, discount, current, min_total_price, effect_at, expiry_at, amount } = req.body;
    const coupons = await Coupons.create({
      title, banner, discount, current, min_total_price, effect_at, expiry_at, amount
    }, {
      transaction
    })
    await transaction.commit();
    return res.send(apiResponse(200, "Success", coupons))
  } catch(err) {
    await transaction.rollback();
    next(err)
  }
});

router.put("/update", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Coupons } = connection.models;
  const transaction = await connection.transaction();
  try{
    const { id, title, banner, discount, current, effect_at, expiry_at, amount, min_total_price } = req.body;
    const coupons = await Coupons.findOne({ where: { id } });
    if (!coupons) {
      await transaction.commit();
      return res.send(apiResponse(400, "Couupon not found"));
    }
    coupons.title = title;
    coupons.banner = banner;
    coupons.discount = discount;
    coupons.current = current;
    coupons.effect_at = effect_at;
    coupons.expiry_at = expiry_at;
    coupons.amount = amount;
    coupons.min_total_price = min_total_price;
    await coupons.save({
      transaction
    })
    await transaction.commit();
    return res.send(apiResponse(200, "Success", coupons))
  } catch(err) {
    await transaction.rollback();
    next(err)
  }
});


router.delete("/delete", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Coupons } = connection.models;
  const transaction = await connection.transaction();
  try{
    const { ids } = req.body;
    await Coupons.update({
      is_deleted: true
    }, {
      where: {
        id: {
          [Op.in]: ids
        }
      },
      transaction
    })
    await transaction.commit();
    return res.send(apiResponse(200, "Success", coupons))
  } catch(err) {
    await transaction.rollback();
    next(err)
  }
});

router.post("/list-valid", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Coupons } = connection.models;
  try{
    const coupons = await Coupons.findAll({
      where: {
        expiry_at: {
          [Op.gte]: new Date()
        },
        effect_at: {
          [Op.lte]: new Date()
        },
        amount: {
          [Op.not]: 0
        },
        is_deleted: false
      }
    })
    return res.send(apiResponse(200, "Success", coupons))
  } catch(err) {
    next(err)
  }
});

router.post("/apply", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Coupons } = connection.models;
  try{
    const { total_price, coupon_id } = req.body;
    const coupons = await Coupons.findOne({
      where: {
        id: coupon_id,
        expiry_at: {
          [Op.gte]: new Date()
        },
        effect_at: {
          [Op.lte]: new Date()
        },
        amount: {
          [Op.not]: 0
        },
        is_deleted: false
      }
    })
    if (!coupons) {
      return res.send(apiResponse(400, "Coupon is valid"))
    }
    if (coupons.min_total_price > total_price) {
      return res.send(apiResponse(400, "Total price less then ..."));
    }
    const apply_total_price = discountCalculate(total_price, coupons.discount, coupons.current);
    return res.send(apiResponse(200, "Success", { apply_total_price, coupon_id }))
  } catch(err) {
    next(err)
  }
});

module.exports = router;