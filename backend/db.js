const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE, // Changed from DB_NAME to match .env
  options: {
    instanceName: process.env.DB_INSTANCE, // Added for SQLEXPRESS support
    encrypt: process.env.DB_ENCRYPT === 'true', // Configurable via .env
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true', // Configurable via .env
  },
};

// If no instance name is provided, use the port (default 1433)
if (!process.env.DB_INSTANCE) {
  config.port = parseInt(process.env.DB_PORT) || 1433;
}

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Connected to MS SQL Server');
    return pool;
  })
  .catch(err => {
    console.error('Database Connection Failed! Bad Config: ', err);
    process.exit(1);
  });

const db = {
  query: async (queryString, params = []) => {
    try {
      const pool = await poolPromise;
      const request = pool.request();
      params.forEach(param => {
        request.input(param.name, param.type, param.value);
      });
      const result = await request.query(queryString);
      return result;
    } catch (err) {
      console.error('SQL Query Error: ', err);
      throw err;
    }
  },

  // Helper for simple find (matching existing API as much as possible)
  find: async (tableName) => {
    const result = await db.query(`SELECT * FROM ${tableName}`);
    return result.recordset;
  },

  findOne: async (tableName, queryObj) => {
    const keys = Object.keys(queryObj);
    const whereClause = keys.map((key, i) => `${key} = @param${i}`).join(' AND ');
    const params = keys.map((key, i) => ({
      name: `param${i}`,
      value: queryObj[key]
    }));
    const result = await db.query(`SELECT TOP 1 * FROM ${tableName} WHERE ${whereClause}`, params);
    return result.recordset[0];
  },

  insert: async (tableName, record) => {
    const keys = Object.keys(record);
    const columns = keys.join(', ');
    const values = keys.map((key, i) => `@param${i}`).join(', ');
    const params = keys.map((key, i) => ({
      name: `param${i}`,
      value: record[key]
    }));
    const query = `INSERT INTO ${tableName} (${columns}) VALUES (${values}); SELECT SCOPE_IDENTITY() AS id;`;
    const result = await db.query(query, params);
    return { ...record, id: result.recordset[0].id };
  },

  update: async (tableName, idField, idValue, updates) => {
    const keys = Object.keys(updates);
    const setClause = keys.map((key, i) => `${key} = @param${i}`).join(', ');
    const params = keys.map((key, i) => ({
      name: `param${i}`,
      value: updates[key]
    }));
    params.push({ name: 'id', value: idValue });
    const query = `UPDATE ${tableName} SET ${setClause} WHERE ${idField} = @id`;
    await db.query(query, params);
    return true;
  }
};

module.exports = {
  sql,
  poolPromise,
  db
};
