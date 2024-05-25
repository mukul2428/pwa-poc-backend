const express = require("express");
require("dotenv").config();
const bodyParser = require("body-parser");
const PushNotifications = require("node-pushnotifications");
const Policy = require("./utilities/models/policyModel");
const connect = require("./utilities/dbconfig");
const User = require("./utilities/models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();

app.use(bodyParser.json());
app.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  // Request headers you wish to allow
  res.setHeader("Access-Control-Allow-Headers", "*");

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", true);

  // Pass to next layer of middleware
  next();
});

app.post("/subscribe", async (req, res) => {
  try {
    const subscription = req.body.subscriptionData;
    const payload = req.body.message;

    const settings = {
      web: {
        vapidDetails: {
          subject: process.env.SUBJECT,
          publicKey: process.env.VAPID_PUBLIC_KEY,
          privateKey: process.env.VAPID_PRIVATE_KEY,
        },
        gcmAPIKey: "gcmkey",
        TTL: 2419200,
        contentEncoding: "aes128gcm",
        headers: {},
      },
      isAlwaysUseFCM: false,
    };

    const push = new PushNotifications(settings);

    await push.send(subscription, payload);

    return res.status(201).json({ message: "Subscription successful" });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ message: "Error in subscription", error: err.message });
  }
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
    user = new User({ email, password: hashedPassword });
    const result = await user.save();

    // Create a JWT token
    const payload = { userId: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Respond with the user data and token
    return res.status(201).json({
      message: "User created successfully",
      data: {
        user: {
          password: result.password,
          email: result.email,
        },
        token,
      },
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
      console.log("User not found");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare the provided password with the stored hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("Password mismatch");
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
      data: {
        user: {
          password: user.password,
          email: user.email,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Server error" });
  }
});

const port = 4000;

app.listen(port, () => console.log(`Server started on port ${port}`));
