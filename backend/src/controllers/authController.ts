import { Request, Response, NextFunction, CookieOptions } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { SeedService } from '../services/seedService';
import { sha256, safeEqual } from '../utils/crypto';
import { jwtSecret, refreshSecret as refreshSecretKey } from '../utils/secrets';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const REFRESH_COOKIE = 'worksync_refresh';

const accessSecret = (): string => jwtSecret();
const refreshSecret = (): string => refreshSecretKey();

const generateToken = (user: IUser): string => {
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    accessSecret(),
    { expiresIn: ACCESS_TOKEN_TTL }
  );
};

const refreshCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/api/auth',
});

/** Creates a refresh token (unique via jti) and its storable hash. */
const generateRefreshToken = (user: IUser): { token: string; hash: string } => {
  const token = jwt.sign(
    { id: String(user._id), typ: 'refresh', jti: crypto.randomBytes(16).toString('hex') },
    refreshSecret(),
    { expiresIn: REFRESH_TOKEN_TTL_SECONDS }
  );
  return { token, hash: sha256(token) };
};

/** Issues a new access token, rotates the refresh token and sets the cookie. */
const startSession = async (user: IUser, res: Response): Promise<string> => {
  const refresh = generateRefreshToken(user);
  await User.updateOne({ _id: user._id }, { refreshTokenHash: refresh.hash });
  res.cookie(REFRESH_COOKIE, refresh.token, {
    ...refreshCookieOptions(),
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  });
  return generateToken(user);
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Please fill in all required fields' });
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      res.status(400).json({ success: false, message: 'Passwords do not match' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'An account with this email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    // Auto-seed demo workflow and initial data
    await SeedService.seedUserData(user._id);

    const token = await startSession(user, res);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        preferences: user.preferences,
        webhookKey: user.webhookKey,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Please provide both email and password' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    // Ensure demo data is seeded
    await SeedService.seedUserData(user._id);

    const token = await startSession(user, res);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        preferences: user.preferences,
        webhookKey: user.webhookKey,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const demoLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (process.env.ENABLE_DEMO_MODE !== 'true') {
      res.status(404).json({ success: false, message: 'Not found' });
      return;
    }
    const demoEmail = 'demo@worksync.io';
    let user = await User.findOne({ email: demoEmail });

    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('DemoPass123!', salt);
      user = await User.create({
        name: 'Alex Rivera',
        email: demoEmail,
        password: hashedPassword,
      });
    }

    await SeedService.seedUserData(user._id);
    const token = await startSession(user, res);

    res.status(200).json({
      success: true,
      message: 'Logged in as Demo User',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        preferences: user.preferences,
        webhookKey: user.webhookKey,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const presented: string | undefined = req.cookies?.[REFRESH_COOKIE];
    if (!presented) {
      res.status(401).json({ success: false, message: 'Refresh token required' });
      return;
    }

    let payload: { id: string; typ?: string };
    try {
      payload = jwt.verify(presented, refreshSecret()) as { id: string; typ?: string };
    } catch {
      res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
      res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
      return;
    }
    if (payload.typ !== 'refresh') {
      res.status(401).json({ success: false, message: 'Invalid refresh token' });
      return;
    }

    const user = await User.findById(payload.id).select('+refreshTokenHash');
    if (!user || !user.refreshTokenHash || !safeEqual(user.refreshTokenHash, sha256(presented))) {
      // Unknown or already-rotated token: treat as possible theft and revoke the session
      if (user) await User.updateOne({ _id: user._id }, { refreshTokenHash: null });
      res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
      res.status(401).json({ success: false, message: 'Refresh token has been revoked' });
      return;
    }

    // Rotate. The filter on the old hash makes concurrent reuse of one token fail.
    const next_ = generateRefreshToken(user);
    const rotated = await User.findOneAndUpdate(
      { _id: user._id, refreshTokenHash: sha256(presented) },
      { refreshTokenHash: next_.hash }
    );
    if (!rotated) {
      res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
      res.status(401).json({ success: false, message: 'Refresh token has been revoked' });
      return;
    }

    res.cookie(REFRESH_COOKIE, next_.token, {
      ...refreshCookieOptions(),
      maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
    });
    res.status(200).json({ success: true, token: generateToken(user) });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const presented: string | undefined = req.cookies?.[REFRESH_COOKIE];
    if (presented) {
      // Ignore expiry: an expired cookie should still be able to log out cleanly
      const payload = jwt.verify(presented, refreshSecret(), { ignoreExpiration: true }) as { id?: string };
      if (payload?.id) {
        await User.updateOne({ _id: payload.id }, { refreshTokenHash: null });
      }
    }
  } catch {
    // Invalid cookie: nothing to invalidate
  }
  try {
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id).select('-password');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        preferences: user.preferences,
        webhookKey: user.webhookKey,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: 'Name is required' });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.user?.id,
      { name },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Both current and new password are required' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
      return;
    }

    const user = await User.findById(req.user?.id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Current password does not match' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const updatePreferences = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { emailNotifications, workflowNotifications, autoRetryFailed } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user?.id,
      {
        preferences: {
          emailNotifications: Boolean(emailNotifications),
          workflowNotifications: Boolean(workflowNotifications),
          autoRetryFailed: Boolean(autoRetryFailed),
        },
      },
      { new: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Preferences saved successfully',
      user,
    });
  } catch (error) {
    next(error);
  }
};
