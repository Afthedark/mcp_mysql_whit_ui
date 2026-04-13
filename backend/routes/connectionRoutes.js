const express = require('express');
const router = express.Router();
const connectionController = require('../controllers/connectionController');

router.get('/', connectionController.getAll);
router.post('/', connectionController.create);
router.put('/:id', connectionController.update);
router.delete('/:id', connectionController.remove);
router.post('/:id/test', connectionController.testConnection);

module.exports = router;
