import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

// In local dev (no SMTP configured) we just log the email so you can copy
// verification/reset links straight out of the terminal — no mail server needed.
export async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    console.log('\n----- 📧 EMAIL (SMTP not configured, logging instead) -----');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log(text || html);
    console.log('-----------------------------------------------------------\n');
    return;
  }
  await t.sendMail({ from: process.env.MAIL_FROM || 'no-reply@noyontelecom.com', to, subject, html, text });
}
