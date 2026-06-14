const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const URI=process.env.MONGO_URL;
console.log(`Connecting to MongoDB at: ${URI}`);

const connectDB = async () => {
    try{
        const conn = await mongoose.connect(URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
}

module.exports = connectDB;