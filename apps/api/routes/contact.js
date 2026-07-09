import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Resend } from 'resend';

const router = Router();

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many messages sent. Please try again later.' } },
});

let _resend = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

function esc(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// POST /api/contact — public, rate-limited 5/hr/IP
router.post('/', contactLimiter, async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body ?? {};

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'All fields are required.' } });
    }
    if (typeof message !== 'string' || message.length > 2000) {
      return res.status(400).json({ error: { code: 'INVALID_MESSAGE', message: 'Message must be under 2000 characters.' } });
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn('[contact] RESEND_API_KEY not set — skipping contact email');
      return res.json({ ok: true });
    }

    const toAddress = process.env.RESEND_FROM_EMAIL ?? 'orders@joycurry.net';

    const { error } = await getResend().emails.send({
      from: toAddress,
      to: [toAddress],
      reply_to: email,
      subject: `[Joy Curry Contact] ${esc(subject)} — from ${esc(name)}`,
      html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;max-width:600px;margin:32px auto;color:#222;">
        <h2 style="color:#541C0D;">New contact message</h2>
        <p><strong>Name:</strong> ${esc(name)}</p>
        <p><strong>Email:</strong> ${esc(email)}</p>
        <p><strong>Subject:</strong> ${esc(subject)}</p>
        <hr style="border:none;border-top:1px solid #ddd;margin:16px 0;">
        <p style="white-space:pre-wrap;">${esc(message)}</p>
        <hr style="border:none;border-top:1px solid #ddd;margin:16px 0;">
        <p style="font-size:12px;color:#999;">Sent via joycurry.com contact form</p>
      </body></html>`,
    });

    if (error) {
      console.error('[contact] Resend error:', error);
      return res.status(502).json({ error: { code: 'EMAIL_FAILED', message: 'Could not send your message. Please try calling us directly.' } });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
