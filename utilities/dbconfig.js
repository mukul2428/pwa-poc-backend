const mongoose = require('mongoose');
require("dotenv").config();

async function connect() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const connection = await mongoose.connection;
    connection.on("connection", () => {
      console.log("MongoDB connected Successfully!");
    });
    connection.on("error", (err) => {
      console.log("MongoDB connection Error" + err);
      process.exit();
    });
  } catch (err) {
    console.log("Something went wrong");
    console.log(err);
  }
}

module.exports = connect;
