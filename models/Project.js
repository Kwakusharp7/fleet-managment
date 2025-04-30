const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Project code is required'],
        unique: true,
        trim: true,
        maxlength: [20, 'Project code cannot exceed 20 characters']
    },
    name: {
        type: String,
        required: [true, 'Project name is required'],
        trim: true,
        maxlength: [100, 'Project name cannot exceed 100 characters']
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    },
    address: {
        type: String,
        trim: true,
        maxlength: [200, 'Address cannot exceed 200 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create a text index for search functionality
ProjectSchema.index({ code: 'text', name: 'text' });

// Virtual for full name display
ProjectSchema.virtual('fullName').get(function() {
    return `${this.code} – ${this.name}`;
});

const Project = mongoose.model('Project', ProjectSchema);
module.exports = Project;