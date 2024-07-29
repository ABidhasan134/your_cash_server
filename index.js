const express = require("express");
const app= express();
require('dotenv').config()
const port= process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
const cors = require('cors')
const cookieParser = require('cookie-parser')

// middleware
app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: ["http://localhost:5173"], 
  credentials: true, 
}))

    // middleware to verify user
    const verifyToken=(req,res,next)=>{

    }

    const cookieOptions={
      httpOnly: true,
      secure: process.env.NODE_ENV === "production"?true:false,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    }

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.il352b3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

app.get('/',(req,res)=>{
    res.send("my money is in cash ")
})

const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  async function run() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
      await client.connect();
      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
      app.post('/jwt',async(req,res)=>{
        const user=req.body;
        // console.log("user get from here",user)
        const token=jwt.sign(user,process.env.ACCESS_TOKEN,{ expiresIn: '1h' })
        // res.cookie("token", token,cookieOptions).send({ success: 'true'});
        res.cookie('token',token,cookieOptions).send({ success: 'true'});
      })
  

    } finally {
      // Ensures that the client will close when you finish/error
      await client.close();
    }
  }
  run().catch(console.dir);




app.listen(port, ()=>{
    console.log(`my money is in cash ${port}`);
})