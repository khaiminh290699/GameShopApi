const { DataTypes, Sequelize } = require("sequelize")

const ImportDetail = (sequelize) => {
  return sequelize.define("ImportDetail", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("uuid_generate_v4")
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    each_price: {
      type: DataTypes.FLOAT,
      allowNull: false
    }
  })
}

module.exports = ImportDetail;