const mongoose = require('mongoose');
const moment = require('moment');

// Skid Schema (embedded in Load)
const SkidSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true
    },
    width: {
        type: Number,
        required: [true, 'Width is required'],
        min: [0.1, 'Width must be greater than 0.1']
    },
    length: {
        type: Number,
        required: [true, 'Length is required'],
        min: [0.1, 'Length must be greater than 0.1']
    },
    weight: {
        type: Number,
        required: [true, 'Weight is required'],
        min: [1, 'Weight must be greater than 0']
    },
    description: {
        type: String,
        maxlength: [200, 'Description cannot exceed 200 characters']
    }
});

// Truck Info Schema (embedded in Load)
const TruckInfoSchema = new mongoose.Schema({
    length: {
        type: Number,
        required: [true, 'Length is required'],
        min: [1, 'Length must be greater than 0']
    },
    width: {
        type: Number,
        required: [true, 'Width is required'],
        min: [1, 'Width must be greater than 0']
    },
    weight: {
        type: Number,
        required: [true, 'Weight capacity is required'],
        min: [1000, 'Weight capacity must be at least 1000 lbs']
    }
});

// Packing List Schema (embedded in Load)
const PackingListSchema = new mongoose.Schema({
    date: {
        type: Date
    },
    workOrder: {
        type: String,
        trim: true
    },
    projectName: {
        type: String,
        trim: true
    },
    projectAddress: {
        type: String,
        trim: true
    },
    requestedBy: {
        type: String,
        trim: true
    },
    carrier: {
        type: String,
        trim: true
    },
    consignee: {
        type: String,
        trim: true
    },
    consigneeAddress: {
        type: String,
        trim: true
    },
    siteContact: {
        type: String,
        trim: true
    },
    sitePhone: {
        type: String,
        trim: true
    },
    deliveryDate: {
        type: Date
    },
    packagedBy: {
        type: String,
        trim: true
    },
    checkedBy: {
        type: String,
        trim: true
    },
    receivedBy: {
        type: String,
        trim: true
    },
    signature: {
        type: String  // Base64 encoded signature data
    }
});

// Main Load Schema
const LoadSchema = new mongoose.Schema({
    truckId: {
        type: String,
        required: [true, 'Truck ID is required'],
        trim: true,
        maxlength: [50, 'Truck ID cannot exceed 50 characters']
    },
    projectCode: {
        type: String,
        required: [true, 'Project code is required'],
        trim: true,
        ref: 'Project'
    },
    dateEntered: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['Planned', 'Loaded', 'Delivered'],
        default: 'Planned'
    },
    truckInfo: {
        type: TruckInfoSchema,
        required: [true, 'Truck information is required']
    },
    skids: {
        type: [SkidSchema],
        default: []
    },
    packingList: {
        type: PackingListSchema,
        default: {}
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date
    }
});

// Middleware - Pre-save hook to set updated date
LoadSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Middleware - Pre-save hook to calculate totals
LoadSchema.pre('save', function(next) {
    // Calculate skid count and total weight
    this.skidCount = this.skids.length;
    this.totalWeight = this.skids.reduce((sum, skid) => sum + skid.weight, 0);
    next();
});

// Virtual for formatted date
LoadSchema.virtual('formattedDate').get(function() {
    return moment(this.dateEntered).format('YYYY-MM-DD HH:mm');
});

// Method to check if load is overweight
LoadSchema.methods.isOverweight = function() {
    if (!this.truckInfo || !this.truckInfo.weight) return false;

    const totalWeight = this.skids.reduce((sum, skid) => sum + skid.weight, 0);
    return totalWeight > this.truckInfo.weight;
};

// Method to check space utilization
LoadSchema.methods.spaceUtilization = function() {
    if (!this.truckInfo || !this.truckInfo.length || !this.truckInfo.width)
        return { totalArea: 0, truckArea: 0, percentage: 0 };

    const totalArea = this.skids.reduce((sum, skid) => sum + (skid.width * skid.length), 0);
    const truckArea = this.truckInfo.length * this.truckInfo.width;

    return {
        totalArea,
        truckArea,
        percentage: (totalArea / truckArea) * 100
    };
};

// Create text index for search
LoadSchema.index({ truckId: 'text' });

const Load = mongoose.model('Load', LoadSchema);
module.exports = Load;