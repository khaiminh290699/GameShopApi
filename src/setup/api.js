const Joi = require("joi");
const joi = require("joi");
module.exports = {
  "/auth/sign-up": {
    authorize: false,
    schema: joi.object({
      username: joi.string().required(),
      email: joi.string().email().required(),
      password: joi.string().min(8).required(),
    })
  },
  "/auth/sign-in": {
    authorize: false,
    schema: joi.object().keys({
      email: joi.string().email().required(),
      password: joi.string().min(8).required()
    })
  },
  "/auth/forget-password": {
    authorize: false,
    schema: joi.object().keys({
      email: joi.string().email().required(),
    })
  },
  "/auth/check-admin": {
    authorize: true
  },
  "/auth/change-password": {
    authorize: true,
    schema: joi.object().keys({
      email: joi.string().email().required(),
      old_password: joi.string().min(8).required(),
      new_password: joi.string().min(8).required(),
    })
  },
  "/category/list": {
    authorize: false,
  },
  "/product/list": {
    authorize: false,
  },
  "/product/create": {
    authorize: true,
    permission: 255,
    schema: joi.object().keys({
      title: joi.string().required(),
      price: joi.number(),
      stock: joi.number(),
      description: joi.string().required(),
      category_id: Joi.string().required(),
      properties: Joi.array().items(
        joi.object().keys({
          label: Joi.string(),
          value: Joi.string(),
        })
      ),
      images: Joi.object().keys({
        main: Joi.string().required(),
        files: Joi.array()
      })
    })
  },
  "/product/update": {
    authorize: true,
    permission: 255,
    schema: joi.object().keys({
      id: joi.string().required(),
      title: joi.string().required(),
      price: joi.number(),
      stock: joi.number(),
      description: joi.string().required(),
      category_id: Joi.string().required(),
      properties: Joi.array(),
      images: Joi.object().keys({
        main: Joi.string().required(),
        files: Joi.array()
      })
    })
  },
  "/product/delete": {
    authorize: true,
    permission: 255,
    schema: joi.object().keys({
      ids: joi.array().items(joi.string()).required()
    })
  },
  "/order/create": {
    authorize: true,
    schema: joi.object().keys({
      address: joi.string().required(),
      phone_number: joi.string().required(),
      products: joi.array().items(
        joi.object().keys({
          product_id: joi.string().required(),
          amount: joi.number().min(1).required()
        })
      )
    })
  },
  "/order/update-status": {
    authorize: true,
    schema: joi.object().keys({
      id: joi.string().required(),
      status: joi.number().required()
    })
  },
  // "/auth/get-user": {
  //   authorize: true,
  // },
  "/category/create": {
    authorize: true,
    permission: 255,
    schema: joi.object().keys({
      title: joi.string().required(),
      banner: joi.string().required(),
    })
  },
  "/category/update": {
    authorize: true,
    permission: 255,
    schema: joi.object().keys({
      id: joi.string().required(),
      title: joi.string().required(),
      banner: joi.string().required(),
    })
  },
  "/category/delete": {
    authorize: true,
    permission: 255,
    schema: joi.object().keys({
      ids: joi.array().items(joi.string()).required()
    })
  },
  "/auth/update-profile": {
    authorize: true,
    schema: joi.object().keys({
      email: joi.string().required(),
      old_password: joi.string(),
      password: joi.string(),
      username: joi.string().required()
    })
  }
}