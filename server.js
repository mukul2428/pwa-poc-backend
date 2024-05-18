const express = require("express");
require("dotenv").config();
const bodyParser = require("body-parser");
const PushNotifications = require("node-pushnotifications");
const Policy = require("./utilities/models/policyModel");
const connect = require("./utilities/dbconfig");

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

const port = 4000;

app.listen(port, () => console.log(`Server started on port ${port}`));
