const Paper = require('../models/paper.js');
const Citation = require('../models/citation.js');
const User = require('../models/user.js');
const redisClient = require('../config/redis');
const mongoose = require('mongoose');

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

        if (!title || !authors || !abstract || !publication_date || !keywords) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }

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

        const keyParts = ['search', search || 'all', sort_by, order];
        const cacheKey = keyParts.join(':');
        console.log(`[DEBUG] Using cache key: ${cacheKey}`);

        const cachedResults = await redisClient.get(cacheKey);
        if (cachedResults) {
            console.log('[DEBUG] Cache HIT!');
            return res.status(200).json(JSON.parse(cachedResults));
        }

        console.log('[DEBUG] Cache MISS. Querying MongoDB...');

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
            .lean();

        const response = { papers };

        if (papers.length > 0) {
            console.log(`[DEBUG] Storing result in Redis. Key: ${cacheKey}`);
            try {
                await redisClient.setex(cacheKey, 300, JSON.stringify(response));
                console.log('[DEBUG] Successfully stored in Redis.');
            } catch (redisError) {
                console.error('[DEBUG] FAILED to store in Redis:', redisError);
            }
        } else {
            console.log('[DEBUG] No results to store in cache.');
        }

        res.status(200).json(response);

    } catch (error) {
        console.error('[DEBUG] An error occurred in searchPapers:', error);
        res.status(400).json({ message: 'Invalid query parameters', error: error.message });
    }
};

// GET /papers/{ID}
exports.getPaperDetails = async (req, res) => {
    try {
        const { paper_id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(paper_id)) {
            return res.status(404).json({ message: 'Paper not found.' });
        }

        const paperCacheKey = `paper_details:${paper_id}`;
        console.log(`[DEBUG] Using paper cache key: ${paperCacheKey}`);

        let cachedPaper = await redisClient.get(paperCacheKey);
        let paper, citationCount;

        if (cachedPaper) {
            console.log('[DEBUG] Paper cache HIT!');
            const cachedData = JSON.parse(cachedPaper);
            paper = cachedData.paper;
            citationCount = cachedData.citation_count;
        } else {
            console.log('[DEBUG] Paper cache MISS. Querying MongoDB...');

            paper = await Paper.findById(paper_id).lean();
            if (!paper) {
                return res.status(404).json({ message: 'Paper not found.' });
            }

            citationCount = await Citation.countDocuments({ cited_paper_id: paper_id });

            const cacheData = {
                paper: paper,
                citation_count: citationCount
            };

            try {
                await redisClient.setex(paperCacheKey, 600, JSON.stringify(cacheData));
                console.log(`[DEBUG] Successfully stored paper data in Redis. Key: ${paperCacheKey}`);
            } catch (redisError) {
                console.error('[DEBUG] FAILED to store paper data in Redis:', redisError);
            }
        }

        const viewCount = await redisClient.incr(`paper_views:${paper_id}`);

        const response = {
            ...paper,
            citation_count: citationCount,
            views: viewCount
        };

        res.status(200).json(response);

    } catch (error) {
        console.error('[DEBUG] An error occurred in getPaperDetails:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
