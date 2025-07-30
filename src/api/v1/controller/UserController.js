const UserService = require("../services/user.service");
const catchAsyncHandler = require("../utils/catchAsyncHandler");

class UserController {
  static createUser = catchAsyncHandler(async (req, res) => {
    const result = await UserService.createUser(req.body);
    return res.status(201).json(result);
  });

  static otpVerifyUser = catchAsyncHandler(async (req, res) => {
    const result = await UserService.otpVerifyUser(req.body);
    return res.status(201).json(result);
  });

  static approveClient = catchAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await UserService.approveClient(id);
    return res.status(200).json(result);
  });

  static loginUser = catchAsyncHandler(async (req, res) => {
    const result = await UserService.loginUser(req.body);
    return res.status(200).json(result);
  });

  static getAllUsers = catchAsyncHandler(async (req, res) => {
    const users = await UserService.getAllUsers();
    return res.status(200).json(users);
  });

  static getUserById = catchAsyncHandler(async (req, res) => {
    const userQ = req.user;
    console.log("userQ", userQ);
    //const { id } = req.params;
    //const user = await UserService.getUserById(id);
    return res.status(200).json({
      success: true,
      data: userQ,
    });
  });

  static updateUser = catchAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await UserService.updateUser(id, req.body);
    return res.status(200).json(result);
  });

  static deleteUser = catchAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await UserService.deleteUser(id);
    return res.status(200).json(result);
  });

  static forgotPassword = catchAsyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await UserService.forgotPassword(email);
    return res.status(200).json(result);
  });

  static updatePassword = catchAsyncHandler(async (req, res) => {
    const { otp, newPassword } = req.body;
    const result = await UserService.updatePassword({ otp, newPassword });
    return res.status(200).json(result);
  });

  static inviteClient = catchAsyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email || !validator.isEmail(email)) {
      throw new AppError("Please provide a valid email address.", 400);
    }

    const result = await UserService.inviteClient(email, req.user._id);
    return res.status(200).json(result);
  });

  // static updateProfile = catchAsyncHandler(async (req, res) => {
  //   const result = await UserService.updateProfile(req);
  //   res.status(200).json({
  //     success: true,
  //     message: result.message,
  //     user: result.user,
  //   });
  // });

  /**
   * Update User Profile
   */
  static updateProfile = catchAsyncHandler(async (req, res) => {
    console.log("req.user", req.user);
    const userId = req.user.id; // Assuming authentication middleware adds `req.user`
    const result = await UserService.updateProfile(userId, req.body);
    return res.status(200).json(result);
  });

  static createVendorRequest = catchAsyncHandler(async (req, res) => {
    const result = await UserService.createVendorRequest(req.body);
    return res.status(201).json(result);
  });

  // Get All Vendor Requests
  static getAllVendorRequests = catchAsyncHandler(async (req, res) => {
    const result = await UserService.getAllVendorRequests();
    return res.status(200).json(result);
  });

  static getVendorRequestById = catchAsyncHandler(async (req, res) => {
    const { id } = req.body; // Extracting ID from the request body
    if (!id) {
      throw new AppError(
        "Vendor request ID is required.",
        HttpStatusCodes.BAD_REQUEST
      );
    }
    const result = await UserService.getVendorRequestById(id);
    return res.status(200).json(result);
  });

  /**
   * Approve a vendor request and create a user account
   */
  static approveVendorRequest = catchAsyncHandler(async (req, res) => {
    const { id } = req.params; // Extract vendor request ID from the URL
    if (!id) {
      throw new AppError(
        "Vendor request ID is required.",
        HttpStatusCodes.BAD_REQUEST
      );
    }

    const result = await UserService.approveVendorRequest(id);
    return res.status(200).json(result);
  });

  /**
   * Create a new contact request
   */
  static createContactRequest = catchAsyncHandler(async (req, res) => {
    const result = await UserService.createContactRequest(req.body);
    return res.status(201).json(result);
  });

  /**
   * Get all contact requests
   */
  static getAllContactRequests = catchAsyncHandler(async (req, res) => {
    const result = await UserService.getAllContactRequests();
    return res.status(200).json(result);
  });

  /**
   * Get a single contact request by ID
   */
  static getContactRequestById = catchAsyncHandler(async (req, res) => {
    const { id } = req.body;
    if (!id) {
      throw new AppError(
        "Contact request ID is required.",
        HttpStatusCodes.BAD_REQUEST
      );
    }
    const result = await UserService.getContactRequestById(id);
    return res.status(200).json(result);
  });

  /**
   * Mark a contact request as resolved
   */
  static markAsResolved = catchAsyncHandler(async (req, res) => {
    const { id } = req.body;
    if (!id) {
      throw new AppError(
        "Contact request ID is required.",
        HttpStatusCodes.BAD_REQUEST
      );
    }
    const result = await UserService.markAsResolved(id);
    return res.status(200).json(result);
  });
}

module.exports = UserController;
