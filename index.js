const express = require("express");
const app = express(); // app would be undefined if express was not imported properly.
require("dotenv").config();
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion } = require("mongodb");
const bcrypt = require("bcrypt"); // Add bcrypt for password hashing
const { uuid } = require("uuidv4");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.il352b3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.options("*", cors());

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" ? true : false,
  maxAge: 3600000,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  expires: new Date(Date.now() + 1 * 3600000), // 1 hours
};

// midelwire
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.your_cash;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

// Connect to MongoDB and set up routes
async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    const database = client.db("MobileFinancialService(MFS)");
    const userCollation = database.collection("users");

    // Update the '/jwt' route to properly return the token.
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      return res.cookie("your_cash", token, cookieOptions).send({ token });
    });

    app.post("/createUser", async (req, res) => {
      const userInfo = req.body;
      console.log(userInfo);
      const query = { email: userInfo.email };
      const result = await userCollation.findOne(query);
      console.log(result);
      if (result === null) {
        userInfo.password = await bcrypt.hash(userInfo.password, 10); // Hash the password
        const insertResult = await userCollation.insertOne(userInfo);
        const token = jwt.sign(
          { id: insertResult._id, email: insertResult.email },
          process.env.ACCESS_TOKEN,
          { expiresIn: "1h" }
        );
        return res
          .status(201)
          .cookie("token", token, cookieOptions)
          .send(insertResult);
      }
      return res.status(400).send("User already exists");
    });

    // Modify the '/login' route to include JWT token in the response.
    app.post("/login", async (req, res) => {
      const { email, password } = req.body;
      // console.log(req.body);
      const query = { $or: [{ email }, { phoneNumber: email }] };
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

    app.get("/users/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      // console.log("hit it")
      const query = { email: email };
      const result = await userCollation.findOne(query);
      res.send(result);
      // console.log('The result to user',result)
    });

    app.patch("/sendMoney", async (req, res) => {
      const info = req.body;
      const query1 = { phoneNumber: info.sendernumber };
      const query2 = { phoneNumber: info.phone };
      // console.log("sender",query1,"Reciver",query2);
      const password = info.password;
      const senderResult = await userCollation.findOne(query1);
      console.log(senderResult?.history);
      const reciverResult = await userCollation.findOne(query2);
      // console.log("sender info",senderResult)
      if (!reciverResult) {
        res.send({ error: "NotFound" });
        return;
      }
      if (info.sendernumber === info.phone) {
        res.send({ error: "enter a valid number" });
        return;
      }
      if (senderResult.amount < info.amount) {
        res.send({ error: "NotHaveEnoughMoney" }).status(403);
        return;
      }
      // comearing
      const isPasswordValid = await bcrypt.compare(
        password,
        senderResult.password
      );
      // console.log(isPasswordValid)
      // console.log(senderResult.password);
      if (!isPasswordValid) {
        // console.log("Fill the condition ",senderResult);
        // console.log(date.toISOString().split('T')[0] , date.toISOString().split('T')[1].split(".")[0]);
        res.send({ error: "InvalidPassword" }).status(403);
        return;
      }
      // console.log(reciverResult);
      if (reciverResult.status !== "ok" || senderResult.status !== "ok") {
        res.send({ error: "NotAvalidUser" }).status(403);
        return;
      }
      if (info.amount < 10) {
        res.send({ error: "balance" }).status(403);
        return;
      }
      // console.log(parseInt(info.amount)+parseInt(reciverResult.amount));
      // reciver doc update

      // patch request
      // resiver history update
      const date = new Date();
      // date.toISOString().split('T')[0];
      const sendDate = date.toISOString().split("T")[0];
      const sendTime = date.toISOString().split("T")[1].split(".")[0];
      const sendAmout = info.amount;
      const sendPhoneNumber = info.sendernumber;
      const senderhistory = {
        history_amount: sendAmout,
        history_time: sendTime,
        history_date: sendDate,
        history_phone: sendPhoneNumber,
        trangistion_id: uuid(),
      };
      const updateSenderHistory = [...reciverResult.history, senderhistory];
      // update sender history
      const resiverPhone = info.phone;
      const resiverHistory = {
        history_amount: sendAmout,
        history_time: sendTime,
        history_date: sendDate,
        history_phone: resiverPhone,
        trangistion_id: uuid(),
      };
      let updateReceverHistory =
        senderResult.history && Array.isArray(senderResult.history)
          ? [...senderResult.history, resiverHistory]
          : [resiverHistory];
      const options = { upsert: true };
      if (updateSenderHistory.length > 5) {
        updateSenderHistory.shift();
      }
      if (updateReceverHistory.length > 5) {
        updateReceverHistory.shift();
      }
      const reciverUpdateDoc = {
        $set: {
          amount: parseInt(info.amount) + parseInt(reciverResult.amount),
          history: updateSenderHistory,
        },
      };

      // sender doc update
      // const option ={upsert: true}
      const senderUpdateResultDoc = {
        $set: {
          amount: parseInt(senderResult.amount) - parseInt(info.amount),
          history: updateReceverHistory, // Update the sender's history with the new array
        },
      };
      const reciverUpdateResult = await userCollation.updateOne(
        reciverResult,
        reciverUpdateDoc,
        options
      );
      const senderUpdateResult = await userCollation.updateOne(
        senderResult,
        senderUpdateResultDoc,
        options
      );
      res.send(reciverUpdateResult);
      // console.log(senderUpdateResult);
      // console.log("sender Result is here",senderResult);
    });

    app.get("/", (req, res) => {
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
