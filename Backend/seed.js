const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/User");

dotenv.config();

const seedUser = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

    // Check if admin already exists
    const adminExists = await User.findOne({ username: "admin" });

    if (adminExists) {
      console.log("Admin user already exists. Skipping seed.");
      process.exit();
    }

    const user = await User.create({
      username: "admin",
      password: "admin123", // You can change this
      role: "admin",
    });

    if (user) {
      console.log("Admin User Created Successfully!");
      console.log("Username: admin");
      console.log("Password: admin123");
    }

    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedUser();
