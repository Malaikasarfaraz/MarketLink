const nodemailer = require("nodemailer");

function smtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

function getTransporter() {
  if (!smtpConfigured()) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
}

async function verifyEmailConfiguration() {
  if (!smtpConfigured()) {
    console.warn("[EMAIL] SMTP is not configured. Emails are disabled until SMTP_USER and SMTP_PASS are added to backend/.env");
    return false;
  }

  try {
    const transporter = getTransporter();
    await transporter.verify();
    console.log(`[EMAIL] SMTP connection verified for ${process.env.SMTP_USER}`);
    return true;
  } catch (error) {
    console.error(`[EMAIL] SMTP verification failed: ${error.message}`);
    return false;
  }
}

async function sendEmail({ to, subject, html, text }) {
  if (!to) {
    console.warn(`[EMAIL] No recipient email for: ${subject}`);
    return { sent: false, skipped: true, reason: "Recipient email missing" };
  }

  if (!smtpConfigured()) {
    console.warn(`[EMAIL] SMTP is not configured. Skipping email to ${to}: ${subject}`);
    return { sent: false, skipped: true, reason: "SMTP not configured" };
  }

  try {
    const transporter = getTransporter();
    if (!transporter) return { sent: false, skipped: true, reason: "SMTP transporter unavailable" };

    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html
    });

    console.log(`[EMAIL] Sent "${subject}" to ${to}. Message ID: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL] Failed to send "${subject}" to ${to}: ${error.message}`);
    return { sent: false, error: error.message };
  }
}

async function sendFarmerRegistrationEmail(farmer) {
  return sendEmail({
    to: farmer.email,
    subject: "MarketLink Farmer Registration Received",
    text: `Hello ${farmer.name}, your MarketLink farmer registration has been received and is waiting for admin approval.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>Welcome to MarketLink</h2><p>Hello <strong>${farmer.name}</strong>,</p><p>Your farmer registration has been received successfully.</p><p>Your account is currently <strong>pending admin approval</strong>. You will receive another email when your status changes.</p><p>Thank you for joining MarketLink.</p></div>`
  });
}

async function sendFarmerApprovalEmail(farmer, status) {
  const approved = status === "approved";
  const subject = approved ? "MarketLink Farmer Account Approved" : "MarketLink Farmer Account Suspended";
  const message = approved
    ? "Your farmer account has been approved. You can now log in and manage your products and orders."
    : "Your farmer account has been suspended. Please contact the MarketLink administrator if you need assistance.";

  return sendEmail({
    to: farmer.email,
    subject,
    text: `Hello ${farmer.name}, ${message}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>MarketLink Farmer Account Update</h2><p>Hello <strong>${farmer.name}</strong>,</p><p>${message}</p><p><strong>Status:</strong> ${status}</p></div>`
  });
}

async function sendOrderConfirmationEmail(customer, order) {
  return sendEmail({
    to: customer.email,
    subject: `MarketLink Order Confirmation - ${order._id}`,
    text: `Hello ${customer.name}, your MarketLink order ${order._id} has been placed successfully. Total: ${order.totalAmount}.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>Order Confirmed</h2><p>Hello <strong>${customer.name}</strong>,</p><p>Your MarketLink pre-order has been placed successfully.</p><p><strong>Order ID:</strong> ${order._id}</p><p><strong>Total:</strong> ${order.totalAmount}</p><p>Payment is made at pickup according to the MarketLink process.</p></div>`
  });
}

async function sendOrderStatusEmail(customer, order, status) {
  const labels = { ACCEPTED: "accepted", DECLINED: "declined", READY_FOR_PICKUP: "ready for pickup", COMPLETED: "completed", CANCELLED: "cancelled" };
  const label = labels[status] || String(status).toLowerCase().replaceAll("_", " ");

  return sendEmail({
    to: customer.email,
    subject: `MarketLink Order ${String(status).replaceAll("_", " ")} - ${order._id}`,
    text: `Hello ${customer.name}, your MarketLink order ${order._id} is now ${label}.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>MarketLink Order Update</h2><p>Hello <strong>${customer.name}</strong>,</p><p>Your order <strong>${order._id}</strong> is now <strong>${label}</strong>.</p><p>Thank you for using MarketLink.</p></div>`
  });
}

module.exports = { sendEmail, sendFarmerRegistrationEmail, sendFarmerApprovalEmail, sendOrderConfirmationEmail, sendOrderStatusEmail, verifyEmailConfiguration };
