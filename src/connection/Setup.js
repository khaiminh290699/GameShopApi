const Connection = require("./Connection");
const { Contacts, Categories, Products, Properties, Coupons, CouponProductApply, CouponCatogryApply, Orders, OrderDetails } = require("../models/index");
const { hash } = require("../ultilities/encryption");

module.exports = class Setup {
  async initAdmin(contactModel) {
    const admin = await contactModel.findOne({
      where: {
        email: "gfc_admin@gamil.com"
      }
    })

    if (!admin) {
      await contactModel.build({
        email: "gfc_admin@gamil.com",
        username: "super admin",
        password: await hash("12345678"),
        permission: 512
      }).save();
    }
  }
  async setup() {
    const sequelize = Connection.getConnection();
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    const contacts = Contacts(sequelize);

    const categories = Categories(sequelize);
    const products = Products(sequelize)
    const properties = Properties(sequelize);

    categories.hasMany(products, {
      as: "Products",
      foreignKey: {
        name: "category_id",
        allowNull: true
      },
      onDelete: "SET NULL"
    });

    products.belongsTo(categories, {
      as: "Category",
      foreignKey: "category_id"
    });

    products.hasMany(properties, {
      as: "Properties",
      foreignKey: {
        name: "product_id",
      },
      onDelete: "CASCADE"
    });

    properties.belongsTo(products, {
      as: "Product",
      foreignKey: "product_id"
    });

    const coupons = Coupons(sequelize);
    const coupon_product_apply = CouponProductApply(sequelize);
    const coupon_category_apply = CouponCatogryApply(sequelize);

    coupons.hasMany(coupon_product_apply, {
      as: "CouponProductApply",
      foreignKey: {
        name: "coupon_id",
        allowNull: false
      }
    })

    coupon_product_apply.belongsTo(coupons, {
      as: "Coupon",
      foreignKey: "coupon_id"
    })

    products.hasMany(coupon_product_apply, {
      as: "CouponProductApplys",
      foreignKey: {
        name: "product_id",
        allowNull: false
      }
    })

    coupon_product_apply.belongsTo(products, {
      as: "Product",
      foreignKey: "product_id"
    })

    coupons.hasMany(coupon_category_apply, {
      as: "CouponCategoryApplys",
      foreignKey: {
        name: "coupon_id",
        allowNull: false
      }
    })

    coupon_category_apply.belongsTo(coupons, {
      as: "Coupon",
      foreignKey: "coupon_id"
    })

    categories.hasMany(coupon_category_apply, {
      as: "CouponCategoryApply",
      foreignKey: {
        name: "category_id",
        allowNull: false
      }
    })

    coupon_category_apply.belongsTo(categories, {
      as: "Category",
      foreignKey: "category_id"
    })

    const orders = Orders(sequelize);
    const orderDetails = OrderDetails(sequelize);

    contacts.hasMany(orders, {
      as: "Orders",
      foreignKey: {
        name: "contact_id",
        allowNull: false
      },
      onDelete: "SET NULL"
    })

    orders.belongsTo(contacts, {
      as: "Contact",
      foreignKey: "contact_id"
    });

    coupons.hasMany(orders, {
      as: "Orders",
      foreignKey: {
        name: "coupon_id",
        allowNull: true
      },
    })

    orders.belongsTo(coupons, {
      as: "Coupon",
      foreignKey: "coupon_id"
    });

    orders.hasMany(orderDetails, {
      as: "OrderDetails",
      foreignKey: {
        name: "order_id",
        allowNull: false
      },
    })

    orderDetails.belongsTo(orders, {
      as: "Order",
      foreignKey: "order_id"
    });

    products.hasMany(orderDetails, {
      as: "OrderDetails",
      foreignKey: {
        name: "product_id",
        allowNull: false
      },
    })

    orderDetails.belongsTo(products, {
      as: "Product",
      foreignKey: "product_id"
    });

    await sequelize.sync({ force: true })

    await this.initAdmin(contacts);
  }
}