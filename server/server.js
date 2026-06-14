const express=require('express');
const dns = require('dns');
const cors=require('cors');
const connectDB=require('./src/config/db');
const dotenv=require('dotenv');
const chatRoutes = require("./src/routes/chat.routes");
const mapRoute = require("./src/routes/locationRoute")

dotenv.config();
const app=express();

app.use(express.json());

const PORT=process.env.PORT || 5000;
// Set custom DNS servers to resolve MongoDB SRV records
dns.setServers(['1.1.1.1', '8.8.8.8']);

const allowedOrigins = (process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173" || "https://3qn9cgkm-5173.inc1.devtunnels.ms/")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsOptions = {
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
};

app.get('/',(req,res)=>{
    res.send('Hello World');
});

connectDB();
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use("/api/v1/chat", chatRoutes);

app.use("/api/v1/location", mapRoute);

app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
});