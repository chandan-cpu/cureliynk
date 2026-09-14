const mongoose = require('mongoose');

const connectDB = async () => {
    const URI = process.env.MONGO_URL;

    try {
        const conn = await mongoose.connect(URI);

        // The host only. The full URI carries the username and password in it,
        // and printing it put the database credentials into stdout — which on
        // a hosted deploy means the log viewer, and whoever can read it.
        console.log(`MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
