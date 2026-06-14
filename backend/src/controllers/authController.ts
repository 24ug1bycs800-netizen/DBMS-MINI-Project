import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db/db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
 
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must be set. Refusing to start with insecure defaults.");
}

const generateTokens = (user: { id: number; email: string; role: string; fullName: string }) => {
  const payload = { id: user.id, email: user.email, role: user.role, fullName: user.fullName };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });
  return { accessToken, refreshToken };
};
 
// REGISTER
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: "All fields (email, password, fullName) are required" });
    }
 
    const emailLower = email.toLowerCase().trim();
    const hashedPassword = await bcrypt.hash(password, 10);
 
    const existing = await db.select().from(users).where(eq(users.email, emailLower)).limit(1);
    if (existing[0]) {
      return res.status(409).json({ error: "User with this email already exists" });
    }
 
    // SECURITY: never derive privileges from user-supplied input. All self-registrations
    // are plain users. Admins must be provisioned directly in the database (or via a
    // trusted, server-side process), never by typing a special email address.
    const inserted = await db.insert(users).values({
      email: emailLower,
      passwordHash: hashedPassword,
      fullName,
      role: "user",
    }).returning();
    const newUser = inserted[0];
 
    const { accessToken, refreshToken } = generateTokens(newUser);
 
    return res.status(201).json({
      message: "User registered successfully",
      accessToken,
      refreshToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        profilePic: newUser.profilePic,
      },
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ error: "Internal server error during registration" });
  }
};
 
// LOGIN
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
 
    const emailLower = email.toLowerCase().trim();
    const dbUsers = await db.select().from(users).where(eq(users.email, emailLower)).limit(1);
    const user = dbUsers[0] || null;
 
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
 
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
 
    const { accessToken, refreshToken } = generateTokens(user);
 
    return res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        profilePic: user.profilePic,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error during login" });
  }
};
 
// GET PROFILE
export const getProfile = async (req: Request, res: Response) => {
  try {
    const reqUser = (req as any).user;
    const dbUsers = await db.select().from(users).where(eq(users.id, reqUser.id)).limit(1);
    const user = dbUsers[0] || null;
 
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
 
    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        profilePic: user.profilePic,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    return res.status(500).json({ error: "Internal server error fetching profile" });
  }
};
 
// UPDATE PROFILE
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const reqUser = (req as any).user;
    const { fullName, profilePic } = req.body;
 
    const updates: Record<string, any> = {};
    if (fullName) updates.fullName = fullName;
    if (profilePic) updates.profilePic = profilePic;
 
    const updated = await db.update(users).set(updates).where(eq(users.id, reqUser.id)).returning();
    const updatedUser = updated[0];
 
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }
 
    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
        profilePic: updatedUser.profilePic,
      },
    });
  } catch (err) {
    console.error("Update profile error:", err);
    return res.status(500).json({ error: "Internal server error updating profile" });
  }
};
 
// REFRESH TOKEN
export const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required" });
  }
 
  try {
    jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err: any, decoded: any) => {
      if (err) {
        return res.status(403).json({ error: "Invalid or expired refresh token" });
      }
      const accessToken = jwt.sign(
        { id: decoded.id, email: decoded.email, role: decoded.role, fullName: decoded.fullName },
        JWT_SECRET,
        { expiresIn: "1d" }
      );
      return res.status(200).json({ accessToken });
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error processing refresh token" });
  }
};
 
// FORGOT PASSWORD (simulated)
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  console.log(`Password reset requested for: ${email}`);
  return res.status(200).json({ message: "Password reset link sent to registered email (simulated)" });
};
 
// RESET PASSWORD (simulated)
export const resetPassword = async (req: Request, res: Response) => {
  return res.status(200).json({ message: "Password has been reset successfully" });
};