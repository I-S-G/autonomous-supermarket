const Database = require("better-sqlite3");
const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = path.resolve(__dirname, "../../data");
const databasePath = path.join(dataDirectory, "supermarket.db");
const schemaPath = path.join(__dirname, "schema.sql");

fs.mkdirSync(dataDirectory, { recursive: true });

const db = new Database(databasePath);

// Enable relational integrity for this connection.
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");

// Create the tables and indexes if they don't exist.
const schema = fs.readFileSync(schemaPath, "utf8");
db.exec(schema);

console.log(`SQLite database ready: ${databasePath}`);

module.exports = db;
