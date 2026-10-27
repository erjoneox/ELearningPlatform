const { connectDB } = require("../config/db");

async function getAllCategories() {
  const pool = await connectDB();

  const result = await pool.request().query(`
    SELECT CategoryID, Name, Description
    FROM Categories
    ORDER BY Name
  `);

  return result.recordset;
}

module.exports = {
  getAllCategories,
};
