const { Pool } = require('pg');

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return String(value).toLowerCase() === 'true';
}

const connectionString = process.env.DATABASE_URL;
const useSsl = toBoolean(process.env.DB_SSL, false);

if (!connectionString) {
  throw new Error('Falta la variable DATABASE_URL para conectar a PostgreSQL');
}

const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined
});

async function query(text, params = []) {
  return pool.query(text, params);
}

module.exports = {
  query,
  pool
};