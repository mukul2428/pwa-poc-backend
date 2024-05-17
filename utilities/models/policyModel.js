const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const policySchema = new Schema(
  {
    policyHolderName: String,
    policyType: String,
    coverageAmount: String,
    premiumAmount: String,
    policyDuration: String,
  },
  { timestamps: true }
);

const Policy = model("Policy", policySchema);

module.exports = Policy;