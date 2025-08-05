const OnBoarding = require("../models/onboarding.model");

let methods = {
  // Get onboarding data for the authenticated user
  getOnboarding: async (req, res) => {
    try {
      const userId = req.token._id;

      const onboarding = await OnBoarding.findOne({ userId });

      if (!onboarding) {
        return res.status(404).json({
          msg: "Onboarding data not found",
          success: false
        });
      }

      return res.status(200).json({
        onboarding,
        success: true
      });
    } catch (error) {
      console.error("Error fetching onboarding:", error);
      return res.status(500).json({
        msg: "Failed to fetch onboarding data",
        error: error.message || "Something went wrong.",
        success: false
      });
    }
  },

  // Update onboarding data
  updateOnboarding: async (req, res) => {
    try {
      const userId = req.token._id;
      const updateData = req.body;

      // Remove any fields that shouldn't be updated directly
      delete updateData.userId;
      delete updateData._id;
      delete updateData.createdAt;
      delete updateData.updatedAt;

      // If onboarding is being completed, set completion timestamp
      if (updateData.isCompleted && updateData.isCompleted === true) {
        updateData.completedAt = new Date();
        updateData.status = "Completed";
      }

      const onboarding = await OnBoarding.findOneAndUpdate(
        { userId },
        updateData,
        { new: true, runValidators: true }
      );

      if (!onboarding) {
        return res.status(404).json({
          msg: "Onboarding data not found",
          success: false
        });
      }

      return res.status(200).json({
        onboarding,
        msg: "Onboarding updated successfully",
        success: true
      });
    } catch (error) {
      console.error("Error updating onboarding:", error);
      return res.status(500).json({
        msg: "Failed to update onboarding",
        error: error.message || "Something went wrong.",
        success: false
      });
    }
  },

  // Mark onboarding as completed
  completeOnboarding: async (req, res) => {
    try {
      const userId = req.token._id;

      const onboarding = await OnBoarding.findOneAndUpdate(
        { userId },
        {
          isCompleted: true,
          completedAt: new Date(),
          status: "Completed"
        },
        { new: true, runValidators: true }
      );

      if (!onboarding) {
        return res.status(404).json({
          msg: "Onboarding data not found",
          success: false
        });
      }

      return res.status(200).json({
        onboarding,
        msg: "Onboarding completed successfully",
        success: true
      });
    } catch (error) {
      console.error("Error completing onboarding:", error);
      return res.status(500).json({
        msg: "Failed to complete onboarding",
        error: error.message || "Something went wrong.",
        success: false
      });
    }
  },

  // Skip onboarding
  skipOnboarding: async (req, res) => {
    try {
      const userId = req.token._id;

      const onboarding = await OnBoarding.findOneAndUpdate(
        { userId },
        {
          skipped: true,
          isCompleted: true,
          completedAt: new Date(),
          status: "Abandoned"
        },
        { new: true, runValidators: true }
      );

      if (!onboarding) {
        return res.status(404).json({
          msg: "Onboarding data not found",
          success: false
        });
      }

      return res.status(200).json({
        onboarding,
        msg: "Onboarding skipped successfully",
        success: true
      });
    } catch (error) {
      console.error("Error skipping onboarding:", error);
      return res.status(500).json({
        msg: "Failed to skip onboarding",
        error: error.message || "Something went wrong.",
        success: false
      });
    }
  },

  // Delete onboarding (admin only)
  deleteOnboarding: async (req, res) => {
    try {
      const { userId } = req.params;

      // Check if user is admin (you may need to adjust this based on your auth system)
      if (!req.token.isAdmin) {
        return res.status(403).json({
          msg: "Access denied. Admin privileges required.",
          success: false
        });
      }

      const onboarding = await OnBoarding.findOneAndDelete({ userId });

      if (!onboarding) {
        return res.status(404).json({
          msg: "Onboarding data not found",
          success: false
        });
      }

      return res.status(200).json({
        msg: "Onboarding deleted successfully",
        success: true
      });
    } catch (error) {
      console.error("Error deleting onboarding:", error);
      return res.status(500).json({
        msg: "Failed to delete onboarding",
        error: error.message || "Something went wrong.",
        success: false
      });
    }
  },

  // Get all onboardings (admin only)
  getAllOnboardings: async (req, res) => {
    try {
      // Check if user is admin
      if (!req.token.isAdmin) {
        return res.status(403).json({
          msg: "Access denied. Admin privileges required.",
          success: false
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const onboardings = await OnBoarding.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await OnBoarding.countDocuments();

      return res.status(200).json({
        onboardings,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        },
        success: true
      });
    } catch (error) {
      console.error("Error fetching all onboardings:", error);
      return res.status(500).json({
        msg: "Failed to fetch onboardings",
        error: error.message || "Something went wrong.",
        success: false
      });
    }
  },

  // Get onboarding statistics (admin only)
  getOnboardingStats: async (req, res) => {
    try {
      // Check if user is admin
      if (!req.token.isAdmin) {
        return res.status(403).json({
          msg: "Access denied. Admin privileges required.",
          success: false
        });
      }

      const stats = await OnBoarding.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]);

      const totalOnboardings = await OnBoarding.countDocuments();
      const completedOnboardings = await OnBoarding.countDocuments({ isCompleted: true });
      const skippedOnboardings = await OnBoarding.countDocuments({ skipped: true });

      return res.status(200).json({
        stats: {
          total: totalOnboardings,
          completed: completedOnboardings,
          skipped: skippedOnboardings,
          inProgress: totalOnboardings - completedOnboardings,
          statusBreakdown: stats
        },
        success: true
      });
    } catch (error) {
      console.error("Error fetching onboarding stats:", error);
      return res.status(500).json({
        msg: "Failed to fetch onboarding statistics",
        error: error.message || "Something went wrong.",
        success: false
      });
    }
  },

  // Reset onboarding for a user (admin only)
  resetOnboarding: async (req, res) => {
    try {
      const { userId } = req.body;

      // Check if user is admin
      if (!req.token.isAdmin) {
        return res.status(403).json({
          msg: "Access denied. Admin privileges required.",
          success: false
        });
      }

      if (!userId) {
        return res.status(400).json({
          msg: "User ID is required",
          success: false
        });
      }

      const onboarding = await OnBoarding.findOneAndUpdate(
        { userId },
        {
          activeCard: 1,
          status: "In Progress",
          isCompleted: false,
          viewed: false,
          skipped: false,
          completedAt: null
        },
        { new: true, runValidators: true }
      );

      if (!onboarding) {
        return res.status(404).json({
          msg: "Onboarding data not found",
          success: false
        });
      }

      return res.status(200).json({
        onboarding,
        msg: "Onboarding reset successfully",
        success: true
      });
    } catch (error) {
      console.error("Error resetting onboarding:", error);
      return res.status(500).json({
        msg: "Failed to reset onboarding",
        error: error.message || "Something went wrong.",
        success: false
      });
    }
  }
};

module.exports = methods; 