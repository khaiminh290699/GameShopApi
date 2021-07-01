const { DataTypes, Sequelize } = require("sequelize")

const Promotions = (sequelize) => {
  return sequelize.define("Promotions", {
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
    product_ids: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    effect_at: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    expiry_at: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
  })
}

module.exports = Promotions;