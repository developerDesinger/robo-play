const ResumeBuilder = require("../models/resumeBuilder.model");

const methods = {
  // Add a new resume
  addResume: async (req, res) => {
    try {
      const data = req.body;
      data.userId = req.token._id;

      if (!data.userId) {
        return res.status(400).json({
          msg: "User ID is required",
          success: false,
        });
      }

      const newResume = new ResumeBuilder(data);
      const addedResume = await newResume.save();

      return res.status(200).json({
        resume: addedResume,
        msg: "Resume added successfully",
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to add resume",
        error: error.message,
        success: false,
      });
    }
  },

  // View resumes based on userId
  viewResumes: async (req, res) => {
    try {
      const userId = req.token._id;
      const { page = 1, limit = 10 } = req.query;

      if (!userId) {
        return res.status(400).json({
          msg: "User ID is required",
          success: false,
        });
      }

      const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: { createdAt: -1 }, // Sort by createdAt in descending order
      };

      const resumes = await ResumeBuilder.paginate(
        { userId, deleted: false },
        options
      );

      return res.status(200).json({
        resumes: resumes,
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to view resumes",
        error: error.message,
        success: false,
      });
    }
  },

  // Update an existing resume
  updateResume: async (req, res) => {
    try {
      const { _id, ...data } = req.body;

      if (!_id) {
        return res.status(400).json({
          msg: "Resume ID is required",
          success: false,
        });
      }

      const existingResume = await ResumeBuilder.findById(_id);

      if (!existingResume) {
        return res.status(404).json({
          msg: "Resume not found",
          success: false,
        });
      }

      const updatedResume = await ResumeBuilder.findByIdAndUpdate(_id, data, {
        new: true,
      });

      return res.status(200).json({
        resume: updatedResume,
        msg: "Resume updated successfully",
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to update resume",
        error: error.message,
        success: false,
      });
    }
  },

  // Delete a resume (soft delete)
  deleteResume: async (req, res) => {
    try {
      const { _id } = req.body;

      if (!_id) {
        return res.status(400).json({
          msg: "Resume ID is required",
          success: false,
        });
      }

      const existingResume = await ResumeBuilder.findByIdAndUpdate(
        _id,
        { deleted: true },
        { new: true }
      );

      if (!existingResume) {
        return res.status(404).json({
          msg: "Resume not found",
          success: false,
        });
      }

      return res.status(200).json({
        msg: "Resume deleted successfully",
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to delete resume",
        error: error.message,
        success: false,
      });
    }
  },
};

module.exports = methods;
