require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Project = require('../models/Project');
const Load = require('../models/Load');
const connectDB = require('../config/database');

// Sample data
const users = [
    {
        username: 'admin',
        password: 'admin123',
        role: 'Admin',
        status: 'Active'
    },
    {
        username: 'viewer',
        password: 'viewer123',
        role: 'Viewer',
        status: 'Active'
    }
];

const projects = [
    {
        code: '47290',
        name: 'We Wai Kai',
        status: 'Active',
        address: '123 Main St, Vancouver, BC',
        description: 'Native band housing development'
    },
    {
        code: '47402',
        name: '104Ave',
        status: 'Active',
        address: '456 104th Ave, Surrey, BC',
        description: 'Commercial building renovation'
    },
    {
        code: '45863',
        name: 'DeVille Tower',
        status: 'Active',
        address: '789 West St, Calgary, AB',
        description: 'High-rise residential tower'
    },
    {
        code: '47578',
        name: 'Place 800',
        status: 'Inactive',
        address: '800 Place Rd, Edmonton, AB',
        description: 'Completed office building'
    },
    {
        code: '47773',
        name: 'River Cree Hotel',
        status: 'Active',
        address: '321 River Rd, Enoch, AB',
        description: 'Hotel expansion project'
    }
];

const loads = [
    {
        truckId: 'TRUCK-ABC',
        projectCode: '47290',
        dateEntered: new Date('2023-10-27T10:30:00'),
        status: 'Loaded',
        truckInfo: {
            length: 53,
            width: 8.5,
            weight: 45000
        },
        skids: [
            { id: 'SKID-1', width: 4, length: 4, weight: 500, description: 'Pallet 1' },
            { id: 'SKID-2', width: 4, length: 4, weight: 600, description: '' },
            { id: 'SKID-3', width: 4, length: 4, weight: 550, description: 'Fragile' }
        ],
        packingList: {
            date: new Date('2023-10-27'),
            workOrder: 'WO-111',
            projectName: 'We Wai Kai',
            projectAddress: 'Site Address A',
            requestedBy: 'Client A',
            carrier: 'Fast Freight',
            consignee: 'Job Site A',
            consigneeAddress: 'Delivery Addr A',
            siteContact: 'Foreman Bill',
            sitePhone: '555-111-2222',
            deliveryDate: new Date('2023-10-28'),
            packagedBy: 'PK',
            checkedBy: 'LD',
            receivedBy: 'John D.',
            signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
        },
        skidCount: 3,
        totalWeight: 1650
    },
    {
        truckId: 'PLATE-123',
        projectCode: '47402',
        dateEntered: new Date('2023-10-27T09:15:00'),
        status: 'Planned',
        truckInfo: {
            length: 48,
            width: 8,
            weight: 40000
        },
        skids: [
            { id: 'SKID-4', width: 8, length: 6, weight: 1200, description: 'Heavy materials' }
        ],
        packingList: {
            date: new Date('2023-10-27'),
            workOrder: 'WO-112',
            projectName: '104Ave',
            projectAddress: '456 104th Ave, Surrey, BC',
            requestedBy: 'Client B',
            carrier: 'ABC Trucking'
        },
        skidCount: 1,
        totalWeight: 1200
    },
    {
        truckId: 'TRUCK-XYZ',
        projectCode: '45863',
        dateEntered: new Date('2023-10-26T14:00:00'),
        status: 'Delivered',
        truckInfo: {
            length: 53,
            width: 8.5,
            weight: 45000
        },
        skids: [
            { id: 'SKID-5', width: 4, length: 4, weight: 800, description: 'Glass panels' },
            { id: 'SKID-6', width: 4, length: 4, weight: 750, description: 'Frames' },
            { id: 'SKID-7', width: 4, length: 4, weight: 600, description: 'Hardware' }
        ],
        packingList: {
            date: new Date('2023-10-26'),
            workOrder: 'WO-113',
            projectName: 'DeVille Tower',
            projectAddress: '789 West St, Calgary, AB',
            requestedBy: 'Client C',
            carrier: 'FastFreight',
            consignee: 'DeVille Construction',
            consigneeAddress: '789 West St, Calgary, AB',
            siteContact: 'Site Manager',
            sitePhone: '555-333-4444',
            deliveryDate: new Date('2023-10-27'),
            packagedBy: 'JD',
            checkedBy: 'TS',
            receivedBy: 'Bob Smith',
            signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
        },
        skidCount: 3,
        totalWeight: 2150
    }
];

// Function to delete existing data and seed new data
const seedData = async () => {
    try {
        // Connect to database
        await connectDB();

        // Delete existing data
        await User.deleteMany({});
        await Project.deleteMany({});
        await Load.deleteMany({});

        console.log('Existing data deleted');

        // Create admin user first
        const adminUser = await User.create(users[0]);
        console.log('Admin user created');

        // Create viewer user
        await User.create(users[1]);
        console.log('Viewer user created');

        // Create projects
        for (let project of projects) {
            project.createdBy = adminUser._id;
            await Project.create(project);
        }
        console.log('Projects created');

        // Create loads
        for (let load of loads) {
            load.createdBy = adminUser._id;
            await Load.create(load);
        }
        console.log('Loads created');

        console.log('Data seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

// Run the seeder
seedData();