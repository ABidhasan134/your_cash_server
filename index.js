const express = require("express");
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.il352b3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));

// Middleware to verify user
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(403).send("A token is required for authentication");
  }
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = decoded;
  } catch (err) {
    return res.status(401).send("Invalid Token");
  }
  return next();
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB!");

    const database = client.db('MobileFinancialService(MFS)');
    const userCollation = database.collection('users');

    // Routes
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.cookie('token', token, cookieOptions).send({ success: 'true' });
    });

    app.post('/createUser', async (req, res) => {
      const userInfo = req.body;
      const query = { $or: [{ email: userInfo.email }, { phone: userInfo.phone }] };
      const result = await userCollation.findOne(query);
      if (result) {
        console.log("this is the result you get",result);
        return res.status(400).send("User already exists");
      }
      const insertResult = await userCollation.insertOne(userInfo);
      res.status(201).send(insertResult);
    });

    app.get('/', (req, res) => {
      res.send("my money is in cash ");
    });

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

// Start the server and MongoDB connection
run();

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
