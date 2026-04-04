require('dotenv').config();

const express = require('express');
const cors = require('cors');

const apiRoutes = require('./routes/apiRoutes');
const senderRoutes = require('./routes/senderRoutes');
const { initializeSessions } = require('./services/whatsappSessionManager');
const { getConfiguredSenders } = require('./config/senders');

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api', apiRoutes);
app.use('/senders', senderRoutes);

app.use((err, _req, res, _next) => {
  res.status(500).json({
    ok: false,
    message: 'Error interno no controlado',
    error: {
      code: 'INTERNAL_ERROR',
      details: err.message
    }
  });
});

app.listen(port, () => {
  console.log(`WhatsApp API escuchando en puerto ${port}`);

  (async () => {
    try {
      const senders = await getConfiguredSenders();

      if (senders.length === 0) {
        console.log('No hay remitentes activos en la base de datos para inicialización automática.');
        return;
      }

      console.log(`Inicializando ${senders.length} sesión(es) configurada(s)...`);
      const results = await initializeSessions(senders);
      const ok = results.filter((item) => item.ok).length;
      const failed = results.filter((item) => !item.ok);

      console.log(`Inicialización completada: ${ok}/${results.length} en proceso.`);
      failed.forEach((item) => {
        console.error(`No se pudo inicializar ${item.remitente}: ${item.error}`);
      });
    } catch (error) {
      console.error(`Error obteniendo remitentes desde base de datos: ${error.message}`);
    }
  })();
});
