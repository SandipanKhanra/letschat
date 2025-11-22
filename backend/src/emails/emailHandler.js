import { resendClient, sender } from "../lib/resend.js";
import { createWelcomeEmailTemplate } from "./emailTemplate.js";

function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

function sanitizeName(name) {
  if (!name || typeof name !== "string") return "";
  return name.trim().substring(0, 100); // Limit to 100 chars
}

function sanitizeUrl(clientUrl) {
  if (!clientUrl || typeof clientUrl !== "string") return null;
  const trimmed = clientUrl.trim();
  const lower = trimmed.toLowerCase();

  // Reject dangerous protocols
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    console.warn("⚠️ Dangerous URL protocol in clientUrl rejected");
    return null;
  }

  // Validate URL format
  try {
    if (lower.startsWith("http://") || lower.startsWith("https://")) {
      new URL(trimmed);
      return trimmed;
    } else if (lower.startsWith("/")) {
      return trimmed; // Relative path OK
    }
  } catch (e) {
    console.warn("⚠️ Invalid URL format in clientUrl:", e.message);
  }

  return null;
}

export const sendWelcomeEmail = async (email, name, clientUrl) => {
  if (!isValidEmail(email)) {
    throw new Error("Invalid email address format");
  }

  const safeName = sanitizeName(name);
  if (!safeName) {
    throw new Error("Invalid or missing name");
  }

  const safeUrl = sanitizeUrl(clientUrl);
  if (!safeUrl) {
    console.warn(
      "⚠️ Invalid clientUrl provided, email will have fallback link"
    );
  }

  try {
    const { data, error } = await resendClient.emails.send({
      from: `${sender.name} <${sender.email}>`,
      to: email.trim(),
      subject: "Welcome to Letschat",
      html: createWelcomeEmailTemplate(
        safeName,
        safeUrl || "https://letschat.example.com"
      ),
    });

    if (error) {
      console.error("❌ Error while sending welcome email:", error);
      throw new Error("Failed to send welcome email");
    }

    console.log("✅ Successfully sent welcome email to", email);
    return data;
  } catch (err) {
    console.error("❌ Exception while sending welcome email:", err.message);
    throw err;
  }
};
