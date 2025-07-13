// src/routes/paper.routes.js
const express = require('express');
const router = express.Router();
const paperController = require('../controllers/paperController');

// POST /papers - Requires authentication
router.post('/', paperController.authMiddleware, paperController.uploadPaper);

// GET /papers - Public search
router.get('/', paperController.searchPapers);

// GET /papers/:paper_id - Public details
router.get('/:paper_id', paperController.getPaperDetails);

module.exports = router;