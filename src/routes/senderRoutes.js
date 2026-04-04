const express = require('express');
const { getConfiguredSenders } = require('../config/senders');
const { initializeSessions, getStatus } = require('../services/whatsappSessionManager');

const router = express.Router();

router.get('/refresh', async (_req, res) => {
  try {
    const senders = await getConfiguredSenders();
    const statusBySender = senders.map((remitente) => ({
      remitente,
      status: getStatus(remitente)
    }));

    const newSenders = statusBySender
      .filter((item) => item.status === 'not_initialized')
      .map((item) => item.remitente);

    const recoveredSenders = statusBySender
      .filter((item) => item.status === 'error' || item.status === 'unknown')
      .map((item) => item.remitente);

    const sendersToInitialize = [...newSenders, ...recoveredSenders];

    if (sendersToInitialize.length > 0) {
      await initializeSessions(sendersToInitialize);
    }

    const statusAfterBySender = senders.map((remitente) => ({
      remitente,
      status: getStatus(remitente)
    }));

    const senderDiagnostics = statusBySender.map((item) => {
      const after = statusAfterBySender.find((statusItem) => statusItem.remitente === item.remitente);

      return {
        remitente: item.remitente,
        statusBefore: item.status,
        statusAfter: after ? after.status : item.status
      };
    });

    return res.json({
      ok: true,
      message: 'Remitentes recargados desde base de datos',
      data: {
        totalConfigured: senders.length,
        initializedNew: newSenders.length,
        recoveredSessions: recoveredSenders.length,
        initializedOrRecovered: sendersToInitialize.length,
        senderDiagnostics
      }
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'No fue posible refrescar los remitentes',
      error: {
        code: 'SENDERS_REFRESH_ERROR',
        details: error.message
      }
    });
  }
});

module.exports = router;