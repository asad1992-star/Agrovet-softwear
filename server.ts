import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(process.cwd(), 'public')));

// User & OTP in-memory and file-persisted store
export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string; // Base64 / encoded password
  name: string;
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
}

interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  type: 'signup' | 'forgot_password';
}

const otpStore = new Map<string, OtpRecord>();

// Simple file-backed database storage directory
const DATA_DIR = path.join(process.cwd(), '.farm_storage');
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.warn('Could not create storage dir:', e);
  }
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');

const readUsers = (): Record<string, StoredUser> => {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading users file:', e);
  }
  return {};
};

const saveUsers = (users: Record<string, StoredUser>) => {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing users file:', e);
  }
};

// Farm data per user
const getFarmDataFile = (email: string) => {
  const safeEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return path.join(DATA_DIR, `farm_${safeEmail}.json`);
};

// Setup nodemailer transporter
const SMTP_USER = (process.env.SMTP_USER || 'Vetasad1992@gmail.com').trim();
const SMTP_PASS = (process.env.SMTP_PASS || '@Sad1992#.#').replace(/\s+/g, '');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

// Helper to generate a secure 4-digit code
const generate4DigitOtp = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// HTML Email Generator
const createOtpEmailHtml = (otp: string, type: 'signup' | 'forgot_password', recipientEmail: string) => {
  const isSignup = type === 'signup';
  const title = isSignup ? 'Confirm Your AgroVet Pro Account' : 'Reset Your AgroVet Pro Password';
  const subtitle = isSignup
    ? 'Welcome to AgroVet Pro Farm Management. Use the verification code below to activate your account.'
    : 'We received a request to reset your password. Use the verification code below to set a new password.';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background-color: #f8fafc; color: #1e293b; border-radius: 24px;">
      <div style="text-align: center; margin-bottom: 28px;">
        <div style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 20px; border-radius: 16px; font-weight: 900; font-size: 20px; letter-spacing: -0.5px; box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.3);">
          AgroVet Pro
        </div>
        <p style="margin-top: 8px; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px;">
          Dairy &amp; Cattle Farm Management System
        </p>
        <p style="margin-top: 2px; font-size: 12px; font-weight: 700; color: #059669;">
          Powered by Dr. Asad Mehmood
        </p>
      </div>

      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 12px;">
          ${title}
        </h2>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
          ${subtitle}
        </p>

        <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 2px dashed #93c5fd; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <p style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #1d4ed8; margin: 0 0 8px 0;">
            Your 4-Digit Verification Code
          </p>
          <div style="font-size: 42px; font-weight: 900; letter-spacing: 10px; color: #1e3a8a; font-family: monospace;">
            ${otp}
          </div>
          <p style="font-size: 12px; color: #64748b; margin: 8px 0 0 0;">
            ⏱ Valid for <strong>10 minutes</strong> (Maximum 3 attempts)
          </p>
        </div>

        <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 20px; font-size: 13px; color: #64748b; line-height: 1.5;">
          <p style="margin: 0 0 8px 0;">
            • If you did not request this code for <strong>${recipientEmail}</strong>, please ignore this email.
          </p>
          <p style="margin: 0;">
            • Never share your verification code with anyone.
          </p>
        </div>
      </div>

      <div style="text-align: center; margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 12px; font-weight: 700; color: #475569; margin: 0 0 8px 0;">
          Need Help or Custom Features for Your Farm?
        </p>
        <a href="https://wa.me/923136451992?text=Hello%20Dr.%20Asad,%20I%20need%20help%20with%20my%20AgroVet%20Pro%20farm%20account." target="_blank" style="display: inline-flex; align-items: center; background-color: #22c55e; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 12px; font-weight: 700; font-size: 13px; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);">
          💬 WhatsApp Support: +92 313 6451992
        </a>
        <p style="font-size: 11px; color: #94a3b8; margin-top: 12px;">
          AgroVet Pro &copy; ${new Date().getFullYear()} Dr. Asad Mehmood. All rights reserved.
        </p>
      </div>
    </div>
  `;
};

// ======================= API ROUTES =======================

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 2. Send OTP endpoint
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email, type } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const otpType: 'signup' | 'forgot_password' = type === 'forgot_password' ? 'forgot_password' : 'signup';

    const users = readUsers();
    const userExists = !!users[cleanEmail];

    if (otpType === 'forgot_password' && !userExists) {
      return res.status(404).json({
        success: false,
        error: 'No account found with this email address. Please sign up first.'
      });
    }

    if (otpType === 'signup' && userExists) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email already exists. Please log in or use Forgot Password.'
      });
    }

    // Check rate limit (30s cooldown)
    const existing = otpStore.get(cleanEmail);
    const now = Date.now();
    if (existing && existing.lastSentAt && now - existing.lastSentAt < 30000) {
      const waitSec = Math.ceil((30000 - (now - existing.lastSentAt)) / 1000);
      return res.status(429).json({
        success: false,
        error: `Please wait ${waitSec} seconds before requesting a new OTP.`
      });
    }

    const otp = generate4DigitOtp();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes

    otpStore.set(cleanEmail, {
      code: otp,
      expiresAt,
      attempts: 0,
      lastSentAt: now,
      type: otpType
    });

    const subject = otpType === 'signup'
      ? `Your AgroVet Pro Verification Code: ${otp}`
      : `Reset Your AgroVet Pro Password - Code: ${otp}`;

    const html = createOtpEmailHtml(otp, otpType, cleanEmail);

    let emailSent = false;
    let emailError = '';

    try {
      await transporter.sendMail({
        from: `"AgroVet Pro - Dairy & Cattle Farm Management System powered by Asad Mehmood" <${SMTP_USER}>`,
        to: cleanEmail,
        subject,
        html
      });
      emailSent = true;
      console.log(`[AUTH] OTP email sent successfully to ${cleanEmail}`);
    } catch (mailErr: any) {
      emailError = mailErr?.message || String(mailErr);
      console.warn(`[AUTH] Direct SMTP send failed for ${cleanEmail}:`, emailError);
    }

    return res.json({
      success: true,
      message: `4-digit verification code sent to ${cleanEmail}. Please check your email inbox (and spam folder).`,
      emailSent,
      expiresInMinutes: 10
    });
  } catch (error: any) {
    console.error('[AUTH] Send OTP error:', error);
    return res.status(500).json({ success: false, error: 'Failed to process OTP request.' });
  }
});

// 3. Verify OTP endpoint
app.post('/api/auth/verify-otp', (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and OTP code are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    const record = otpStore.get(cleanEmail);
    if (!record) {
      return res.status(400).json({
        success: false,
        error: 'No active OTP found. Please request a new verification code.'
      });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanEmail);
      return res.status(400).json({
        success: false,
        error: 'Verification code has expired (10 min limit). Please request a new code.'
      });
    }

    if (record.attempts >= 3) {
      otpStore.delete(cleanEmail);
      return res.status(400).json({
        success: false,
        error: 'Maximum 3 attempts exceeded. This OTP is now invalid. Please request a new code.'
      });
    }

    if (record.code !== cleanOtp) {
      record.attempts += 1;
      const remainingAttempts = 3 - record.attempts;
      return res.status(400).json({
        success: false,
        error: `Incorrect 4-digit code. ${remainingAttempts} attempt(s) remaining.`
      });
    }

    return res.json({
      success: true,
      message: 'OTP verified successfully.'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Verification failed.' });
  }
});

// Password validation helper: Uppercase, Lowercase, Number, Special Character
const validatePasswordComplexity = (password: string): { valid: boolean; error?: string } => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter (a-z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number (0-9).' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character (!@#$%^&* etc).' };
  }
  return { valid: true };
};

// 4. Signup endpoint
app.post('/api/auth/signup', (req, res) => {
  try {
    const { email, password, otp, name } = req.body;
    if (!email || !password || !otp) {
      return res.status(400).json({ success: false, error: 'Email, password, and OTP code are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    // Verify OTP first
    const record = otpStore.get(cleanEmail);
    if (!record) {
      return res.status(400).json({ success: false, error: 'No active OTP found. Please request a new verification code.' });
    }
    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanEmail);
      return res.status(400).json({ success: false, error: 'Verification code has expired (10 min limit). Please request a new code.' });
    }
    if (record.attempts >= 3) {
      otpStore.delete(cleanEmail);
      return res.status(400).json({ success: false, error: 'Maximum 3 attempts exceeded. This OTP is now invalid. Please request a new code.' });
    }
    if (record.code !== cleanOtp) {
      record.attempts += 1;
      const remainingAttempts = 3 - record.attempts;
      return res.status(400).json({
        success: false,
        error: `Incorrect 4-digit code. ${remainingAttempts} attempt(s) remaining.`
      });
    }

    const complexity = validatePasswordComplexity(password);
    if (!complexity.valid) {
      return res.status(400).json({ success: false, error: complexity.error });
    }

    const users = readUsers();
    if (users[cleanEmail]) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
    }

    const newUser: StoredUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: cleanEmail,
      passwordHash: Buffer.from(password).toString('base64'),
      name: name?.trim() || cleanEmail.split('@')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    users[cleanEmail] = newUser;
    saveUsers(users);
    otpStore.delete(cleanEmail); // Clear OTP after successful registration

    // Initialize clean slate database file for new user (Option A: zero animals)
    const userDbFile = getFarmDataFile(cleanEmail);
    if (!fs.existsSync(userDbFile)) {
      fs.writeFileSync(userDbFile, JSON.stringify({
        animals: [],
        reproEvents: [],
        healthEvents: [],
        medicines: [],
        purchases: [],
        enrollments: [],
        customProtocols: [],
        settings: null,
        updatedAt: new Date().toISOString()
      }, null, 2), 'utf-8');
    }

    return res.json({
      success: true,
      message: 'Account created successfully!',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        createdAt: newUser.createdAt
      }
    });
  } catch (error: any) {
    console.error('[AUTH] Signup error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create account.' });
  }
});

// 5. Login endpoint (Standard fast access, no OTP needed for regular logins)
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = readUsers();
    const user = users[cleanEmail];

    // Master account bootstrap check
    const isMasterEmail = cleanEmail === 'chasad51992@gmail.com' || cleanEmail === 'vetasad1992@gmail.com' || cleanEmail === 'va.asad92@gmail.com';

    if (!user) {
      if (isMasterEmail && (password === '@Sad1992#.#' || password === 'Asad1992#')) {
        // Auto-register master account if first time
        const masterUser: StoredUser = {
          id: `master_asad`,
          email: cleanEmail,
          passwordHash: Buffer.from(password).toString('base64'),
          name: 'Dr. Asad Mehmood',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        users[cleanEmail] = masterUser;
        saveUsers(users);
        return res.json({
          success: true,
          user: { id: masterUser.id, email: masterUser.email, name: masterUser.name, isMaster: true }
        });
      }
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const providedHash = Buffer.from(password).toString('base64');
    if (user.passwordHash !== providedHash) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        isMaster: isMasterEmail
      }
    });
  } catch (error: any) {
    console.error('[AUTH] Login error:', error);
    return res.status(500).json({ success: false, error: 'Login failed.' });
  }
});

// 6. Reset password endpoint
app.post('/api/auth/reset-password', (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email, OTP code, and new password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    // Verify OTP
    const record = otpStore.get(cleanEmail);
    if (!record) {
      return res.status(400).json({ success: false, error: 'No active OTP found. Please request a new verification code.' });
    }
    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanEmail);
      return res.status(400).json({ success: false, error: 'Verification code has expired (10 min limit). Please request a new code.' });
    }
    if (record.attempts >= 3) {
      otpStore.delete(cleanEmail);
      return res.status(400).json({ success: false, error: 'Maximum 3 attempts exceeded. This OTP is now invalid. Please request a new code.' });
    }
    if (record.code !== cleanOtp) {
      record.attempts += 1;
      const remainingAttempts = 3 - record.attempts;
      return res.status(400).json({
        success: false,
        error: `Incorrect 4-digit code. ${remainingAttempts} attempt(s) remaining.`
      });
    }

    const complexity = validatePasswordComplexity(newPassword);
    if (!complexity.valid) {
      return res.status(400).json({ success: false, error: complexity.error });
    }

    const users = readUsers();
    const user = users[cleanEmail];
    if (!user) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    user.passwordHash = Buffer.from(newPassword).toString('base64');
    user.updatedAt = new Date().toISOString();
    users[cleanEmail] = user;
    saveUsers(users);

    otpStore.delete(cleanEmail); // Clear OTP

    return res.json({
      success: true,
      message: 'Password reset successfully! Full farm access restored.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    console.error('[AUTH] Reset password error:', error);
    return res.status(500).json({ success: false, error: 'Password reset failed.' });
  }
});

// 7. Farm Data per User (Sync & Persistence)
app.get('/api/farm-data/:email', (req, res) => {
  try {
    const email = req.params.email?.toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Update lastActiveAt timestamp in users store
    const users = readUsers();
    if (users[email]) {
      users[email].lastActiveAt = new Date().toISOString();
      saveUsers(users);
    }

    const file = getFarmDataFile(email);
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      return res.json({ success: true, data });
    }
    return res.json({ success: true, data: null });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message });
  }
});

app.post('/api/farm-data/:email', (req, res) => {
  try {
    const email = req.params.email?.toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const users = readUsers();
    if (users[email]) {
      users[email].lastActiveAt = new Date().toISOString();
      saveUsers(users);
    }

    const file = getFarmDataFile(email);
    const payload = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf-8');
    return res.json({ success: true, savedAt: payload.updatedAt });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message });
  }
});

// Start Server with Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AgroVet Pro Server running on port ${PORT}`);
  });
}

startServer();
