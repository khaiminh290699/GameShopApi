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
  const { Orders, Promotions, Products, OrderDetails } = connection.models;
  const transaction = await connection.transaction();
  try{
    const { coupon_id, products, address, phone_number } = req.body;
    const { id: contact_id } = req.user;
    let coupons;
    if (coupon_id) {
      coupons = await Coupons.findOne({
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
        transaction.commit();
        return res.send(apiResponse(400, "Coupon is invalid"))
      }
    }
    
    const orderDtailes = [];
    let total_price = 0;
    await executeEach(products, async (product) => {
      const { product_id, promotion_id, amount } = product;
      const existProduct = await Products.findOne({ where: { id: product_id } });
      if (!existProduct) {
        transaction.commit();
        return res.send(apiResponse(404, `Product not found`))
      }
      if (existProduct.is_deleted) {
        transaction.commit();
        return res.send(apiResponse(404, `Product ${existProduct.title} is deleted`))
      }
      if (existProduct.stock < amount) {
        transaction.commit();
        return res.send(apiResponse(404, `Stock of ${ existProduct.title } not enough `))
      }
      let promotion;

      if (promotion_id) {
        promotion = await Promotions.findOne({
          where: {
            id: promotion_id,
            expiry_at: {
              [Op.gte]: new Date()
            },
            effect_at: {
              [Op.lte]: new Date()
            },
            is_deleted: false,
          }
        })
        if (!promotion || !promotion.product_ids.includes(product_id)) {
          transaction.commit();
          return res.send(apiResponse(400, "Promotion is invalid"))
        }
      }

      existProduct.stock -= amount;
      await existProduct.save({
        transaction
      })

      const original_price = amount * existProduct.price;
      const price_after_promotion = discountCalculate(original_price, promotion ? promotion.discount : 0, promotion ? promotion.current : 0);
      orderDtailes.push({
        original_price,
        total_price: price_after_promotion,
        amount,
        product_id,
        promotion_id
      })
      total_price += price_after_promotion;
      
    })
    
    const price_after_promotion = discountCalculate(total_price, coupons ? coupons.discount : 0, coupons ? coupons.current : 0);

    const order = await Orders.create({
      original_price: total_price,
      total_price: price_after_promotion,
      contact_id,
      coupon_id,
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

    await transaction.commit();
    return res.send(apiResponse(200, "Success", {
      order,
      details
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
      order.finish_at = new Date();
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
      console.log("STOP");
    } else {
      order.status = status;
      if (ORDER_STATUS[status] === "finish") {
        order.finish_at = new Date();
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