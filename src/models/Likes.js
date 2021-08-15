const { DataTypes, Sequelize } = require("sequelize")

const Likes = (sequelize) => {
  return sequelize.define("Likes", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("uuid_generate_v4")
    }
  })
}

module.exports = Likes;