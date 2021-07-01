const { DataTypes, Sequelize } = require("sequelize")

const Orders = (sequelize) => {
  return sequelize.define("Orders", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("uuid_generate_v4")
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    finished_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ordered_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn("now")
    },
    original_price: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    total_price: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: false
    }
  })
}

module.exports = Orders;