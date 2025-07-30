// const Category = require("../model/categories");

class CategoryService {
  /**
   * Seed default categories if none exist
   */
  static async seedDefaultCategories() {
    try {
      const existingCategories = await Category.countDocuments();
      if (existingCategories === 0) {
        const defaultCategories = [
          { name: "Rental Cars", isApproved: true },
          { name: "Motorcycles and Scooters", isApproved: true },
          { name: "Campervans and RVs", isApproved: true },
          { name: "Car Sharing", isApproved: true },
          { name: "Cargo Vans and Trucks", isApproved: true },
          { name: "Chauffeured Rentals", isApproved: true },
          { name: "Driving Experiences", isApproved: true },
          { name: "Trackday Rentals", isApproved: true },
          { name: "Classic Car Rental", isApproved: true },
          { name: "Manufacturer Rental Programs", isApproved: true },
          { name: "Car Subscriptions", isApproved: true },
        ];

        await Category.insertMany(defaultCategories);
        console.log("✅ Default categories added successfully!");
      } else {
        console.log("✅ Default categories already exist. Skipping seeding...");
      }
    } catch (error) {
      console.error("❌ Error seeding default categories:", error.message);
    }
  }
}

module.exports = CategoryService;
