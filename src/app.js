const express = require('express');
const connectDB = require('./config/database');
const syncViewsTask = require('./tasks/syncViews');
require('dotenv').config();

connectDB();

const app = express();

app.use(express.json());

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/papers', require('./routes/paperRoutes'));

app.get('/', (req, res) => {
    res.send('Research Papers Manager API is running...');
});

syncViewsTask();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
