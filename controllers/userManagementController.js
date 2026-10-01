import User from "../models/User.js";
import bcrypt from "bcryptjs";

// Central audit logger service
import { logAdminActivity } from "../middleware/auditLogger.js";

// Get users with pagination, search, and role filtering
export const getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      role = "all",
    } = req.query;

    // -----------------------------
    // PAGINATION
    // -----------------------------
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);

    // Never allow more than 20 users per request
    const usersPerPage = Math.min(
      Math.max(parseInt(limit, 10) || 20, 1),
      20
    );

    const skip = (currentPage - 1) * usersPerPage;

    // -----------------------------
    // BUILD FILTER
    // -----------------------------
    const filter = {};

    // Search by full name or email
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");

      filter.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
      ];
    }

    // Filter by role
    if (
      role &&
      role !== "all" &&
      ["admin", "instructor", "student"].includes(role)
    ) {
      filter.role = role;
    }

    // -----------------------------
    // FETCH USERS
    // -----------------------------
    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(usersPerPage)
      .lean();

    // -----------------------------
    // CHECK IF MORE USERS EXIST
    // -----------------------------
    const nextUser = await User.findOne(filter)
      .sort({ createdAt: -1 })
      .skip(skip + usersPerPage)
      .select("_id")
      .lean();

    const hasMore = Boolean(nextUser);

    // Security audit trail
    await logAdminActivity(
      req,
      "USER_MANAGEMENT",
      "VIEW",
      `Accessed users management registry page ${currentPage} with ${usersPerPage} records per request.`
    );

    res.json({
      success: true,
      users,
      page: currentPage,
      limit: usersPerPage,
      hasMore,
    });
  } catch (error) {
    console.error("Failed to fetch users:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get one user
export const getSingleUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Security audit trail
    await logAdminActivity(
      req,
      "USER_MANAGEMENT",
      "VIEW",
      `Opened profile settings detail audit for user: "${user.fullName}" (${user.email}).`
    );

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Change role
export const updateRole = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const oldRole = user.role;

    user.role = req.body.role;

    await user.save();

    // Security audit trail
    await logAdminActivity(
      req,
      "USER_MANAGEMENT",
      "UPDATE",
      `Changed role of user "${user.fullName}" (${user.email}) from [${oldRole.toUpperCase()}] to [${user.role.toUpperCase()}].`
    );

    res.json({
      message: "Role updated",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Suspend / activate
export const updateStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const oldStatus = user.status;

    user.status = req.body.status;

    await user.save();

    // Security audit trail
    const actionVerb =
      user.status === "suspended"
        ? "SUSPENDED"
        : "REACTIVATED";

    await logAdminActivity(
      req,
      "USER_MANAGEMENT",
      "UPDATE",
      `${actionVerb} account access for user "${user.fullName}" (${user.email}). State shifted from [${oldStatus}] to [${user.status}].`
    );

    res.json({
      message: "Status updated",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Capture metadata BEFORE deletion
    const targetName = user.fullName;
    const targetEmail = user.email;
    const targetRole = user.role;

    await User.findByIdAndDelete(req.params.id);

    // Security audit trail
    await logAdminActivity(
      req,
      "USER_MANAGEMENT",
      "DELETE",
      `PERMANENTLY DELETED user accounts record: "${targetName}" (${targetEmail}) who held the role [${targetRole.toUpperCase()}].`
    );

    res.json({
      message: "User deleted",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new user
export const createUser = async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      role,
      status,
    } = req.body;

    // Basic validation
    if (!fullName || !email || !password) {
      return res.status(400).json({
        message:
          "Please fill in all required fields (Full Name, Email, Password)",
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        message:
          "A user with this email address already exists",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(
      password,
      salt
    );

    // Create user
    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      role: role || "student",
      status: status || "active",
    });

    // Return user without password
    const createdUser = await User.findById(
      newUser._id
    ).select("-password");

    // Security audit trail
    await logAdminActivity(
      req,
      "USER_MANAGEMENT",
      "CREATE",
      `Manually provisioned a new account profile for user "${createdUser.fullName}" (${createdUser.email}) with role [${createdUser.role.toUpperCase()}].`
    );

    res.status(201).json({
      message: "User created successfully",
      user: createdUser,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};