import mongoose from "mongoose";

const CountryRiskSchema = new mongoose.Schema({
  country: { type: String, },
  RiskRating: { type: Number,  },
  Code: { type: String,   },
  iscode3digit: { type: String, },
  Override: { type: Number},
   createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin', // replace 'User' with your actual user model name
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
});

const CountryRisk = mongoose.model("CountryRisk", CountryRiskSchema);

export default CountryRisk;
