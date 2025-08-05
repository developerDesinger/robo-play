const express = require("express");
const router = express.Router();
const onboardingController = require("../controllers/onboarding.controller");
const authPolicy = require("../utils/auth.policy");

// Get onboarding data for the authenticated user
router.get("/",  onboardingController.getOnboarding);

// Create new onboarding data
router.post("/", onboardingController.createOnboarding);

// Update onboarding data
router.patch("/",  onboardingController.updateOnboarding);

// Mark onboarding as completed
router.post("/complete", onboardingController.completeOnboarding);

// Skip onboarding
router.post("/skip", onboardingController.skipOnboarding);

// Delete onboarding (admin only)
router.delete("/:id",  onboardingController.deleteOnboarding);

// Get all onboardings (admin only)
router.get("/all",  onboardingController.getAllOnboardings);

// Get onboarding statistics (admin only)
router.get("/stats", authPolicy, onboardingController.getOnboardingStats);

// Reset onboarding for a user (admin only)
router.post("/reset", onboardingController.resetOnboarding);

module.exports = router; 