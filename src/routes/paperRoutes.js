const express = require('express');
const router = express.Router();
const paperController = require('../controllers/paperController');

router.post('/', paperController.authMiddleware, paperController.uploadPaper);
router.get('/', paperController.searchPapers);
router.get('/:paper_id', paperController.getPaperDetails);

module.exports = router;