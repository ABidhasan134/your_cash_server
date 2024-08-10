const express = require("express");
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion } = require('mongodb');
const bcrypt = require('bcrypt'); // Add bcrypt for password hashing

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

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

// Connect to MongoDB and set up routes
async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    const database = client.db('MobileFinancialService(MFS)');
    const userCollation = database.collection('users');

    app.post('/createUser', async (req, res) => {
      const userInfo = req.body;
      console.log(userInfo)
      const query = { email: userInfo.email};
      const result = await userCollation.findOne(query);
      console.log(result)
      if (result===null) {
        userInfo.password = await bcrypt.hash(userInfo.password, 10); // Hash the password
        const insertResult = await userCollation.insertOne(userInfo);
        const token = jwt.sign({ id: insertResult._id, email: insertResult.email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
        return res.status(201).cookie('token', token, cookieOptions).send(insertResult);
      }
      return res.status(400).send("User already exists");
    });

    // Modify the '/login' route to include JWT token in the response.
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const query = { $or: [{ email }, { phone: email }] };
  const user = await userCollation.findOne(query);
  if (!user) {
    return res.status(404).send("User not found");
  }
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(403).send("Invalid credentials");
  }
  
  res.send(user);
});

// Update the '/jwt' route to properly return the token.
app.get('/jwt', async (req, res) => {
  const user = req.body;
  console.log("user is here",user)
  // const token =jwt.sign({user}) 

  }
);

    app.get('/', (req, res) => {
      res.send("my money is in cash ");
    });

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
