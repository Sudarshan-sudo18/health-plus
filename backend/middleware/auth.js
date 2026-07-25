import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-health-plus-secret";

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id || user._id.toString(),
      role: user.role,
      tokenVersion: Number(user.tokenVersion || 0)
    },
    JWT_SECRET,
    { expiresIn: "2h" }
  );
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing bearer token." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub).select("+tokenVersion");

    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    if (Number(payload.tokenVersion || 0) !== Number(user.tokenVersion || 0)) {
      return res.status(401).json({ message: "Your session has expired. Please sign in again." });
    }

    req.user = user;
    req.safeUser = user.toJSON();
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have access to this role route." });
    }
    return next();
  };
}

export function requireVerifiedAccount(req, res, next) {
  if (req.user && ["doctor", "patient"].includes(req.user.role) && req.user.isVerified !== true) {
    return res.status(403).json({
      code: "EMAIL_VERIFICATION_REQUIRED",
      message: "Please verify your email address to continue."
    });
  }

  return next();
}
