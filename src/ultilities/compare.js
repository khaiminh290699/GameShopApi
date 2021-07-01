const { Op } = require("sequelize");

const createWhereCondition = (wheres) => {
  const result = {}
  Object.keys(wheres).map((key) => {
    const where = wheres[key];
    const op = Object.keys(where)[0];
    if (!Op[op]) {
      throw new Error("Where properties invalid")
    }
    result[key] = {
      [Op[op]]: where[op]
    }
  })
  return result;
}

module.exports = createWhereCondition;