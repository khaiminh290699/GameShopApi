const express = require("express");
const apiResponse = require("../ultilities/apiResponse"); 
const Connection = require("../connection/Connection");
const { Op } = require("sequelize");
const { executeEach } = require("../ultilities/arrays");
const discountCalculate = require("../ultilities/discountCalculate");
const createWhereCondition = require("../ultilities/compare");

const router = express.Router();

router.post("/list", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Coupons } = connection.models;
  try{
    const { select = null, wheres = {}, order, page = 0, limit = 50 } = req.body;
    const list = await Coupons.findAndCountAll({
      where: createWhereCondition(wheres),
      order,
      limit,
      offset: page * limit,
      attributes: select,
    });
    return res.send(apiResponse(200, "Success", list))
  } catch(err) {
    next(err)
  }
})

router.get("/:id", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Coupons, Products, Categories } = connection.models;
  try{
    const { id } = req.params;
    const coupon = await Coupons.findOne({
      where: [{ id: { [Op.eq]: id } }]
    })
    if (!coupon) {
      return res.send(apiResponse(404, "Coupon not found"));
    }
    const { product_apply, product_no_apply, category_apply, category_no_apply } = coupon.apply;
    const productApply = await Products.findAll({
      where: [
        { id: { [Op.in]: product_apply } },
        { is_deleted: { [Op.eq]: false } }
      ]
    })
    const productNoApply = await Products.findAll({
      where: [
        { id: { [Op.in]: product_no_apply } },
        { is_deleted: { [Op.eq]: false } }
      ]
    })
    const categoryApply = await Categories.findAll({
      where: [
        { id: { [Op.in]: category_apply } }
      ]
    })
    const categoryNoApply = await Categories.findAll({
      where: [
        { id: { [Op.in]: category_no_apply } }
      ]
    })
    return res.send(apiResponse(200, "Success", {
      coupon,
      productApply,
      productNoApply,
      categoryApply,
      categoryNoApply
    }))
  } catch(err) {
    next(err)
  }
})

router.post("/create", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Coupons } = connection.models;
  const transaction = await connection.transaction();
  try {
    const { title, discount , max_discount, current, amount, min_total_price, effect_at, expiry_at, banner, product_apply, product_no_apply, category_apply, category_no_apply, code, description } = req.body;
    if (effect_at > expiry_at) {
      return res.send(apiResponse(400, "Effect date is greater then expiry date"));
    }
    const coupon = await Coupons.create({
      title, discount, max_discount, current, amount, min_total_price, effect_at, expiry_at, code, banner, apply: { product_apply, product_no_apply, category_apply, category_no_apply }, description
    }, {
      transaction
    })
    await transaction.commit();
    return res.send(apiResponse(200, "Success", coupon))
  } catch(err) {
    await transaction.rollback();
    next(err)
  }
});

router.put("/update", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Coupons } = connection.models;
  const transaction = await connection.transaction();
  try {
    const { id, title, discount , max_discount, current, amount, min_total_price, effect_at, expiry_at, banner, product_apply, product_no_apply, category_apply, category_no_apply, code, description } = req.body;
    if (effect_at > expiry_at) {
      return res.send(apiResponse(400, "Effect date is greater then expiry date"));
    }
    const coupon = await Coupons.findOne({
      where: [{ id: { [Op.eq]: id } }]
    })
    if (!coupon) {
      return res.send(apiResponse(404, "Coupon not found"));
    }
    coupon.title = title;
    coupon.discount = discount;
    coupon.max_discount = max_discount;
    coupon.current = current;
    coupon.amount = amount;
    coupon.min_total_price = min_total_price;
    coupon.effect_at = effect_at;
    coupon.expiry_at = expiry_at;
    coupon.banner = banner;
    coupon.code = code;
    coupon.apply = { product_apply, product_no_apply, category_apply, category_no_apply };
    coupon.description = description;
    await coupon.save({ transaction });
    await transaction.commit();
    return res.send(apiResponse(200, "Success", coupon))
  } catch(err) {
    await transaction.rollback();
    next(err)
  }
});

router.post("/delete", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Coupons } = connection.models;
  const transaction = await connection.transaction();
  try {
    const { id } = req.body;
    const coupon = await Coupons.findOne({
      where: [{ id: { [Op.eq]: id } }]
    })
    if (!coupon) {
      return res.send(apiResponse(404, "Coupon not found"));
    }
    coupon.is_deleted = true;
    await coupon.save({ transaction });
    await transaction.commit();
    return res.send(apiResponse(200, "Success", coupon))
  } catch(err) {
    await transaction.rollback();
    next(err)
  }
});

router.post("/apply-coupon", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Coupons, Products } = connection.models;
  try {
    const { code, products } = req.body;
    const coupon = await Coupons.findOne({
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
        code: { [Op.eq]: code },
        is_deleted: { [Op.eq]: false }
      }
    })
    if (!coupon) {
      return res.send(apiResponse(404, "Coupon is invalid"));
    }
    let totalPrice = 0;
    const { product_apply, product_no_apply, category_apply, category_no_apply } = coupon.apply;
    for (let i = 0; i < products.length; i++) {
      const { product_id, amount } = products[i];
      const existProduct = await Products.findOne({ 
        include: [{
          association: Products.associations.Category,
          as: "Category"
        }],
        where: { id: product_id } 
      });
      if (!existProduct) {
        return res.send(apiResponse(404, `Product not found`))
      }
      if (existProduct.is_deleted) {
        return res.send(apiResponse(400, `Product ${existProduct.title} is deleted`))
      }
      if (existProduct.stock < amount) {
        return res.send(apiResponse(400, `Stock of ${ existProduct.title } not enough`))
      }
      let valid = false;
      for (let i = 0; i < product_no_apply.length; i ++) {
        if (product_no_apply[i] === existProduct.id) {
          return res.send(apiResponse(400, `${ existProduct.title } is not valid for this coupon`));
        } 
      }
      for (let i = 0; i < category_no_apply.length; i ++) {
        if (category_no_apply[i] === existProduct.category_id) {
          return res.send(apiResponse(400, `${ existProduct.title } is not valid for this coupon`));
        } 
      }
      for (let i = 0; i < product_apply.length; i ++) {
        if (product_apply[i] === existProduct.id) {
          valid = true;
        }
      }
      for (let i = 0; i < category_apply.length; i ++) {
        if (category_apply[i] === existProduct.category_id) {
          valid = true;
        }
      }
      if (!valid) {
        return res.send(apiResponse(400, `${ existProduct.title } is not valid for this coupon`));
      }
      totalPrice += existProduct.price * amount;
    }

    if (totalPrice < coupon.min_total_price) {
      return res.send(apiResponse(400, `Total pirce is less then min price apply coupon`)); 
    }
    let priceAfterCoupon = discountCalculate(totalPrice, coupon.discount, coupon.current);
    const amountDiscount = totalPrice - priceAfterCoupon;
    if (amountDiscount > coupon.max_discount) {
      priceAfterCoupon = totalPrice - coupon.max_discount;
    }
    return res.send(apiResponse(200, `Success`, {
      priceAfterCoupon,
      totalPrice
    })); 
  } catch (err) {
    next(err)
  }
})

module.exports = router;