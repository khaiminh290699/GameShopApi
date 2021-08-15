const { DataTypes, Sequelize } = require("sequelize")

const Comments = (sequelize) => {
  return sequelize.define("Comments", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("uuid_generate_v4")
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    parent_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    amount_like: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    amount_reply: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    edited_at: {
      type: DataTypes.DATE,
      allowNull: true,
    }
  })
}

module.exports = Comments;