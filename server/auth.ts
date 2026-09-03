import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query, queryOne, run } from './db.js';

export interface AuthUser {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  school_name: string | null;
  school_city: string | null;
  last_login_at: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// In-memory brute force rate limiting for login
const loginAttempts: Record<string, { count: number; resetAt: number }> = {};

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts[ip];
  if (!record) {
    loginAttempts[ip] = { count: 1, resetAt: now + 15 * 60 * 1000 };
    return true;
  }
  if (now > record.resetAt) {
    loginAttempts[ip] = { count: 1, resetAt: now + 15 * 60 * 1000 };
    return true;
  }
  record.count += 1;
  return record.count <= 15; // Max 15 attempts per 15 minutes
}

export function resetRateLimit(ip: string) {
  delete loginAttempts[ip];
}

export async function createSession(userId: string, rememberMe = false): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const sessionId = 'ses_' + crypto.randomBytes(8).toString('hex');
  const days = rememberMe ? 30 : 2;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  // Rotate sessions - keep max 5 per user
  await run(`DELETE FROM sessions WHERE user_id = ? AND expires_at < datetime('now')`, [userId]);

  await run(
    `INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`,
    [sessionId, userId, token, expiresAt]
  );

  await run(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`, [userId]);

  return token;
}

export async function validateToken(token: string): Promise<AuthUser | null> {
  if (!token) return null;

  const session = await queryOne<{ user_id: string; expires_at: string }>(
    `SELECT user_id, expires_at FROM sessions WHERE token = ? AND expires_at > datetime('now')`,
    [token]
  );

  if (!session) return null;

  const user = await queryOne<AuthUser>(
    `SELECT id, username, full_name, email, phone, role, school_name, school_city, last_login_at FROM users WHERE id = ?`,
    [session.user_id]
  );

  return user;
}

export async function invalidateSession(token: string): Promise<void> {
  if (!token) return;
  await run(`DELETE FROM sessions WHERE token = ?`, [token]);
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.cookies && req.cookies.session_token) {
    token = req.cookies.session_token;
  }

  if (!token) {
    return res.status(401).json({ error: 'غير مصرح بالدخول، يرجى تسجيل الدخول أولاً' });
  }

  const user = await validateToken(token);
  if (!user) {
    return res.status(401).json({ error: 'انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول' });
  }

  req.user = user;
  next();
}

export async function logActivity(userId: string | null, action: string, details: string, req?: Request) {
  try {
    const actId = 'act_' + crypto.randomBytes(8).toString('hex');
    const ip = req ? (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '127.0.0.1') : null;
    await run(
      `INSERT INTO activity_logs (id, user_id, action, details, ip) VALUES (?, ?, ?, ?, ?)`,
      [actId, userId, action, details, ip]
    );
  } catch (e) {
    console.error('Failed to write activity log:', e);
  }
}
