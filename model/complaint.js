const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    category: { type: String, required: true },
    details: { type: String, required: true},
    flightnumber: {type: String, required: true},
    incident: { type: Date, required: true },
    highlighted: { type: Boolean, default: true },
    viewed: { type: Boolean, default: false },
}, {timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);