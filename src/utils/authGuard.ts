import { logger } from "./logger";

// --- Vet Guard (สำหรับผู้ใช้งาน - aud: vet)
export const verifyVetTokenVet = async (vetJwt: any, authorization: string) => {
  // 1. เช็คว่ามี Header หรือไม่
  if (!authorization?.startsWith("Bearer ")) {
    logger.error("❌ No Bearer token found");
    return null;
  }

  // 2. แกะ Token ออกมา
  const token = authorization.split(" ")[1];

  // 3. Verify ด้วย JWT Secret
  const payload = await vetJwt.verify(token);

  // 4. เช็ค Payload และ Audience (aud)
  if (!payload || payload.aud !== "vet") {
    logger.warn("❌ Payload invalid or Audience mismatch:", payload);
    return null;
  }

  logger.info("✅ Token verified successfully:", payload.aud);
  return payload; // ส่งข้อมูล user กลับไป
};

// --- Admin Guard (สำหรับผู้ดูแลระบบ - aud: admin)
export const verifyVetTokenAdmin = async (
  vetJwt: any,
  authorization: string,
) => {
  // 1. เช็คว่ามี Header หรือไม่
  if (!authorization?.startsWith("Bearer ")) {
    logger.error("❌ No Bearer token found");
    return null;
  }

  // 2. แกะ Token ออกมา
  const token = authorization.split(" ")[1];

  // 3. Verify ด้วย JWT Secret
  const payload = await vetJwt.verify(token);

  // 4. เช็ค Payload และ Audience (aud)
  if (!payload || payload.aud !== "admin") {
    logger.log("❌ Payload invalid or Audience mismatch:", payload);
    return null;
  }

  logger.log("✅ Token verified successfully:", payload.aud);
  return payload; // ส่งข้อมูล user กลับไป
};

// --- Vet Guard (สำหรับผู้ใช้งาน - aud: vet-cmu)
export const verifyVetTokenVetCmu = async (
  vetJwt: any,
  authorization: string,
) => {
  // 1. เช็คว่ามี Header หรือไม่
  if (!authorization?.startsWith("Bearer ")) {
    logger.error("❌ No Bearer token found");
    return null;
  }

  // 2. แกะ Token ออกมา
  const token = authorization.split(" ")[1];

  // 3. Verify ด้วย JWT Secret
  const payload = await vetJwt.verify(token);

  // 4. เช็ค Payload และ Audience (aud)
  if (!payload || payload.aud !== "vet-cmu") {
    logger.log("❌ Payload invalid or Audience mismatch:", payload);
    return null;
  }

  logger.log("✅ Token verified successfully:", payload.aud);
  return payload; // ส่งข้อมูล user กลับไป
};
