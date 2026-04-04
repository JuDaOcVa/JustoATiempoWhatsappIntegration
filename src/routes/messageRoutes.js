const express = require('express');
const { sendMessage } = require('../services/whatsappSessionManager');
const { normalizePhone, isValidPhone } = require('../utils/phone');
const { isSenderConfigured } = require('../config/senders');

const router = express.Router();

router.post('/send', async (req, res) => {
  try {
    const remitente = normalizePhone(req.body?.remitente);
    const receptor = normalizePhone(req.body?.receptor);
    const mensaje = req.body?.mensaje ?? req.body?.Mensaje;

    if (!isValidPhone(remitente)) {
      return res.status(400).json({
        ok: false,
        message: 'Número remitente inválido',
        error: {
          code: 'INVALID_SENDER'
        }
      });
    }

    if (!(await isSenderConfigured(remitente))) {
      return res.status(400).json({
        ok: false,
        message: 'Remitente no configurado para esta integración',
        error: {
          code: 'SENDER_NOT_CONFIGURED'
        }
      });
    }

    if (!isValidPhone(receptor)) {
      return res.status(400).json({
        ok: false,
        message: 'Número receptor inválido',
        error: {
          code: 'INVALID_RECEIVER'
        }
      });
    }

    if (!mensaje || typeof mensaje !== 'string') {
      return res.status(400).json({
        ok: false,
        message: 'Mensaje inválido',
        error: {
          code: 'INVALID_MESSAGE'
        }
      });
    }

    const data = await sendMessage({
      remitente,
      receptor,
      mensaje
    });

    return res.json({
      ok: true,
      message: 'Mensaje enviado correctamente',
      data
    });
  } catch (error) {
    if (error.code === 'SESSION_NOT_READY') {
      return res.status(409).json({
        ok: false,
        message: 'La sesión del remitente aún no está lista',
        error: {
          code: error.code,
          status: error.status,
          details: error.details
        }
      });
    }

    return res.status(500).json({
      ok: false,
      message: 'No fue posible enviar el mensaje',
      error: {
        code: 'SEND_MESSAGE_ERROR',
        details: error.message
      }
    });
  }
});

module.exports = router;