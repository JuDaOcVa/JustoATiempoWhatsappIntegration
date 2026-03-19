const express = require('express');
const sessionRoutes = require('./sessionRoutes');
const messageRoutes = require('./messageRoutes');

const router = express.Router();

router.use('/sessions', sessionRoutes);
router.use('/messages', messageRoutes);

module.exports = router;
