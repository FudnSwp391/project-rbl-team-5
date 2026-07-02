const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const sql = require('mssql');
const { Sequelize, DataTypes } = require('sequelize');

// --- 1. LEGACY MS SQL CONFIGURATION ---
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    instanceName: process.env.DB_INSTANCE,
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
};

if (!process.env.DB_INSTANCE) {
  config.port = parseInt(process.env.DB_PORT) || 1433;
}

// Legacy connection pool for raw queries compatibility
const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Connected to MS SQL Server (Legacy Pool)');
    // Run schema checked/updated migration on startup
    pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[conversations]') AND type in (N'U'))
      BEGIN
        CREATE TABLE [dbo].[conversations](
          [id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
          [customer_id] [int] NOT NULL,
          [seller_id] [int] NULL,
          [product_id] [int] NULL,
          [status] [nvarchar](50) NOT NULL DEFAULT 'pending',
          [created_at] [datetime] NOT NULL DEFAULT GETUTCDATE(),
          [updated_at] [datetime] NOT NULL DEFAULT GETUTCDATE()
        );
      END

      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[messages]') AND name = 'conversation_id')
      BEGIN
        ALTER TABLE [dbo].[messages] ADD conversation_id INT NULL;
        ALTER TABLE [dbo].[messages] ALTER COLUMN booking_id INT NULL;
      END

      -- Make receiver_id nullable to support pending conversations (no seller assigned yet)
      IF EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'[dbo].[messages]') AND name = 'receiver_id' AND is_nullable = 0
      )
      BEGIN
        DECLARE @fkName NVARCHAR(256);
        SELECT @fkName = fk.name
        FROM sys.foreign_keys fk
        INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
        INNER JOIN sys.columns c ON fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
        WHERE fk.parent_object_id = OBJECT_ID(N'[dbo].[messages]') AND c.name = 'receiver_id';
        
        IF @fkName IS NOT NULL
        BEGIN
          DECLARE @dropSql NVARCHAR(500) = 'ALTER TABLE [dbo].[messages] DROP CONSTRAINT [' + @fkName + ']';
          EXEC sp_executesql @dropSql;
        END

        ALTER TABLE [dbo].[messages] ALTER COLUMN receiver_id INT NULL;
        ALTER TABLE [dbo].[messages] ADD CONSTRAINT FK_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE NO ACTION;
      END

      IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'description'
      )
      BEGIN
        ALTER TABLE dbo.Users ADD description NVARCHAR(MAX) NULL;
      END
    `).then(() => {
      console.log('Database schema checked/updated successfully.');
    }).catch(err => {
      console.error('Error running database migrations:', err);
    });
    return pool;
  })
  .catch(err => {
    console.error('Database Connection Failed! Bad Config: ', err);
    process.exit(1);
  });

// --- 2. SEQUELIZE ORM CONFIGURATION ---
const sequelizeOptions = {
  host: process.env.DB_SERVER,
  dialect: 'mssql',
  dialectOptions: {
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    }
  },
  logging: false, // Turn off raw SQL logs to keep console clean
};

if (process.env.DB_INSTANCE) {
  sequelizeOptions.dialectOptions.options.instanceName = process.env.DB_INSTANCE;
} else if (process.env.DB_PORT) {
  sequelizeOptions.port = parseInt(process.env.DB_PORT) || 1433;
}

const sequelize = new Sequelize(
  process.env.DB_DATABASE,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  sequelizeOptions
);

sequelize.authenticate()
  .then(() => {
    console.log('Sequelize connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database via Sequelize:', err);
  });

// --- 3. SEQUELIZE MODEL DEFINITIONS ---
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  role_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  full_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  seller_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending'
  }
}, {
  tableName: 'conversations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  receiver_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  booking_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  text_content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  conversation_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'messages',
  timestamps: false
});

// Associations / Relationships
User.hasMany(Conversation, { foreignKey: 'customer_id', as: 'CustomerConversations' });
User.hasMany(Conversation, { foreignKey: 'seller_id', as: 'SellerConversations' });
Conversation.belongsTo(User, { foreignKey: 'customer_id', as: 'Customer' });
Conversation.belongsTo(User, { foreignKey: 'seller_id', as: 'Seller' });

Conversation.hasMany(Message, { foreignKey: 'conversation_id', as: 'Messages' });
Message.belongsTo(Conversation, { foreignKey: 'conversation_id', as: 'Conversation' });

User.hasMany(Message, { foreignKey: 'sender_id', as: 'SentMessages' });
User.hasMany(Message, { foreignKey: 'receiver_id', as: 'ReceivedMessages' });
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'Sender' });
Message.belongsTo(User, { foreignKey: 'receiver_id', as: 'Receiver' });

// --- 4. BACKWARD COMPATIBLE WRAPPER (db) ---
const db = {
  query: async (queryString, params = []) => {
    try {
      const pool = await poolPromise;
      const request = pool.request();

      params.forEach(param => {
        if (param.type) {
          request.input(param.name, param.type, param.value);
        } else {
          request.input(param.name, param.value);
        }
      });

      const result = await request.query(queryString);
      return result;
    } catch (err) {
      console.error('SQL Query Error: ', err);
      throw err;
    }
  },

  find: async (tableName, queryObj = {}) => {
    const modelMap = {
      users: User,
      conversations: Conversation,
      messages: Message
    };
    const model = modelMap[tableName.toLowerCase()];
    if (model) {
      const results = await model.findAll({ where: queryObj });
      return results.map(r => r.get({ plain: true }));
    }

    // Fallback to legacy raw query
    const keys = Object.keys(queryObj);
    if (keys.length === 0) {
      const result = await db.query(`SELECT * FROM ${tableName}`);
      return result.recordset;
    }
    const whereClause = keys.map((key, i) => `${key} = @param${i}`).join(' AND ');
    const params = keys.map((key, i) => ({ name: `param${i}`, value: queryObj[key] }));
    const result = await db.query(`SELECT * FROM ${tableName} WHERE ${whereClause}`, params);
    return result.recordset;
  },

  findOne: async (tableName, queryObj) => {
    const modelMap = {
      users: User,
      conversations: Conversation,
      messages: Message
    };
    const model = modelMap[tableName.toLowerCase()];
    if (model) {
      const result = await model.findOne({ where: queryObj });
      return result ? result.get({ plain: true }) : null;
    }

    // Fallback to legacy raw query
    const keys = Object.keys(queryObj);
    const whereClause = keys.map((key, i) => `${key} = @param${i}`).join(' AND ');
    const params = keys.map((key, i) => ({ name: `param${i}`, value: queryObj[key] }));
    const result = await db.query(`SELECT TOP 1 * FROM ${tableName} WHERE ${whereClause}`, params);
    return result.recordset[0];
  },

  insert: async (tableName, record) => {
    const modelMap = {
      users: User,
      conversations: Conversation,
      messages: Message
    };
    const model = modelMap[tableName.toLowerCase()];
    if (model) {
      const result = await model.create(record);
      return result.get({ plain: true });
    }

    // Fallback to legacy raw query
    const keys = Object.keys(record);
    const columns = keys.join(', ');
    const values = keys.map((key, i) => `@param${i}`).join(', ');
    const params = keys.map((key, i) => ({ name: `param${i}`, value: record[key] }));
    const query = `INSERT INTO ${tableName} (${columns}) VALUES (${values}); SELECT SCOPE_IDENTITY() AS id;`;
    const result = await db.query(query, params);
    return { ...record, id: result.recordset[0]?.id || null };
  },

  update: async (tableName, idField, idValue, updates) => {
    const modelMap = {
      users: User,
      conversations: Conversation,
      messages: Message
    };
    const model = modelMap[tableName.toLowerCase()];
    if (model) {
      await model.update(updates, { where: { [idField]: idValue } });
      return true;
    }

    // Fallback to legacy raw query
    const keys = Object.keys(updates);
    const setClause = keys.map((key, i) => `${key} = @param${i}`).join(', ');
    const params = keys.map((key, i) => ({ name: `param${i}`, value: updates[key] }));
    params.push({ name: 'id', value: idValue });
    const query = `UPDATE ${tableName} SET ${setClause} WHERE ${idField} = @id`;
    await db.query(query, params);
    return true;
  }
};

module.exports = {
  sql,
  poolPromise,
  sequelize,
  Sequelize,
  User,
  Conversation,
  Message,
  db
};
