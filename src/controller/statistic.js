const express = require("express");
const apiResponse = require("../ultilities/apiResponse");
const Connection = require ("../connection/Connection");
const router = express.Router();
const moment = require("moment");
const sequelize = require("sequelize");

const { Op, QueryTypes } = sequelize;

router.post("/top-user", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Orders } = connection.models;
  try{
    const { amount, unit, top } = req.body;
    const from_date = moment().subtract(amount, unit).toDate();

    const result = await connection.query(`
      SELECT "Contacts".id, "Contacts".username, SUM("Orders".total_price) AS total_contact_pay
      FROM "Orders"
      LEFT JOIN "Contacts" ON "Contacts".id = "Orders".contact_id
      WHERE "Orders".finished_at >= :from_date
      AND "Orders".status = :finish_status
      GROUP BY "Contacts".id, "Contacts".username
      ORDER BY total_contact_pay DESC
      LIMIT :top
    `, {
      type: QueryTypes.SELECT,
      replacements: {
        from_date,
        finish_status: 2,
        top
      }
    })

    return res.send(apiResponse(200, "Success", result))
  } catch(err) {
    next(err)
  }
});

router.post("/top-product", async (req, res, next) => {
  const connection = Connection.getConnection();
  try{
    const { amount, unit, top } = req.body;
    const from_date = moment().subtract(amount, unit).toDate();

    const result = await connection.query(`
      SELECT "Products".id, "Products".title, SUM("OrderDetails".amount) AS total_amount_buy
      FROM "Orders"
      LEFT JOIN "OrderDetails" ON "OrderDetails".order_id = "Orders".id
      LEFT JOIN "Products" ON "Products".id = "OrderDetails".product_id
      WHERE "Orders".finished_at >= :from_date
      AND "Orders".status = :finish_status
      AND "Products".is_deleted = false
      GROUP BY "Products".id, "Products".title
      ORDER BY total_amount_buy DESC
      LIMIT :top
    `, {
      type: QueryTypes.SELECT,
      replacements: {
        from_date,
        finish_status: 2,
        top
      }
    })

    return res.send(apiResponse(200, "Success", result))
  } catch(err) {
    next(err)
  }
})

router.post("/overall", async (req, res, next) => {
  const connection = Connection.getConnection();
  try{
    const { amount, unit } = req.body;
    const from_date = moment().subtract(amount, unit).toDate();

    const total_contact = await connection.query(`
      SELECT COUNT(*) AS total_contact FROM "Contacts" WHERE "Contacts"."createdAt" >= :from_date
    `, {
      type: QueryTypes.SELECT,
      replacements: {
        from_date
      }
    })

    const total_profit = await connection.query(`
      SELECT SUM("Orders".total_price) AS total_profit FROM "Orders" WHERE "Orders"."finished_at" >= :from_date AND "Orders".status = :finish_status
    `, {
      type: QueryTypes.SELECT,
      replacements: {
        from_date,
        finish_status: 2
      }
    })
    
    return res.send(apiResponse(200, "Success", {
      ...total_contact[0],
      ...total_profit[0],
    }))
  } catch(err) {
    next(err)
  }
})

router.post("/order", async (req, res, next) => {
  const connection = Connection.getConnection();
  try{
    const { amount, unit } = req.body;
    const from_date = moment().subtract(amount, unit).toDate();

    const trade_statistic = await connection.query(`
      SELECT "Orders".status, COUNT(*) AS value
      FROM "Orders" 
      WHERE 
      ("Orders"."finished_at" >= :from_date AND ("Orders".status = :finish_status OR "Orders".status = :reject_status))
      OR
      ("Orders".ordered_at >= :from_date AND "Orders".status != :finish_status AND "Orders".status != :reject_status)
      GROUP BY "Orders".status
    `, {
      type: QueryTypes.SELECT,
      replacements: {
        from_date,
        finish_status: 2,
        reject_status: 3
      }
    })
    
    return res.send(apiResponse(200, "Success", trade_statistic))
  } catch(err) {
    next(err)
  }
})

module.exports = router;