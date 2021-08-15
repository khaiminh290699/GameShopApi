const express = require("express");
const apiResponse = require("../ultilities/apiResponse"); 
const Connection = require("../connection/Connection");
const { Op, Sequelize } = require("sequelize");
const createWhereCondition = require("../ultilities/compare");

const router = express.Router();

router.post("/list", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Comments } = connection.models;
  try {
    const { limit = 10, page = 1, from = new Date() , contact_id, product_id } = req.body;
    const include = [
      {
        association: Comments.associations.Contact,
        as: "contact"
      }
    ]
    if (contact_id) {
      include.push({
        association: Comments.associations.Likes,
        as: "like",
        where: [{contact_id}],
        required: false
      })
    }
    const list = await Comments.findAndCountAll({
      include,
      where: [{ product_id, parent_id: null, createdAt: { [Op.lte]: from } }],
      order: [["createdAt", "DESC"]],
      limit,
      offset: (page - 1) * limit
    })
    return res.send(apiResponse(200, "Success", list))
  } catch (err) {
    next(err);
  }
})

router.post("/list-reply", async (req, res, next) => {
  const connection = Connection.getConnection();
  const { Comments } = connection.models;
  try {
    const { contact_id, comment_id } = req.body;
    const include = [
      {
        association: Comments.associations.Contact,
        as: "contact",
        require: false,
      }
    ]
    if (contact_id) {
      include.push(
        {
          association: Comments.associations.Likes,
          as: "like",
          where: [{contact_id}],
          required: false
        }
      )
    }
    const list = await Comments.findAndCountAll({
      include,
      where: [{
        parent_id: comment_id
      }]
    })
    return res.send(apiResponse(200, "Success", list))
  } catch (err) {
    next(err);
  }
})

router.post("/create", async (req, res, next) => {
  const connection = Connection.getConnection();
  const transaction = await connection.transaction();
  const { Comments, Products } = connection.models;
  try{
    const { body, parent_id, product_id } = req.body;
    const { id: contact_id } = req.user;
    
    const product = await Products.findOne({ where: [{ id: product_id, is_deleted: false }] });
    if (!product) {
      await transaction.commit();
      return res.send(apiResponse(400, "Product not found"));
    }

    if (parent_id) {
      const parent = await Comments.findOne({ where: { id: parent_id } });
      if (!parent) {
        await transaction.commit();
        return res.send(apiResponse(400, "Parent comment not found"));
      }
      parent.amount_reply += 1;
      await parent.save({ transaction });
    }
    const comment = await Comments.build({ body, parent_id, product_id, contact_id }).save({ transaction });

    await transaction.commit();
    return res.send(apiResponse(200, "Success", {
      comment,
      contact: req.user
    }))
  } catch(err) {
    await transaction.rollback();
    next(err)
  }
});

router.put("/update", async (req, res, next) => {
  const connection = Connection.getConnection();
  const transaction = await connection.transaction();
  const { Comments } = connection.models;
  try{
    const { body, comment_id } = req.body;
    const { id: contact_id } = req.user;
    
    const comment = await Comments.findOne({ where: [{ id: comment_id, contact_id }] });
    if (!comment) {
      await transaction.commit();
      return res.send(apiResponse(400, "Comment not found"));
    }
    comment.body = body;
    comment.edited_at = new Date();
    await comment.save({ transaction });

    await transaction.commit();
    return res.send(apiResponse(200, "Success", comment))
  } catch(err) {
    await transaction.rollback();
    next(err)
  }
});

router.post("/delete", async (req, res, next) => {
  const connection = Connection.getConnection();
  const transaction = await connection.transaction();
  const { Comments } = connection.models;
  try{
    const { comment_id } = req.body;
    const { id: contact_id } = req.user;
    
    const comment = await Comments.findOne({ where: [{ id: comment_id, contact_id }] });
    if (!comment) {
      await transaction.commit();
      return res.send(apiResponse(400, "Comment not found"));
    }
    if (comment.parent_id) {
      const parent = await Comments.findOne({ where: [{ id: comment.parent_id }] });
      parent.amount_reply -= 1;
      await parent.save({transaction});
    }
    await Comments.destroy({
      where: {
        parent_id: comment_id
      },
      transaction
    })
    await comment.destroy({transaction});

    await transaction.commit();
    return res.send(apiResponse(200, "Success"))
  } catch(err) {
    await transaction.rollback();
    next(err)
  }
});

router.post("/like", async (req, res, next) => {
  const connection = Connection.getConnection();
  const transaction = await connection.transaction();
  const { Comments, Likes } = connection.models;
  try{
    const { comment_id } = req.body;
    const { id: contact_id } = req.user;
    
    const comment = await Comments.findOne({ where: [{ id: comment_id }] });
    if (!comment) {
      await transaction.commit();
      return res.send(apiResponse(400, "Comment not found"));
    }

    await Likes.build({ contact_id, comment_id }).save();

    comment.amount_like += 1;
    await comment.save({ transaction })

    await transaction.commit();
    return res.send(apiResponse(200, "Success", comment))
  } catch(err) {
    await transaction.rollback();
    next(err)
  }
});

router.post("/unlike", async (req, res, next) => {
  const connection = Connection.getConnection();
  const transaction = await connection.transaction();
  const { Comments, Likes } = connection.models;
  try{
    const { comment_id } = req.body;
    const { id: contact_id } = req.user;
    
    const comment = await Comments.findOne({ where: [{ id: comment_id }] });
    if (!comment) {
      await transaction.commit();
      return res.send(apiResponse(400, "Comment not found"));
    }

    await (await Likes.findOne({ where: {contact_id, comment_id}}) ).destroy({ transaction });

    comment.amount_like -= 1;
    await comment.save({ transaction })

    await transaction.commit();
    return res.send(apiResponse(200, "Success", comment))
  } catch(err) {
    await transaction.rollback();
    next(err)
  }
});


module.exports = router;