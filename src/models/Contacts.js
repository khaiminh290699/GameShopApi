const { DataTypes, Sequelize } = require("sequelize")

const Contacts = (sequelize) => {
  return sequelize.define("Contacts", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("uuid_generate_v4")
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique:true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique:true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    randomPassword: {
      type: DataTypes.STRING,
      allowNull: true
    },
    permission: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 7
    }
  })
}

module.exports = Contacts;