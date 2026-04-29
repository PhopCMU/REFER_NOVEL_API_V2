import { Context } from "elysia";
import { getRequestInfo } from "../utils/requestInfo";
import { logger } from "../utils/logger";
import {
  useDecodecryptBodyNew,
  useDecodecryptQueryNew,
} from "../utils/useCodes";
import { PrismaClient } from "@prisma/client";
import { generateUniqueCode } from "../utils/generateCode";
import { verifyVetTokenAdmin } from "../utils/authGuard";

const prisma = new PrismaClient();

export const authCmuItAccount = async ({
  body,
  set,
  request,
}: Context & { request: any; body: { code: string } }) => {
  const requestInfo = getRequestInfo(request);
  try {
    const { code } = body;
    if (!code) {
      set.status = 400;
      logger.warn("Missing code", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Missing code",
      };
    }

    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    const redirectUri = process.env.REDIRECT_URI;
    const tokenUrl = process.env.TOKEN_URI ?? "";
    const scope = process.env.SCOPE;

    if (!clientId || !clientSecret || !redirectUri || !tokenUrl || !scope) {
      set.status = 500;
      logger.error("Missing environment variables", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Missing environment variables",
      };
    }

    const options = {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      scope,
    };

    const resp = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(options),
    });

    const data = await resp.json();

    const accessToken = data.access_token;
    set.status = 200;
    logger.info("Auth CMU IT Account API success", {
      ...requestInfo,
      status: set.status,
    });
    return {
      success: true,
      message: "Success",
      accessToken,
    };
  } catch (error) {
    set.status = 500;
    logger.error("Auth CMU IT Account API error", {
      ...requestInfo,
      status: set.status,
      error,
    });
    return {
      success: false,
      message: "Internal server error",
    };
  }
};

export const authCmuItAccountCallback = async ({
  body,
  set,
  request,
  adminJwt,
}: Context & {
  body: { encodedData: string };
  adminJwt: any;
}) => {
  const requestInfo = getRequestInfo(request);
  try {
    if (!body.encodedData) {
      set.status = 400;
      logger.warn("Missing encrypted data", {
        ...requestInfo,
        status: set.status,
      });
      return { success: false, message: "Missing encrypted data" };
    }

    const secretKey = process.env.CRYPTO_KEY || "";
    const decodedData = await useDecodecryptBodyNew(
      body.encodedData,
      secretKey,
    );

    if (!decodedData) {
      set.status = 400;
      logger.warn("Missing encrypted data", {
        ...requestInfo,
        status: set.status,
      });
      return { success: false, message: "Missing encrypted data" };
    }

    if (!["14"].includes(decodedData.organization_code)) {
      set.status = 400;
      logger.warn("ท่านไม่มีสิทธิ์เข้าใช้งานระบบนี้", {
        ...requestInfo,
        status: set.status,
      });
      return { success: false, message: "ท่านไม่มีสิทธิ์เข้าใช้งานระบบนี้" };
    }

    // --- ✅ FIX 1: Construct Full Name อย่างปลอดภัย ---
    // ดึงค่าโดยใส่ Default เป็น string ว่าง และตัดช่องว่างหัวท้าย
    const firstNameTH = decodedData.firstname_TH?.trim() || "";
    // รองรับทั้ง lastname_EN และ lastname_TH (Fallback)
    const lastName = (decodedData.lastname_TH || "").trim();

    // สร้างชื่อเต็ม โดยจัดการกรณีที่มีเฉพาะชื่อหน้า
    const fullName = [firstNameTH, lastName].filter(Boolean).join(" ").trim();

    // ตรวจสอบความถูกต้องของชื่อ ก่อนนำไปใช้ (ป้องกัน Prisma Validation Error)
    if (!fullName) {
      throw new Error("Cannot construct valid user name from decoded data");
    }

    // ✅ แก้ไขให้ตรวจสอบได้ทั้ง username และ email
    const userEmail = decodedData.cmuitaccount?.trim()?.toLowerCase();
    const isAdmin =
      userEmail === "sophon.m" ||
      userEmail === "sophon.m@cmu.ac.th" ||
      decodedData.cmuitaccount_name === "sophon.m";

    let userPermissions: any[] = [];

    if (isAdmin) {
      userPermissions = [
        "READ",
        "CREATE",
        "UPDATE",
        "DELETE",
        "EXPORT",
        "SEND_MAIL",
        "VIEW_PRIVATE",
      ];
      logger.info("Assigning ADMIN permissions", {
        email: userEmail,
        permissions: userPermissions,
      });
    } else {
      userPermissions = ["READ"];
      logger.info("Assigning USER permissions", {
        email: userEmail,
        permissions: userPermissions,
      });
    }

    let existingUser = await prisma.cmuItAccount.findFirst({
      where: { email: decodedData.cmuitaccount },
      select: {
        id: true,
        cmu_codeId: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
      },
    });

    if (!existingUser) {
      const newYear = new Date().getFullYear();
      const cmuCodeId = generateUniqueCode("CMU", "00", newYear.toString(), []);

      existingUser = await prisma.cmuItAccount.create({
        data: {
          cmu_codeId: cmuCodeId,
          name: fullName,
          email: decodedData.cmuitaccount,
          role: isAdmin ? "ADMIN" : "USER",
          permissions: userPermissions, // ✅ ใช้อาร์เรย์ที่สร้างไว้
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        select: {
          id: true,
          cmu_codeId: true,
          name: true,
          email: true,
          role: true,
          permissions: true,
        },
      });
    } else {
      existingUser = await prisma.cmuItAccount.update({
        where: { email: decodedData.cmuitaccount },
        data: { updatedAt: new Date() },
        select: {
          id: true,
          cmu_codeId: true,
          name: true,
          email: true,
          role: true,
          permissions: true,
        },
      });
    }

    // --- ✅ FIX 2: แยกชื่อ-นามสกุล สำหรับ Token อย่างปลอดภัย ---
    const nameParts = existingUser.name
      .split(" ")
      .filter((part) => part.length > 0);
    const tokenFirstName = nameParts[0] || "";
    // ดึงคำสุดท้ายเป็นนามสกุล (รองรับชื่อที่มีหลายคำ)
    const tokenLastName =
      nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

    const token = await adminJwt.sign({
      id: existingUser.id,
      codeId: existingUser.cmu_codeId,
      email: existingUser.email,
      firstName: tokenFirstName,
      lastName: tokenLastName,
      role: existingUser.role,
      permissions: existingUser.permissions,
    });

    set.status = 200;
    logger.info("Auth CMU IT Account Callback API success", {
      ...requestInfo,
      status: set.status,
      cmuId: existingUser.cmu_codeId,
      email: existingUser.email,
      name: existingUser.name,
    });

    return { success: true, message: "Success", token };
  } catch (error) {
    set.status = 500;
    // Log error อย่างละเอียดเพื่อช่วย Debug หากเกิดปัญหาอีก
    logger.error("Auth CMU IT Account Callback API error", {
      ...requestInfo,
      status: set.status,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, message: "Internal server error" };
  }
};

export const getCmuItAccount = async ({
  set,
  request,
  adminJwt,
}: Context & { request: any; set: any; adminJwt: any }) => {
  const requestInfo = getRequestInfo(request);
  const authorization = request.headers.get("authorization") || "";
  const authenUser = await verifyVetTokenAdmin(
    adminJwt,
    authorization.toString(),
  );

  if (!authenUser) {
    set.status = 401;
    logger.warn("Unauthorized referralCasesAdmin", {
      ...requestInfo,
    });
    return { success: false, message: "Unauthorized" };
  }

  try {
    const resp = await prisma.cmuItAccount.findMany({
      select: {
        id: true,
        cmu_codeId: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
      },
    });

    set.status = 200;

    logger.info("Get CMU IT Accounts API success", {
      ...requestInfo,
      status: set.status,
    });

    return {
      success: true,
      message: "Success",
      data: resp,
    };
  } catch (error) {
    set.status = 500;

    logger.error("Get CMU IT Accounts API error", {
      ...requestInfo,
      status: set.status,
      error,
    });
    return {
      success: false,
      message: "Internal server error",
    };
  }
};

export const updatePermissions = async ({
  query,
  set,
  request,
  adminJwt,
}: Context & {
  query: { data: string };
  request: any;
  set: any;
  adminJwt: any;
}) => {
  const requestInfo = getRequestInfo(request);
  const authorization = request.headers.get("authorization") || "";
  const authenUser = await verifyVetTokenAdmin(
    adminJwt,
    authorization.toString(),
  );

  if (!authenUser) {
    set.status = 401;
    logger.warn("Unauthorized referralCasesAdmin", {
      ...requestInfo,
    });
    return { success: false, message: "Unauthorized" };
  }

  try {
    if (!query.data) {
      set.status = 400;
      logger.warn("Missing query data", {
        ...requestInfo,
        status: set.status,
      });
      return { success: false, message: "Missing query data" };
    }

    const secretKey = process.env.CRYPTO_KEY || "";
    const decodedData = await useDecodecryptQueryNew(query.data, secretKey);

    if (!decodedData) {
      set.status = 400;
      logger.warn("Invalid query data", {
        ...requestInfo,
        status: set.status,
      });
      return { success: false, message: "Invalid query data" };
    }

    const { adminId, permissions, role } = decodedData;

    if (!adminId || !permissions) {
      set.status = 400;
      logger.warn("Missing adminId, permissions, or role", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Missing adminId, permissions, or role",
      };
    }

    const updatedUser = await prisma.cmuItAccount.update({
      where: { id: adminId },
      data: { role: role, permissions: permissions, updatedAt: new Date() },
      select: {
        id: true,
        cmu_codeId: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
      },
    });

    set.status = 200;
    logger.info("Update Permissions API success", {
      ...requestInfo,
      status: set.status,
      adminId,
      updatedPermissions: permissions,
    });

    return {
      success: true,
      message: "Success",
      data: updatedUser,
    };
  } catch (error) {
    set.status = 500;
    logger.error("Update Permissions API error", {
      ...requestInfo,
      status: set.status,
      error,
    });
    return {
      success: false,
      message: "Internal server error",
    };
  }
};

