const { DataTypes, Sequelize } = require("sequelize")

const Rates = (sequelize) => {
  return sequelize.define("Rates", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("uuid_generate_v4")
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
    }
  })
}

module.exports = Rates;