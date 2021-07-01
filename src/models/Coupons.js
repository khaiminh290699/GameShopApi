const { DataTypes, Sequelize } = require("sequelize")

const Coupons = (sequelize) => {
  return sequelize.define("Coupons", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("uuid_generate_v4")
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      unique:true
    },
    banner: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    discount: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    current: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    min_total_price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    effect_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    expiry_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  })
}

module.exports = Coupons;