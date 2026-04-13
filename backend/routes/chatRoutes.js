const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.post('/', chatController.handleChat);
router.get('/', chatController.getChats);
router.get('/:chatId/messages', chatController.getChatMessages);
router.delete('/:chatId', chatController.deleteChat);

module.exports = router;
