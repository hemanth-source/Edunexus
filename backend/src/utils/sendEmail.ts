import { Resend } from "resend";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Utility to send emails using the Resend HTTP API.
 * This bypasses Render's strict SMTP firewall.
 */
export const sendEmail = async (options: EmailOptions) => {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.warn("⚠️ RESEND_API_KEY is not set. Email will not be sent.");
      return null;
    }

    const resend = new Resend(resendApiKey);

    // If using the free tier of Resend without a verified domain,
    // you can only send emails TO the email address you registered with!
    const { data, error } = await resend.emails.send({
      from: 'Edunexus Support <onboarding@resend.dev>',
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      console.error("❌ Resend API Error:", error);
      return null;
    }

    console.log(`\n📧 Email sent successfully to ${options.to} via Resend`);
    console.log(`Message ID: ${data?.id}\n`);

    return data;
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
};
