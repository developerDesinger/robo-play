const express = require("express");
const router = express.Router();

// const router = require("express").Router();
const userRoutes = require("./user.route");
const resumeManagementRoutes = require("./resumeManagement.route");
const resuneRoutes = require("./resume.route");

const profileManagementRoutes = require("./profileManagemet.route");
const feedbackRoutes = require("./feedback.route");
const searchHistoryRoutes = require("./searchHistory.route");
const jobsActivityRoutes = require("./jobsActivity.route");
const resumeBuilderRoutes = require("./resumeBuilder.route");
const planRoutes = require("./plan.route");
const subscriptionRoutes = require("./subscription.route");
const userJobSearchHistoryRoutes = require("./userJobSearchHistory.route");
const stripeRoutes = require("./stripe.route");
const coverLetterRoutes = require("./coverLetter.route");
const tailoredResumeRoutes = require("./tailoredResume.route");
const onboardingRoutes = require("./onboarding.routes");
const subscriptionController= require("../controllers/subscription.controller")
const jobPrepRoutes = require("./jobPrep.route");
  
const aiResumeTailorRoutes = require("./aiResumeTailor.route");

// Stripe webhook must use raw body parser
// router.post(
//   "/handleWebhook",
//   express.raw({ type: "application/json" }),
//   subscriptionController.handleWebhook
// );

router.use("/user", userRoutes);
router.use("/resume", resumeManagementRoutes);
router.use("/resumeBuilder", resuneRoutes);

router.use("/profile", profileManagementRoutes);
router.use("/feedback", feedbackRoutes);
router.use("/search", searchHistoryRoutes);
router.use("/jobs-activity", jobsActivityRoutes);
router.use("/resume-builder", resumeBuilderRoutes);
router.use("/plan", planRoutes);
router.use("/subscription", subscriptionRoutes);
router.use("/searchHistory", userJobSearchHistoryRoutes);
router.use("/stripe", stripeRoutes);
router.use("/coverLetter", coverLetterRoutes);
router.use("/tailoredResume", tailoredResumeRoutes);
router.use("/onboarding", onboardingRoutes);
router.use("/jobPrep", jobPrepRoutes);

router.use("/ai-resume-tailor", aiResumeTailorRoutes);

module.exports = router;
