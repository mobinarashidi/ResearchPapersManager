const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const User = require('./src/models/user');
const Paper = require('./src/models/paper');
const Citation = require('./src/models/citation');
const redisClient = require('./src/config/redis');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

const seedDatabase = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB connected for seeding.');


        await User.deleteMany({});
        await Paper.deleteMany({});
        await Citation.deleteMany({});
        await redisClient.flushall();
        console.log('Cleared existing data.');


        const userPromises = [];
        const usernames = new Set();
        for (let i = 0; i < 100; i++) {
            const username = faker.internet.userName().toLowerCase().replace(/[^a-z0-9_]/g, '').substring(0, 20);
            if (usernames.has(username)) continue; // Ensure username is unique
            usernames.add(username);

            const user = new User({
                username,
                name: faker.person.fullName(),
                email: faker.internet.email(),
                password: faker.internet.password({ length: faker.number.int({ min: 8, max: 12 }) }),
                department: faker.commerce.department()
            });
            userPromises.push(user.save());
        }
        const createdUsers = await Promise.all(userPromises);
        console.log(`${createdUsers.length} users created.`);


        const redisUsernames = {};
        createdUsers.forEach(user => {
            redisUsernames[user.username] = '1';
        });
        if (Object.keys(redisUsernames).length > 0) {
            await redisClient.hset('usernames', redisUsernames);
        }
        console.log('Usernames added to Redis.');


        const papers = [];
        for (let i = 0; i < 1000; i++) {
            papers.push({
                title: faker.lorem.sentence({ min: 6, max: 10 }),
                authors: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => faker.person.fullName()),
                abstract: faker.lorem.paragraph(),
                publication_date: faker.date.between({ from: '2015-01-01', to: '2025-01-01' }),
                journal_conference: faker.company.name(),
                keywords: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => faker.lorem.word()),
                uploaded_by: faker.helpers.arrayElement(createdUsers)._id,
                views: 0
            });
        }
        const createdPapers = await Paper.insertMany(papers);
        console.log(`${createdPapers.length} papers created.`);


        const citations = [];
        for (const paper of createdPapers) {
            const numCitations = faker.number.int({ min: 0, max: 5 });
            const citedPapers = faker.helpers.arrayElements(createdPapers, numCitations);
            for (const citedPaper of citedPapers) {
                if (paper._id.toString() !== citedPaper._id.toString()) {
                    citations.push({
                        paper_id: paper._id,
                        cited_paper_id: citedPaper._id
                    });
                }
            }
        }
        await Citation.insertMany(citations);
        console.log(`${citations.length} citations created.`);

        console.log('Database seeded successfully!');
    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        await mongoose.disconnect();
        await redisClient.quit();
        console.log('Connections closed.');
    }
};

seedDatabase();