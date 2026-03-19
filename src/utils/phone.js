function normalizePhone(raw) {
  if (raw === undefined || raw === null) {
    return '';
  }

  return String(raw).replace(/\D/g, '');
}

function isValidPhone(phone) {
  return /^\d{8,15}$/.test(phone);
}

module.exports = {
  normalizePhone,
  isValidPhone
};
