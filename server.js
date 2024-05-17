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

app.post("/subscribe", (req, res) => {
  // Get pushSubscription object
  const subscription = req.body.subscriptionData;
  console.log(subscription);
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

  // Send 201 - resource created
  const push = new PushNotifications(settings);

  // Create payload
  const payload = req.body.message;

  console.log(payload);
  push.send(subscription, payload, (err, result) => {
    if (err) {
      console.log(err);
    } else {
      console.log(result);
    }
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
    const newPolicy = new Policy({
      policyHolderName,
      policyType,
      coverageAmount,
      premiumAmount,
      policyDuration,
    });

    const savedPolicy = await newPolicy.save();
    res.status(201).json({
      message: "Policy created successfully",
      policy: savedPolicy,
    });
  } catch (err) {
    res.status(400).json({
      message: "Error creating policy",
      error: err.message,
    });
  }
});

app.get("/get-policies", async (req, res) => {
  try {
    const policies = await Policy.find();
    const result = res.status(200).json(policies);
    console.log(result);
  } catch (err) {
    res.status(500).json({
      message: "Error fetching policies",
      error: err.message
    });
  }
});

const port = 4000;

app.listen(port, () => console.log(`Server started on port ${port}`));
