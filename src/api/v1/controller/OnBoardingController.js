const catchAsyncHandler = require("../utils/catchAsyncHandler");
const OnBoardingService = require("../services/onboarding.service");

class OnBoardingController {
  static createUserOnBoarding = catchAsyncHandler(async (req, res) => {
    const result = await OnBoardingService.createUserOnBoarding(req.body);
    return res.status(201).json(result);
  });
  static updateUserOnBoarding = catchAsyncHandler(async (req, res) => {
    const result = await OnBoardingService.updateUserOnBoarding(req.body);
    return res.status(201).json(result);
  });
  static getUserOnBoarding = catchAsyncHandler(async (req, res) => {
    const { onboardingId } = req.params;
    const result = await OnBoardingService.getUserOnBoarding(onboardingId);
    return res.status(200).json(result);
  });
  static getAllUsers = catchAsyncHandler(async (req, res) => {
    const result = await OnBoardingService.getAllUsers();
    return res.status(200).json(result);
  });
}

module.exports = OnBoardingController;
