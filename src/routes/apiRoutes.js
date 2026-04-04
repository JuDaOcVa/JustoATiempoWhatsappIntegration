const express = require('express');
const sessionRoutes = require('./sessionRoutes');
const messageRoutes = require('./messageRoutes');
const senderRoutes = require('./senderRoutes');

const router = express.Router();

router.use('/sessions', sessionRoutes);
router.use('/messages', messageRoutes);
router.use('/senders', senderRoutes);

module.exports = router;
