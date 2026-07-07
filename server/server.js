import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import nodemailer from 'nodemailer';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { body, validationResult } from 'express-validator';
import { rateLimit } from 'express-rate-limit';
import {
  readContent,
  updateCompany,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
} from './contentStore.js';
import { verifyPassword, issueToken, revokeToken, requireAdmin } from './auth.js';
import { buildPublicImageUrl } from './lib/imageUrls.js';
import { buildSmtpCandidates } from './lib/smtp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'https://ifex.kesug.com';

// --- Core middleware -------------------------------------------------------
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: '10kb' }));

// Serves uploaded portfolio images (e.g. /uploads/1719999999-cover.jpg)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Rate limiting -----------------------------------------------------
// Anti-spam: limits each IP to 5 contact submissions per 15 minutes.
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many submissions from this IP. Please try again later.',
  },
});

// Anti-brute-force: limits login attempts to 10 per 15 minutes per IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

// --- Image uploads (memory + Cloudinary for serverless deployments) ---
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, WEBP, or GIF images are allowed.'));
    }
    cb(null, true);
  },
});

// Configure Cloudinary if env vars are present (optional)
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// --- Mail transport ----------------------------------------------------
const SMTP_USER = process.env.SMTP_USER;
const CONTACT_SENDER_EMAIL = process.env.CONTACT_SENDER_EMAIL || SMTP_USER;
const CONTACT_RECEIVER_EMAIL = process.env.CONTACT_RECEIVER_EMAIL || SMTP_USER;

// Create transporter with a fallback (try configured port first, then 587)
let transporter;
const smtpHost = process.env.SMTP_HOST;
const configuredPort = Number(process.env.SMTP_PORT);
const configuredSecure = process.env.SMTP_SECURE !== 'false';
const smtpAuth = { user: SMTP_USER, pass: process.env.SMTP_PASS };

const smtpCandidates = buildSmtpCandidates({
  host: smtpHost,
  port: configuredPort,
  secure: configuredSecure,
  user: SMTP_USER,
  pass: process.env.SMTP_PASS,
});

(async function initSmtp() {
  if (!smtpCandidates.length) {
    console.warn('SMTP credentials are not configured. Contact email sending is disabled until SMTP_HOST, SMTP_USER, and SMTP_PASS are set.');
    return;
  }

  for (const cfg of smtpCandidates) {
    try {
      const candidate = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: smtpAuth,
        tls: cfg.tls || undefined,
        // short timeouts to fail fast and get actionable logs
        connectionTimeout: 60000,
        greetingTimeout: 60000,
        socketTimeout: 60000,
        logger: false,
        debug: false,
      });

      // attempt verify
      await candidate.verify();
      transporter = candidate;
      // eslint-disable-next-line no-console
      console.log(`SMTP connection verified using ${cfg.host}:${cfg.port} (secure=${cfg.secure})`);
      return;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`SMTP verification failed for ${cfg.host}:${cfg.port} (secure=${cfg.secure}):`, err && err.code ? { code: err.code, message: err.message } : err);
      // try next candidate
    }
  }

  // eslint-disable-next-line no-console
  console.error('All SMTP verification attempts failed. Email sending will likely fail.');
})();

// --- Validation rules ----------------------------------------------------
const contactValidationRules = [
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 100 }),
  body('email').trim().notEmpty().withMessage('Email is required.').isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 30 }).escape(),
  body('company').optional({ checkFalsy: true }).trim().isLength({ max: 150 }).escape(),
  body('service').trim().notEmpty().withMessage('Please select a service.').isLength({ max: 100 }).escape(),
  body('budget').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).escape(),
  body('message').trim().notEmpty().withMessage('Message is required.').isLength({ min: 20, max: 5000 }).withMessage('Message must be between 20 and 5000 characters.').escape(),
];

function buildEmailHtml({ name, email, phone, company, service, budget, message }) {
  const row = (label, value) =>
    value
      ? `<tr>
           <td style="padding:10px 16px;color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">${label}</td>
           <td style="padding:10px 16px;color:#0A0F1D;font-size:14px;">${value}</td>
         </tr>`
      : '';

  return `
  <div style="background:#F8FAFC;padding:32px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">
      <div style="background:linear-gradient(120deg,#2563EB,#06B6D4);padding:24px 32px;">
        <h1 style="color:#FFFFFF;font-size:18px;margin:0;">New Project Inquiry — iFeX International</h1>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Name', name)}
        ${row('Email', email)}
        ${row('Phone', phone)}
        ${row('Company', company)}
        ${row('Service Needed', service)}
        ${row('Budget Range', budget)}
      </table>
      <div style="padding:16px 32px 28px;">
        <p style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">Message</p>
        <p style="color:#0A0F1D;font-size:14px;line-height:1.6;white-space:pre-wrap;margin:0;">${message}</p>
      </div>
    </div>
  </div>`;
}

// --- Routes ----------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/contact', contactLimiter, contactValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }

  const { name, email, phone, company, service, budget, message } = req.body;

  if (!transporter) {
    return res.status(503).json({
      success: false,
      message: 'Email delivery is currently unavailable because SMTP is not configured correctly.',
    });
  }

  try {
    const info = await transporter.sendMail({
      from: `"iFeX Website" <${CONTACT_SENDER_EMAIL}>`,
      to: CONTACT_RECEIVER_EMAIL,
      replyTo: email,
      subject: `New Inquiry: ${service} — ${name}`,
      html: buildEmailHtml({ name, email, phone, company, service, budget, message }),
    });

    // Log send result for troubleshooting (messageId, response)
    // eslint-disable-next-line no-console
    console.log('Contact email sent:', { messageId: info.messageId, response: info.response });

    return res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully.',
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to send contact email:', err);
    return res.status(502).json({
      success: false,
      message: 'We could not send your message right now. Please try again shortly.',
    });
  }
});

// --- Public content routes --------------------------------------------
// Read-only: powers the live site (company details + portfolio).
app.get('/api/content', async (req, res) => {
  try {
    const content = await readContent();
    const origin = `${req.protocol}://${req.get('host')}`;
    const normalizeProject = (project) => ({
      ...project,
      image: buildPublicImageUrl(req, project.image),
      images: project.images?.map((img) => buildPublicImageUrl(req, img)) || [],
    });

    const normalized = {
      ...content,
      portfolio: content.portfolio?.map(normalizeProject) || [],
      company: content.company ? { ...content.company } : undefined,
    };

    if (normalized.company) {
      if (normalized.company.logo && normalized.company.logo.startsWith('/uploads/')) {
        normalized.company.logo = `${origin}${normalized.company.logo}`;
      }
    }

    res.json({ success: true, data: normalized });
  } catch (err) {
    console.error('Failed to read content:', err.message);
    res.status(500).json({ success: false, message: 'Could not load site content.' });
  }
});

// --- Admin auth routes ---------------------------------------------------
app.post(
  '/api/admin/login',
  loginLimiter,
  body('password').isString().notEmpty(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Password is required.' });
    }
    if (!verifyPassword(req.body.password)) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }
    const token = issueToken();
    res.json({ success: true, token });
  }
);

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const token = req.headers.authorization.slice(7);
  revokeToken(token);
  res.json({ success: true });
});

app.get('/api/admin/session', requireAdmin, (req, res) => {
  res.json({ success: true });
});

// --- Admin: company details ---------------------------------------------
app.put(
  '/api/admin/company',
  requireAdmin,
  [
    body('name').optional().trim().isLength({ max: 150 }),
    body('tagline').optional().trim().isLength({ max: 150 }),
    body('heroHeadline').optional().trim().isLength({ max: 300 }),
    body('heroSubtext').optional().trim().isLength({ max: 600 }),
    body('email').optional().trim().isEmail().withMessage('Enter a valid email address.'),
    body('phone').optional().trim().isLength({ max: 40 }),
    body('location').optional().trim().isLength({ max: 150 }),
    body('mission').optional().trim().isLength({ max: 800 }),
    body('vision').optional().trim().isLength({ max: 800 }),
    body('pricingVisible').optional().isBoolean().withMessage('Pricing visibility must be true or false.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    try {
      const {
        name, tagline, heroHeadline, heroSubtext, email, phone, location,
        socials, mission, vision, stats, pricingVisible,
      } = req.body;
      const updated = await updateCompany({
        ...(name !== undefined && { name }),
        ...(tagline !== undefined && { tagline }),
        ...(heroHeadline !== undefined && { heroHeadline }),
        ...(heroSubtext !== undefined && { heroSubtext }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(location !== undefined && { location }),
        ...(socials !== undefined && { socials }),
        ...(mission !== undefined && { mission }),
        ...(vision !== undefined && { vision }),
        ...(stats !== undefined && { stats }),
        ...(pricingVisible !== undefined && { pricingVisible }),
      });
      res.json({ success: true, data: updated });
    } catch (err) {
      console.error('Failed to update company:', err.message);
      res.status(500).json({ success: false, message: 'Could not save company details.' });
    }
  }
);

// --- Admin: portfolio CRUD ------------------------------------------------
app.post(
  '/api/admin/portfolio',
  requireAdmin,
  [
    body('title').trim().notEmpty().withMessage('Title is required.').isLength({ max: 150 }),
    // Support either a single `category` string (legacy) or a `categories` array
    body('category').optional().trim().isLength({ max: 100 }),
    body('categories').optional().isArray().withMessage('Categories must be an array.'),
    body('categories.*').optional().trim().isLength({ max: 100 }),
    body('summary').trim().notEmpty().withMessage('Summary is required.').isLength({ max: 400 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    try {
      const { title, category, categories, summary, tags, featured, image, images } = req.body;
      const categoriesArr = Array.isArray(categories)
        ? categories.filter(Boolean)
        : category
        ? [category]
        : [];

      const item = await createPortfolioItem({
        title,
        category: categoriesArr[0] || category || 'Websites',
        categories: categoriesArr,
        summary,
        tags: Array.isArray(tags) ? tags : [],
        featured: !!featured,
        image: image || '',
        images: Array.isArray(images) ? images : [],
      });
      res.status(201).json({ success: true, data: item });
    } catch (err) {
      console.error('Failed to create portfolio item:', err.message);
      res.status(500).json({ success: false, message: 'Could not create project.' });
    }
  }
);

app.put('/api/admin/portfolio/:id', requireAdmin, async (req, res) => {
  try {
    const { title, category, categories, summary, tags, featured, image, images } = req.body;
    const categoriesArr = Array.isArray(categories)
      ? categories.filter(Boolean)
      : category
      ? [category]
      : undefined;

    const updated = await updatePortfolioItem(req.params.id, {
      ...(title !== undefined && { title }),
      ...(categoriesArr !== undefined && { categories: categoriesArr }),
      ...(category !== undefined && { category: category }),
      ...(summary !== undefined && { summary }),
      ...(tags !== undefined && { tags: Array.isArray(tags) ? tags : [] }),
      ...(featured !== undefined && { featured: !!featured }),
      ...(image !== undefined && { image }),
      ...(images !== undefined && { images: Array.isArray(images) ? images : [] }),
    });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Failed to update portfolio item:', err.message);
    res.status(500).json({ success: false, message: 'Could not update project.' });
  }
});

app.delete('/api/admin/portfolio/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await deletePortfolioItem(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete portfolio item:', err.message);
    res.status(500).json({ success: false, message: 'Could not delete project.' });
  }
});

// --- Admin: image upload --------------------------------------------------
app.post('/api/admin/upload', requireAdmin, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'No image file received.' });

    // If Cloudinary configured, upload there
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      try {
        const streamUpload = (buffer) =>
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({ folder: 'ifex-uploads' }, (error, result) => {
              if (result) resolve(result);
              else reject(error);
            });
            streamifier.createReadStream(buffer).pipe(stream);
          });

        const result = await streamUpload(req.file.buffer);
        return res.status(201).json({ success: true, url: result.secure_url });
      } catch (uploadErr) {
        console.error('Cloudinary upload failed:', uploadErr);
        return res.status(500).json({ success: false, message: 'Upload failed.' });
      }
    }

    // Fallback: write to local uploads folder (works for local/stanalone deployments)
    try {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      const outPath = path.join(__dirname, 'uploads');
      // ensure uploads dir exists
      await fs.mkdir(outPath, { recursive: true });
      await fs.writeFile(path.join(outPath, filename), req.file.buffer);
      const url = buildPublicImageUrl(req, `/uploads/${filename}`);
      return res.status(201).json({ success: true, url });
    } catch (diskErr) {
      console.error('Local upload failed:', diskErr);
      return res.status(500).json({ success: false, message: 'Upload failed.' });
    }
  });
});

// Listen when the server is started directly (local dev or Render).
// Serverless platforms import the app without executing the listen call.
const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (process.env.STANDALONE === 'true' || isDirectExecution) {
  app.listen(PORT, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(`iFeX API server running on port ${PORT}`);
  });
}

export default app;
