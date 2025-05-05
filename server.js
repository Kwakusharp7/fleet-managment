require('dotenv').config(); // Load environment variables
const app = require('./app');
const connectDB = require('./config/database');

// Connect to MongoDB
connectDB();

// Set port
const PORT = process.env.PORT || 3000;

console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

// Start server
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
});