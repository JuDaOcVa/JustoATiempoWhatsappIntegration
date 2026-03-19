const express = require('express');
const {
  getStatus,
  getSession,
  listSessions
} = require('../services/whatsappSessionManager');
const { getConfiguredSenders } = require('../config/senders');

const router = express.Router();

router.get('/qrs', (req, res) => {
  const configuredSenders = getConfiguredSenders();
  const activeSenders = listSessions().map((item) => item.remitente);
  const remitentes = configuredSenders.length > 0 ? configuredSenders : activeSenders;
  const onlyPending = String(req.query.onlyPending || 'true').toLowerCase() !== 'false';

  const data = remitentes
    .map((remitente) => {
      const session = getSession(remitente);
      const status = getStatus(remitente);

      return {
        remitente,
        status,
        qr: status === 'qr_ready' ? session?.qr || null : null,
        qrUpdatedAt: session?.qrUpdatedAt || null,
        lastError: session?.lastError || null
      };
    })
    .filter((item) => {
      if (!onlyPending) {
        return true;
      }

      return item.status !== 'ready';
    });

  return res.json({
    ok: true,
    message: onlyPending ? 'QR pendientes obtenidos' : 'Estados y QR de sesiones obtenidos',
    data
  });
});

module.exports = router;