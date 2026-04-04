const { query } = require('./database');
const { normalizePhone, isValidPhone } = require('../utils/phone');

const DEFAULT_SENDERS_QUERY = 'SELECT remitente FROM whatsapp_senders WHERE activo = true';

function extractSenderValue(row) {
  if (!row || typeof row !== 'object') {
    return '';
  }

  if (row.remitente !== undefined && row.remitente !== null) {
    return row.remitente;
  }

  if (row.sender !== undefined && row.sender !== null) {
    return row.sender;
  }

  if (row.phone !== undefined && row.phone !== null) {
    return row.phone;
  }

  const firstValue = Object.values(row)[0];
  return firstValue !== undefined && firstValue !== null ? firstValue : '';
}

async function getConfiguredSenders() {
  const sql = process.env.DB_SENDERS_QUERY || DEFAULT_SENDERS_QUERY;
  const result = await query(sql);
  const unique = new Set();

  result.rows
    .map(extractSenderValue)
    .map((sender) => normalizePhone(sender))
    .filter((sender) => isValidPhone(sender))
    .forEach((sender) => unique.add(sender));

  return Array.from(unique);
}

async function isSenderConfigured(remitente) {
  const senders = await getConfiguredSenders();

  if (senders.length === 0) {
    return true;
  }

  return senders.includes(remitente);
}

module.exports = {
  getConfiguredSenders,
  isSenderConfigured
};
