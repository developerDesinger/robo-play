const mongoose = require("mongoose");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    profilePhoto: {
      type: String,
    },
    name: {
      type: String,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Please provide your email."],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email."],
    },
    password: {
      type: String,
      required: [true, "Please provide a password."],
      minlength: 6,
      select: false,
    },
    phoneNumber: {
      type: String,
      trim: true,
      // validate: {
      //   message: "Phone number must be valid.",
      //   // validator: function (val) {
      //   //   return validator.isMobilePhone(val, "any");
      //   // },
      // },
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    cnic: {
      type: String,
      trim: true,
      required: function () {
        return this.role === "Vendor"; // CNIC required for Vendors
      },
    },
    cnicFrontImage: {
      type: String, // URL for CNIC front image
      required: function () {
        return this.role === "Vendor";
      },
    },
    cnicBackImage: {
      type: String, // URL for CNIC back image
      required: function () {
        return this.role === "Vendor";
      },
    },
    jobTitle: {
      type: String,
      trim: true,
    },
    duration: {
      type: String,
      trim: true,
    },
    employer: {
      type: String,
      trim: true,
    },

    // Vendor-Specific Fields
    companyName: {
      type: String,
      trim: true,
      minlength: 2,
      maxlength: 100,
      required: function () {
        return this.role === "Vendor";
      },
    },
    businessEmail: {
      type: String,
      trim: true,
      unique: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid business email.",
      ],
      required: function () {
        return this.role === "Vendor";
      },
    },
    businessAddress: {
      type: String,
      trim: true,
      required: function () {
        return this.role === "Vendor";
      },
    },
    businessType: {
      type: String,
      //enum: ["Retail", "Manufacturing", "Services", "Others"],
      required: function () {
        return this.role === "Vendor";
      },
    },
    typesOfProducts: {
      type: String,
      trim: true,
      required: function () {
        return this.role === "Vendor";
      },
    },
    taxRegistrationNumber: {
      type: String,
      unique: true,
      trim: true,
      required: function () {
        return this.role === "Vendor";
      },
    },
    businessLicense: {
      type: String, // URL to business license
      required: function () {
        return this.role === "Vendor";
      },
    },

    // User Roles & Status
    role: {
      type: String,
      enum: ["Admin", "Vendor", "Client"],
      default: "Client",
      required: true,
    },
    vendorStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
      required: function () {
        return this.role === "Vendor";
      },
    },
    clientStatus: {
      type: String,
      enum: ["Pending", "Approved"],
      default: "Pending",
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    // OTP for verification
    otp: {
      type: String,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
