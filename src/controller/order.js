const express = require("express");
const apiResponse = require("../ultilities/apiResponse"); 
const Connection = require("../connection/Connection");
const { Op, Sequelize } = require("sequelize");
const { ORDER_STATUS } = require("../setup/contanst")
const discountCalculate = require("../ultilities/discountCalculate");
const { executeEach } = require("../ultilities/arrays");
const createWhereCondition = require("../ultilities/compare");

const router = express.Router();

router.post("/create", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Orders, Coupons, Products, OrderDetails } = connection.models;
  const transaction = await connection.transaction();
  try{
    const { code, products, address, phone_number } = req.body;
    const { id: contact_id } = req.user;
    let coupon;
    if (code) {
      coupon = await Coupons.findOne({
        include: [{
          association: Coupons.associations.CouponProductApply,
          where: [{
            deleted_at: {
              [Op.eq]: null
            }
          }],
          required:false
        }, {
          association: Coupons.associations.CouponCategoryApply,
          where: [{
            deleted_at: {
              [Op.eq]: null
            }
          }],
          required:false
        }],
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
        await transaction.commit();
        return res.send(apiResponse(404, "Coupon is invalid"));
      }
    }
    
    const orderDtailes = [];
    let totalPrice = 0;
    await executeEach(products, async (product) => {
      const { product_id, amount } = product;
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
      if (coupon) {
        const { product_apply, product_no_apply, category_apply, category_no_apply } = coupon.apply;
        let valid = false;
        for (let i = 0; i < product_no_apply.length; i ++) {
          if (product_no_apply[i] === existProduct.id) {
            return res.send(apiResponse(400, `${ existProduct.title } is not valid for this coupon`));
          } 
        }
        for (let i = 0; i < category_no_apply.length; i ++) {
          if (category_no_apply[i] === existProduct.id) {
            return res.send(apiResponse(400, `${ existProduct.title } is not valid for this coupon`));
          } 
        }
        for (let i = 0; i < product_apply.length; i ++) {
          if (product_apply[i] === existProduct.id) {
            valid = true;
          }
        }
        for (let i = 0; i < category_apply.length; i ++) {
          if (category_apply[i] === existProduct.Category.id) {
            valid = true;
          }
        }
        if (!valid) {
          return res.send(apiResponse(400, `${ existProduct.title } is not valid for this coupon`));
        }
      }

      existProduct.stock -= amount;
      await existProduct.save({
        transaction
      })

      const original_price = amount * existProduct.price;

      orderDtailes.push({
        original_price,
        total_price: original_price,
        amount,
        product_id
      })
      
      totalPrice += existProduct.price * amount;
    })

    let priceAfterCoupon = totalPrice;
    if (coupon) {
      priceAfterCoupon = discountCalculate(totalPrice, coupon.discount, coupon.current);
      const amountDiscount = totalPrice - priceAfterCoupon;
      if (amountDiscount > coupon.max_discount) {
        priceAfterCoupon = totalPrice - coupon.max_discount;
      }
    }

    const order = await Orders.create({
      original_price: totalPrice,
      total_price: priceAfterCoupon,
      contact_id,
      coupon_id: coupon ? coupon.id : null,
      address, 
      phone_number
    }, {
      transaction
    })

    const details = await OrderDetails.bulkCreate(orderDtailes.map((item => {
      return {...item, order_id: order.id }
    })), {
      transaction
    })

    if (coupon) {
      coupon.amount -= 1;
      await coupon.save({
        transaction
      })
    }

    await transaction.commit();
    return res.send(apiResponse(200, "Success", {
      order,
      details,
      coupon
    }))
  } catch(err) {
    await transaction.rollback();
    next(err)
  }
});

router.post("/update-status", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Orders, Products, OrderDetails } = connection.models;
  const transaction = await connection.transaction();
  try{
    const { id, status } = req.body;
    
    const order = await Orders.findOne({ where: { id } });
    if (!order) {
      return res.send(apiResponse(404, "Order not found"))
    }
    if (ORDER_STATUS[status] === "reject") {
      if (ORDER_STATUS[order.status] != "waiting") {
        await transaction.commit();
        return res.send(apiResponse(400, "Không thể huỷ đơn hàng đã được xác nhận"));
      }
      order.status = status;
      order.finished_at = new Date();
      const orderDetail = await OrderDetails.findAll({
        where: {
          order_id: id
        },
        transaction
      })
      await executeEach(orderDetail, async (item) => {
        const { id, product_id, amount } = item;
        const product = await Products.findOne({ where: { id: product_id } });
        product.stock += amount;
        await product.save({ transaction })
        await OrderDetails.update({
          is_deleted: true
        }, {
          where: {
            id
          },
          transaction
        })
      })
    } else {
      order.status = status;
      if (ORDER_STATUS[status] === "finish") {
        order.finished_at = new Date();
      }
    }
    await order.save({ transaction })
    await transaction.commit();
    return res.send(apiResponse(200, "Success", {
      order
    }))
  } catch(err) {
    console.log(err)
    await transaction.rollback();
    next(err)
  }
});

router.post("/list", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Orders } = connection.models;
  try{
    const { select = null, wheres = {}, order, page = 0, limit = 50 } = req.body;
    const list = await Orders.findAndCountAll({
      where: createWhereCondition(wheres),
      order,
      limit,
      offset: page * limit,
      attributes: select,
      include: [{
        association: Orders.associations.Contact,
        as: "Contacts",
      }]
    });
    return res.send(apiResponse(200, "Success", list))
  } catch(err) {
    next(err)
  }
})

router.get("/:id", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Orders, OrderDetails } = connection.models;
  try{
    const { id } = req.params;
    const order = await Orders.findOne({
      where: {
        id
      },
      include: [{
        association: Orders.associations.OrderDetails,
        as: "OrderDetails",
        include: [{
          association: OrderDetails.associations.Product,
          as: "Products",
        }, {
          association: OrderDetails.associations.Promotion,
          as: "Promotions",
        }]
      }, {
        association: Orders.associations.Coupon,
        as: "Coupons",
      }, {
        association: Orders.associations.Contact,
        as: "Contacts",
      }]
    });
    if (!order) {
      return res.send(apiResponse(404, "Order not found"))
    }
    return res.send(apiResponse(200, "Success", order))
  } catch(err) {
    next(err)
  }
})

router.post("/history", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Orders, OrderDetails } = connection.models;
  try{
    const { id } = req.user;
    const orders = await Orders.findAll({
      where: {
        contact_id: id
      },
      include: [{
        association: Orders.associations.OrderDetails,
        as: "OrderDetails",
        include: [{
          association: OrderDetails.associations.Products,
          as: "Products",
        }, {
          association: OrderDetails.associations.Promotions,
          as: "Promotions",
        }]
      }, {
        association: Orders.associations.Coupons,
        as: "Coupons",
      }]
    })
    return res.send(apiResponse(200, "Success", orders))
  } catch(err) {
    next(err)
  }
});

module.exports = router;