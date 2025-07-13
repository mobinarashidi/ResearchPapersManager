const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
    title: { type: String, required: true, maxlength: 200, trim: true },
    authors: {
        type: [String],
        required: true,
        validate: [v => v.length >= 1 && v.length <= 5, 'Authors must be between 1 and 5.']
    },
    abstract: { type: String, required: true, maxlength: 1000, trim: true },
    publication_date: { type: Date, required: true },
    journal_conference: { type: String, maxlength: 200, trim: true },
    keywords: {
        type: [String],
        required: true,
        validate: [v => v.length >= 1 && v.length <= 5, 'Keywords must be between 1 and 5.']
    },
    uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    views: { type: Number, default: 0 },
}, { timestamps: true });


paperSchema.index({ title: 'text', abstract: 'text', keywords: 'text' });

const Paper = mongoose.model('Paper', paperSchema);

module.exports = Paper;
