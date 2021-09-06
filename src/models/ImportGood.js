const { DataTypes, Sequelize } = require("sequelize")

const ImportGood = (sequelize) => {
  return sequelize.define("ImportGood", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("uuid_generate_v4")
    },
    total_price: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    amount_product: {
      type: DataTypes.INTEGER,
    },
    amount_imported: {
      type: DataTypes.INTEGER,
    },
    status: {
      type: DataTypes.STRING
    }
  })
}

module.exports = ImportGood;