import User from "../models/User.js";
import bcrypt from "bcryptjs";

// 👇 IMPORT THE CENTRAL AUDIT LOGGER SERVICE HERE
import { logAdminActivity } from "../middleware/auditLogger.js";

// Get all users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    // 🛡️ SECURITY AUDIT TRAIL: Log viewing global user registry
    await logAdminActivity(
      req,
      "USER_MANAGEMENT",
      "VIEW",
      "Accessed and viewed the global users management ledger grid."
    );

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get one user
export const getSingleUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🛡️ SECURITY AUDIT TRAIL: Log looking up a specific individual's configuration
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

    // 🛡️ SECURITY AUDIT TRAIL: Track structural privileges shifts
    await logAdminActivity(
      req,
      "USER_MANAGEMENT",
      "UPDATE",
      `Changed role of user "${user.fullName}" (${user.email}) from [${oldRole.toUpperCase()}] to [${user.role.toUpperCase()}].`
    );

    res.json({
      message: "Role updated",
      user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Suspend/activate
export const updateStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const oldStatus = user.status;
    user.status = req.body.status;
    await user.save();

    // 🛡️ SECURITY AUDIT TRAIL: Keep tabs on account flags/suspensions
    const actionVerb = user.status === "suspended" ? "SUSPENDED" : "REACTIVATED";
    await logAdminActivity(
      req,
      "USER_MANAGEMENT",
      "UPDATE",
      `${actionVerb} account access for user "${user.fullName}" (${user.email}). State shifted from [${oldStatus}] to [${user.status}].`
    );

    res.json({
      message: "Status updated",
      user
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

    // Capture user metadata BEFORE the document is wiped from the database
    const targetName = user.fullName;
    const targetEmail = user.email;
    const targetRole = user.role;

    await User.findByIdAndDelete(req.params.id);

    // 🛡️ SECURITY AUDIT TRAIL: Clear destructive actions history trail tracking 
    await logAdminActivity(
      req,
      "USER_MANAGEMENT",
      "DELETE",
      `PERMANENTLY DELETED user accounts record: "${targetName}" (${targetEmail}) who held the role [${targetRole.toUpperCase()}].`
    );

    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new user
export const createUser = async (req, res) => {
  try {
    const { fullName, email, password, role, status } = req.body;

    // 1. Basic validation
    if (!fullName || !email || !password) {
      return res.status(400).json({
        message: "Please fill in all required fields (Full Name, Email, Password)"
      });
    }

    // 2. Check if the user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        message: "A user with this email address already exists"
      });
    }

    // 3. Hash the admin-typed password manually
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create the new user
    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      role: role || "student", 
      status: status || "active" 
    });

    // 5. Return user data without sending back the password field
    const createdUser = await User.findById(newUser._id).select("-password");

    // 🛡️ SECURITY AUDIT TRAIL: Log direct manual onboarding operations 
    await logAdminActivity(
      req,
      "USER_MANAGEMENT",
      "CREATE",
      `Manually provisioned a new account profile for user "${createdUser.fullName}" (${createdUser.email}) with role [${createdUser.role.toUpperCase()}].`
    );

    res.status(201).json({
      message: "User created successfully",
      user: createdUser
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};