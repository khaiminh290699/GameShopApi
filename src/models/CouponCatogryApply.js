const { DataTypes, Sequelize } = require("sequelize")

const CouponCatogryApply = (sequelize) => {
  return sequelize.define("CouponCatogryApply", {
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

module.exports = CouponCatogryApply;