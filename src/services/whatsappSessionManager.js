const qrcode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { nowInTimezone } = require('../utils/dateTime');

const sessions = new Map();

function getSession(remitente) {
  return sessions.get(remitente);
}

function getStatus(remitente) {
  const session = getSession(remitente);

  if (!session) {
    return 'not_initialized';
  }

  if (session.ready) {
    return 'ready';
  }

  if (session.qr) {
    return 'qr_ready';
  }

  if (session.initializing) {
    return 'initializing';
  }

  if (session.lastError) {
    return 'error';
  }

  return 'unknown';
}

function listSessions() {
  return Array.from(sessions.entries()).map(([remitente, session]) => ({
    remitente,
    status: session.ready ? 'ready' : session.qr ? 'qr_ready' : session.initializing ? 'initializing' : 'unknown',
    lastError: session.lastError || null,
    initializedAt: session.initializedAt || null
  }));
}

async function initializeSession(remitente) {
  const current = getSession(remitente);

  if (current) {
    if (current.ready || current.initializing || current.qr) {
      return current;
    }

    if (current.client) {
      try {
        await current.client.destroy();
      } catch (_error) {
        // No bloquear la reinicialización si la sesión previa ya está destruida.
      }
    }

    sessions.delete(remitente);
  }

  const session = {
    remitente,
    initializing: true,
    ready: false,
    qr: null,
    qrUpdatedAt: null,
    initializedAt: nowInTimezone(),
    lastError: null,
    client: null
  };

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: `rem-${remitente}` }),
    puppeteer: {
      headless: process.env.PUPPETEER_HEADLESS !== 'false',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  session.client = client;

  client.on('qr', async (qrText) => {
    try {
      session.qr = await qrcode.toDataURL(qrText);
      session.qrUpdatedAt = nowInTimezone();
      session.lastError = null;
      console.log(`QR listo para ${remitente}. Consulta: GET /api/sessions/${remitente}/qr`);
    } catch (error) {
      session.lastError = `Error generando QR: ${error.message}`;
    }
  });

  client.on('authenticated', () => {
    session.lastError = null;
  });

  client.on('ready', () => {
    session.ready = true;
    session.initializing = false;
    session.qr = null;
    session.qrUpdatedAt = null;
    session.lastError = null;
    console.log(`Sesión lista para remitente ${remitente}`);
  });

  client.on('auth_failure', (msg) => {
    session.ready = false;
    session.initializing = false;
    session.qr = null;
    session.qrUpdatedAt = null;
    session.lastError = `Fallo de autenticación: ${msg}`;
  });

  client.on('disconnected', (reason) => {
    session.ready = false;
    session.initializing = false;
    session.qr = null;
    session.qrUpdatedAt = null;
    session.lastError = `Sesión desconectada: ${reason}`;
  });

  sessions.set(remitente, session);

  try {
    await client.initialize();
    session.initializing = false;
    return session;
  } catch (error) {
    session.ready = false;
    session.initializing = false;
    session.lastError = error.message;
    throw error;
  }
}

async function initializeSessions(remitentes) {
  const tasks = remitentes.map(async (remitente) => {
    try {
      await initializeSession(remitente);
      return { remitente, ok: true };
    } catch (error) {
      return {
        remitente,
        ok: false,
        error: error.message
      };
    }
  });

  return Promise.all(tasks);
}

async function ensureSession(remitente) {
  const existing = getSession(remitente);

  if (existing) {
    return existing;
  }

  return initializeSession(remitente);
}

async function sendMessage({ remitente, receptor, mensaje }) {
  const session = await ensureSession(remitente);

  if (!session.ready) {
    const status = getStatus(remitente);
    const details = session.lastError || 'Escanea el QR para autenticar la línea';

    const error = new Error('La sesión del remitente aún no está lista');
    error.code = 'SESSION_NOT_READY';
    error.status = status;
    error.details = details;
    throw error;
  }

  const chatId = `${receptor}@c.us`;
  const response = await session.client.sendMessage(chatId, mensaje);

  return {
    remitente,
    receptor,
    messageId: response.id ? response.id._serialized : null,
    status: 'sent'
  };
}

module.exports = {
  initializeSession,
  initializeSessions,
  ensureSession,
  sendMessage,
  getStatus,
  getSession,
  listSessions
};
