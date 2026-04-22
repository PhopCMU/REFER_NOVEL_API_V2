import CryptoJS from "crypto-js";
/**
 * ฟังก์ชันสำหรับ Hash Password ด้วย SHA256
 * แนะนำให้เพิ่ม Salt เพื่อความปลอดภัยที่มากขึ้น
 */
export const useHashPassword = (password: string, salt?: string): string => {
  // หากไม่มี salt ส่งมา ให้ใช้ค่าคงที่ในระบบ (แต่แนะนำให้ใช้ค่าเฉพาะของ user เช่น email)
  const dynamicSalt = salt || "YOUR_SYSTEM_STATIONARY_SALT";

  // รวม password กับ salt เข้าด้วยกันก่อน Hash (เรียกว่า Salting)
  const hashed = CryptoJS.SHA256(password + dynamicSalt).toString();

  return hashed;
};
