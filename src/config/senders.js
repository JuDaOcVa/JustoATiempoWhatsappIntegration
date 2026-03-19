const { normalizePhone, isValidPhone } = require('../utils/phone');

function getConfiguredSenders() {
  const raw = process.env.WHATSAPP_SENDERS || '';

  return raw
    .split(',')
    .map((sender) => normalizePhone(sender))
    .filter((sender) => isValidPhone(sender));
}

function isSenderConfigured(remitente) {
  const senders = getConfiguredSenders();

  if (senders.length === 0) {
    return true;
  }

  return senders.includes(remitente);
}

module.exports = {
  getConfiguredSenders,
  isSenderConfigured
};
