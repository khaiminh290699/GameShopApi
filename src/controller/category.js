const express = require("express");
const apiResponse = require("../ultilities/apiResponse"); 
const Connection = require("../connection/Connection");
const { Op, Sequelize } = require("sequelize");
const createWhereCondition = require("../ultilities/compare");

const router = express.Router();

router.get("/:id", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Categories } = connection.models;
  try{
    const { id } = req.params;
    const category = await Categories.findOne({
      where: {
        id
      }
    })
    if (!category) {
      return res.send(apiResponse(404, "Category not found"))
    }
    return res.send(apiResponse(200, "Success", category))
  } catch(err) {
    next(err)
  }
});

router.post("/list", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Categories, Products } = connection.models;
  try{
    const { select = ["*"], wheres = {}, order, page = 0, limit = 50 } = req.body;
    const categories = await Categories.findAndCountAll({
      where: createWhereCondition(wheres),
      order,
      limit,
      offset: page * limit,
      attributes: select,
      raw: true
    })
    const mapCategory = {};
    const listCategoryId = categories.rows.reduce((listCategoryId, category) => {
      listCategoryId.push(category.id);
      mapCategory[category.id] = category;
      return listCategoryId;
    },[])
    const countProduct = await Products.count({
      where: {
        category_id: {
          [Op.in]: listCategoryId
        }
      },
      attributes: [
        "category_id",
        [Sequelize.fn("COUNT", "category_id"), "total_product"]
      ],
      group: "category_id"
    })
    countProduct.map((count) => {
      const { category_id, total_product } = count;
      mapCategory[category_id].total_product = total_product;
    })
    return res.send(apiResponse(200, "Success", categories))
  } catch(err) {
    next(err)
  }
});

router.post("/create", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Categories } = connection.models;
  const transaction = await connection.transaction();
  try{
    const { title, banner } = req.body;
    const categories = await Categories.create({
      title, banner
    }, {
      transaction
    })
    await transaction.commit();
    return res.send(apiResponse(200, "Success", categories))
  } catch(err) {
    await transaction.rollback();
    next(err)
  }
});

router.put("/update", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Categories } = connection.models;
  const transaction = await connection.transaction();
  try{
    const { id, title, banner } = req.body;
    const categories = await Categories.findOne({ where: { id } });
    if (!categories) {
      await transaction.commit();
      return res.send(apiResponse(404, "Categories not found"));
    }
    categories.title = title;
    categories.banner = banner;
    await categories.save({
      transaction
    })
    await transaction.commit();
    return res.send(apiResponse(200, "Success"))
  } catch(err) {
    await transaction.rollback();
    next(err)
  }
});

router.post("/delete", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Products, Categories } = connection.models;
  const transaction = await connection.transaction();
  try{
    const { ids } = req.body;
    const listExist = (await Products.findAll({
      where : {
        is_deleted: false,
        category_id: {
          [Op.in]: ids
        }
      },
      attributes: [
        [Sequelize.literal("DISTINCT category_id"), "category_id"]
      ]
    })).map((item) => item.category_id);
    const listDelete = ids.filter(id => !listExist.includes(id));
    await Categories.destroy({
      where: {
        id: {
          [Op.in]: listDelete
        }
      },
      transaction
    })
    await transaction.commit();
    return res.send(apiResponse(200, "Success", {
      listDelete,
      listExist
    }))
  } catch(err) {
    await transaction.rollback();
    next(err)
  }
});

module.exports = router;