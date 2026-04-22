import { JWTPayload } from "../types/type";

export const generateJwtToken = async (
  jwt: { sign: (payload: any) => Promise<string> },
  payload: JWTPayload,
): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  const oneDay = 60 * 60 * 24;
  const twoYears = oneDay * 365 * 2; // แก้ไขให้เป็น 2 ปีตามคอมเมนต์ของคุณ

  return await jwt.sign({
    ...payload,
    iat: now,
    exp: now + twoYears,
  });
};
