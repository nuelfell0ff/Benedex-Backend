import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  platformName: {
    type: String,
    default: "Benedex Digital Hub"
  },

  maintenanceMode: {
    type: Boolean,
    default: false
  },

  logo: {
    type: String,
    default: ""
  },

  contact: {
    email: {
      type: String,
      default: ""
    },
    phone: {
      type: String,
      default: ""
    },
    address: {
      type: String,
      default: ""
    }
  },

  socialLinks: {
    type: Map,
    of: String,
    default: {}
  },

  homepage: {
    type: Object,
    default: {}
  },

  paymentSettings: {
    type: Object,
    default: {}
  }
}, { timestamps: true });

const Settings = mongoose.model("Settings", settingsSchema);

export default Settings;
