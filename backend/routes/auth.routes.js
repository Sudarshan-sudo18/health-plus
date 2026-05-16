import bcrypt from "bcrypt";
import { Router } from "express";
import { requireAuth, signAccessToken } from "../middleware/auth.js";
import { User } from "../models/User.js";

const SALT_ROUNDS = 12;

export const authRouter = Router();

authRouter.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, role, termsAccepted } = req.body || {};

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Name, email, password, and role are required." });
    }

    if (!["admin", "doctor", "patient"].includes(role)) {
      return res.status(400).json({ message: "Role must be admin, doctor, or patient." });
    }

    if (["doctor", "patient"].includes(role) && termsAccepted !== true) {
      return res.status(400).json({ message: "Please accept the terms and conditions to create this account." });
    }

    const existingUser = await User.findOne({ email: String(email).toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      termsAccepted: termsAccepted === true,
      termsAcceptedAt: termsAccepted === true ? new Date() : null
    });

    return res.status(201).json({
      user: user.toJSON()
    });
  } catch (error) {
    return next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password, role } = req.body || {};

    if (!email || !password || !role) {
      return res.status(400).json({ message: "Email, password, and role are required." });
    }

    const user = await User.findOne({ email: String(email).toLowerCase() }).select("+password");
    if (!user || user.role !== role) {
      return res.status(401).json({ message: "Invalid credentials or role." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid credentials or role." });
    }

    return res.json({
      accessToken: signAccessToken(user),
      user: user.toJSON()
    });
  } catch (error) {
    return next(error);
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.safeUser });
});

authRouter.post("/accept-terms", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        termsAccepted: true,
        termsAcceptedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }

    res.json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
});
