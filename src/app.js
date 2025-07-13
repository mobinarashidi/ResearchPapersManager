// src/app.js
const express = require('express');
const connectDB = require('./config/database');
const syncViewsTask = require('./tasks/syncViews');
require('dotenv').config();

// Connect to Databases
connectDB();

const app = express();

// Middlewares
app.use(express.json()); // To parse JSON bodies

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/papers', require('./routes/paperRoutes'));

// Health check endpoint
app.get('/', (req, res) => {
    res.send('Research Papers Manager API is running...');
});

// Start background task for syncing views
syncViewsTask();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
