const express = require("express");
const apiResponse = require("../ultilities/apiResponse"); 
const Connection = require("../connection/Connection");
const { Op, QueryTypes } = require("sequelize");
const createWhereCondition = require("../ultilities/compare");
const sequelize = require("sequelize");
const connectSocket = require("../ultilities/socket");

const fs = require("fs");
const parse = require('csv-parse');
const multer = require("multer");

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
      where: category_id ? [{ category_id }] : [{}],
      group: [[sequelize.literal('"Products".id')], [sequelize.literal('"Products".title')], [sequelize.literal('"Products".images')], [sequelize.literal('"Products".stock')], [sequelize.literal('"Products".price')]],
      order: [[sequelize.fn("AVG", sequelize.col("rating")), "DESC NULLS LAST"]],
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

router.post("/current-import", async (req, res, next) => {
  const { user: { id: contact_id } } = req;
  const connection = Connection.getConnection();
  const { ImportGood } = connection.models;
  const importGood = await ImportGood.findOne({
    where: [{
      contact_id,
      status: "waiting"
    }]
  })

  return res.send(apiResponse(200, "Success", importGood))
})

router.post("/list-import", async (req, res, next) => {
  const { select = null, wheres = {}, order, page, limit } = req.body;
  const connection = Connection.getConnection();
  const { ImportGood } = connection.models;
  const list = await ImportGood.findAndCountAll({
    where: createWhereCondition(wheres),
    order,
    limit,
    offset: limit ? page * limit : undefined,
    attributes: "*",
    attributes: select,
    include: [{
      association: ImportGood.associations.Contact,
      as: "Contact",
    }]
  });
  return res.send(apiResponse(200, "Success", list))
})

router.post("/import-detail", async (req, res, next) => {
  const { import_id } = req.body;
  const connection = Connection.getConnection();
  const { ImportGood, ImportDetail } = connection.models;
  const importGood = await ImportGood.findOne({
    where: [{ id: import_id }]
  })
  const importDetail = await ImportDetail.findAll({
    where: [{ import_id }],
    include: [{
      association: ImportDetail.associations.Product,
      as: "Products",
    }]
  })
  return res.send(apiResponse(200, "Success", {
    import_good: importGood,
    details: importDetail,
  }))
})

const upload = multer({ dest: "public/csv" })

router.post("/import", upload.single("import"), async (req, res, next) => {
  const { file: { filename }, user: { id: contact_id } } = req;
  const data = await new Promise((resolve, reject) => {
    fs.readFile(`${process.cwd()}/public/csv/${filename}`, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  })

  const { header, records } = await new Promise((resolve, reject) => {
    parse(data, (err, records, info) => {
      if (err) return reject(err);
      const header = records.shift();
      resolve({
        header,
        records
      })
    })
  })

  if (!header.includes("ProductName") || !header.includes("Amount") || !header.includes("EachPrice")) {
    return res.send(apiResponse(400, "Not Correct Format"));
  }

  const mapColumns = (header) => {
    const nameIndex = header.indexOf("ProductName");
    const amountIndex = header.indexOf("Amount");
    const priceIndex = header.indexOf("EachPrice");

    return {
      product_name: nameIndex,
      amount: amountIndex,
      price: priceIndex
    }

  }

  const mapColumnsIndex = mapColumns(header);

  const connection = Connection.getConnection();
  const { ImportGood } = connection.models;
  const transaction = await connection.transaction();

  try {
    const importGood = await ImportGood.build({
      contact_id,
      amount_product: records.length,
      amount_imported: 0,
      total_price: 0,
      status: "waiting"
    }).save({
      transaction
    })

    const { id: import_id } = importGood;

    let imported = 0;
    let total_price = 0;
    let total = records.length;
    let error = [];
    setTimeout(async () => {
      const { ImportGood, ImportDetail, Products } = connection.models;
      const socket = await connectSocket("socket", "token");
      try {
        while(records.length) {
          const transaction = await connection.transaction();

          const chunks = records.splice(0, 1);
  
          const list = await Products.findAll({
            where: [{
              title: {
                [Op.in]: chunks.map((chunk) => chunk[mapColumnsIndex.product_name])
              }
            }, {
              is_deleted: false
            }]
          }, { transaction })

          const lisName = [];
          for (let i = 0; i < list.length; i++) {
            const product = list[i];
            const index = chunks.findIndex(chunk => chunk[mapColumnsIndex.product_name] == product.title);
            chunk = chunks[index];

            product.stock += (+chunk[mapColumnsIndex.amount]);
            await ImportDetail.build({
              import_id,
              product_id: product.id,
              amount: +chunk[mapColumnsIndex.amount],
              each_price: +chunk[mapColumnsIndex.price]
            }).save({ transaction })
            await product.save({ transaction });
            imported += 1;
            total_price += (+chunk[mapColumnsIndex.amount]) * (+chunk[mapColumnsIndex.price]);
            lisName.push(chunk[mapColumnsIndex.product_name]);
          }

          error.push(...chunks.filter(chunk => !lisName.includes(chunk[mapColumnsIndex.product_name])).map((item) => item[mapColumnsIndex.product_name]));


          await socket.emit("import_goods", {
            import_id,
            imported,
            total,
            status: "waiting"
          })
          await ImportGood.update({ status: "waiting", amount_imported: imported }, {
            where: { id: import_id },
            transaction
          })
          await transaction.commit();
          await new Promise((res) => {
            setTimeout(() => res(), 2000);
          })
        }

        await ImportGood.update({ status: "done", amount_imported: imported, total_price }, {
          where: { id: import_id }
        })

        socket.emit("import_goods", {
          status: "done",
          total,
          imported,
          import_id,
          total_price,
          error
        })

        fs.unlinkSync(`${process.cwd()}/public/csv/${filename}`);
      } catch (err) {
        console.log(err)
      }
    }, 0)

    await transaction.commit();
    return res.send(apiResponse(200, "Success", importGood))

  } catch (err) {

  }
})


module.exports = router;