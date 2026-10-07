const User = require('../models/User');
const Department = require('../models/Department');
const AuditLog = require('../models/AuditLog');
const { sendEmail } = require('../services/mailService');
const crypto = require('crypto');

// Get all users in the tenant company (Supports pagination, search, sorting)
const getCompanyUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', sortBy = 'name', order = 'asc', departmentId } = req.query;

    const query = { ...req.tenantFilter };

    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (departmentId) {
      query.departmentId = departmentId;
    }

    const sortOrder = order === 'desc' ? -1 : 1;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(query)
      .populate('departmentId', 'name')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-password -refreshToken');

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin/HR invite new Employee
const inviteUser = async (req, res) => {
  try {
    const { name, email, role, departmentId, password } = req.body;

    if (req.user.role !== 'Company Admin' && req.user.role !== 'HR Manager') {
      return res.status(403).json({ error: 'Only Company Admins or HR Managers can invite users' });
    }

    // Verify user doesn't already exist
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'User with this email is already registered' });
    }

    // Verify department belongs to same company
    if (departmentId) {
      const dept = await Department.findOne({ _id: departmentId, companyId: req.user.companyId });
      if (!dept) {
        return res.status(400).json({ error: 'Invalid department ID' });
      }
    }

    // Use admin specified password or generate temporary password
    const userPassword = (password && password.trim()) ? password.trim() : crypto.randomBytes(8).toString('hex');

    const newUser = await User.create({
      name,
      email,
      password: userPassword,
      role: role || 'Employee',
      companyId: req.user.companyId,
      departmentId: departmentId || undefined,
      status: 'Active', // Pre-verified by Admin
      isVerified: true
    });

    // Send Invitation Email
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
    await sendEmail({
      to: newUser.email,
      subject: 'You have been invited to ExpensePilot',
      html: `
        <h3>Welcome to ExpensePilot!</h3>
        <p>You have been added to the company dashboard. Here are your credentials:</p>
        <p><strong>Email:</strong> ${newUser.email}</p>
        <p><strong>Password:</strong> ${userPassword}</p>
        <p>Please change your password after logging in if required.</p>
        <a href="${loginUrl}" target="_blank">Login Now</a>
      `
    });

    await AuditLog.create({
      companyId: req.user.companyId,
      userId: req.user.id,
      action: 'USER_INVITE',
      details: { invitedEmail: newUser.email, invitedRole: newUser.role },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({
      message: 'Employee invited successfully',
      passwordAssigned: userPassword,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        departmentId: newUser.departmentId
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update user details
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, departmentId, status } = req.body;

    if (req.user.role !== 'Company Admin' && req.user.role !== 'HR Manager') {
      return res.status(403).json({ error: 'Unauthorized to modify user files' });
    }

    const user = await User.findOne({ _id: id, companyId: req.user.companyId });
    if (!user) return res.status(404).json({ error: 'Employee not found' });

    // Restrict Company Admin changes
    if (user.role === 'Company Admin' && req.user.role !== 'Company Admin') {
      return res.status(403).json({ error: 'Only Company Admins can edit other Admins' });
    }

    if (name) user.name = name;
    if (role && req.user.role === 'Company Admin') user.role = role; // Only Company Admin can change roles
    if (status) user.status = status;
    
    if (departmentId !== undefined) {
      if (!departmentId || departmentId === 'null' || departmentId === 'unassigned') {
        user.departmentId = undefined;
      } else {
        const dept = await Department.findOne({ _id: departmentId, companyId: req.user.companyId });
        if (!dept) return res.status(400).json({ error: 'Department does not exist' });
        user.departmentId = departmentId;
      }
    }

    await user.save();

    await AuditLog.create({
      companyId: req.user.companyId,
      userId: req.user.id,
      action: 'USER_UPDATE_ADMIN',
      details: { updatedUserId: user._id, role: user.role, status: user.status },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get profile details
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -refreshToken').populate('companyId', 'name');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update profile details
const updateProfile = async (req, res) => {
  try {
    const { name, password } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (name) user.name = name;
    if (password) user.password = password; // Pre-save hook will hash it

    await user.save();

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getCompanyUsers,
  inviteUser,
  updateUser,
  getProfile,
  updateProfile
};
