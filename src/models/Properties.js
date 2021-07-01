const { DataTypes, Sequelize } = require("sequelize")

const Properties = (sequelize) => {
  return sequelize.define("Properties", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("uuid_generate_v4")
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, 
  {
    indexes: [
      {
        unique: true,
        fields: ["product_id", "label"]
      }
    ]
  })
}

module.exports = Properties;