const express = require("express");
const apiResponse = require("../ultilities/apiResponse"); 
const Connection = require("../connection/Connection");
const { Op, QueryTypes } = require("sequelize");
const createWhereCondition = require("../ultilities/compare");
const sequelize = require("sequelize")

const router = express.Router();

router.get("/:id", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Products, Rates } = connection.models;
  try{
    const { id } = req.params;
    const product = await Products.findOne({
      where: {
        id,
        is_deleted: false
      },
      include: [{
        association: Products.associations.Category,
        as: "category",
      }, {
        association: Products.associations.Properties,
        as: "properties",
      }]
    })
    if (!product) {
      return res.send(apiResponse(404, "Product not found"))
    }
    const rating = await Rates.findOne({
      attributes: [[sequelize.fn("AVG", sequelize.col("rating")), "avg_rating"], [sequelize.fn("COUNT", sequelize.col("id")), "total_rating"]],
      where: {
        product_id: id
      },
      group: ["product_id"]
    })
    product.setDataValue("rating", rating || { avg_rating: 0, total_rating: 0 })
    return res.send(apiResponse(200, "Success", product))
  } catch(err) {
    next(err)
  }
});

router.post("/list", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Products } = connection.models;
  try{
    const { select = null, wheres = {}, order, page, limit } = req.body;
    const list = await Products.findAndCountAll({
      where: createWhereCondition(wheres),
      order,
      limit,
      offset: limit ? page * limit : undefined,
      attributes: "*",
      attributes: select,
      include: [{
        association: Products.associations.Category,
        as: "Category",
      }]
    });
    return res.send(apiResponse(200, "Success", list))
  } catch(err) {
    next(err)
  }
});

router.post("/create", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Products } = connection.models;
  const transaction = await connection.transaction();
  try{
    const { title, images, price, stock, description, category_id, properties } = req.body;
    const existTitle = await Products.findOne({
      where: {
        title,
        is_deleted: false
      }
    })
    if (existTitle) {
      await transaction.commit();
      return res.send(apiResponse(400, "Title exist"))
    }
    const product = await Products.create({
      title, images, price, stock, description, category_id,
      Properties: properties
    }, {
      transaction,
      include: [
        {
          association: Products.associations.Properties,
        }
      ],
    })
    await transaction.commit();
    return res.send(apiResponse(200, "Success", product))
  } catch(err) {
    await transaction.rollback();
    next(err)
  }
});

router.put("/update", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Products, Properties } = connection.models;
  const transaction = await connection.transaction();
  try{
    const { id, title, images, price, stock, description, category_id, properties } = req.body;
    const existTitle = await Products.findOne({
      where: {
        title,
        is_deleted: false,
        id: {
          [Op.not]: id
        }
      }
    })
    if (existTitle) {
      await transaction.commit();
      return res.send(apiResponse(400, "Title exist"))
    }
    const product = await Products.findOne({ where: { id } });
    if (!product) {
      await transaction.commit();
      return res.send(apiResponse(404, "Porduct not found"))
    }
    product.title = title;
    product.images = images;
    product.price = price;
    product.stock = stock;
    product.description = description;
    product.category_id = category_id;
    await product.save({
      transaction
    })
    const listLabel = properties.map((property) => {
      property.product_id = id;
      return property.label;
    });
    await Properties.destroy({
      where: {
        product_id: id,
        label: {
          [Op.notIn]: listLabel
        }
      }
    }, {
      transaction
    })
    await Properties.bulkCreate(properties, {
      transaction,
      updateOnDuplicate: ["value", "label"]
    });
    const result = await Properties.findAll({
      where: { product_id: id },
      transaction
    })
    await transaction.commit();
    return res.send(apiResponse(200, "Success", product))
  } catch(err) {
    await transaction.rollback();
    next(err)
  }
});

router.post("/delete", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Products } = connection.models;
  const transaction = await connection.transaction();
  try{
    const { ids } = req.body;
    await Products.update({
      is_deleted: true
    }, {
      where: {
        id: {
          [Op.in]: ids
        }
      }
    }, {
      transaction
    })
    await transaction.commit();
    return res.send(apiResponse(200, "Success"))
  } catch(err) {
    await transaction.rollback();
    next(err)
  }
});

router.post("/update-properties", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Properties } = connection.models;
  const transaction = await connection.transaction();
  try{
    const { id, properties } = req.body;
    const listLabel = properties.map((property) => {
      property.product_id = id;
      return property.label;
    });
    await Properties.destroy({
      where: {
        product_id: id,
        label: {
          [Op.notIn]: listLabel
        }
      }
    }, {
      transaction
    })
    await Properties.bulkCreate(properties, {
      transaction,
      updateOnDuplicate: ["value", "label"]
    });
    const result = await Properties.findAll({
      where: { product_id: id },
      transaction
    })
    await transaction.commit();
    return res.send(apiResponse(200, "Success", result))
  } catch(err) {
    await transaction.rollback();
    next(err)
  }
});

router.post("/get-by-ids", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Products } = connection.models;
  try {
    const { ids } = req.body;
    const product = await Products.findAll({
      where: {
        id: {
          [Op.in]: ids
        }
      }
    })
    return res.send(apiResponse(200, "Success", product))
  } catch (err) {
    next(err)
  }
})

router.post("/top-rating", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Products } = connection.models;
  try {
    const { top, category_id } = req.body;
    const top_rate = await Products.findAll({
      attributes: ["id", "title", "images", "stock", "price", [sequelize.fn("AVG", sequelize.col("rating")), "avg_rating"]],
      include: [{
        association: Products.associations.Rates,
        attributes: []
      }],
      where: category_id ? { category_id } : {},
      group: [[sequelize.literal('"Products".id')], [sequelize.literal('"Products".title')], [sequelize.literal('"Products".images')], [sequelize.literal('"Products".stock')], [sequelize.literal('"Products".price')]],
      top
    })
    return res.send(apiResponse(200, "Success", top_rate))
  } catch (err) {
    next(err);
  }
})

router.post("/get-rating", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Rates } = connection.models;
  try {
    const { product_id } = req.body;
    const { id: contact_id } = req.user;
    let rate = await Rates.findOne({
      where: {
        product_id,
        contact_id
      }
    })
    return res.send(apiResponse(200, "Success", rate || { rating: 0, not_rated: true }))
  } catch (err) {
    next(err);
  }
})

router.post("/rating", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Products, Rates } = connection.models;
  const transaction = await connection.transaction();
  try {
    const { product_id, rating } = req.body;
    const { id: contact_id } = req.user;
    const product = await Products.findOne({ 
      where: {
        id: product_id,
        is_deleted: false
      }
    })
    if (!product) {
      await transaction.commit();
      return res.send(apiResponse(404, "Product not found")) 
    }
    let rate = await Rates.findOne({
      where: {
        product_id,
        contact_id
      }
    })
    if (rate) {
      rate.rating = rating;
      await rate.save({
        transaction
      });
    } else {
      rate = await Rates.build({
        contact_id,
        product_id,
        rating
      }).save();
    }
    await transaction.commit();
    return res.send(apiResponse(200, "Success", rate))
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
})



module.exports = router;