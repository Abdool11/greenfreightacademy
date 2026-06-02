import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
  port: Number(process.env.BREVO_SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_LOGIN,
    pass: process.env.BREVO_SMTP_PASSWORD,
  },
});

export async function sendEmail(options: {
  from: string;
  fromName?: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}) {
  await transporter.sendMail({
    from: options.fromName ? `"${options.fromName}" <${options.from}>` : options.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}
