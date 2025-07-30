const nodemailer = require("nodemailer");

const senderEmail = process.env.SENDER_EMAIL;

// Function to create and send the OTP email
const sendOtpEmail = async (email, otp) => {
  // Configure Nodemailer transport
  const transport = nodemailer.createTransport({
    host: process.env.EMAIL_TRANSPORT_HOST, // Example: smtp.gmail.com
    port: process.env.EMAIL_TRANSPORT_PORT, // Example: 587
    auth: {
      user: process.env.EMAIL_TRANSPORT_HOST_USER, // Your email address
      pass: process.env.EMAIL_TRANSPORT_HOST_PASS, // Your email password (or app password)
    },
  });

  // Enhanced OTP Email Template
  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; background-color: #f9f9f9;">
      <div style="text-align: center; padding: 20px;">
        <img src="https://swap-n-share.vercel.app/logo.jpg" alt="SwapNShare Logo" width="150" style="margin-bottom: 20px;" />
        <h2 style="color: #333; font-size: 24px; font-weight: bold;">Your OTP Code</h2>
        <p style="font-size: 16px; color: #555;">Use the following One-Time Password (OTP) to complete your verification:</p>
        <h1 style="font-size: 48px; color: #007bff; font-weight: bold;">${otp}</h1>
        <p style="font-size: 16px; color: #555;">The OTP is valid for <strong>5 minutes</strong>.</p>
        <p style="font-size: 16px; color: #555;">If you did not request this, please ignore this email.</p>
      </div>
      <footer style="text-align: center; padding: 20px; font-size: 14px; color: #777; border-top: 1px solid #ddd;">
        <p>Best Regards,</p>
        <p style="font-weight: bold;">SwapNShare</p>
        <p><a href="https://swap-n-share.vercel.app" style="color: #007bff; text-decoration: none;">Visit our website</a></p>
      </footer>
    </div>
  `;

  // Email options
  const mailOptions = {
    from: "support@freshr.me", // Sender address
    to: email, // Recipient email
    subject: "Your OTP Code", // Subject
    html: htmlTemplate, // HTML content
  };

  // Send the email
  try {
    await transport.sendMail(mailOptions);
    console.log("OTP sent successfully!");
  } catch (error) {
    console.error("Error sending OTP:", error);
  }
};

const sendVendorRequestEmail = async (email, ownerFullName, companyName) => {
  const transport = nodemailer.createTransport({
    host: process.env.EMAIL_TRANSPORT_HOST,
    port: process.env.EMAIL_TRANSPORT_PORT,
    auth: {
      user: process.env.EMAIL_TRANSPORT_HOST_USER,
      pass: process.env.EMAIL_TRANSPORT_HOST_PASS,
    },
  });

  // Enhanced Vendor Request Email Template
  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; background-color: #f9f9f9;">
      <div style="text-align: center; padding: 20px;">
        <h2 style="color: #333; font-size: 24px; font-weight: bold;">Your Vendor Request Has Been Received</h2>
        <p style="font-size: 16px; color: #555;">Dear ${ownerFullName},</p>
        <p style="font-size: 16px; color: #555;">We have successfully received your vendor request for ${companyName}. Your request is currently under review, and we will inform you shortly about the status of your application.</p>
        <p style="font-size: 16px; color: #555;">Thank you for choosing us!</p>
      </div>
      <footer style="text-align: center; padding: 20px; font-size: 14px; color: #777; border-top: 1px solid #ddd;">
        <p>Best Regards,</p>
        <p style="font-weight: bold;">SwapNShare</p>
      </footer>
    </div>
  `;

  const mailOptions = {
    from: process.env.SENDER_EMAIL, // Sender address
    to: email, // Recipient email
    subject: "Your Vendor Request Received",
    html: htmlTemplate,
  };

  try {
    await transport.sendMail(mailOptions);
    console.log("Vendor request email sent successfully!");
  } catch (error) {
    console.error("Error sending vendor request email:", error);
  }
};


const sendVendorApprovalEmail = async (
  email,
  ownerFullName,
  companyName,
  password,
  isNewUser
) => {
  const transport = nodemailer.createTransport({
    host: process.env.EMAIL_TRANSPORT_HOST,
    port: process.env.EMAIL_TRANSPORT_PORT,
    auth: {
      user: process.env.EMAIL_TRANSPORT_HOST_USER,
      pass: process.env.EMAIL_TRANSPORT_HOST_PASS,
    },
  });

  // Email Content for New & Existing Users
  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; background-color: #f9f9f9;">
      <div style="text-align: center; padding: 20px;">
        <h2 style="color: #333; font-size: 24px; font-weight: bold;">Your Vendor Request Has Been Approved!</h2>
        <p style="font-size: 16px; color: #555;">Dear ${ownerFullName},</p>
        <p style="font-size: 16px; color: #555;">Congratulations! Your vendor request for <strong>${companyName}</strong> has been approved. You can now access your vendor account.</p>

        ${
          isNewUser
            ? `<p style="font-size: 16px; color: #555;">Here are your login details:</p>
            <p style="font-size: 16px; color: #555;"><strong>Email:</strong> ${email}</p>
            <p style="font-size: 16px; color: #555;"><strong>Password:</strong> ${password}</p>
            <p style="font-size: 16px; color: #d9534f;">(Please change your password after logging in.)</p>`
            : `<p style="font-size: 16px; color: #555;">You can log in using your existing password.</p>`
        }

        <p style="font-size: 16px; color: #555;">Click below to log in:</p>
        <a href="https://yourwebsite.com/login" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Login Now</a>
      </div>
      <footer style="text-align: center; padding: 20px; font-size: 14px; color: #777; border-top: 1px solid #ddd;">
        <p>Best Regards,</p>
        <p style="font-weight: bold;">SwapNShare Team</p>
      </footer>
    </div>
  `;

  const mailOptions = {
    from: process.env.SENDER_EMAIL,
    to: email,
    subject: "Vendor Request Approved - Login Details",
    html: htmlTemplate,
  };

  try {
    await transport.sendMail(mailOptions);
    console.log(`Vendor approval email sent successfully to ${email}!`);
  } catch (error) {
    console.error("Error sending vendor approval email:", error);
  }
};

const sendOrderDetailsEmail = async (vendorEmail, orders) => {
  // Configure Nodemailer transport
  const transport = nodemailer.createTransport({
    host: process.env.EMAIL_TRANSPORT_HOST, // Example: smtp.gmail.com
    port: process.env.EMAIL_TRANSPORT_PORT, // Example: 587
    auth: {
      user: process.env.EMAIL_TRANSPORT_HOST_USER, // Your email address
      pass: process.env.EMAIL_TRANSPORT_HOST_PASS, // Your email password (or app password)
    },
  });

  // Create the HTML email template with order details
  let totalAmount = 0;
  const orderDetails = orders
    .map((order) => {
      totalAmount += order.productId.price * order.quantity; // Assuming you have a quantity field
      return `
      <div style="padding: 10px; border-bottom: 1px solid #ddd;">
        <h3 style="color: #007bff;">Order #${order._id}</h3>
        <p><strong>Product Name:</strong> ${order.productId.name}</p>
        <p><strong>Quantity:</strong> ${order.quantity}</p>
        <p><strong>Price:</strong> $${order.productId.price}</p>
        <p><strong>User:</strong> ${order.userId.name} (${
        order.userId.email
      })</p>
        <p><strong>Total Amount for this order:</strong> $${
          order.productId.price * order.quantity
        }</p>
      </div>
    `;
    })
    .join("");

  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; background-color: #f9f9f9;">
      <h2 style="color: #333; font-size: 24px; font-weight: bold;">Order Details for Vendor</h2>
      <p style="font-size: 16px; color: #555;">You have received the following orders:</p>
      ${orderDetails}
      <hr>
      <h3 style="color: #007bff;">Total Order Amount: $${totalAmount}</h3>
      <footer style="padding: 20px; font-size: 14px; color: #777; text-align: center;">
        <p>Best Regards,</p>
        <p>SwapNShare</p>
        <p><a href="https://swap-n-share.vercel.app" style="color: #007bff; text-decoration: none;">Visit our website</a></p>
      </footer>
    </div>
  `;

  // Email options
  const mailOptions = {
    from: "support@swapnshare.com", // Sender address
    to: vendorEmail, // Vendor's email address
    subject: "Your Orders for This Period", // Subject
    html: htmlTemplate, // HTML content
  };

  // Send the email
  try {
    await transport.sendMail(mailOptions);
    console.log("Order details sent successfully!");
  } catch (error) {
    console.error("Error sending order details email:", error);
  }
};

const sendResetPasswordEmail = async (email, otp) => {
  // Configure Nodemailer transport
  const transport = nodemailer.createTransport({
    host: process.env.EMAIL_TRANSPORT_HOST, // e.g., smtp.gmail.com
    port: process.env.EMAIL_TRANSPORT_PORT, // e.g., 587
    auth: {
      user: process.env.EMAIL_TRANSPORT_HOST_USER, // Your email address
      pass: process.env.EMAIL_TRANSPORT_HOST_PASS, // Your email password or app-specific password
    },
  });

  // Create the HTML email template for reset password OTP
  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; background-color: #f9f9f9;">
      <h2 style="color: #333; font-size: 24px; font-weight: bold;">Reset Password OTP</h2>
      <p style="font-size: 16px; color: #555;">Your OTP for resetting your password is:</p>
      <h3 style="color: #007bff;">${otp}</h3>
      <footer style="padding: 20px; font-size: 14px; color: #777; text-align: center;">
        <p>Best Regards,</p>
        <p>Your Company Name</p>
        <p><a href="https://yourwebsite.com" style="color: #007bff; text-decoration: none;">Visit our website</a></p>
      </footer>
    </div>
  `;

  // Email options
  const mailOptions = {
    from: "support@yourcompany.com", // Update this with your sender address
    to: email,
    subject: "Reset Password OTP",
    html: htmlTemplate,
  };

  // Send the email
  try {
    await transport.sendMail(mailOptions);
    console.log("Reset password OTP email sent successfully!");
  } catch (error) {
    console.error("Error sending reset password OTP email:", error);
  }
};

module.exports = {
  sendOtpEmail,
  sendVendorRequestEmail,
  sendVendorApprovalEmail,
  sendOrderDetailsEmail,
  sendResetPasswordEmail
};

// module.exports = sendEmail;
