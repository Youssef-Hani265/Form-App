'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Startup env check ───────────────────────────────────────────────────────
if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn(
        '⚠️  WARNING: GMAIL_USER or GMAIL_APP_PASSWORD is not set.\n' +
        '   Create a .env file from .env.example before submitting forms.'
    );
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend from /public
app.use(express.static(path.join(__dirname, 'public')));

// ─── Multer — PDF-only, max 5 MB ─────────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}-${file.originalname}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are accepted for the CV.'));
        }
    },
});

// ─── Validation helpers ───────────────────────────────────────────────────────
const ALLOWED_FIELDS = [
    'UI/UX Design',
    'Graphic Design',
    'Motion Design',
    'Brand Identity',
    'Illustration',
    'Product Design',
    'Other',
];

const PORTFOLIO_RE = /^https?:\/\/.+\..+/i;
const PHONE_RE = /^[+\d][\d\s\-().]{6,19}$/;

function validateBody(body) {
    const errors = [];

    if (!body.fullName || body.fullName.trim().length < 2) {
        errors.push('Full name must be at least 2 characters.');
    }

    if (!body.phone || !PHONE_RE.test(body.phone.trim())) {
        errors.push('Please provide a valid phone number.');
    }

    if (!body.designField || !ALLOWED_FIELDS.includes(body.designField)) {
        errors.push('Please select a valid design field.');
    }

    if (!body.portfolioLink || !PORTFOLIO_RE.test(body.portfolioLink.trim())) {
        errors.push('Please provide a valid portfolio URL (must start with http:// or https://).');
    }

    return errors;
}

// ─── Nodemailer transporter ───────────────────────────────────────────────────
function createTransporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });
}

// ─── POST /api/apply ──────────────────────────────────────────────────────────
app.post('/api/apply', upload.single('cv'), async (req, res) => {
    const cvPath = req.file ? req.file.path : null;

    // Clean up temp file helper
    const cleanup = () => {
        if (cvPath && fs.existsSync(cvPath)) fs.unlinkSync(cvPath);
    };

    try {
        // 1. Validate fields
        const errors = validateBody(req.body);
        if (errors.length > 0) {
            cleanup();
            return res.status(400).json({ success: false, message: errors.join(' ') });
        }

        // 2. Require CV file
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'A CV (PDF) is required.' });
        }

        const { fullName, phone, designField, portfolioLink } = req.body;
        const recipient = process.env.RECIPIENT_EMAIL || process.env.GMAIL_USER;

        // 3. Build email
        const mailOptions = {
            from: `"Design Applications" <${process.env.GMAIL_USER}>`,
            to: recipient,
            subject: `New Design Application — ${fullName} (${designField})`,
            html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
          <!-- Logo & Header -->
          <div style="background-color: #ffffff; padding: 40px 32px 20px; text-align: center; border-bottom: 2px solid #fca5a5;">
            <img src="cid:logo" alt="LX Logo" style="height: 70px; width: auto; margin-bottom: 16px; display: block; margin-left: auto; margin-right: auto;" />
            <h1 style="color: #111827; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">New Applicant</h1>
            <p style="color: #6b7280; margin: 6px 0 0; font-size: 15px;">A new designer wants to join your team.</p>
          </div>
          
          <!-- Details List -->
          <div style="padding: 32px 40px; background: #ffffff;">
            <div style="margin-bottom: 24px;">
                <p style="color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px; font-weight: 600;">Full Name</p>
                <p style="color: #1f2937; font-size: 18px; font-weight: 700; margin: 0;">${escapeHtml(fullName)}</p>
            </div>
            
            <div style="margin-bottom: 24px;">
                <p style="color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px; font-weight: 600;">Phone Number</p>
                <p style="color: #1f2937; font-size: 16px; font-weight: 500; margin: 0;">${escapeHtml(phone)}</p>
            </div>

            <div style="margin-bottom: 24px;">
                <p style="color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px; font-weight: 600;">Design Field</p>
                <span style="display: inline-block; background: #fee2e2; border: 1px solid #f87171; color: #b91c1c; padding: 6px 14px; border-radius: 6px; font-size: 14px; font-weight: 600;">${escapeHtml(designField)}</span>
            </div>

            <div style="margin-bottom: 32px;">
                <p style="color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px; font-weight: 600;">Portfolio</p>
                <a href="${escapeHtml(portfolioLink)}" style="color: #dc2626; font-size: 16px; font-weight: 600; text-decoration: none; border-bottom: 1px dashed #fca5a5;" target="_blank">${escapeHtml(portfolioLink)}</a>
            </div>

            <div style="background: #f9fafb; border-left: 4px solid #ef4444; border-radius: 4px; padding: 16px 20px; font-size: 14px; color: #4b5563; box-shadow: inset 0 0 0 1px #f3f4f6;">
               <strong>📎 Attachment:</strong> The applicant's CV is attached to this email.
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f3f4f6; padding: 24px; text-align: center; font-size: 13px; color: #6b7280;">
            <p style="margin: 0;">This email was automatically generated by your Job Portal.</p>
          </div>
        </div>
      `,
            attachments: [
                {
                    filename: `CV_${fullName.replace(/\s+/g, '_')}.pdf`,
                    path: cvPath,
                },
                {
                    filename: 'logo.png',
                    path: path.join(__dirname, 'public', 'logo.png'),
                    cid: 'logo' // same cid value as in the html img src
                }
            ],
        };

        // 4. Send email
        const transporter = createTransporter();
        await transporter.sendMail(mailOptions);

        // 5. Cleanup & respond
        cleanup();
        return res.json({ success: true, message: 'Your application has been submitted successfully! We will review it and get back to you soon.' });

    } catch (err) {
        cleanup();
        console.error('Email send error [code=%s]:', err.code || 'unknown', err.message);

        // Multer file type error
        if (err.message && err.message.includes('Only PDF')) {
            return res.status(400).json({ success: false, message: err.message });
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: 'CV file must be smaller than 5 MB.' });
        }
        // SMTP / auth errors
        if (err.code === 'EAUTH' || err.responseCode === 535) {
            return res.status(500).json({ success: false, message: 'Email authentication failed. Please check GMAIL_USER and GMAIL_APP_PASSWORD in your .env file.' });
        }
        if (err.code === 'ECONNECTION' || err.code === 'ETIMEDOUT' || err.code === 'ESOCKET') {
            return res.status(500).json({ success: false, message: 'Could not connect to Gmail. Please check your internet connection and try again.' });
        }
        if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
            return res.status(500).json({ success: false, message: 'Email not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in your .env file.' });
        }

        return res.status(500).json({ success: false, message: 'Failed to send email. Please try again in a moment.' });
    }
});

// ─── Multer error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError || err.message) {
        const msg = err.code === 'LIMIT_FILE_SIZE'
            ? 'CV file must be smaller than 5 MB.'
            : err.message || 'File upload error.';
        return res.status(400).json({ success: false, message: msg });
    }
    res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ─── HTML escape helper ───────────────────────────────────────────────────────
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`✦ Design Jobs server running → http://localhost:${PORT}`);
});
