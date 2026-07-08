import { Resend } from "resend";

declare global {
  var resend: Resend | undefined;
}

function createResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set. Please check your .env file.");
  }
  return new Resend(apiKey);
}

export const resend = global.resend ?? createResendClient();

if (process.env.NODE_ENV !== "production") global.resend = resend;
