import nodemailer from "nodemailer";
import * as fs from "fs";
import * as path from "path";
import { logger } from "../utils/logger";

// 1. Define Types
export type TemplateName = "confirm-register" | "reset-password";

interface EmailVars {
  fnameTh?: string;
  lnameTh?: string;
  codeId?: string;
  projectName?: string;
  year?: string | number;
  [key: string]: string | number | undefined;
}

logger.info(`EMAIL_PASS:" ${process.env.MAIL_PASS ? "OK" : "MISSING"} `);

// 2. Setup Transporter จาก Env ที่คุณระบุ
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: 587,
  secure: false, // 587 มักใช้ TLS
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// 3. Helper Functions
export function loadTemplate(name: TemplateName): string {
  const fileName = `${name}.html`;
  const distPath = path.join(
    process.cwd(),
    "dist",
    "email",
    "templates",
    fileName,
  );
  const srcPath = path.join(
    process.cwd(),
    "src",
    "email",
    "templates",
    fileName,
  );

  try {
    if (fs.existsSync(distPath)) return fs.readFileSync(distPath, "utf8");
    if (fs.existsSync(srcPath)) return fs.readFileSync(srcPath, "utf8");
    throw new Error("Template not found in dist or src");
  } catch (error) {
    throw new Error(`Could not load template ${fileName}: ${error}`);
  }
}

export function renderTemplate(html: string, vars: EmailVars): string {
  let out = html;
  for (const [key, value] of Object.entries(vars)) {
    // ใช้ Regex เพื่อแทนที่ {{ key }} ทั้งหมด
    out = out.replace(
      new RegExp(`{{\\s*${key}\\s*}}`, "g"),
      String(value ?? ""),
    );
  }
  return out;
}

// 4. Main Export Function
export async function sendTemplateEmail(
  to: string,
  template: TemplateName,
  subject: string,
  vars: EmailVars,
): Promise<void> {
  try {
    const htmlRaw = loadTemplate(template);
    const html = renderTemplate(htmlRaw, {
      ...vars,
      year: vars.year ?? new Date().getFullYear(),
    });

    await transporter.sendMail({
      from: `"NOVEL CMU" <no-reply-novel-cmu@cmu.ac.th>`,
      to: to,
      subject: subject,
      html: html,
    });

    logger.info(`📧 Email sent to ${to} [${template}]`);
  } catch (error) {
    logger.error("❌ Failed to send email:", error);
    throw error;
  }
}
