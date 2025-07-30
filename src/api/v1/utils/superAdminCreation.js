const User = require("../model/Users"); // Adjust the path to your user model
const bcrypt = require("bcrypt");

const seedDatabaseAndCreateSuperAdmin = async () => {
  try {
    console.log("Checking for existing users...");
    
    // Check if any user exists
    const users = await User.find();
    if (users.length === 0) {
      console.log("No users found. Creating default Admin...");

      // Hash the default password
      const hashedPassword = await bcrypt.hash("admin@123", 12);

      // Create the Admin
      await User.create({
        email: "admin@crm.com",
        password: hashedPassword,
        role: "Admin",
        name: "Muddasar Rehman",
      });

      console.log("Default Admin created successfully.");
    } else {
      console.log("Users already exist in the database. Skipping Admin creation.");
    }
  } catch (error) {
    console.error("Error during admin creation:", error);
    throw error; 
  }
};
module.exports = seedDatabaseAndCreateSuperAdmin;


