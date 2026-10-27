const { connectDB } = require("../config/db");

async function findUserByEmail(email) {
  const pool = await connectDB();

  const result = await pool.request().input("email", email).query(`
            SELECT UserID, FirstName, LastName, Email,
                   PasswordHash, Role, Status
            FROM Users
            WHERE Email = @email
        `);

  return result.recordset[0] || null;
}

async function createUser(firstName, lastName, email, passwordHash) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("firstName", firstName)
    .input("lastName", lastName)
    .input("email", email)
    .input("passwordHash", passwordHash).query(`
            INSERT INTO Users
                (FirstName, LastName, Email, PasswordHash, Role, Status)
            OUTPUT
                INSERTED.UserID,
                INSERTED.FirstName,
                INSERTED.LastName,
                INSERTED.Email,
                INSERTED.Role,
                INSERTED.Status
            VALUES
                (@firstName, @lastName, @email,
                 @passwordHash, 'Student', 'Active')
        `);

  return result.recordset[0];
}

async function getAllUsers() {
  const pool = await connectDB();

  const result = await pool.request().query(`
        SELECT
            UserID,
            FirstName,
            LastName,
            Email,
            Role,
            CreatedAt,
            Status
        FROM Users
        ORDER BY CreatedAt DESC
    `);

  return result.recordset;
}

async function updateUserStatus(userId, status) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("userId", require("mssql").Int, userId)
    .input("status", require("mssql").NVarChar(20), status).query(`
            UPDATE Users
            SET Status = @status
            OUTPUT
                INSERTED.UserID,
                INSERTED.FirstName,
                INSERTED.LastName,
                INSERTED.Email,
                INSERTED.Role,
                INSERTED.Status
            WHERE UserID = @userId
        `);

  return result.recordset[0] || null;
}

module.exports = {
  findUserByEmail,
  createUser,
  getAllUsers,
  updateUserStatus,
};
