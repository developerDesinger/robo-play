const mongoose = require("mongoose");

const onboardingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: false,
    },
    activeCard: { type: Number, default: 1 },
    activeCardName: { type: String, default: "nameInfo" },
    firstName: { type: String, trim: true, minlength: 2, maxlength: 50 },
    lastName: { type: String, trim: true, minlength: 2, maxlength: 50 },
    jobSearchStatus: { type: String },
    challenges: [{ type: String, trim: true }],
    hearAboutUs: { type: String, trim: true },
    employmentStatus: { type: String, trim: true },
    jobTitle: { type: String, trim: true },
    salary: { type: Number, min: 0 },
    country: { type: String, trim: true },
    phone: { type: String, trim: true },
    selectedOption: { type: String, trim: true },
    selectedExperienceLevels: [{ type: String, trim: true }],
    resumeName: { type: String, trim: true },
    resumeData: { type: String },
    resumeType: { type: String, trim: true },
    educationLevel: { type: String, trim: true },
    selectedPlan: { type: String, trim: true },
    yearsOfExperience: { type: Number, min: 0, max: 50 },
    jobSearchGoal: { type: String, trim: true },
    jobSearchGoalLabel: { type: String, trim: true },
    selectedBlockers: [{ type: String, trim: true }],
    viewed: { type: Boolean, default: false },
    selectedGoal: { type: String, trim: true },
    jobsPerWeek: { type: Number, min: 0, max: 100 },
    referralCode: { type: String, trim: true },
    skipped: { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
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

onboardingSchema.virtual("fullName").get(function () {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return null;
});

onboardingSchema.index({ userId: 1 });
onboardingSchema.index({ status: 1 });
onboardingSchema.index({ isCompleted: 1 });
onboardingSchema.index({ activeCardName: 1 });

const OnBoarding = mongoose.model("OnBoarding", onboardingSchema);
module.exports = OnBoarding;
