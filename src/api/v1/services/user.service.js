const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("../model/Users");

const AppError = require("../utils/AppError");
const HttpStatusCodes = require("../enums/httpStatusCode");
const { createJwtToken } = require("../middlewares/auth.middleware");
const { s3SharpImageUpload } = require("../services/aws.service");
const {
  sendOtpEmail,
  sendVendorRequestEmail,
  sendVendorApprovalEmail,
  sendResetPasswordEmail,
} = require("../utils/email");

// const sendEmail = require("../utils/sendEmail"); // Utility for sending emails

class UserService {
  static async createUser(data) {
    const { name, email, password, phoneNumber, cnic, role } = data;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError("Email already in use.", HttpStatusCodes.BAD_REQUEST);
    }

    // Generate a random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newClient = new User({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
      cnic,
      role: role ? role : "Client",
      clientStatus: "Pending",
      otp, // Save OTP to the user model
    });

    const reultA = await newClient.save();

    console.log("OTP:", reultA);
    await sendOtpEmail(email, otp);

    // Send OTP via email or SMS (Implement this function)
    // await sendOTP(email, otp);

    return {
      message: "Client created successfully. OTP sent.",
      success: true,
      data: newClient,
    };
  }

  static async approveClient(clientId) {
    const client = await User.findById(clientId);
    if (!client || client.role !== "Client") {
      throw new AppError("Client not found.", HttpStatusCodes.NOT_FOUND);
    }

    client.clientStatus = "Approved";
    await client.save();

    return { message: "Client approved successfully.", client };
  }

  static async otpVerifyUser({ email, otp }) {
    // Find the client by email
    const client = await User.findOne({ email });

    if (!client || client.role !== "Client") {
      throw new AppError("Client not found.", HttpStatusCodes.NOT_FOUND);
    }

    // Check if OTP is valid and not expired
    if (!client.otp || client.otp !== otp) {
      throw new AppError("Invalid OTP.", HttpStatusCodes.BAD_REQUEST);
    }

    // Update client status to Approved
    client.clientStatus = "Approved";
    client.otp = null; // Clear OTP after verification

    await client.save();

    return { message: "Client approved successfully.", success: true, client };
  }

  static async loginUser(data) {
    console.log("Data from login:", data);
    const { email, password } = data;
    if (!email || !password) {
      throw new AppError(
        "Email, password, and role are required.",
        HttpStatusCodes.BAD_REQUEST
      );
    }
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      throw new AppError("User not found.", HttpStatusCodes.NOT_FOUND);
    }

    if (user.clientStatus !== "Approved" && user.role !== "Admin") {
      throw new AppError("User is not approved.", HttpStatusCodes.UNAUTHORIZED);
    }

    if (user.status == "Inactive") {
      throw new AppError("User is block", HttpStatusCodes.UNAUTHORIZED);
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError(
        "Invalid email or password.",
        HttpStatusCodes.UNAUTHORIZED
      );
    }
    // if (user.role !== role) {
    //   throw new AppError(
    //     "Role mismatch. Access denied.",
    //     HttpStatusCodes.UNAUTHORIZED
    //   );
    // }

    const token = createJwtToken({ id: user._id, role: user.role });

    return {
      message: "Login successful.",
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePhoto: user.profilePhoto,
        vendorStatus: user.vendorStatus,
        token,
      },
    };
  }

  static async getAllUsers() {
    const users = await User.find();
    return {
      message: "Users fetched successfully.",
      data: users.length ? users : [],
      success: true,
    };
  }

  static async getUserById(userId) {
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found.", HttpStatusCodes.NOT_FOUND);
    return user;
  }

  static async updateUser(userId, updateData) {
    console.log("userId :>> ", userId);
    console.log("updateData :>> ", updateData);
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser)
      throw new AppError("User not found.", HttpStatusCodes.NOT_FOUND);

    return {
      message: "User updated successfully.",
      data: updatedUser,
      success: true,
    };
  }

  static async deleteUser(userId) {
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser)
      throw new AppError("User not found.", HttpStatusCodes.NOT_FOUND);
    return { message: "User deleted successfully.", success: true };
  }

  static async forgotPassword(email) {
    const user = await User.findOne({ email });
    if (!user) throw new AppError("User not found.", HttpStatusCodes.NOT_FOUND);

    const otp = crypto.randomInt(100000, 999999).toString();
    // await sendEmail({
    //   email,
    //   subject: "Reset Password OTP",
    //   message: `Your OTP is: ${otp}`,
    // });

    await sendResetPasswordEmail(email, otp);

    await User.create({ fk_userId: user._id, otp });
    return {
      message: "OTP sent successfully.",
      data: { fk_userId: user._id, otp },
    };
  }

  static async updatePassword({ otp, newPassword }) {
    const otpRecord = await User.findOne({ otp });
    if (!otpRecord)
      throw new AppError(
        "Invalid or expired OTP.",
        HttpStatusCodes.BAD_REQUEST
      );

    const user = await User.findById(otpRecord.fk_userId);
    if (!user) throw new AppError("User not found.", HttpStatusCodes.NOT_FOUND);

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    await User.findByIdAndDelete(otpRecord._id);

    return { message: "Password updated successfully." };
  }

  static async inviteClient(email, inviterId) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError("Email already exists.", HttpStatusCodes.BAD_REQUEST);
    }

    const token = createJwtToken({
      email,
      role: "Client",
      inviterId,
    });

    const inviteLink = `${process.env.FRONTEND_URL}/accept-invite?token=${token}`;
    const message = `You have been invited to join as a Client. Click the link to accept the invitation: ${inviteLink}`;

    await sendEmail({
      to: email,
      subject: "You're Invited!",
      message,
    });

    return {
      message: `Invitation sent successfully to ${email}.`,
      inviteLink,
    };
  }

  // static async updateProfile(req) {
  //   try {
  //     const userId = req.user.id;
  //     const { name, password, profilePhoto } = req.body;

  //     console.log("User ID from token:", userId);

  //     const userToUpdate = await User.findOne({ _id: userId });
  //     if (!userToUpdate) {
  //       throw new AppError("User not found.", 400);
  //     }

  //     let updates = {};

  //     if (profilePhoto) {
  //       try {
  //         const profilePhotoUrl = profilePhoto.startsWith("data:")
  //           ? await s3SharpImageUpload(profilePhoto)
  //           : profilePhoto;
  //         updates.profilePhoto = profilePhotoUrl;
  //       } catch (error) {
  //         throw new AppError("Failed to upload profile photo.", 400);
  //       }
  //     }

  //     if (password) {
  //       updates.password = await bcrypt.hash(password, 10);
  //     }

  //     if (name) {
  //       updates.name = name;
  //     }

  //     if (Object.keys(updates).length > 0) {
  //       Object.assign(userToUpdate, updates);
  //       await userToUpdate.save();
  //     }

  //     return {
  //       message: "Profile updated successfully.",
  //       user: {
  //         name: userToUpdate.name,
  //         email: userToUpdate.email,
  //         role: userToUpdate.role,
  //         profilePhoto: userToUpdate.profilePhoto,
  //         status: userToUpdate.status,
  //       },
  //     };
  //   } catch (error) {
  //     throw new AppError(
  //       error.message || "An error occurred while updating the profile.",
  //       500
  //     );
  //   }
  // }

  static async updateProfile(userId, data) {
    console.log("Data from updateProfile:", data);

    if (!userId) {
      throw new AppError("User ID is required.", HttpStatusCodes.BAD_REQUEST);
    }

    if (data?.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found.", HttpStatusCodes.NOT_FOUND);
    }

    // Update only provided fields
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        user[key] = value;
      }
    });

    await user.save();

    return {
      message: "Profile updated successfully.",
      success: true,
      user,
    };
  }

  /**
   * Create a new vendor request
   */
  static async createVendorRequest(data) {
    const {
      companyName,
      ownerFullName,
      businessEmail,
      contactNumber,
      businessAddress,
      city,
      businessType,
      typesOfProducts,
      taxRegistrationNumber,
      businessLicense,
      cnicNumber,
      cnicFrontImage,
      cnicBackImage,
    } = data;

    // Validate required fields
    if (
      !companyName ||
      !ownerFullName ||
      !businessEmail ||
      !contactNumber ||
      !businessAddress ||
      !city ||
      !businessType ||
      !typesOfProducts ||
      !taxRegistrationNumber ||
      !businessLicense ||
      !cnicNumber ||
      !cnicFrontImage ||
      !cnicBackImage
    ) {
      throw new AppError(
        "All fields are required.",
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Check if a vendor with the given email already exists
    const existingVendor = await VendorRequest.findOne({ businessEmail });
    if (existingVendor) {
      throw new AppError(
        "A vendor with this email already exists.",
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Check if a vendor with the given tax registration number already exists
    const existingTaxNumber = await VendorRequest.findOne({
      taxRegistrationNumber,
    });
    if (existingTaxNumber) {
      throw new AppError(
        "A vendor with this tax registration number already exists.",
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Check if a vendor with the given CNIC number already exists
    const existingCnic = await VendorRequest.findOne({
      cnicNumber,
    });
    if (existingCnic) {
      throw new AppError(
        "A vendor with this CNIC number already exists.",
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Create a new vendor request
    const newVendorRequest = new VendorRequest({
      companyName,
      ownerFullName,
      businessEmail,
      contactNumber,
      businessAddress,
      city,
      businessType,
      typesOfProducts,
      taxRegistrationNumber,
      businessLicense,
      cnicNumber,
      cnicFrontImage,
      cnicBackImage,
      status: "Pending", // Default status
      createdAt: Date.now(), // Store request creation timestamp
    });

    // Save the request to the database
    const savedVendorRequest = await newVendorRequest.save();
    await sendVendorRequestEmail(businessEmail, ownerFullName, companyName);

    return {
      message: "Vendor request created successfully.",
      success: true,
      vendorRequest: savedVendorRequest,
    };
  }

  /**
   * Get all vendor requests
   */
  static async getAllVendorRequests() {
    const vendorRequests = await VendorRequest.find();
    return {
      success: true,
      vendorRequests,
    };
  }

  /**
   * Get a single vendor request by ID
   */
  static async getVendorRequestById(id) {
    const vendorRequest = await VendorRequest.findById(id);
    if (!vendorRequest) {
      throw new AppError(
        "Vendor request not found.",
        HttpStatusCodes.NOT_FOUND
      );
    }

    return {
      success: true,
      vendorRequest,
    };
  }

  /**
   * Approve vendor request and create user entry
   */

  // static async approveVendorRequest(vendorId) {
  //   const vendor = await VendorRequest.findById(vendorId);
  //   if (!vendor) {
  //     throw new AppError(
  //       "Vendor request not found.",
  //       HttpStatusCodes.NOT_FOUND
  //     );
  //   }

  //   if (vendor.status === "Approved") {
  //     throw new AppError(
  //       "Vendor is already approved.",
  //       HttpStatusCodes.BAD_REQUEST
  //     );
  //   }

  //   // Validate required fields
  //   const requiredFields = [
  //     "businessEmail",
  //     "businessAddress",
  //     "contactNumber",
  //     "companyName",
  //     "ownerFullName",
  //     "city",
  //     "businessType",
  //     "typesOfProducts",
  //     "taxRegistrationNumber",
  //     "businessLicense",
  //     "cnicNumber",
  //     "cnicFrontImage",
  //     "cnicBackImage",
  //   ];

  //   for (const field of requiredFields) {
  //     if (!vendor[field]) {
  //       throw new AppError(
  //         `Invalid input data: ${field} is required.`,
  //         HttpStatusCodes.BAD_REQUEST
  //       );
  //     }
  //   }

  //   // Approve the vendor request
  //   vendor.status = "Approved";
  //   await vendor.save();

  //   // Check if user with business email already exists
  //   let existingUser = await User.findOne({ email: vendor.businessEmail });

  //   if (!existingUser) {
  //     // Generate a default password if missing
  //     const defaultPassword = await bcrypt.hash("Vendor@123", 10);

  //     // Create new user as vendor
  //     existingUser = new User({
  //       name: vendor.ownerFullName,
  //       email: vendor.businessEmail,
  //       businessEmail: vendor.businessEmail,
  //       phoneNumber: vendor.contactNumber,
  //       address: vendor.businessAddress,
  //       businessAddress: vendor.businessAddress,
  //       city: vendor.city,
  //       companyName: vendor.companyName,
  //       businessType: vendor.businessType,
  //       typesOfProducts: vendor.typesOfProducts,
  //       taxRegistrationNumber: vendor.taxRegistrationNumber,
  //       businessLicense: vendor.businessLicense,
  //       cnic: vendor.cnicNumber,
  //       cnicFrontImage: vendor.cnicFrontImage,
  //       cnicBackImage: vendor.cnicBackImage,
  //       role: "Vendor",
  //       vendorStatus: "Approved",
  //       status: "Active",
  //       clientStatus: "Approved",
  //       createdAt: vendor.createdAt, // Sync creation time
  //       password: defaultPassword, // Setting a default password
  //     });

  //     await existingUser.save();
  //   } else {
  //     // Update existing user with vendor details
  //     existingUser.companyName = vendor.companyName;
  //     existingUser.businessType = vendor.businessType;
  //     existingUser.typesOfProducts = vendor.typesOfProducts;
  //     existingUser.taxRegistrationNumber = vendor.taxRegistrationNumber;
  //     existingUser.businessLicense = vendor.businessLicense;
  //     existingUser.cnic = vendor.cnicNumber;
  //     existingUser.cnicFrontImage = vendor.cnicFrontImage;
  //     existingUser.cnicBackImage = vendor.cnicBackImage;
  //     existingUser.vendorStatus = "Approved";
  //     existingUser.status = "Active";
  //     clientStatus: "Approved", await existingUser.save();
  //   }

  //   return {
  //     message: "Vendor request approved and user created successfully.",
  //     success: true,
  //   };
  // }

  // static async approveVendorRequest(vendorId) {
  //   const vendor = await VendorRequest.findById(vendorId);
  //   if (!vendor) {
  //     throw new AppError("Vendor request not found.", HttpStatusCodes.NOT_FOUND);
  //   }

  //   if (vendor.status === "Approved") {
  //     throw new AppError("Vendor is already approved.", HttpStatusCodes.BAD_REQUEST);
  //   }

  //   // Validate required fields
  //   const requiredFields = [
  //     "businessEmail",
  //     "businessAddress",
  //     "contactNumber",
  //     "companyName",
  //     "ownerFullName",
  //     "city",
  //     "businessType",
  //     "typesOfProducts",
  //     "taxRegistrationNumber",
  //     "businessLicense",
  //     "cnicNumber",
  //     "cnicFrontImage",
  //     "cnicBackImage",
  //   ];

  //   for (const field of requiredFields) {
  //     if (!vendor[field]) {
  //       throw new AppError(`Invalid input data: ${field} is required.`, HttpStatusCodes.BAD_REQUEST);
  //     }
  //   }

  //   // Approve the vendor request
  //   vendor.status = "Approved";
  //   await vendor.save();

  //   // Check if user with business email already exists
  //   let existingUser = await User.findOne({ email: vendor.businessEmail });

  //   if (!existingUser) {
  //     // Generate a **random** secure password
  //     const randomPassword = generateRandomPassword(12); // Generate a 12-character password
  //     const hashedPassword = await bcrypt.hash(randomPassword, 10); // Hash the password

  //     // Create new user as vendor
  //     existingUser = new User({
  //       name: vendor.ownerFullName,
  //       email: vendor.businessEmail,
  //       businessEmail: vendor.businessEmail,
  //       phoneNumber: vendor.contactNumber,
  //       address: vendor.businessAddress,
  //       businessAddress: vendor.businessAddress,
  //       city: vendor.city,
  //       companyName: vendor.companyName,
  //       businessType: vendor.businessType,
  //       typesOfProducts: vendor.typesOfProducts,
  //       taxRegistrationNumber: vendor.taxRegistrationNumber,
  //       businessLicense: vendor.businessLicense,
  //       cnic: vendor.cnicNumber,
  //       cnicFrontImage: vendor.cnicFrontImage,
  //       cnicBackImage: vendor.cnicBackImage,
  //       role: "Vendor",
  //       vendorStatus: "Approved",
  //       status: "Active",
  //       clientStatus: "Approved",
  //       createdAt: vendor.createdAt,
  //       password: hashedPassword, // Save the hashed password
  //     });

  //     await existingUser.save();

  //     // Optionally, send the password to the vendor via email (implement email service)
  //     console.log(`Generated Password for Vendor: ${randomPassword}`);
  //   } else {
  //     // Update existing user with vendor details
  //     existingUser.companyName = vendor.companyName;
  //     existingUser.businessType = vendor.businessType;
  //     existingUser.typesOfProducts = vendor.typesOfProducts;
  //     existingUser.taxRegistrationNumber = vendor.taxRegistrationNumber;
  //     existingUser.businessLicense = vendor.businessLicense;
  //     existingUser.cnic = vendor.cnicNumber;
  //     existingUser.cnicFrontImage = vendor.cnicFrontImage;
  //     existingUser.cnicBackImage = vendor.cnicBackImage;
  //     existingUser.vendorStatus = "Approved";
  //     existingUser.status = "Active";
  //     existingUser.clientStatus = "Approved";

  //     await existingUser.save();
  //   }

  //   return {
  //     message: "Vendor request approved and user created successfully.",
  //     success: true,
  //   };
  // }

  static async approveVendorRequest(vendorId) {
    const vendor = await VendorRequest.findById(vendorId);

    if (!vendor) {
      throw new AppError(
        "Vendor request not found.",
        HttpStatusCodes.NOT_FOUND
      );
    }

    if (vendor.status === "Approved") {
      throw new AppError(
        "Vendor is already approved.",
        HttpStatusCodes.BAD_REQUEST
      );
    }

    const requiredFields = [
      "businessEmail",
      "businessAddress",
      "contactNumber",
      "companyName",
      "ownerFullName",
      "city",
      "businessType",
      "typesOfProducts",
      "taxRegistrationNumber",
      "businessLicense",
      "cnicNumber",
      "cnicFrontImage",
      "cnicBackImage",
    ];

    for (const field of requiredFields) {
      if (!vendor[field]) {
        throw new AppError(
          `Invalid input data: ${field} is required.`,
          HttpStatusCodes.BAD_REQUEST
        );
      }
    }

    vendor.status = "Approved";
    await vendor.save();

    let existingUser = await User.findOne({ email: vendor.businessEmail });
    let isNewUser = false;
    let randomPassword;

    if (!existingUser) {
      isNewUser = true;
      randomPassword = crypto.randomBytes(8).toString("base64").slice(0, 12);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      existingUser = new User({
        name: vendor.ownerFullName,
        email: vendor.businessEmail,
        businessEmail: vendor.businessEmail,
        phoneNumber: vendor.contactNumber,
        address: vendor.businessAddress,
        businessAddress: vendor.businessAddress,
        city: vendor.city,
        companyName: vendor.companyName,
        businessType: vendor.businessType,
        typesOfProducts: vendor.typesOfProducts,
        taxRegistrationNumber: vendor.taxRegistrationNumber,
        businessLicense: vendor.businessLicense,
        cnic: vendor.cnicNumber,
        cnicFrontImage: vendor.cnicFrontImage,
        cnicBackImage: vendor.cnicBackImage,
        role: "Vendor",
        vendorStatus: "Approved",
        status: "Active",
        clientStatus: "Approved",
        createdAt: vendor.createdAt,
        password: hashedPassword,
      });

      await existingUser.save();
    } else {
      existingUser.companyName = vendor.companyName;
      existingUser.businessType = vendor.businessType;
      existingUser.typesOfProducts = vendor.typesOfProducts;
      existingUser.taxRegistrationNumber = vendor.taxRegistrationNumber;
      existingUser.businessLicense = vendor.businessLicense;
      existingUser.cnic = vendor.cnicNumber;
      existingUser.cnicFrontImage = vendor.cnicFrontImage;
      existingUser.cnicBackImage = vendor.cnicBackImage;
      existingUser.vendorStatus = "Approved";
      existingUser.status = "Active";
      existingUser.clientStatus = "Approved";

      await existingUser.save();
    }

    await sendVendorApprovalEmail(
      vendor.businessEmail,
      vendor.ownerFullName,
      vendor.companyName,
      randomPassword,
      isNewUser
    );

    return {
      message: "Vendor request approved and email sent successfully.",
      success: true,
    };
  }

  // Function to Generate a Secure Random Password
  static async generateRandomPassword(length = 12) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}|;:,.<>?";
    let password = "";

    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, chars.length);
      password += chars[randomIndex];
    }

    return password;
  }

  /**
   * Create a new vendor request
   */
  // static async createVendorRequest(data) {
  //   const {
  //     companyName,
  //     ownerFullName,
  //     businessEmail,
  //     contactNumber,
  //     businessAddress,
  //     city,
  //     businessType,
  //     typesOfProducts,
  //     taxRegistrationNumber,
  //     businessLicense,
  //     idCardImage,
  //   } = data;

  //   // Validate required fields
  //   if (
  //     !companyName ||
  //     !ownerFullName ||
  //     !businessEmail ||
  //     !contactNumber ||
  //     !businessAddress ||
  //     !city ||
  //     !businessType ||
  //     !typesOfProducts ||
  //     !taxRegistrationNumber ||
  //     !businessLicense ||
  //     !idCardImage
  //   ) {
  //     throw new AppError(
  //       "All fields are required.",
  //       HttpStatusCodes.BAD_REQUEST
  //     );
  //   }

  //   // Check if a vendor with the given email already exists
  //   const existingVendor = await VendorRequest.findOne({ businessEmail });
  //   if (existingVendor) {
  //     throw new AppError(
  //       "A vendor with this email already exists.",
  //       HttpStatusCodes.BAD_REQUEST
  //     );
  //   }

  //   // Check if a vendor with the given tax registration number already exists
  //   const existingTaxNumber = await VendorRequest.findOne({
  //     taxRegistrationNumber,
  //   });
  //   if (existingTaxNumber) {
  //     throw new AppError(
  //       "A vendor with this tax registration number already exists.",
  //       HttpStatusCodes.BAD_REQUEST
  //     );
  //   }

  //   // Create a new vendor request
  //   const newVendorRequest = new VendorRequest({
  //     companyName,
  //     ownerFullName,
  //     businessEmail,
  //     contactNumber,
  //     businessAddress,
  //     city,
  //     businessType,
  //     typesOfProducts,
  //     taxRegistrationNumber,
  //     businessLicense,
  //     idCardImage, // Add idCardImage to the new request
  //     status: "Pending", // Default status
  //   });

  //   // Save the request to the database
  //   const savedVendorRequest = await newVendorRequest.save();
  //   await sendVendorRequestEmail(businessEmail, ownerFullName, companyName);
  //   return {
  //     message: "Vendor request created successfully.",
  //     success: true,
  //     vendorRequest: savedVendorRequest,
  //   };
  // }

  // // Get All Vendor Requests
  // static async getAllVendorRequests() {
  //   const vendorRequests = await VendorRequest.find();
  //   return {
  //     success: true,
  //     vendorRequests,
  //   };
  // }

  // // Get Single Vendor Request by ID
  // static async getVendorRequestById(id) {
  //   const vendorRequest = await VendorRequest.findById(id);
  //   if (!vendorRequest) {
  //     throw new AppError(
  //       "Vendor request not found.",
  //       HttpStatusCodes.NOT_FOUND
  //     );
  //   }

  //   return {
  //     success: true,
  //     vendorRequest,
  //   };
  // }

  /**
   * Create a new contact request
   * @param {Object} data - Contact form data
   */
  static async createContactRequest(data) {
    const { fullName, email, topic, query } = data;

    // Validate required fields
    if (!fullName || !email || !topic || !query) {
      throw new AppError(
        "All fields are required.",
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Create a new contact request
    const newContactRequest = new ContactRequest({
      fullName,
      email,
      topic,
      query,
      status: "Pending",
    });

    // Save the request to the database
    const savedContactRequest = await newContactRequest.save();

    return {
      message: "Your query has been submitted successfully.",
      success: true,
      contactRequest: savedContactRequest,
    };
  }

  /**
   * Get all contact requests
   */
  static async getAllContactRequests() {
    const contactRequests = await ContactRequest.find();
    return {
      success: true,
      contactRequests,
    };
  }

  /**
   * Get a single contact request by ID
   */
  static async getContactRequestById(id) {
    const contactRequest = await ContactRequest.findById(id);

    if (!contactRequest) {
      throw new AppError(
        "Contact request not found.",
        HttpStatusCodes.NOT_FOUND
      );
    }

    return {
      success: true,
      contactRequest,
    };
  }

  /**
   * Mark a contact request as resolved
   */
  static async markAsResolved(id) {
    const contactRequest = await ContactRequest.findById(id);

    if (!contactRequest) {
      throw new AppError(
        "Contact request not found.",
        HttpStatusCodes.NOT_FOUND
      );
    }

    contactRequest.status = "Resolved";
    await contactRequest.save();

    return {
      message: "Contact request marked as resolved.",
      success: true,
      contactRequest,
    };
  }
}

module.exports = UserService;
