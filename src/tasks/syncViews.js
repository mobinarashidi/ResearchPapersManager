// src/tasks/syncViews.js
const cron = require('node-cron');
const redisClient = require('../config/redis');
const Paper = require('../models/paper.js');

const syncViewsTask = () => {
    // Schedule to run every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
        console.log('Running scheduled task: Syncing paper views from Redis to MongoDB...');
        try {
            const keys = await redisClient.keys('paper_views:*');
            if (keys.length === 0) {
                console.log('No views to sync.');
                return;
            }

            const pipeline = redisClient.pipeline();
            keys.forEach(key => pipeline.get(key));
            const viewCounts = await pipeline.exec();

            const bulkOps = [];
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const paperId = key.split(':')[1];
                const count = parseInt(viewCounts[i][1], 10);

                if (count > 0) {
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: paperId },
                            update: { $inc: { views: count } }
                        }
                    });
                }
            }

            if (bulkOps.length > 0) {
                await Paper.bulkWrite(bulkOps);
                console.log(`Synced ${bulkOps.length} paper view counts.`);
                // Reset the keys in Redis after successful sync
                await redisClient.del(keys);
                console.log('Cleared synced view keys from Redis.');
            } else {
                console.log('No new views to sync.');
            }

        } catch (error) {
            console.error('Error during view sync task:', error);
        }
    });
};

module.exports = syncViewsTask;
