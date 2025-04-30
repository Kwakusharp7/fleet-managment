const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    value: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware to update the updatedAt field
SettingSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Middleware to update the updatedAt field for findOneAndUpdate
SettingSchema.pre('findOneAndUpdate', function(next) {
    this.update({}, { $set: { updatedAt: Date.now() } });
    next();
});

const Setting = mongoose.model('Setting', SettingSchema);
module.exports = Setting;