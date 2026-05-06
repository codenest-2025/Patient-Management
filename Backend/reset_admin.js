const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/User");

dotenv.config();

const resetAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

    const user = await User.findOne({ username: "admin" });

    if (user) {
      user.password = "admin123";
      await user.save();
      console.log("Admin password reset to: admin123");
    } else {
      await User.create({
        username: "admin",
        password: "admin123",
        role: "admin",
      });
      console.log("Admin user created with password: admin123");
    }

    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

resetAdmin();
