export const generateUniqueCode = (
  ref: string,
  pass: string,
  year: string,
  existingCodes: string[],
): string => {
  let isUnique = false;
  let newCode = "";

  while (!isUnique) {
    // 1. สุ่มเลข 0 - 99999 แล้วเติม 0 ข้างหน้าให้ครบ 5 หลัก
    const randomNumber = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, "0");

    // 2. รูปแบบ: OWN-02-00000-2025
    newCode = `${ref}-${pass}-${randomNumber}-${year}`;

    // 3. ตรวจสอบว่าซ้ำใน Array existingCodes หรือไม่
    if (!existingCodes.includes(newCode)) {
      isUnique = true;
    }
  }

  return newCode;
};

export const generateOTP = () => {
  // 1. สุ่มตัวเลข 6 หลัก
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // 2. คำนวณเวลาปัจจุบัน + 15 นาที
  const now = new Date();
  const expOTP = new Date(now.getTime() + 15 * 60 * 1000);

  return {
    otp: otp,
    expotp: expOTP,
  };
};
