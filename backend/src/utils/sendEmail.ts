import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Utility to send emails using Nodemailer.
 * Currently uses Ethereal Email (a fake SMTP service) for testing.
 * The console will print a Preview URL to view the email.
 */
export const sendEmail = async (options: EmailOptions) => {
  try {
    // For development, we generate a test account if no SMTP is configured in .env
    const host = process.env.SMTP_HOST || "smtp.ethereal.email";
    const port = Number(process.env.SMTP_PORT) || 587;
    let user = process.env.SMTP_USER;
    let pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      // Fallback to Ethereal dummy account if no env vars exist
      const testAccount = await nodemailer.createTestAccount();
      user = testAccount.user;
      pass = testAccount.pass;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    const info = await transporter.sendMail({
      from: '"Edunexus Support" <noreply@edunexus.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log(`\n📧 Email sent successfully to ${options.to}`);
    console.log(`Message ID: ${info.messageId}`);
    
    // Ethereal URL where you can view the email in your browser
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`👀 Preview URL: ${previewUrl}\n`);
    }

    return info;
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
};
