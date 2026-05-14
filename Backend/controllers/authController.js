const jwt = require("jsonwebtoken");
const User = require("../models/User");

// @desc    Auth user & get token
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (user && (await user.matchPassword(password))) {
      if (!user.isActive) {
        return res.status(401).json({ message: "Account is deactivated. Please contact Admin." });
      }

      res.json({
        _id: user._id,
        username: user.username,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid username or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register a new user (Internal/Setup)
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
  const { username, password, role } = req.body;

  try {
    const userExists = await User.findOne({ username });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      username,
      password,
      role,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generate JWT
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc    Get all users
// @route   GET /api/auth/users
const getUsers = async (req, res) => {
  const { search, role, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  let query = { _id: { $ne: req.user._id } };

  if (search) {
    query.username = { $regex: search, $options: "i" };
  }

  if (role) {
    query.role = role;
  }

  try {
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select("-password")
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    res.json({
      users,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error(`Get users error: ${error.message}`);
    res.status(500).json({ message: "Failed to retrieve users. Please try again." });
  }
};

// @desc    Update user
// @route   PUT /api/auth/users/:id
const updateUser = async (req, res) => {
  try {
    console.log("Updating User ID:", req.params.id);
    console.log("Update Body:", req.body);
    
    const user = await User.findById(req.params.id);
    if (user) {
      user.username = req.body.username || user.username;
      user.role = req.body.role || user.role;
      if (req.body.isActive !== undefined) {
        user.isActive = req.body.isActive;
      }
      if (req.body.password) {
        user.password = req.body.password;
      }
      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        username: updatedUser.username,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Detailed Update User Error:", error);
    res.status(500).json({ 
      message: error.message || "Failed to update user",
      details: error.errors ? Object.keys(error.errors).map(key => error.errors[key].message) : []
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/auth/users/:id
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      await user.deleteOne();
      res.json({ message: "User removed" });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  loginUser,
  registerUser,
  getUsers,
  updateUser,
  deleteUser,
};
