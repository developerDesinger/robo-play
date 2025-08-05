const express = require("express");
const router = express.Router();
const onboardingController = require("../controllers/onboarding.controller");
const authPolicy = require("../utils/auth.policy");

// Get onboarding data for the authenticated user
router.get("/", authPolicy, onboardingController.getOnboarding);

// Update onboarding data
router.patch("/", authPolicy, onboardingController.updateOnboarding);

// Mark onboarding as completed
router.post("/complete", authPolicy, onboardingController.completeOnboarding);

// Skip onboarding
router.post("/skip", authPolicy, onboardingController.skipOnboarding);

// Delete onboarding (admin only)
router.delete("/:userId", authPolicy, onboardingController.deleteOnboarding);

// Get all onboardings (admin only)
router.get("/all", authPolicy, onboardingController.getAllOnboardings);

// Get onboarding statistics (admin only)
router.get("/stats", authPolicy, onboardingController.getOnboardingStats);

// Reset onboarding for a user (admin only)
router.post("/reset", authPolicy, onboardingController.resetOnboarding);

module.exports = router; 