const express = require("express");
const OnBoardingController = require("../controller/OnBoardingController");
const {
  isAuthenticated,
  restrictTo,
} = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/getAllUsers", OnBoardingController.getAllUsers);
router.post("/", OnBoardingController.createUserOnBoarding);
router.patch("/", OnBoardingController.updateUserOnBoarding);
router.get("/:onboardingId", OnBoardingController.getUserOnBoarding);

module.exports = router;
