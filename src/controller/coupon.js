const express = require("express");
const apiResponse = require("../ultilities/apiResponse"); 
const Connection = require("../connection/Connection");
const { Op } = require("sequelize");
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
    const { 
      is_all,
      except_category,
      except_product,
      apply_category,
      apply_product 
    } = coupon.apply;
    const applyProduct = await Products.findAll({
      where: [
        { id: { [Op.in]: apply_product } },
        { is_deleted: { [Op.eq]: false } }
      ]
    })
    const exceptProduct = await Products.findAll({
      where: [
        { id: { [Op.in]: except_product } },
        { is_deleted: { [Op.eq]: false } }
      ]
    })
    const applyCategory = await Categories.findAll({
      where: [
        { id: { [Op.in]: apply_category } }
      ]
    })
    const exceptCategory = await Categories.findAll({
      where: [
        { id: { [Op.in]: except_category } }
      ]
    })
    return res.send(apiResponse(200, "Success", {
      coupon,
      is_all,
      except_category: exceptCategory,
      except_product: exceptProduct,
      apply_category: applyCategory,
      apply_product: applyProduct 
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
    const { 
      code,
      title, 
      discount, 
      max_discount, 
      currency, 
      amount, 
      min_total_price, 
      effect_at, 
      expiry_at, 
      banner, 
      description,
      is_all = false,
      except_category,
      except_product,
      apply_category,
      apply_product
    } = req.body;

    if (effect_at > expiry_at) {
      await transaction.commit();
      return res.send(apiResponse(400, "Effect date is greater then expiry date"));
    }
    const exist = await Coupons.findOne({ where: { code } });
    if (exist) {
      await transaction.commit();
      return res.send(apiResponse(400, "Code exist"));
    }
    const coupon = await Coupons.create({
      code,
      title, 
      discount, 
      max_discount, 
      currency, 
      amount, 
      min_total_price, 
      effect_at, 
      expiry_at, 
      banner, 
      description,
      apply: {
        is_all,
        except_category,
        except_product,
        apply_category,
        apply_product
      }
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
    const { 
      id,
      code,
      title, 
      discount, 
      max_discount, 
      currency, 
      amount, 
      min_total_price, 
      effect_at, 
      expiry_at, 
      banner, 
      description,
      is_all = false,
      except_category,
      except_product,
      apply_category,
      apply_product
    } = req.body;
    if (effect_at > expiry_at) {
      return res.send(apiResponse(400, "Effect date is greater then expiry date"));
    }
    const exist = await Coupons.findOne({ where: { code, id: { [Op.ne]: id } } });
    if (exist) {
      await transaction.commit();
      return res.send(apiResponse(400, "Code exist"));
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
    coupon.currency = currency;
    coupon.amount = amount;
    coupon.min_total_price = min_total_price;
    coupon.effect_at = effect_at;
    coupon.expiry_at = expiry_at;
    coupon.banner = banner;
    coupon.code = code;
    coupon.apply = { 
      is_all,
      except_category,
      except_product,
      apply_category,
      apply_product
    };
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
    const { 
      is_all,
      except_category,
      except_product,
      apply_category,
      apply_product 
    } = coupon.apply;
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
      if (is_all || apply_product.includes(product_id) || apply_category.includes(existProduct.category_id) ) {
        valid = true;
      }
      if (except_product.includes(product_id) || except_category.includes(existProduct.category_id)) {
        valid = false;
      }
      if (!valid) {
        return res.send(apiResponse(400, `${ existProduct.title } is not valid for this coupon`));
      }
      totalPrice += existProduct.price * amount;
    }

    if (totalPrice < coupon.min_total_price) {
      return res.send(apiResponse(400, `Total pirce is less then min price apply coupon`)); 
    }
    let priceAfterCoupon = discountCalculate(totalPrice, coupon.discount, coupon.currency);
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