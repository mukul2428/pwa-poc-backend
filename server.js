const express = require("express");
require("dotenv").config();
const bodyParser = require("body-parser");
const webPush = require("web-push");
const Policy = require("./utilities/models/policyModel");
const connect = require("./utilities/dbconfig");
const User = require("./utilities/models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const admin = require('firebase-admin');

const app = express();

// Use the cors middleware with specific configuration
app.use(cors({
  origin: 'https://react-pwa-poc-eight.vercel.app',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, // If you need to include credentials
  optionsSuccessStatus: 204
}));

app.use(bodyParser.json());

const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Set VAPID details
webPush.setVapidDetails(process.env.SUBJECT, publicVapidKey, privateVapidKey);

app.post("/subscribe", async (req, res) => {
  try {
    const subscription = req.body.subscriptionData;
    const payload = JSON.stringify(req.body.message);

    // Send notification
    await webPush.sendNotification(subscription, payload);

    return res.status(201).json({ message: "Subscription successful" });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ message: "Error in subscription", error: err.message });
  }
});

app.post("/send-notification", (req, res) => {
  const { title, body, token } = req.body;

  const message = {
    notification: {
      title: title,
      body: body,
    },
    token: token,
  };

  admin
    .messaging()
    .send(message)
    .then((response) => {
      res.status(200).send("Notification sent successfully: " + response);
    })
    .catch((error) => {
      res.status(500).send("Error sending notification: " + error);
    });
});

connect();
app.post("/create-policy", async (req, res) => {
  const {
    policyHolderName,
    policyType,
    coverageAmount,
    premiumAmount,
    policyDuration,
  } = req.body;

  try {
    // Check if a policy with the same policyHolderName already exists
    const existingPolicy = await Policy.findOne({ policyHolderName });
    if (existingPolicy) {
      return res.status(400).json({
        message: "Policy with this policy holder name already exists",
      });
    }

    // Create new policy if it doesn't exist
    const newPolicy = new Policy({
      policyHolderName,
      policyType,
      coverageAmount,
      premiumAmount,
      policyDuration,
    });

    const savedPolicy = await newPolicy.save();
    return res.status(201).json({
      message: "Policy created successfully",
      policy: savedPolicy,
    });
  } catch (err) {
    return res.status(400).json({
      message: "Error creating policy",
      error: err.message,
    });
  }
});

app.get("/get-policies", async (req, res) => {
  try {
    const policies = await Policy.find();
    return res.status(200).json(policies);
  } catch (err) {
    return res.status(500).json({
      message: "Error fetching policies",
      error: err.message,
    });
  }
});

app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password before saving
    const salt = await bcrypt.genSaltSync(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user
    const newUser = new User({ email, password: hashedPassword });
    const result = await newUser.save();

    // Create a JWT token
    const payload = { userId: result._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Respond with the user data and token
    return res.status(201).json({
      message: "User created successfully",
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare the provided password with the stored hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Create JWT payload
    const payload = { userId: user._id };

    // Sign the token with the secret from environment variables
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    return res.status(200).json({
      message: "User LoggedIn successfully",
      token,
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Server error" });
  }
});

const port = 4000;

app.listen(port, () => console.log(`Server started on port ${port}`));
