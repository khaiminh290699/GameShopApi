const express = require("express");
const apiResponse = require("../ultilities/apiResponse"); 
const Connection = require("../connection/Connection");
const createWhereCondition = require("../ultilities/compare");
const { Op } = require("sequelize");

const router = express.Router();

router.get("/:id", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Promotions, Products } = connection.models;
  try {
    const { id } = req.params;
    const promotion = await Promotions.findOne({ where: { id } });
    if (!promotion) {
      return res.send(apiResponse(404, "Promotion not found"));
    }
    const products = await Products.findAll({
      where: {
        id: {
          [Op.in]: promotion.product_ids
        }
      },
      attributes: ["id", "title", "images"]
    });

    return res.send(apiResponse(200, "Success", { promotion, products }));
  } catch (err) {
    next(err)
  }
})

router.post("/list", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Promotions } = connection.models;
  try{
    const { select = ["*"], wheres = {}, order, page = 0, limit = 50 } = req.body;
    const list = await Promotions.findAndCountAll({
      where: createWhereCondition(wheres),
      order,
      limit,
      attributes: select,
      offset: page * limit
    });
    return res.send(apiResponse(200, "Success", list))
  } catch(err) {
    next(err)
  }
});

router.post("/create", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Promotions, Products } = connection.models;
  const transaction = await connection.transaction();
  try {
    const { title, banner, discount, current, effect_at, expiry_at, product_ids } = req.body;
    const promotion = await Promotions.create({
      title, banner, discount, current, effect_at, expiry_at, product_ids
    }, {
      transaction
    })
    await transaction.commit();
    return res.send(apiResponse(200, "Success", promotion))
  } catch (err) {
    await transaction.rollback();
    next(err)
  }
})

router.put("/update", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Promotions } = connection.models;
  const transaction = await connection.transaction();
  try {
    const { id, title, banner, discount, current, effect_at, expiry_at, product_ids } = req.body;
    
    const promotion = await Promotions.findOne({ where: { id } });

    if (!promotion) {
      await transaction.commit();
      return res.send(apiResponse(404, "Promotion not found"));
    }
    promotion.title = title;
    promotion.banner = banner;
    promotion.discount = discount;
    promotion.current = current;
    promotion.effect_at = effect_at;
    promotion.expiry_at = expiry_at;
    promotion.product_ids = product_ids;
    await promotion.save({
      transaction
    })
    // await Products.update({
    //   promotion_id: promotion.id
    // }, {
    //   where: {
    //     id: {
    //       [Op.in]: product_ids
    //     }
    //   },
    //   transaction
    // })
    // await Products.update({
    //   promotion_id: null
    // }, {
    //   where: {
    //     promotion_id: id,
    //     id: {
    //       [Op.notIn]: product_ids
    //     }
    //   },
    //   transaction
    // })
    await transaction.commit();
    return res.send(apiResponse(200, "Success", promotion))
  } catch (err) {
    await transaction.rollback();
    next(err)
  }
})

router.delete("/delete", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Promotions, Products } = connection.models;
  const transaction = await connection.transaction();
  try {
    const { ids } = req.body;
    await Promotions.update({
      is_deleted: true
    }, {
      where: {
        id: {
          [Op.in]: ids
        }
      },
      transaction
    })
    await Promotions.update({
      promotion_id: null
    }, {
      where: {
        promotion_id: {
          [Op.in]: ids
        }
      },
      transaction
    })
    await transaction.commit();
    return res.send(apiResponse(200, "Success"))
  } catch (err) {
    await transaction.rollback();
    next(err)
  }
});

router.post("/apply", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Promotions, Products } = connection.models;
  const transaction = await connection.transaction();
  try {
    const { id } = req.body;
    const { product_ids } = await Promotions.findOne({ where: { id } });

    if (product_ids[0] === "*") {
      await Products.update({
        promotion_id: promotion.id
      },{
        transaction
      })
    } else {
      
      await Products.update({
        promotion_id: promotion.id
      }, {
        where: {
          id: {
            [Op.in]: product_ids
          }
        },
        transaction
      })

      await Products.update({
        promotion_id: null
      }, {
        where: {
          promotion_id: promotion.id,
          id: {
            [Op.notIn]: product_ids
          }
        },
        transaction
      })
    }

    await transaction.commit();
    return res.send(apiResponse(200, "Success"))
  } catch (err) {
    await transaction.rollback();
    next(err)
  }
});

module.exports = router;