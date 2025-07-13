const mongoose = require('mongoose');

const citationSchema = new mongoose.Schema({
    paper_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Paper', required: true },
    cited_paper_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Paper', required: true }
}, { timestamps: true });


citationSchema.index({ cited_paper_id: 1 });

const Citation = mongoose.model('Citation', citationSchema);

module.exports = Citation;
