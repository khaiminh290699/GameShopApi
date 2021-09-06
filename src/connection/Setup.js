const Connection = require("./Connection");
const { Contacts, Categories, Products, Properties, Coupons, Orders, OrderDetails, Rates, Comments, Likes, ImportGood, ImportDetail } = require("../models/index");
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

    const rates = Rates(sequelize);

    contacts.hasMany(rates, {
      as: "Rates",
      foreignKey: {
        name: "contact_id",
        allowNull: false
      },
    })

    rates.belongsTo(contacts, {
      as: "Contact",
      foreignKey: "contact_id"
    })

    products.hasMany(rates, {
      as: "Rates",
      foreignKey: {
        name: "product_id",
        allowNull: false
      },
    })

    rates.belongsTo(products, {
      as: "Product",
      foreignKey: "product_id"
    })

    const comments = Comments(sequelize);
    const likes = Likes(sequelize);

    products.hasMany(comments, {
      as: "Comments",
      foreignKey: {
        name: "product_id",
        allowNull: false
      },
    })

    comments.belongsTo(products, {
      as: "Product",
      foreignKey: "product_id"
    })

    contacts.hasMany(comments, {
      as: "Comments",
      foreignKey: {
        name: "contact_id",
        allowNull: false
      },
    })

    comments.belongsTo(contacts, {
      as: "Contact",
      foreignKey: "contact_id"
    })

    comments.hasMany(likes, {
      as: "Likes",
      foreignKey: {
        name: "comment_id",
        allowNull: false,
      },
      onDelete: 'CASCADE'
    })

    likes.belongsTo(comments, {
      as: "Comment",
      foreignKey: "comment_id",
    })

    contacts.hasMany(likes, {
      as: "Likes",
      foreignKey: {
        name: "contact_id",
        allowNull: false
      },
    })

    likes.belongsTo(contacts, {
      as: "Contact",
      foreignKey: "contact_id"
    })

    const import_good = ImportGood(sequelize)
    
    contacts.hasMany(import_good, {
      as: "ImportGood",
      foreignKey: {
        name: "contact_id",
        allowNull: false
      },
    })

    import_good.belongsTo(contacts, {
      as: "Contact",
      foreignKey: "contact_id"
    })

    const import_detail = ImportDetail(sequelize);

    import_good.hasMany(import_detail, {
      as: "ImportDetail",
      foreignKey: {
        name: "import_id",
        allowNull: false
      },
    })

    import_detail.belongsTo(products, {
      as: "Product",
      foreignKey: "product_id"
    })

    products.hasMany(import_detail, {
      as: "ImportDetail",
      foreignKey: {
        name: "product_id",
        allowNull: false
      },
    })

    import_detail.belongsTo(import_good, {
      as: "ImportGood",
      foreignKey: "import_id"
    })


    await sequelize.sync({ force: false })

    await this.initAdmin(contacts);
  }
}