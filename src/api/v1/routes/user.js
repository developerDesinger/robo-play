const express = require("express");
const UserController = require("../controller/UserController");
const {
  isAuthenticated,
  restrictTo,
} = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/", UserController.createUser);
router.post("/vendor-request", UserController.createVendorRequest);
// Get All Vendor Requests
router.get("/vendor-requests", UserController.getAllVendorRequests);
// Get Single Vendor Request by ID\
router.post("/vendor-request-by-id", UserController.getVendorRequestById);

// **NEW: Approve Vendor Request**
router.put(
  "/vendor/approve/:id",
  isAuthenticated,
  UserController.approveVendorRequest
);


router.post("/verifyOtp", UserController.otpVerifyUser);
router.post("/login", UserController.loginUser);
router.get("/", UserController.getAllUsers);
router.get("/token", isAuthenticated, UserController.getUserById);
router.patch("/:id", isAuthenticated, UserController.updateUser);
router.delete("/:id", isAuthenticated, UserController.deleteUser);
router.post("/forgotPassword", UserController.forgotPassword);
router.post("/updatePassword", UserController.updatePassword);
router.patch(
  "/approve-client/:id",
  isAuthenticated,
  restrictTo("Admin"),
  UserController.approveClient
);

// Create a new contact request
router.post("/contact-request", UserController.createContactRequest);

// Get all contact requests
router.get("/contact-requests", UserController.getAllContactRequests);

// Get a single contact request by ID (ID in body)
router.post("/contact-request-by-id", UserController.getContactRequestById);

// Mark contact request as resolved
router.post("/contact-request-resolve", UserController.markAsResolved);


// Update User Profile - PATCH Request
router.patch("/update-profile/:id", isAuthenticated, UserController.updateProfile);

// router.post(
//     "/invite-client",
//     isAuthenticated,
//     restrictTo("Admin", "Manager"),
//     UserController.inviteClient
//   );

//   router.post("/profile", isAuthenticated, UserController.updateProfile);

module.exports = router;
