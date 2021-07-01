const express = require("express");
const apiResponse = require("../ultilities/apiResponse"); 
const Connection = require("../connection/Connection");
const { Op } = require("sequelize");
const createWhereCondition = require("../ultilities/compare");
const discountCalculate = require("../ultilities/discountCalculate");

const router = express.Router();

router.get("/:id", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Products } = connection.models;
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
    });
    if (!product) {
      return res.send(apiResponse(404, "Product not found"))
    }
    return res.send(apiResponse(200, "Success", product))
  } catch(err) {
    next(err)
  }
});

router.post("/list", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Products } = connection.models;
  try{
    const { select = null, wheres = {}, order, page = 0, limit = 50 } = req.body;
    const list = await Products.findAndCountAll({
      where: createWhereCondition(wheres),
      order,
      limit,
      offset: page * limit,
      attributes: "*",
      attributes: select,
      include: [{
        association: Products.associations.Category,
        as: "Category",
      },{
        association: Products.associations.Promotion,
        as: "Promotion",
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

router.post("/price-calculate", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Products } = connection.models;
  try {
    const { id, amount } = req.body;
    const product = await Products.findOne({
      where: {
        id
      },
      include: [{
        association: Products.associations.Promotions,
        as: "Promotions"
      }],
      transaction
    })
    if (!product) {
      return res.send(apiResponse(404, "Product not found"));
    }
    let price = 0 
    if (product.Promotions) {
      const { discount, current } = product.Promotions;
      price = discountCalculate(amount * product.price, discount, current);
    } else {
      price = product.price * amount;
    }
    return res.send(apiResponse(200, "Success", { price, product_id: id, amount, promotion_id : product.Promotions ? product.Promotions.id : null  }))
  } catch (err) {
    next(err)
  }
})

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

module.exports = router;