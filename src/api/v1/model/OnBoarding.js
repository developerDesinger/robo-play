const mongoose = require("mongoose");

const onboardingSchema = new mongoose.Schema(
  {
    // Reference to the user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Current active step
    activeCard: {
      type: Number,
      default: 1,
    },

    // Step 1: Basic Information

    firstName: {
      type: String,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    lastName: {
      type: String,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    // Step 3: Job Search Status

    jobSearchStatus: {
      type: String,
      // enum: ["not", "actively", "passively"],
    },

    // Step 4: Challenges
    challenges: [
      {
        type: String,
        trim: true,
      },
    ],

    // Step 5: How did you hear about us

    hearAboutUs: {
      type: String,
      trim: true,
    },

    // Step 6: Employment Status

    employmentStatus: {
      type: String,
      trim: true,
    },

    // Step 7: Job Title

    jobTitle: {
      type: String,
      trim: true,
    },

    // Step 8: Salary

    salary: {
      type: Number,
      min: 0,
    },

    // Step 9: Contact Information

    country: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },

    // Step 10: Selected Option

    selectedOption: {
      type: String,
      trim: true,
    },

    // Step 11: Experience Levels

    selectedExperienceLevels: [
      {
        type: String,
        trim: true,
      },
    ],

    // Step 12: Resume fields
    resumeName: {
      type: String,
      trim: true,
    },
    resumeData: {
      type: String,
      // Could be base64 or a file reference
    },
    resumeType: {
      type: String,
      trim: true,
    },

    // Step 13: Education Level

    educationLevel: {
      type: String,
      trim: true,
    },
    selectedPlan: {
      type: String,
      trim: true,
    },
    // Step 14: Years of Experience

    yearsOfExperience: {
      type: Number,
      min: 0,
      max: 50,
    },

    // Step 16: Job Search Goal

    jobSearchGoal: {
      type: String,
      trim: true,
    },
    jobSearchGoalLabel: {
      type: String,
      trim: true,
    },

    // Step 18: Selected Blockers

    selectedBlockers: [
      {
        type: String,
        trim: true,
      },
    ],

    // Step 19: Viewed status

    viewed: {
      type: Boolean,
      default: false,
    },

    // Step 20: Selected Goal

    selectedGoal: {
      type: String,
      trim: true,
    },

    jobsPerWeek: {
      type: Number,
      min: 1,
      max: 100,
    },

    // Step 27: Viewed statu

    // Step 30: Referral Code

    referralCode: {
      type: String,
      trim: true,
    },
    skipped: {
      type: Boolean,
      default: false,
    },

    // Overall onboarding status
    isCompleted: {
      type: Boolean,
      default: false,
    },

    // Completion timestamp
    completedAt: {
      type: Date,
    },

    // Status
    status: {
      type: String,
      enum: ["In Progress", "Completed", "Abandoned"],
      default: "In Progress",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for full name
onboardingSchema.virtual("fullName").get(function () {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return null;
});

// Index for better query performance
onboardingSchema.index({ userId: 1 });
onboardingSchema.index({ status: 1 });
onboardingSchema.index({ isCompleted: 1 });

const OnBoarding = mongoose.model("OnBoarding", onboardingSchema);
module.exports = OnBoarding;
