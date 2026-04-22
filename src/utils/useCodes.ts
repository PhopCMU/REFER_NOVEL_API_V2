import CryptoJS from "crypto-js";
import { UserProps } from "../types/type";
import { logger } from "./logger";

const cryptoKey = process.env.CRYPTO_KEY!;

export const useDecodecryptBodyNew = (
  encryptedData: string,
  secretKey: string,
): any => {
  try {
    const parts = encryptedData.split(":");
    if (parts.length !== 2)
      throw new Error("Format error: Missing IV or Ciphertext");

    const iv = CryptoJS.enc.Hex.parse(parts[0]);
    const ciphertext = parts[1];
    // logger.log("Server key:", CryptoJS.SHA256(secretKey).toString());
    const decrypt = (keyStr: string) => {
      const key = CryptoJS.SHA256(keyStr); // ❗ ใช้ SHA256
      const bytes = CryptoJS.AES.decrypt(ciphertext, key, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      return bytes.toString(CryptoJS.enc.Utf8);
    };

    let decryptedString = decrypt(secretKey);

    if (!decryptedString) {
      logger.warn("Trying with fallback key...");
      decryptedString = decrypt(cryptoKey);
    }

    if (!decryptedString) {
      throw new Error(
        "Malformed UTF-8 data - Key mismatch between Client and Server",
      );
    }

    return JSON.parse(decryptedString);
  } catch (error: any) {
    logger.error("Error in useDecodecryptBodyNew:", error);
    throw error;
  }
};

export const useDecodecryptQueryNew = (
  data: string, // รับค่าเป็น string ที่มีรูปแบบ iv:ciphertext
  secretKey: string,
) => {
  try {
    // 1. Decode URL Component ก่อน (กรณีส่งมาผ่าน URL Query)
    const decodedData = decodeURIComponent(data);

    // 2. แยกส่วน IV และ Ciphertext
    const parts = decodedData.split(":");
    if (parts.length !== 2) {
      throw new Error("Format error: Missing IV or Ciphertext");
    }

    const iv = CryptoJS.enc.Hex.parse(parts[0]);
    const ciphertext = parts[1];

    // 3. สร้างฟังก์ชันถอดรหัส (Logic เดียวกับ Body)
    const decrypt = (keyStr: string) => {
      const key = CryptoJS.SHA256(keyStr); // ใช้ SHA256 ตามมาตรฐานของ Body
      const bytes = CryptoJS.AES.decrypt(ciphertext, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      return bytes.toString(CryptoJS.enc.Utf8);
    };

    let decryptedString = decrypt(secretKey);

    if (!decryptedString) {
      logger.warn("Trying with fallback key...");
      decryptedString = decrypt(cryptoKey);
    }

    if (!decryptedString) {
      throw new Error(
        "Malformed UTF-8 data - Key mismatch between Client and Server",
      );
    }

    try {
      return JSON.parse(decryptedString);
    } catch {
      return decryptedString;
    }
  } catch (error: any) {
    logger.error("Error in useDecodecryptQueryNew:", error);
    throw error;
  }
};

export const useEncodecrypt = (data: UserProps | string) => {
  const secretKey = process.env.CRYPTO_KEY!;

  const key = CryptoJS.SHA256(secretKey);
  const iv = CryptoJS.lib.WordArray.random(16);
  const dataString = JSON.stringify(data);

  const encrypted = CryptoJS.AES.encrypt(dataString, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return `${iv.toString(CryptoJS.enc.Hex)}:${encrypted.toString()}`;
};
