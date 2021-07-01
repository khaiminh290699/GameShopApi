const { DataTypes, Sequelize } = require("sequelize")

const Categories = (sequelize) => {
  return sequelize.define("Categories", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("uuid_generate_v4")
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    banner: {
      type: DataTypes.STRING,
      allowNull: false
    }
  })
}

module.exports = Categories;