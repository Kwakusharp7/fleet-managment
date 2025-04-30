const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
    try {
        // Check if MongoDB URI is defined
        const mongoURI = process.env.MONGO_URI || config.db.uri;

        if (!mongoURI) {
            console.error('MongoDB URI is not defined. Please set MONGO_URI in your environment variables or config file.');
            process.exit(1);
        }

        // Connect to MongoDB
        const conn = await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;