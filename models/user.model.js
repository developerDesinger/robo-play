const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      default: "",
    },
     firstName: {
      type: String,
      default: "",
    },
     lastName: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phoneNo: {
      type: String,
      default: "",
    },
    password: {
      type: String,
      required: true,
    },
    resetToken: {
      type: String,
      default: "",
    },
    resetPasswordOtp:
    {
      type: String,
      default:""
    },
    resetPasswordStatus:{
      type:Boolean,
      default:false
    },
    otp: {
      type: String,
      default: null,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    country: {
      type: String,
      default: "",
    },
    state: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      default: "",
    },
    countryCode: {
      type: String,
      default: "",
    },
    stripeCustomerId: {
      type: String,
      default: "",
    },
    verified: {
      type: Boolean,
      default: false,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    credits: {
  type: Number,
  default: 0
},
isFreePlanExpired: {
  type: Boolean,
  default: false,
}
    
  },
  { timestamps: true }
);

userSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("user", userSchema);
