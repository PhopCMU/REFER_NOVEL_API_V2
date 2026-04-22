import { join } from "path";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";

export const uploadToStorage = async (
  file: File,
  options: { folder: string; originalName: string },
) => {
  // ✅ ตัวอย่าง: อัพโหลดไป Local Storage (เปลี่ยนเป็น S3/MinIO ได้ตามต้องการ)
  const uploadDir = join(process.cwd(), "uploads", options.folder);

  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  const timestamp = Date.now();
  const safeName = `${timestamp}-${options.originalName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const filePath = join(uploadDir, safeName);

  // ✅ เขียนไฟล์ลง disk (Bun File API)
  const buffer = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(buffer));

  // ✅ สร้าง URL สำหรับเข้าถึงไฟล์
  const fileUrl = `/uploads/${options.folder}/${safeName}`;
  const fileKey = `${options.folder}/${safeName}`;

  return { fileUrl, fileKey };
};
