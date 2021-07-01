const { Sequelize }=require("sequelize");
const { DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT } = process.env;

class Connection{
  constructor() {
    this.db_name = DB_NAME;
    this.db_user = DB_USER,
    this.db_pass = DB_PASSWORD;
    this.db_host = DB_HOST;
    this.db_port =DB_PORT;
  }

  getConnection() {
    if (!this.connection) {
      this.connection = new Sequelize(
        this.db_name,
        this.db_user,
        this.db_pass,
        {
          host: this.db_host,
          port: this.db_port,
          dialect: "postgres",
        }
      )
    }
    return this.connection;
  }
}

module.exports = new Connection();