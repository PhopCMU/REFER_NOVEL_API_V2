import { Context } from "elysia";
import { verifyRecaptcha } from "../utils/recaptcha";
import { useDecodecryptBodyNew } from "../utils/useCodes";
import { getRequestInfo } from "../utils/requestInfo";
import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";
import { verifyVetTokenAdmin, verifyVetTokenVet } from "../utils/authGuard";

const prisma = new PrismaClient();

// === POST ===
export const hospitals = async ({
  request,
  body,
  set,
}: Context & { request: any; body: { encodedData: string } }) => {
  const requestInfo = getRequestInfo(request);

  try {
    if (!body.encodedData) {
      set.status = 400;
      logger.warn("Missing encrypted data", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Missing encrypted data",
      };
    }

    const secretKey = process.env.CRYPTO_KEY || "";
    const decodedData = await useDecodecryptBodyNew(
      body.encodedData,
      secretKey,
    );

    const recaptcha = await verifyRecaptcha(
      decodedData.recaptchaToken,
      "hospital_workplace",
      0.5,
    );

    if (!recaptcha.success) {
      set.status = 403;
      logger.warn("Recaptcha verification failed", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Recaptcha verification failed",
      };
    }

    await prisma.hospital.createMany({
      data: {
        name: decodedData.name,
        type: decodedData.type,
      },
    });

    set.status = 200;

    logger.info("Hospitals API success", {
      ...requestInfo,
      status: set.status,
    });

    return {
      success: true,
      message: "Success",
    };
  } catch (error) {
    set.status = 500;

    logger.error("Hospitals API error", {
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

export const updateHospitals = async ({
  request,
  body,
  set,
  vetJwt,
}: Context & {
  request: any;
  vetJwt: any;
  body: { encodedData: string };
}) => {
  const requestInfo = getRequestInfo(request);

  // 1. ตรวจสอบการเข้าสู่ระบบ
  const authorization = request.headers.get("authorization") || null;
  const authenUser = await verifyVetTokenVet(
    vetJwt,
    authorization?.toString() || "",
  );

  if (!authenUser) {
    set.status = 401;
    logger.warn("Unauthorized", {
      ...requestInfo,
      status: set.status,
    });
    return {
      success: false,
      message: "Unauthorized",
    };
  }

  const secretKey = process.env.CRYPTO_KEY || "";
  const decodedData = await useDecodecryptBodyNew(body.encodedData, secretKey);

  if (!decodedData.a) {
    set.status = 400;
    logger.warn("Missing encrypted data", {
      ...requestInfo,
      status: set.status,
    });
    return {
      success: false,
      message: "Missing encrypted data",
    };
  }

  try {
    const a = decodedData.a[0];
    const b = authenUser.id;

    const hospitalReCheck = await prisma.veterinarian.findFirst({
      where: {
        id: b,
        hospitals: { some: { id: a } },
      },
    });

    if (hospitalReCheck) {
      set.status = 400;
      logger.warn("Hospital already exist", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Hospital already exist",
      };
    }

    await prisma.veterinarian.update({
      where: {
        id: b,
      },
      data: {
        hospitals: {
          connect: {
            id: a,
          },
        },
      },
    });

    set.status = 200;
    return {
      success: true,
      message: "Success",
    };
  } catch (error) {
    set.status = 500;
    logger.error("Hospitals API error", {
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

// === GET ===
export const getHospitals = async ({
  set,
  request,
}: Context & { request: any; set: any }) => {
  const requestInfo = getRequestInfo(request);

  try {
    const resp = await prisma.hospital.findMany();
    set.status = 200;
    logger.info("Hospitals list API success", {
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
    logger.error("Hospitals List API error", {
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

// Counter for hospsital count
export const getHospitalDashboard = async ({
  set,
  request,
  query,
  adminJwt,
}: Context & { set: any; request: any; query: any; adminJwt: any }) => {
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
      return {
        success: false,
        message: "Missing query data",
      };
    }

    const secretKey = process.env.CRYPTO_KEY || "";
    const decodedData = await useDecodecryptBodyNew(query.data, secretKey);

    if (!decodedData) {
      set.status = 400;
      logger.warn("Invalid encrypted query data", {
        ...requestInfo,
        status: set.status,
        admin: authenUser.codeId || authenUser.id,
      });
      return {
        success: false,
        message: "Invalid encrypted query data",
      };
    }

    // สร้างตัวแปรสำหรับเก็บช่วงเวลาที่จะใช้กรอง
    let dateQuery: { gte?: Date; lte?: Date } = {};

    if (decodedData.year) {
      // กรณีมีการส่ง year มา (เช่น 2024)
      const year = Number(decodedData.year);

      // กำหนดช่วง 1 ม.ค. ถึง 31 ธ.ค. ของปีนั้น
      const startOfYear = new Date(year, 0, 1); // เวลา 00:00:00
      const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999); // เวลา 23:59:59.999

      dateQuery = {
        gte: startOfYear,
        lte: endOfYear,
      };
    } else {
      // กรณีไม่มี year ให้ใช้ช่วงวันที่แบบกำหนดเอง (Fallback)
      dateQuery = {
        gte: decodedData.startDate
          ? new Date(decodedData.startDate)
          : undefined,
        lte: decodedData.endDate ? new Date(decodedData.endDate) : undefined,
      };
    }

    const hospitalCount = await prisma.hospital.findMany({
      take: decodedData.limits ?? decodedData ?? 1000, // ในหน้า UI ให้ส่ง limit ที่เหมาะสม เช่น 20 หรือ 50 เพื่อป้องกันการดึงข้อมูลจำนวนมากเกินไป
      skip: decodedData.offset ?? 0,
      include: {
        caseReferrals: {
          where: {
            createdAt: dateQuery,
          },
          select: {
            id: true,
            referenceNo: true,
            title: true,
            description: true,
            referralType: true,
            status: true,
            serviceCode: true,
            admin: {
              select: {
                id: true,
                cmu_codeId: true,
                name: true,
              },
            },
            resultSummary: true,
            closedAt: true,
            veterinarian: {
              select: {
                id: true,
                vet_codeId: true,
                firstName: true,
                lastName: true,
                ceLicense: true,
              },
            },
            pet: {
              include: {
                owner: {
                  select: {
                    id: true,
                    owner_codeId: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    set.status = 200;

    logger.info("Hospital dashboard API success", {
      ...requestInfo,
      status: set.status,
      admin: authenUser.codeId || authenUser.id,
    });

    return {
      success: true,
      message: "Success",
      data: hospitalCount,
    };
  } catch (error) {
    logger.error("Hospital count API error", {
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

// === DELETE ===

// === UPDATE ===
