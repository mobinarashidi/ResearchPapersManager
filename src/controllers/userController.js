// src/controllers/user.controller.js
const User = require('../models/user.js');
const redisClient = require('../config/redis');

// POST /signup
exports.signup = async (req, res) => {
    try {
        const { username, name, email, password, department } = req.body;

        // Simple validation
        if (!username || !name || !email || !password || !department) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
        }

        // Check username availability in Redis
        const usernameExists = await redisClient.hexists('usernames', username.toLowerCase());
        if (usernameExists) {
            return res.status(409).json({ message: 'Username is already taken.' });
        }

        // Create user
        const newUser = new User({ username, name, email, password, department });
        await newUser.save();

        // Add username to Redis hash
        await redisClient.hset('usernames', username.toLowerCase(), '1');

        res.status(201).json({ message: 'User registered', user_id: newUser._id });

    } catch (error) {
        // Handle potential duplicate key errors from MongoDB as a fallback
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Username or email already exists.' });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// POST /login
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required.' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        res.status(200).json({ message: 'Login successful', user_id: user._id });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
