const User = require('../models/User');
const Company = require('../models/Company');
const AuditLog = require('../models/AuditLog');
const { generateAccessToken, generateRefreshToken } = require('../middleware/auth');
const { sendEmail } = require('../services/mailService');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Onboard new Company & Company Admin
const register = async (req, res) => {
  try {
    const { name, email, password, companyName } = req.body;

    // Check email uniqueness
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Check company name uniqueness
    let company = await Company.findOne({ name: companyName });
    if (company) {
      return res.status(400).json({ error: 'Company name already registered' });
    }

    // Construct company domain (Handle public email providers like gmail.com cleanly)
    const emailDomain = (email.split('@')[1] || '').toLowerCase();
    const publicDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'protonmail.com', 'live.com'];
    const cleanCompName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const companyDomain = publicDomains.includes(emailDomain)
      ? `${cleanCompName || 'company'}-${Date.now().toString(36)}.com`
      : emailDomain;

    // Create Company (Tenant Root)
    company = await Company.create({
      name: companyName,
      domain: companyDomain
    });

    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create User (Company Admin)
    const user = await User.create({
      name,
      email,
      password,
      role: 'Company Admin',
      companyId: company._id,
      status: 'Active',
      isVerified: true,
      verificationToken
    });

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Verify your ExpensePilot Account',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 32px; borderRadius: 16px; max-width: 550px; margin: 0 auto;">
          <h2 style="color: #6366f1; font-size: 24px; margin-bottom: 12px;">Welcome to ExpensePilot!</h2>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">Hello <strong>${user.name}</strong>,</p>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">Thank you for registering your company <strong>${companyName}</strong>. Please click the button below to verify your email address and activate your administrator account:</p>
          <div style="margin: 28px 0; text-align: center;">
            <a href="${verificationUrl}" target="_blank" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">Verify Email Address</a>
          </div>
          <p style="font-size: 12px; color: #64748b; line-height: 1.5;">Or copy and paste your verification token directly into the app:</p>
          <div style="background-color: #020617; padding: 12px; border-radius: 8px; border: 1px solid #334155; font-family: monospace; font-size: 12px; color: #38bdf8; word-break: break-all; margin-top: 8px;">
            ${verificationToken}
          </div>
        </div>
      `
    });

    console.log('\n======================================================');
    console.log(`[VERIFICATION EMAIL DISPATCHED]`);
    console.log(`TO:               ${user.email}`);
    console.log(`VERIFICATION URL: ${verificationUrl}`);
    console.log(`TOKEN:            ${verificationToken}`);
    console.log('======================================================\n');

    // Audit Log
    await AuditLog.create({
      companyId: company._id,
      userId: user._id,
      action: 'USER_REGISTER',
      details: { email: user.email, role: user.role, companyName },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({
      message: 'Onboarding registration completed successfully. Please check your email inbox (or Spam/Junk folder) to verify your account.',
      verificationToken: process.env.NODE_ENV !== 'production' ? verificationToken : undefined
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Email Verification Handler
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.status(400).json({ error: 'Invalid or expired verification token' });

    user.isVerified = true;
    user.status = 'Active';
    user.verificationToken = undefined;
    await user.save();

    await AuditLog.create({
      companyId: user.companyId,
      userId: user._id,
      action: 'USER_VERIFY_EMAIL',
      details: { email: user.email },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: 'Email verified successfully. You can now login.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Login User
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    if (user.status === 'Suspended') {
      return res.status(403).json({ error: 'Your account is suspended. Please contact your administrator.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid email or password' });

    // Enforce Email Verification check (can be toggled in dev, but let's enforce or auto-verify for convenience)
    // We will enforce, but let's make sure it's clear
    if (!user.isVerified) {
      return res.status(403).json({ error: 'Please verify your email address before logging in' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token in HTTP-only Cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    await AuditLog.create({
      companyId: user.companyId,
      userId: user._id,
      action: 'USER_LOGIN',
      details: { email: user.email, role: user.role },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        departmentId: user.departmentId
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Refresh Access Token
const refreshToken = async (req, res) => {
  try {
    const cookieToken = req.cookies?.refreshToken;
    const bodyToken = req.body?.refreshToken;
    const token = cookieToken || bodyToken;

    if (!token) return res.status(401).json({ error: 'Refresh token is missing' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_key_123456789_xyz');
    } catch (err) {
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ error: 'Token is no longer valid' });
    }

    const newAccessToken = generateAccessToken(user);
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Logout User
const logout = async (req, res) => {
  try {
    const cookieToken = req.cookies?.refreshToken;
    const bodyToken = req.body?.refreshToken;
    const token = cookieToken || bodyToken;

    if (token) {
      const decoded = jwt.decode(token);
      if (decoded && decoded.id) {
        const user = await User.findById(decoded.id);
        if (user) {
          user.refreshToken = undefined;
          await user.save();
        }
      }
    }

    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Forgot Password Request
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      // Avoid revealing that a user doesn't exist for security
      return res.json({ message: 'If that email exists in our system, we have sent a reset password link.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Reset your ExpensePilot Password',
      html: `
        <h3>Password Reset Request</h3>
        <p>You requested a password reset. Click the link below to set a new password. This link is valid for 1 hour.</p>
        <a href="${resetUrl}" target="_blank">Reset Password</a>
      `
    });

    res.json({ message: 'If that email exists in our system, we have sent a reset password link.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Reset Password Action
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    await AuditLog.create({
      companyId: user.companyId,
      userId: user._id,
      action: 'USER_RESET_PASSWORD',
      details: { email: user.email },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: 'Password updated successfully. You can now login.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  register,
  verifyEmail,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword
};
