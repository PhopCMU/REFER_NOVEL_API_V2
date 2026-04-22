import { join } from "path";
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";
import { logger } from "../utils/logger";

export const saveFileToStorage = async (
  file: File,
  category: string,
  originalName: string,
  caseId: string,
): Promise<{ fileUrl: string; fileKey: string; filePath: string }> => {
  // ✅ สร้าง path: uploads/{category_lowercase}/{caseId}/{timestamp}-{originalName}
  const categoryFolder = category.toLowerCase();
  const uploadDir = join(
    process.cwd(),
    "uploads",
    "referral",
    categoryFolder,
    caseId,
  );

  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  const timestamp = Date.now();
  const safeName = `${timestamp}-${originalName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const filePath = join(uploadDir, safeName);

  // ✅ เขียนไฟล์ลง disk (Bun File API)
  const buffer = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(buffer));

  // ✅ สร้าง URL สำหรับเข้าถึงไฟล์ (ปรับตาม reverse proxy / CDN ของคุณ)
  const fileUrl = `/uploads/referral/${categoryFolder}/${caseId}/${safeName}`;
  const fileKey = `${categoryFolder}/${caseId}/${safeName}`;

  return { fileUrl, fileKey, filePath };
};

export const deleteFileFromPath = async (fileUrl: string) => {
  try {
    const filePath = path.join(process.cwd(), fileUrl);

    await fs.unlink(filePath);

    logger.info("File deleted from server", {
      filePath,
    });

    return true;
  } catch (error: any) {
    if (error.code === "ENOENT") {
      logger.warn("File not found when deleting", { fileUrl });
      return false;
    }

    logger.error("Delete file error", {
      fileUrl,
      error: error.message,
    });

    throw error;
  }
};

// ✅ Helper: ตรวจสอบและแปลง fileExtension เป็น AllowedFileType
export const getAllowedFileType = (
  extension: string,
): "DOCUMENT" | "IMAGE" | "OTHER" => {
  const ext = extension.toLowerCase();
  if (["pdf", "doc", "docx", "xls", "xlsx", "txt"].includes(ext))
    return "DOCUMENT";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext))
    return "IMAGE";
  return "OTHER";
};

/**
 * แปลงเดือนไทยเป็นตัวเลข (1-12)
 */
const thaiMonthToNumber = (thaiMonth: string): number | null => {
  const months: Record<string, number> = {
    มกราคม: 1,
    กุมภาพันธ์: 2,
    มีนาคม: 3,
    เมษายน: 4,
    พฤษภาคม: 5,
    มิถุนายน: 6,
    กรกฎาคม: 7,
    สิงหาคม: 8,
    กันยายน: 9,
    ตุลาคม: 10,
    พฤศจิกายน: 11,
    ธันวาคม: 12,
  };
  return months[thaiMonth.trim()] || null;
};

/**
 * แปลงปี พ.ศ. เป็น ค.ศ.
 * พ.ศ. = ค.ศ. + 543
 */
const beToCe = (beYear: number): number => beYear - 543;

/**
 * Parse วันที่จากหลายรูปแบบ รวมถึงภาษาไทย + พ.ศ.
 * รองรับ:
 *  - "7 มีนาคม 2569 เวลา 10:54:29"
 *  - "7 มีนาคม 2569 10:54:29"
 *  - "2026-03-21 13:39"
 *  - "2026-03-21T13:39:00+07:00"
 */
export const parseDateTimeSafe = (
  dateTimeStr: string | undefined | null,
): Date | null => {
  if (!dateTimeStr) return null;

  try {
    const input = String(dateTimeStr).trim();

    // 🔹 1. กรณี ISO String (มีตัว T)
    if (input.includes("T")) {
      const date = new Date(input);
      if (!isNaN(date.getTime())) return date;
    }

    // 🔹 2. กรณีภาษาไทย: "7 มีนาคม 2569 เวลา 10:54:29" หรือ "7 มีนาคม 2569 10:54:29"
    const thaiRegex =
      /^(\d{1,2})\s+([ก-๙]+)\s+(\d{4})\s+(?:เวลา\s+)?(\d{2}):(\d{2})(?::(\d{2}))?$/u;
    const thaiMatch = input.match(thaiRegex);

    if (thaiMatch) {
      const [, dayStr, thaiMonth, yearStr, hours, minutes, seconds] = thaiMatch;

      const day = parseInt(dayStr, 10);
      const month = thaiMonthToNumber(thaiMonth);
      let year = parseInt(yearStr, 10);

      // ถ้าปีเป็น พ.ศ. (มากกว่า 2000) ให้แปลงเป็น ค.ศ.
      if (year > 2000) {
        year = beToCe(year);
      }

      if (month && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
        const date = new Date(
          year,
          month - 1, // JS เดือนเริ่มที่ 0
          day,
          parseInt(hours, 10),
          parseInt(minutes, 10),
          seconds ? parseInt(seconds, 10) : 0,
          0,
        );

        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    // 🔹 3. กรณีรูปแบบมาตรฐาน: "YYYY-MM-DD HH:mm" หรือ "YYYY-MM-DD HH:mm:ss"
    const stdRegex = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/;
    const stdMatch = input.match(stdRegex);

    if (stdMatch) {
      const [, year, month, day, hours, minutes, seconds] = stdMatch;
      const date = new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10),
        parseInt(hours, 10),
        parseInt(minutes, 10),
        seconds ? parseInt(seconds, 10) : 0,
        0,
      );
      if (!isNaN(date.getTime())) return date;
    }

    // 🔹 4. Fallback: ลองให้ JS parse เอง (อาจไม่เสถียร)
    const fallback = new Date(input);
    if (!isNaN(fallback.getTime())) return fallback;

    return null;
  } catch {
    return null;
  }
};

/**
 * แปลง Date เป็น Timestamp (milliseconds)
 */
export const dateToTimestamp = (date: Date): number => date.getTime();

/**
 * แปลง Timestamp กลับเป็น Date
 */
export const timestampToDate = (timestamp: number): Date => new Date(timestamp);

/**
 * Format Date เป็น string สำหรับแสดงใน UI (ภาษาไทย)
 */
export const formatThaiDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  }).format(date);
};
