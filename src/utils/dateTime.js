function getConfiguredTimezone() {
  return process.env.APP_TIMEZONE || process.env.TZ || 'UTC';
}

function formatDateInTimezone(date = new Date()) {
  const normalizedDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(normalizedDate.getTime())) {
    return null;
  }

  const timeZone = getConfiguredTimezone();

  try {
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    return formatter.format(normalizedDate).replace(' ', 'T');
  } catch (_error) {
    const fallbackFormatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    return fallbackFormatter.format(normalizedDate).replace(' ', 'T');
  }
}

function nowInTimezone() {
  return formatDateInTimezone(new Date());
}

module.exports = {
  getConfiguredTimezone,
  formatDateInTimezone,
  nowInTimezone
};