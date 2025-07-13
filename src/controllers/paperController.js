// src/controllers/paper.controller.js
const Paper = require('../models/paper.js');
const Citation = require('../models/citation.js');
const User = require('../models/user.js');
const redisClient = require('../config/redis');
const mongoose = require('mongoose');

// Middleware to check for a valid user ID in the header
exports.authMiddleware = async (req, res, next) => {
    const userId = req.header('X-User-ID');
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(401).json({ message: 'Unauthorized: User ID is missing or invalid.' });
    }
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized: User not found.' });
        }
        req.user = user;
        next();
    } catch (error) {
        res.status(500).json({ message: 'Server error during authentication.' });
    }
};

// POST /papers
exports.uploadPaper = async (req, res) => {
    try {
        const { title, authors, abstract, publication_date, journal_conference, keywords, citations } = req.body;

        // Basic validation
        if (!title || !authors || !abstract || !publication_date || !keywords) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }

        // Validate citations if provided
        if (citations && citations.length > 0) {
            for (const citId of citations) {
                if (!mongoose.Types.ObjectId.isValid(citId)) {
                    return res.status(400).json({ message: `Invalid citation ID format: ${citId}` });
                }
                const paperExists = await Paper.findById(citId);
                if (!paperExists) {
                    return res.status(404).json({ message: `Cited paper not found: ${citId}` });
                }
            }
        }

        const newPaper = new Paper({
            ...req.body,
            uploaded_by: req.user._id
        });
        await newPaper.save();

        if (citations && citations.length > 0) {
            const citationDocs = citations.map(citId => ({
                paper_id: newPaper._id,
                cited_paper_id: citId
            }));
            await Citation.insertMany(citationDocs);
        }

        res.status(201).json({ message: 'Paper uploaded', paper_id: newPaper._id });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// GET /papers (Search)
exports.searchPapers = async (req, res) => {
    try {
        const { search = '', sort_by = 'relevance', order = 'desc' } = req.query;

        // Create a unique key for Redis cache
        const cacheKey = `search:${search}:${sort_by}:${order}`;

        // 1. Check cache first
        const cachedResults = await redisClient.get(cacheKey);
        if (cachedResults) {
            return res.status(200).json(JSON.parse(cachedResults));
        }

        // 2. If not in cache, query MongoDB
        let query = {};
        if (search) {
            query = { $text: { $search: search } };
        }

        let sortOption = {};
        if (sort_by === 'relevance' && search) {
            sortOption = { score: { $meta: 'textScore' } };
        } else if (sort_by === 'publication_date') {
            sortOption = { publication_date: order === 'asc' ? 1 : -1 };
        }

        const papers = await Paper.find(query)
            .sort(sortOption)
            .select('title authors publication_date journal_conference keywords')
            .lean(); // .lean() for faster queries, returns plain JS objects

        const response = { papers };

        // 3. Store result in Redis cache for 5 minutes (300 seconds)
        await redisClient.setex(cacheKey, 300, JSON.stringify(response));

        res.status(200).json(response);

    } catch (error) {
        res.status(400).json({ message: 'Invalid query parameters', error: error.message });
    }
};

// GET /papers/{paper_id}
exports.getPaperDetails = async (req, res) => {
    try {
        const { paper_id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(paper_id)) {
            return res.status(404).json({ message: 'Paper not found.' });
        }

        // Atomically increment view count in Redis
        const viewCount = await redisClient.incr(`paper_views:${paper_id}`);

        // Get paper details from MongoDB
        const paper = await Paper.findById(paper_id).lean();
        if (!paper) {
            return res.status(404).json({ message: 'Paper not found.' });
        }

        // Get citation count from MongoDB
        const citationCount = await Citation.countDocuments({ cited_paper_id: paper_id });

        const response = {
            ...paper,
            citation_count: citationCount,
            views: viewCount // Return the real-time view count from Redis
        };

        res.status(200).json(response);

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
