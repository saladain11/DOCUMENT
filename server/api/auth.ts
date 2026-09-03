import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { queryOne, run } from '../db.js';
import { createSession, invalidateSession, requireAuth, AuthenticatedRequest, logActivity, checkRateLimit, resetRateLimit } from '../auth.js';

export const authRouter = Router();

// Login
authRouter.post('/login', async (req: Request, res: Response) => {
  const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '127.0.0.1');
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'تم تجاوز عدد محاولات الدخول المسموح بها، يرجى المحاولة بعد قليل' });
  }

  const { username, password, rememberMe } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
  }

  const user = await queryOne<any>(`SELECT * FROM users WHERE username = ?`, [username.trim()]);
  if (!user) {
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }

  resetRateLimit(ip);
  const token = await createSession(user.id, !!rememberMe);

  // Set secure cookie
  res.cookie('session_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: (rememberMe ? 30 : 2) * 24 * 60 * 60 * 1000
  });

  await logActivity(user.id, 'تسجيل الدخول', `تم تسجيل الدخول بنجاح من المعرف: ${username}`, req);

  return res.json({
    message: 'تم تسجيل الدخول بنجاح',
    token,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      school_name: user.school_name,
      school_city: user.school_city,
      last_login_at: user.last_login_at
    }
  });
});

// Logout
authRouter.post('/logout', async (req: AuthenticatedRequest, res: Response) => {
  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.cookies && req.cookies.session_token) {
    token = req.cookies.session_token;
  }

  if (token) {
    await invalidateSession(token);
  }

  res.clearCookie('session_token');
  if (req.user) {
    await logActivity(req.user.id, 'تسجيل الخروج', 'تم تسجيل الخروج من الجلسة', req);
  }

  return res.json({ message: 'تم تسجيل الخروج بنجاح' });
});

// Me (Get current authenticated user)
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

// Update Profile
authRouter.put('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { full_name, username, email, phone, school_name, school_city } = req.body;
  const userId = req.user!.id;

  if (!full_name || !username) {
    return res.status(400).json({ error: 'الاسم الكامل واسم المستخدم حقول إجبارية' });
  }

  // Check unique username
  const existing = await queryOne<any>(`SELECT id FROM users WHERE username = ? AND id != ?`, [username.trim(), userId]);
  if (existing) {
    return res.status(400).json({ error: 'اسم المستخدم هذا مستعمل بالفعل، يرجى اختيار اسم آخر' });
  }

  await run(
    `UPDATE users SET full_name = ?, username = ?, email = ?, phone = ?, school_name = ?, school_city = ? WHERE id = ?`,
    [full_name.trim(), username.trim(), email || null, phone || null, school_name || null, school_city || null, userId]
  );

  await logActivity(userId, 'تعديل الملف الشخصي', 'تم تحديث معلومات الحساب والمؤسسة', req);

  const updatedUser = await queryOne<any>(
    `SELECT id, username, full_name, email, phone, role, school_name, school_city, last_login_at FROM users WHERE id = ?`,
    [userId]
  );

  return res.json({ message: 'تم تحديث الملف الشخصي بنجاح', user: updatedUser });
});

// Change Password
authRouter.put('/password', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user!.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'يرجى إدخال كلمة المرور الحالية وكلمة المرور الجديدة' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف' });
  }

  const user = await queryOne<any>(`SELECT password_hash FROM users WHERE id = ?`, [userId]);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  await run(`UPDATE users SET password_hash = ? WHERE id = ?`, [newHash, userId]);

  await logActivity(userId, 'تغيير كلمة المرور', 'تم تغيير كلمة المرور بنجاح', req);

  return res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
});
