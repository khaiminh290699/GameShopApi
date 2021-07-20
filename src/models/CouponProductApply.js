const { DataTypes, Sequelize } = require("sequelize")

const CouponProductApply = (sequelize) => {
  return sequelize.define("CouponProductApply", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("uuid_generate_v4")
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    is_apply: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  })
}

module.exports = CouponProductApply;