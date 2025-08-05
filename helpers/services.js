const nodemailer = require("nodemailer")
const dotenv = require("dotenv")
const UserSubscription = require("../models/userSubscriptionModel")
const User = require("../models/user.model") // adjust the path accordingly

dotenv.config()

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_EMAIL,
    pass: process.env.BREVO_PASS
  }
})

const methods = {
  sendResetPasswordMail: async (email, token, res) => {
    try {
      const info = await transporter.sendMail({
        from: process.env.BREVO_SENDER,
        to: email,
        subject: "Reset your Password",
        text: "Reset your forgotten Password",
        html: `<p>Dear User,<br><br>
        We received a request to reset your password. Your OTP is:${token}<br><br>
        If you did not request a password reset, please ignore this email.<br><br>
        Thank you,<br>
        The Team</p>`
      })
      console.log("Reset Password Email sent", info.messageId)
    } catch (error) {
      console.error("Failed to send email:", error)
    }
  },
  sendVerificationMail: async (email, otp) => {
    try {
      const info = await transporter.sendMail({
        from: process.env.BREVO_SENDER,
        to: email,
        subject: "Verify Your Account",
        text: `Your OTP code is ${otp}`,
        html: `<p>Dear User,<br><br>
               Your OTP code for verifying your account is: <strong>${otp}</strong><br><br>
               If you did not request this, please ignore this email.<br><br>
               Thank you,<br>The Team</p>`
      })
      console.log("Verification Email sent:", info.messageId)
    } catch (error) {
      console.error("Failed to send email:", error)
    }
  },

  // checkUserCredits : async (userId, creditsRequired) => {
  // const userSub = await UserSubscription.findOne({ userId, isActive: true });

  // if (!userSub) {
  //   throw new Error("No active subscription found.");
  // }

  // const { planSnapshot, usage } = userSub;

  // const remainingCredits = Math.max(0, planSnapshot.monthlyCredits - usage.monthlyCreditsUsed);

  // if (remainingCredits < creditsRequired) {
  //   throw new Error(`You need at least ${creditsRequired} credits to perform this action.`);
  // }

  // return true;
  // },

  //  deductUserCredits: async (userId, credits) => {
  // const userSub = await UserSubscription.findOne({ userId, isActive: true });

  // if (!userSub) {
  //   throw new Error("No active subscription found.");
  // }

  // userSub.usage.monthlyCreditsUsed += credits;

  // await userSub.save();

  // return true;
  // },

  checkUserCredits: async (userId, creditsRequired) => {
    const userSub = await UserSubscription.findOne({ userId, isActive: true })

    if (!userSub) {
      throw new Error("No active subscription found.")
    }

    const { planSnapshot, usage } = userSub
    const remainingCredits = Math.max(
      0,
      planSnapshot.monthlyCredits - usage.monthlyCreditsUsed
    )

    if (
      planSnapshot.identifier === "free_plan" &&
      usage.monthlyCreditsUsed >= 60
    ) {
      await User.findByIdAndUpdate(userId, { isFreePlanExpired: true })
      throw new Error("Free plan expired. Please upgrade your plan.")
    }

    if (remainingCredits < creditsRequired) {
      throw new Error(
        `You need at least ${creditsRequired} credits to perform this action.`
      )
    }

    return true
  },

  deductUserCredits: async (userId, credits) => {
    const CreditsValues = {
      AutoApply: 6,
      TailoredResume: 13,
      AICoverLetter: 7,
      ResumeBuilder: 9,
      ResumeScore: 8,
      InterviewBuddy: 15
    }

    const userSub = await UserSubscription.findOne({ userId, isActive: true })

    if (!userSub) {
      throw new Error("No active subscription found.")
    }

    userSub.usage.monthlyCreditsUsed += credits
    if (credits === CreditsValues.AutoApply) {
      userSub.usage.autoAppliesUsed += 1
    }

    const isFreePlan = userSub.planSnapshot.identifier === "free_plan"
    const updatedCredits = userSub.usage.monthlyCreditsUsed

    if (isFreePlan && updatedCredits >= 60) {
      await User.findByIdAndUpdate(userId, { isFreePlanExpired: true })
    }

    await userSub.save()
    return true
  },

  checkUserResumeProfiles: async (userId) => {
    const userSub = await UserSubscription.findOne({ userId, isActive: true })
    if (!userSub) throw new Error("No active subscription found.")

    const remainingProfiles = Math.max(
      0,
      userSub.planSnapshot.resumeProfiles - userSub.usage.resumeProfilesUsed
    )

    if (remainingProfiles <= 0) {
      throw new Error("You have used all your resume profile slots.")
    }

    return true
  },

  deductUserResumeProfile: async (userId) => {
    const userSub = await UserSubscription.findOne({ userId, isActive: true })
    if (!userSub) throw new Error("No active subscription found.")

    userSub.usage.resumeProfilesUsed += 1
    await userSub.save()
    return true
  }
}

module.exports = methods
