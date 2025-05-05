const mongoose = require('mongoose');
const config = require('./config');

// Add this to your database.js file
const connectDB = async () => {
    try {
        // Check if MongoDB URI is defined
        const mongoURI = process.env.MONGO_URI || config.db.uri;

        if (!mongoURI) {
            console.error('MongoDB URI is not defined. Please set MONGO_URI in your environment variables or config file.');
            return null;
        }

        // Connect to MongoDB with updated options
        const conn = await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000, // Reduce timeout for serverless environment
            connectTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            // Don't use poolSize option - it's deprecated
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        // Don't exit process in serverless environment
        return null;
    }
};
 

module.exports = connectDB;