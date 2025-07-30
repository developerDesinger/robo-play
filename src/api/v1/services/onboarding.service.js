const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const OnBoarding = require("../model/OnBoarding");
const AppError = require("../utils/AppError");

class OnBoardingService {
  static async createUserOnBoarding(data) {
    try {
      const { ...onboardingData } = data;

      const onboardingPayload = {
        // userId,
        activeCard: 1,
        status: "In Progress",
        isCompleted: false,
        ...onboardingData,
      };

      const onboarding = new OnBoarding(onboardingPayload);
      const savedOnboarding = await onboarding.save();

      return {
        success: true,
        data: savedOnboarding,
        message: "Onboarding created successfully",
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error.name === "ValidationError") {
        const validationErrors = Object.values(error.errors).map(
          (err) => err.message
        );
        throw new AppError(
          `Validation failed: ${validationErrors.join(", ")}`,
          400
        );
      }

      throw new AppError("Failed to create onboarding", 500);
    }
  }

  static async updateUserOnBoarding(data) {
    console.log("Updating onboarding data:", data);
    try {
      const { id, onboardingData } = data;
      if (!id) {
        throw new AppError("User not found", 400);
      }
      const onboarding = await OnBoarding.findByIdAndUpdate(
        id,
        onboardingData,
        { new: true }
      );
      return {
        success: true,
        data: onboarding,
        message: "Onboarding updated successfully",
      };
    } catch (error) {
      throw new AppError("Failed to update onboarding", 500);
    }
  }

  static async getUserOnBoarding(userId) {
    try {
      if (!userId) {
        throw new AppError("User ID is required", 400);
      }

      const onboarding = await OnBoarding.findOne({ id: Object(userId) });
      if (!onboarding) {
        throw new AppError("Onboarding not found for this user", 404);
      }
      return {
        success: true,
        data: onboarding,
        message: "Onboarding retrieved successfully",
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Failed to retrieve onboarding", 500);
    }
  }

  static async getAllUsers() {
    try {
      const users = await OnBoarding.find();
      return {
        success: true,
        data: users.reverse() || [],
        message: "All users retrieved successfully",
      };
    } catch (error) {
      throw new AppError("Failed to retrieve users", 500);
    }
  }
}

module.exports = OnBoardingService;
