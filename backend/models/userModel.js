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

async function createUser(firstName, lastName, email, passwordHash, role) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("firstName", firstName)
    .input("lastName", lastName)
    .input("email", email)
    .input("passwordHash", passwordHash)
    .input("role", role).query(`
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
                 @passwordHash, @role, 'Active')
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

async function getUserById(userId) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("userId", require("mssql").Int, userId).query(`
        SELECT UserID, Role, Status
        FROM Users
        WHERE UserID = @userId
    `);

  return result.recordset[0] || null;
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

async function updateUser(userId, data) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("userId", require("mssql").Int, userId)
    .input("firstName", require("mssql").NVarChar(100), data.firstName)
    .input("lastName", require("mssql").NVarChar(100), data.lastName)
    .input("email", require("mssql").NVarChar(255), data.email)
    .input("role", require("mssql").NVarChar(20), data.role)
    .input("status", require("mssql").NVarChar(20), data.status)
    .input("passwordHash", require("mssql").NVarChar(255), data.passwordHash)
    .query(`
      UPDATE Users
      SET FirstName = @firstName,
          LastName = @lastName,
          Email = @email,
          Role = @role,
          Status = @status,
          PasswordHash = COALESCE(@passwordHash, PasswordHash)
      OUTPUT
        INSERTED.UserID,
        INSERTED.FirstName,
        INSERTED.LastName,
        INSERTED.Email,
        INSERTED.Role,
        INSERTED.CreatedAt,
        INSERTED.Status
      WHERE UserID = @userId
    `);

  return result.recordset[0] || null;
}

async function deactivateUser(userId) {
  const pool = await connectDB();

  const result = await pool
    .request()
    .input("userId", require("mssql").Int, userId).query(`
      UPDATE Users
      SET Status = 'Inactive'
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
  getUserById,
  updateUserStatus,
  updateUser,
  deactivateUser,
};
