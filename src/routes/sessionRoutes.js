const express = require('express');
const {
  initializeSessions,
  getStatus,
  getSession,
  listSessions
} = require('../services/whatsappSessionManager');
const { getConfiguredSenders } = require('../config/senders');

const router = express.Router();

router.get('/qrs', async (req, res) => {
  try {
    const configuredSenders = await getConfiguredSenders();
    const activeSenders = listSessions().map((item) => item.remitente);
    const remitentes = configuredSenders.length > 0 ? configuredSenders : activeSenders;
    const onlyPending = String(req.query.onlyPending || 'true').toLowerCase() !== 'false';

    const sendersToInitialize = remitentes.filter((remitente) => {
      const status = getStatus(remitente);
      return status === 'not_initialized' || status === 'error' || status === 'unknown';
    });

    if (sendersToInitialize.length > 0) {
      await initializeSessions(sendersToInitialize);
    }

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
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'No fue posible consultar los remitentes configurados',
      error: {
        code: 'SENDERS_CONFIG_ERROR',
        details: error.message
      }
    });
  }
});

module.exports = router;