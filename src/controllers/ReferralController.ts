import { Context } from "elysia";
import { getRequestInfo } from "../utils/requestInfo";
import { logger } from "../utils/logger";
import { verifyVetTokenAdmin, verifyVetTokenVet } from "../utils/authGuard";
import {
  useDecodecryptBodyNew,
  useDecodecryptQueryNew,
} from "../utils/useCodes";
import {
  AllowedFileType,
  CaseStatus,
  MedicalFileCategory,
  PrismaClient,
} from "@prisma/client";
import {
  deleteFileFromPath,
  getAllowedFileType,
  parseDateTimeSafe,
  saveFileToStorage,
} from "../helpers/helper";
import { generateUniqueCode } from "../utils/generateCode";
import { sendTelegramMessage } from "../telegram/telegrambot";
import { broadcastStatusUpdate } from "../utils/useWebsocket";

const prisma = new PrismaClient();

export const createReferralCase = async ({
  request,
  headers,
  set,
  vetJwt,
}: Context & { request: any; headers: any; vetJwt: any }) => {
  const requestInfo = getRequestInfo(request);

  // ✅ ตรวจสอบ Token
  const authorization =
    headers.authorization || request.headers.get("authorization");
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

  try {
    // ✅ 1. Parse FormData (สำหรับ multipart/form-data)
    const formData = await request.formData();

    // ✅ 2. ดึง encodedData จาก FormData (ไม่ใช่จาก body!)
    const encodedData = formData.get("encodedData") as string;
    if (!encodedData) {
      set.status = 400;
      return { success: false, message: "Missing encodedData" };
    }

    // ✅ 3. ถอดรหัส Metadata
    const secretKey = process.env.CRYPTO_KEY || "";
    const decodedData = await useDecodecryptBodyNew(encodedData, secretKey);

    // ✅ 4. Validate โครงสร้าง Metadata
    if (!decodedData?.animal_codeId || !Array.isArray(decodedData?.files)) {
      set.status = 400;
      return { success: false, message: "Invalid metadata structure" };
    }

    // ✅ 4. ดึงไฟล์ทั้งหมดที่อัพโหลด
    const files = formData.getAll("files") as File[];
    if (!files.length) {
      set.status = 400;
      return { success: false, message: "No files uploaded" };
    }

    // ✅ 6. หา petId จาก animal_codeId
    const pet = await prisma.animal.findUnique({
      where: { animal_codeId: decodedData.animal_codeId },
    });
    if (!pet) {
      set.status = 404;
      return { success: false, message: "Animal not found" };
    }

    const newYear = new Date().getFullYear();
    const codeId = generateUniqueCode("REF", "04", newYear.toString(), []);

    if (decodedData.serviceId) {
      const service = await prisma.serviceReferral.findUnique({
        where: { id: decodedData.serviceId },
      });
      if (!service) {
        set.status = 400;
        logger.warn("Invalid serviceId", {
          ...requestInfo,
          serviceId: decodedData.serviceId,
        });
        return {
          success: false,
          message: "Invalid serviceId: not found in system",
        };
      }
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const caseReferral = await tx.caseReferral.create({
          data: {
            referenceNo: codeId,
            title: decodedData.title,
            description: decodedData.description,
            referralType: "SPECIALIST",
            status: "PENDING",
            serviceCode: decodedData.serviceCode,
            hospitalId: decodedData.hospitalId,
            veterinarianId: decodedData.veterinarianId,
            serviceId: decodedData.serviceId,
            petId: pet.id,
          },
          select: {
            referenceNo: true,
            id: true,
            hospitalId: true,
            veterinarianId: true,
            referralType: true,
            veterinarian: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            hospital: {
              select: {
                name: true,
              },
            },
          },
        });
        // ── ประมวลผลไฟล์แต่ละตัว ──
        const medicalFiles = await Promise.all(
          files.map(async (file: File, index: number) => {
            // ✅ ดึง metadata ของไฟล์นี้จาก FormData โดยใช้ clientIndex
            const category = formData.get(
              `files[${index}][category]`,
            ) as string;
            const originalName = formData.get(
              `files[${index}][originalName]`,
            ) as string;
            const mimeType = formData.get(
              `files[${index}][mimeType]`,
            ) as string;
            const sizeBytes = parseInt(
              (formData.get(`files[${index}][sizeBytes]`) as string) || "0",
            );
            const fileExtension = formData.get(
              `files[${index}][fileExtension]`,
            ) as string;

            // ✅ Validate category เป็น enum ที่ถูกต้อง
            if (
              !Object.values(MedicalFileCategory).includes(
                category as MedicalFileCategory,
              )
            ) {
              throw new Error(`Invalid category: ${category}`);
            }

            // ✅ บันทึกไฟล์ลง Storage ได้ fileUrl/fileKey
            const { fileUrl, fileKey } = await saveFileToStorage(
              file,
              category,
              originalName,
              caseReferral.id,
            );

            // ✅ คำนวณ SHA256 hash สำหรับตรวจสอบความสมบูรณ์ของไฟล์
            const fileBuffer = await file.arrayBuffer();
            const fileHash = await crypto.subtle
              .digest("SHA-256", fileBuffer)
              .then((buf) =>
                Array.from(new Uint8Array(buf))
                  .map((b) => b.toString(16).padStart(2, "0"))
                  .join(""),
              );

            // ✅ สร้าง MedicalFile Record
            const medicalFile = await tx.medicalFile.create({
              data: {
                caseId: caseReferral.id,
                category: category as MedicalFileCategory,
                name: `${Date.now()}-${originalName}`,
                originalName,
                mimeType,
                fileExtension,
                sizeBytes,
                fileUrl,
                fileKey,
                fileType: getAllowedFileType(fileExtension),
                isAllowed: true,
                fileHash,
                uploadedBy: authenUser.id,
              },
            });

            // ✅ ถ้าเป็นไฟล์ LAB และมี labResults ให้สร้าง LabResult ด้วย
            const fileMeta = decodedData.files.find(
              (f: any) => f.clientIndex === index,
            );
            if (fileMeta?.labResults?.length > 0 && category === "LAB") {
              await tx.labResult.createMany({
                data: fileMeta.labResults.map((lr: any) => ({
                  medicalFileId: medicalFile.id,
                  title: lr.title,
                  description: lr.description || "",
                  resultData:
                    typeof lr.resultData === "object"
                      ? JSON.stringify(lr.resultData)
                      : lr.resultData,
                })),
              });
            }

            return medicalFile;
          }),
        );

        await sendTelegramMessage(caseReferral, request, set);

        // ── สร้าง CaseStatusLog แรก ──
        await tx.caseStatusLog.create({
          data: {
            caseId: caseReferral.id,
            oldStatus: "PENDING",
            newStatus: "PENDING",
            note: "ส่งข้อมูลไปยังเจ้าหน้าที่",
          },
        });

        return { caseReferral, medicalFiles };
      },
      { timeout: 60000 },
    );

    broadcastStatusUpdate("create-newcase", {
      caseId: decodedData.caseId,
      newStatus: CaseStatus.APPOINTED,
    });

    set.status = 200;
    logger.info("Create Referral Case API success", {
      ...requestInfo,
      status: set.status,
    });
    return {
      success: true,
      message: "Referral case created successfully",
      result: {
        caseReferralId: result.caseReferral.id,
        referenceNo: result.caseReferral.referenceNo,
        fileCount: result.medicalFiles.length,
        files: result.medicalFiles.map((f) => ({
          id: f.id,
          category: f.category,
          name: f.originalName,
          fileUrl: f.fileUrl,
        })),
      },
    };
  } catch (error: any) {
    set.status = 500;
    logger.error("Create Referral Case API error", {
      ...requestInfo,
      status: set.status,
      error: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      message: error.message || "Internal server error",
    };
  }
};

export const createMedicalFile = async ({
  request,
  headers,
  set,
  vetJwt,
}: Context & { request: any; headers: any; vetJwt: any }) => {
  const requestInfo = getRequestInfo(request);

  // ✅ ตรวจสอบ Token
  const authorization =
    headers.authorization || request.headers.get("authorization");
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

  try {
    // ✅ 1. Parse FormData (สำหรับ multipart/form-data)
    const formData = await request.formData();

    // ✅ 2. ดึง ข้อมูลหลักจาก FormData
    const caseId = formData.get("caseId") as string;
    const animalCodeId = formData.get("animalCodeId") as string;
    const category = formData.get("category") as string;

    // ✅ 3. ดึงไฟล์ที่อัพโหลด (รองรับเพียง 1 ไฟล์เท่านั้น)
    const file = formData.get("file") as File;
    if (!file) {
      set.status = 400;
      return { success: false, message: "No file uploaded" };
    }

    // ✅ 4. ดึง metadata ของไฟล์ (พยายามเอาจาก FormData หรือ fallback ไปที่ file object)
    const originalName = (formData.get("originalName") as string) || file.name;
    const mimeType = (formData.get("mimeType") as string) || file.type;
    const sizeBytes = parseInt(
      (formData.get("sizeBytes") as string) || file.size.toString(),
    );
    const fileExtension =
      (formData.get("fileExtension") as string) ||
      file.name.split(".").pop() ||
      "";

    if (category === "HISTORY") {
      const fileCheck = await prisma.medicalFile.findFirst({
        where: {
          caseId: caseId,
          category: "HISTORY",
        },
      });

      if (fileCheck) {
        set.status = 400;

        logger.warn("HISTORY file already exists", {
          ...requestInfo,
          status: set.status,
          caseId,
          category,
        });

        return {
          success: false,
          message:
            "HISTORY file already exists. Please delete the existing file before uploading a new one.",
        };
      }
    }

    // ✅ 5. หา petId จาก animal_codeId
    const pet = await prisma.animal.findUnique({
      where: { animal_codeId: animalCodeId },
    });
    if (!pet) {
      set.status = 404;
      return { success: false, message: "Animal not found" };
    }

    // ✅ 6. Validate category เป็น enum ที่ถูกต้อง
    if (
      !Object.values(MedicalFileCategory).includes(
        category as MedicalFileCategory,
      )
    ) {
      set.status = 400;
      return { success: false, message: `Invalid category: ${category}` };
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // ✅ บันทึกไฟล์ลง Storage ได้ fileUrl/fileKey
        const { fileUrl, fileKey } = await saveFileToStorage(
          file,
          category,
          originalName,
          caseId,
        );

        // ✅ คำนวณ SHA256 hash สำหรับตรวจสอบความสมบูรณ์ของไฟล์
        const fileBuffer = await file.arrayBuffer();
        const fileHash = await crypto.subtle
          .digest("SHA-256", fileBuffer)
          .then((buf) =>
            Array.from(new Uint8Array(buf))
              .map((b) => b.toString(16).padStart(2, "0"))
              .join(""),
          );

        // ✅ สร้าง MedicalFile Record
        const medicalFile = await tx.medicalFile.create({
          data: {
            caseId: caseId,
            category: category as MedicalFileCategory,
            name: `${Date.now()}-${originalName}`,
            originalName,
            mimeType,
            fileExtension,
            sizeBytes,
            fileUrl,
            fileKey,
            fileType: getAllowedFileType(fileExtension),
            isAllowed: true,
            fileHash,
            uploadedBy: authenUser.id,
          },
        });

        return { medicalFile };
      },
      { timeout: 60000 },
    );

    set.status = 200;
    logger.info("Create Medical File API success", {
      ...requestInfo,
      status: set.status,
    });
    return {
      success: true,
      message: "Medical file uploaded successfully",
      result: {
        id: result.medicalFile.id,
        category: result.medicalFile.category,
        name: result.medicalFile.originalName,
        fileUrl: result.medicalFile.fileUrl,
      },
    };
  } catch (error: any) {
    set.status = 500;
    logger.error("Create Medical File API error", {
      ...requestInfo,
      status: set.status,
      error: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      message: error.message || "Internal server error",
    };
  }
};

export const updateCategoryFile = async ({
  query,
  set,
  request,
  vetJwt,
}: Context & { request: Request; vetJwt: any; query: { data: string } }) => {
  const requestInfo = getRequestInfo(request);
  const authorization = request.headers.get("authorization") || "";

  const authenUser = await verifyVetTokenVet(vetJwt, authorization.toString());

  if (!authenUser) {
    set.status = 401;
    logger.warn("Unauthorized updateCategoryFile", {
      ...requestInfo,
      status: set.status,
    });
    return { success: false, message: "Unauthorized" };
  }

  try {
    if (!query.data) {
      set.status = 400;
      logger.warn("Missing query data", { ...requestInfo });
      return { success: false, message: "Missing query data" };
    }

    const secretKey = process.env.CRYPTO_KEY || "";
    const decodedData = await useDecodecryptQueryNew(query.data, secretKey);

    if (!decodedData?.fileId || !decodedData?.category) {
      set.status = 400;
      logger.warn("Invalid query data", { ...requestInfo });
      return { success: false, message: "Invalid query data" };
    }

    await prisma.medicalFile.update({
      where: { id: decodedData.fileId },
      data: { category: decodedData.category },
    });

    set.status = 200;
    logger.info("Update Category File API success", {
      ...requestInfo,
      status: set.status,
    });
    return {
      success: true,
      message: "Category file updated successfully",
    };
  } catch (error: any) {
    set.status = 500;
    logger.error("Update Category File API error", {
      ...requestInfo,
      status: set.status,
      error: error.message,
      stack: error.stack,
    });
  }
};

export const deleteCategoryFile = async ({
  query,
  set,
  request,
  vetJwt,
}: Context & { request: Request; vetJwt: any; query: { data: string } }) => {
  const requestInfo = getRequestInfo(request);
  const authorization = request.headers.get("authorization") || "";

  const authenUser = await verifyVetTokenVet(vetJwt, authorization.toString()); // ตรวจสอบการเข้าสู่ระบบ

  if (!authenUser) {
    set.status = 401;
    logger.warn("Unauthorized deleteFile", {
      ...requestInfo,
      status: set.status,
    });
    return { success: false, message: "Unauthorized" };
  }

  try {
    if (!query.data) {
      set.status = 400;
      logger.warn("Missing query data", { ...requestInfo });
      return { success: false, message: "Missing query data" };
    }

    const secretKey = process.env.CRYPTO_KEY || "";
    const decodedData = await useDecodecryptQueryNew(query.data, secretKey);

    if (!decodedData) {
      set.status = 400;
      logger.warn("Invalid query data", { ...requestInfo });
      return { success: false, message: "Invalid query data" };
    }

    const files = await prisma.medicalFile.findUnique({
      where: { id: decodedData },
      select: { fileUrl: true },
    });

    if (files?.fileUrl) {
      await deleteFileFromPath(files.fileUrl);
    }

    if (!files) {
      set.status = 404;
      logger.warn("File not found", { ...requestInfo });
      return { success: false, message: "File not found" };
    }

    await prisma.medicalFile.delete({
      where: { id: decodedData },
    });

    set.status = 200;
    logger.info("Delete Category File API success", {
      ...requestInfo,
      status: set.status,
    });
    return {
      success: true,
      message: "Category file deleted successfully",
    };
  } catch (error: any) {
    set.status = 500;
    logger.error("Update Category File API error", {
      ...requestInfo,
      status: set.status,
      error: error.message,
      stack: error.stack,
    });
  }
};

export const referralCases = async ({
  query,
  set,
  request,
  vetJwt,
}: Context & { request: Request; vetJwt: any }) => {
  const requestInfo = getRequestInfo(request);
  const authorization = request.headers.get("authorization") || "";

  const authenUser = await verifyVetTokenVet(vetJwt, authorization.toString());

  if (!authenUser) {
    set.status = 401;
    logger.warn("Unauthorized referralCases", {
      ...requestInfo,
      status: set.status,
    });
    return { success: false, message: "Unauthorized" };
  }

  try {
    if (!query.data) {
      set.status = 400;
      logger.warn("Missing query data", { ...requestInfo });
      return { success: false, message: "Missing query data" };
    }

    const secretKey = process.env.CRYPTO_KEY || "";
    const decodedData = await useDecodecryptQueryNew(query.data, secretKey);

    if (!decodedData?.timeStart || !decodedData?.timeEnd) {
      set.status = 400;
      logger.warn("Invalid date range", { ...requestInfo });
      return { success: false, message: "Invalid date range" };
    }

    const CATEGORY_ORDER: Record<string, number> = {
      HISTORY: 1,
      LAB: 2,
      XRAY: 3,
      PHOTO: 4,
      BIOPSY: 5,
      APPOINTMENT: 6,
    };

    const cases = await prisma.caseReferral.findMany({
      where: {
        veterinarianId: authenUser.id,
        hospitalId: authenUser.hospitalId,
        createdAt: {
          gte: new Date(decodedData.timeStart),
          lte: new Date(decodedData.timeEnd),
        },
      },
      orderBy: { createdAt: "desc" },
      take: decodedData.limit ?? 1000, // ในหน้า UI ให้ส่ง limit ที่เหมาะสม เช่น 20 หรือ 50 เพื่อป้องกันการดึงข้อมูลจำนวนมากเกินไป
      skip: decodedData.offset ?? 0,
      select: {
        id: true,
        referenceNo: true,
        title: true,
        description: true,
        serviceCode: true,
        status: true,
        referralType: true,
        hospital: true,
        veterinarian: {
          select: {
            id: true,
            vet_codeId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            ceLicense: true,
            lineID: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        pet: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true,
            sex: true,
            age: true,
            color: true,
            weight: true,
            animal_codeId: true,
            owner: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
        serviceReferral: true,
        vetcmu: true,
        resultSummary: true,
        medicalFiles: {
          where: { isAllowed: true },
          orderBy: { createdAt: "desc" },
        },
        caseStatusLogs: {
          orderBy: { createdAt: "desc" },
        },
        appointments: {
          orderBy: { createdAt: "desc" },
        },
        closedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // ✅ เรียงลำดับ medicalFiles ตาม CATEGORY_ORDER ในแต่ละ case
    const casesWithSortedFiles = cases.map((caseItem) => ({
      ...caseItem,
      medicalFiles: caseItem.medicalFiles.sort((a, b) => {
        const orderA = CATEGORY_ORDER[a.category] ?? 999;
        const orderB = CATEGORY_ORDER[b.category] ?? 999;

        // ✅ เรียงตามลำดับหมวดหมู่ก่อน
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        // ✅ ถ้าหมวดหมู่เดียวกัน ให้เรียงตามวันที่ (ใหม่สุดก่อน)
        return b.createdAt.getTime() - a.createdAt.getTime();
      }),
    }));

    set.status = 200;
    logger.info("Referral Cases List (Vet) success", {
      ...requestInfo,
      count: cases.length,
    });

    return {
      success: true,
      message: "Success",
      data: casesWithSortedFiles,
    };
  } catch (error: any) {
    set.status = 500;
    logger.error("Referral Cases List (Vet) error", {
      ...requestInfo,
      error: error.message,
    });
    return { success: false, message: "Internal server error" };
  }
};

// --- Admin Counter ------------------------------------------
export const referralCasesAdmin = async ({
  query,
  set,
  request,
  adminJwt,
}: Context & { request: Request; adminJwt: any }) => {
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
      logger.warn("Missing query data", { ...requestInfo });
      return { success: false, message: "Missing query data" };
    }

    const secretKey = process.env.CRYPTO_KEY || "";
    const decodedData = await useDecodecryptQueryNew(query.data, secretKey);

    const CATEGORY_ORDER: Record<string, number> = {
      HISTORY: 1,
      LAB: 2,
      XRAY: 3,
      PHOTO: 4,
      BIOPSY: 5,
      APPOINTMENT: 6,
    };

    const cases = await prisma.caseReferral.findMany({
      where: {
        createdAt: {
          gte: new Date(decodedData.timeStart),
          lte: new Date(decodedData.timeEnd),
        },
      },
      orderBy: { createdAt: "desc" },
      take: decodedData.limit ?? 100,
      skip: decodedData.offset ?? 0,
      include: {
        pet: { include: { owner: true } },
        hospital: true,
        veterinarian: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        serviceReferral: true,
        medicalFiles: true,
        caseStatusLogs: true,
        appointments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // ✅ เรียงลำดับ medicalFiles ตาม CATEGORY_ORDER ในแต่ละ case
    const casesWithSortedFiles = cases.map((caseItem) => ({
      ...caseItem,
      medicalFiles: caseItem.medicalFiles.sort((a, b) => {
        const orderA = CATEGORY_ORDER[a.category] ?? 999;
        const orderB = CATEGORY_ORDER[b.category] ?? 999;

        // ✅ เรียงตามลำดับหมวดหมู่ก่อน
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        // ✅ ถ้าหมวดหมู่เดียวกัน ให้เรียงตามวันที่ (ใหม่สุดก่อน)
        return b.createdAt.getTime() - a.createdAt.getTime();
      }),
    }));

    set.status = 200;
    logger.info("Referral Cases List (Admin) success", {
      ...requestInfo,
      count: cases.length,
    });

    return { success: true, message: "Success", data: casesWithSortedFiles };
  } catch (error: any) {
    set.status = 500;
    logger.error("Referral Cases List (Admin) error", {
      ...requestInfo,
      error: error.message,
    });
    return { success: false, message: "Internal server error" };
  }
};

export const referralCasesUpdateStatus = async ({
  body,
  set,
  request,
  adminJwt,
}: Context & {
  body: { encodedData: string };
  request: Request;
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
    logger.warn("Unauthorized referralCasesUpdateStatus", {
      ...requestInfo,
    });
    return { success: false, message: "Unauthorized" };
  }

  try {
    if (!body.encodedData) {
      set.status = 400;
      return { success: false, message: "Missing encodedData" };
    }

    const secretKey = process.env.CRYPTO_KEY || "";
    const decodedData = await useDecodecryptBodyNew(
      body.encodedData,
      secretKey,
    );

    if (!decodedData?.caseId || !decodedData?.status) {
      set.status = 400;
      return { success: false, message: "Invalid data" };
    }

    logger.debug("Decoded Data for Update Status:", decodedData.status);
    logger.debug("Decoded Case Status:", CaseStatus);

    if (!Object.values(CaseStatus).includes(decodedData.status)) {
      set.status = 400;
      return { success: false, message: "Invalid status value" };
    }

    const allowedTransitions: Record<string, CaseStatus[]> = {
      PENDING: [CaseStatus.RECEIVED, CaseStatus.CANCELLED],
      RECEIVED: [CaseStatus.CONFIRMED, CaseStatus.CANCELLED],
      CONFIRMED: [CaseStatus.APPOINTED, CaseStatus.CANCELLED],
      APPOINTED: [CaseStatus.COMPLETED, CaseStatus.CANCELLED],
      COMPLETED: [],
      CANCELLED: [],
    };

    const result = await prisma.$transaction(async (tx) => {
      const existingCase = await tx.caseReferral.findUnique({
        where: { id: decodedData.caseId },
      });

      if (!existingCase) {
        throw new Error("Case not found");
      }

      if (!decodedData.note || decodedData.note.trim() === "") {
        throw new Error("Note is required for status update");
      }

      if (
        !allowedTransitions[existingCase.status]?.includes(decodedData.status)
      ) {
        throw new Error("Invalid status transition");
      }

      const updatedCase = await tx.caseReferral.update({
        where: { id: decodedData.caseId },
        data: {
          status: decodedData.status,
          adminId: authenUser.id,
        },
      });

      const log = await tx.caseStatusLog.create({
        data: {
          caseId: updatedCase.id,
          oldStatus: existingCase.status,
          newStatus: decodedData.status,
          note: decodedData.note.trim(),
          changedBy: authenUser.id,
        },
      });

      return { updatedCase, log };
    });

    set.status = 200;
    logger.info("Referral Case Update Status success", {
      ...requestInfo,
      caseId: decodedData.caseId,
      newStatus: decodedData.status,
    });

    broadcastStatusUpdate("update-status", {
      caseId: result.updatedCase.id,
      referenceNo: result.updatedCase.referenceNo,
      oldStatus: result.log.oldStatus,
      newStatus: result.log.newStatus,
      note: result.log.note ?? "",
    });

    return { success: true, message: "Success", data: result.log };
  } catch (error: any) {
    set.status = 400;
    logger.error("Referral Case Update Status error", {
      ...requestInfo,
      error: error.message,
    });
    return { success: false, message: error.message };
  }
};

export const referralCaseAppointment = async ({
  request,
  headers,
  set,
  adminJwt,
}: Context & { request: any; headers: any; adminJwt: any }) => {
  const requestInfo = getRequestInfo(request);

  const authorization =
    headers.authorization || request.headers.get("authorization");

  const authenUser = await verifyVetTokenAdmin(
    adminJwt,
    authorization?.toString() || "",
  );

  if (!authenUser) {
    set.status = 401;
    logger.warn("Unauthorized referralCaseAppointment", {
      ...requestInfo,
      status: set.status,
    });
    return { success: false, message: "Unauthorized" };
  }

  try {
    const formData = await request.formData();
    const encodedData = formData.get("encodedData") as string;
    const files = formData.getAll("files") as File[];

    if (!encodedData) {
      set.status = 400;
      logger.warn("Missing encodedData", {
        ...requestInfo,
        status: set.status,
      });
      return { success: false, message: "Missing encodedData" };
    }

    if (!files.length || files.length > 1) {
      set.status = 400;
      logger.warn("Invalid file count", {
        ...requestInfo,
        status: set.status,
      });
      return { success: false, message: "Only 1 file allowed" };
    }

    const file = files[0];

    if (file.type !== "application/pdf") {
      set.status = 400;
      logger.warn("Invalid file type", {
        ...requestInfo,
        status: set.status,
        mimeType: file.type,
      });
      return { success: false, message: "Only PDF allowed" };
    }

    if (file.size > 10 * 1024 * 1024) {
      set.status = 400;
      logger.warn("File too large", {
        ...requestInfo,
        status: set.status,
        size: file.size,
      });
      return { success: false, message: "File too large (max 10MB)" };
    }

    const secretKey = process.env.CRYPTO_KEY || "";
    const decodedData = await useDecodecryptBodyNew(encodedData, secretKey);

    if (!decodedData.caseId) {
      set.status = 400;
      logger.warn("Invalid caseId decode", {
        ...requestInfo,
        status: set.status,
      });
      return { success: false, message: "Invalid caseId" };
    }

    const caseExists = await prisma.caseReferral.findUnique({
      where: { id: decodedData.caseId },
    });

    if (!caseExists) {
      set.status = 404;
      logger.warn("Case not found", {
        ...requestInfo,
        status: set.status,
        caseId: decodedData.caseId,
      });
      return { success: false, message: "Case not found" };
    }

    logger.info("Saving appointment file", {
      ...requestInfo,
      caseId: decodedData.caseId,
      userId: authenUser.id,
    });

    const { fileUrl, fileKey } = await saveFileToStorage(
      file,
      "APPOINTMENT",
      file.name,
      decodedData.caseId,
    );

    logger.info("File saved successfully", {
      ...requestInfo,
      caseId: decodedData.caseId,
      fileUrl,
    });

    const newAppointmentDate = parseDateTimeSafe(
      decodedData.appointmentDateTime,
    );

    if (!newAppointmentDate) {
      set.status = 400;
      logger.warn("Invalid appointment date format", {
        ...requestInfo,
        status: set.status,
        appointmentDate: decodedData.appointmentDateTime,
        expectedFormat:
          "Thai: '7 มีนาคม 2569 เวลา 10:54:29' or ISO: '2026-03-21T13:39:00+07:00'",
      });
      return {
        success: false,
        message: "รูปแบบวันที่ไม่ถูกต้อง ตัวอย่าง: 7 มีนาคม 2569 เวลา 10:54:29",
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({
        data: {
          caseId: decodedData.caseId,
          date: newAppointmentDate,
          note:
            "Schedule an appointment date: " + decodedData.appointmentDateTime,
        },
      });

      const medicalFile = await tx.medicalFile.create({
        data: {
          caseId: decodedData.caseId,
          appointmentId: appointment.id,
          category: MedicalFileCategory.APPOINTMENT,
          name: `${Date.now()}-${file.name}`,
          originalName: file.name,
          mimeType: file.type,
          fileExtension: "pdf",
          sizeBytes: file.size,
          fileUrl,
          fileKey,
          fileType: AllowedFileType.DOCUMENT,
          isAllowed: true,
          uploadedBy: authenUser.id,
        },
      });

      await tx.caseReferral.update({
        where: { id: decodedData.caseId },
        data: { status: CaseStatus.APPOINTED },
      });

      // await tx.caseStatusLog.create({
      //   data: {
      //     caseId,
      //     oldStatus: caseExists.status,
      //     newStatus: CaseStatus.APPOINTED,
      //     changedBy: authenUser.id,
      //     note: "Appointment uploaded",
      //   },
      // });

      return { appointment, medicalFile };
    });

    logger.info("Referral Case Appointment success", {
      ...requestInfo,
      caseId: decodedData.caseId,
      appointmentId: result.appointment.id,
      fileId: result.medicalFile.id,
      userId: authenUser.id,
    });

    broadcastStatusUpdate("update-followup", {
      caseId: decodedData.caseId,
      newStatus: CaseStatus.APPOINTED,
    });

    set.status = 200;

    return {
      success: true,
      message: "Appointment uploaded successfully",
      result: {
        appointmentId: result.appointment.id,
        fileId: result.medicalFile.id,
        fileUrl: result.medicalFile.fileUrl,
      },
    };
  } catch (error: any) {
    set.status = 500;

    logger.error("Referral Case Appointment API error", {
      ...requestInfo,
      status: set.status,
      error: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      message: error.message || "Internal server error",
    };
  }
};

export const updateAppointmentFile = async ({
  body,
  set,
  request,
  adminJwt,
}: Context & {
  request: Request;
  adminJwt: any;
  body: { encodedData: string };
}) => {
  const requestInfo = getRequestInfo(request);
  const authorization = request.headers.get("authorization") || "";

  const authenUser = await verifyVetTokenAdmin(
    adminJwt,
    authorization.toString(),
  ); // ตรวจสอบการเข้าสู่ระบบ

  if (!authenUser) {
    set.status = 401;
    logger.warn("Unauthorized updateAppointmentFile", {
      ...requestInfo,
      status: set.status,
    });
    return { success: false, message: "Unauthorized" };
  }

  try {
    if (!body.encodedData) {
      set.status = 400;
      logger.warn("Missing body data", { ...requestInfo });
      return { success: false, message: "Missing body data" };
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    const encodedDataRaw =
      (formData.get("encodedData") as string) || body.encodedData;
    const secretKey = process.env.CRYPTO_KEY || "";
    const decodedData = await useDecodecryptBodyNew(encodedDataRaw, secretKey);

    if (!decodedData?.fileId || !decodedData?.appointment) {
      set.status = 400;
      logger.warn("Invalid query data", { ...requestInfo });
      return { success: false, message: "Invalid query data" };
    }

    if (!files.length || files.length > 1) {
      set.status = 400;
      logger.warn("Invalid file count for updateAppointmentFile", {
        ...requestInfo,
        count: files.length,
      });
      return { success: false, message: "Only 1 file allowed" };
    }

    const file = files[0];

    if (file.type !== "application/pdf") {
      set.status = 400;
      logger.warn("Invalid file type for updateAppointmentFile", {
        ...requestInfo,
        mimeType: file.type,
      });
      return { success: false, message: "Only PDF allowed" };
    }

    if (file.size > 10 * 1024 * 1024) {
      set.status = 400;
      logger.warn("File too large for updateAppointmentFile", {
        ...requestInfo,
        size: file.size,
      });
      return { success: false, message: "File too large (max 10MB)" };
    }

    // Upload the new file first to avoid losing data if DB update fails
    const { fileUrl: newFileUrl, fileKey: newFileKey } =
      await saveFileToStorage(
        file,
        "APPOINTMENT",
        file.name,
        decodedData.caseId,
      );

    let transactionResult;
    try {
      transactionResult = await prisma.$transaction(
        async (tx) => {
          const currentFile = await tx.medicalFile.findUnique({
            where: { id: decodedData.fileId },
            select: { fileUrl: true },
          });

          const otherFiles = await tx.medicalFile.findMany({
            where: {
              appointmentId: decodedData.appointment,
              category: MedicalFileCategory.APPOINTMENT,
              NOT: { id: decodedData.fileId },
            },
            select: { id: true, fileUrl: true },
          });

          if (otherFiles.length) {
            await tx.medicalFile.deleteMany({
              where: { id: { in: otherFiles.map((x) => x.id) } },
            });
          }

          const updatedFile = await tx.medicalFile.update({
            where: { id: decodedData.fileId },
            data: {
              appointmentId: decodedData.appointment,
              name: `${Date.now()}-${file.name}`,
              originalName: file.name,
              mimeType: file.type,
              fileExtension: (file.name.split(".").pop() || "").toLowerCase(),
              sizeBytes: file.size,
              fileUrl: newFileUrl,
              fileKey: newFileKey,
              fileType: AllowedFileType.DOCUMENT,
              isAllowed: true,
              uploadedBy: authenUser.id,
            },
          });

          return {
            updatedFile,
            oldFileUrl: currentFile?.fileUrl || null,
            otherFileUrls: otherFiles
              .map((x) => x.fileUrl)
              .filter(Boolean) as string[],
          };
        },
        { timeout: 60000 },
      );
    } catch (txErr: any) {
      // cleanup newly uploaded file to avoid orphaned storage
      try {
        await deleteFileFromPath(newFileUrl);
      } catch (cleanupErr: any) {
        logger.error(
          "Failed to cleanup newly uploaded file after transaction failure",
          {
            ...requestInfo,
            newFileUrl,
            error: cleanupErr?.message ?? String(cleanupErr),
          },
        );
      }
      throw txErr;
    }

    // After successful DB transaction, remove old files from storage
    if (transactionResult.oldFileUrl) {
      try {
        await deleteFileFromPath(transactionResult.oldFileUrl);
      } catch (err: any) {
        logger.error("Failed to delete old appointment file from storage", {
          ...requestInfo,
          fileUrl: transactionResult.oldFileUrl,
          error: err?.message ?? String(err),
        });
      }
    }

    if (transactionResult.otherFileUrls?.length) {
      for (const url of transactionResult.otherFileUrls) {
        try {
          await deleteFileFromPath(url);
        } catch (err: any) {
          logger.error("Failed to delete other appointment file from storage", {
            ...requestInfo,
            fileUrl: url,
            error: err?.message ?? String(err),
          });
        }
      }
    }

    broadcastStatusUpdate("update-followup", {
      caseId: decodedData.caseId,
      newStatus: CaseStatus.APPOINTED,
    });

    set.status = 200;
    logger.info("Update Appointment File API success", {
      ...requestInfo,
      status: set.status,
    });
    return {
      success: true,
      message: "Appointment file updated successfully",
    };
  } catch (error: any) {
    set.status = 500;
    logger.error("Update Appointment File API error", {
      ...requestInfo,
      status: set.status,
      error: error.message,
      stack: error.stack,
    });
  }
};

export const deleteAppointmentFile = async ({
  query,
  set,
  request,
  adminJwt,
}: Context & { request: Request; adminJwt: any; query: { data: string } }) => {
  const requestInfo = getRequestInfo(request);
  const authorization = request.headers.get("authorization") || "";

  const authenUser = await verifyVetTokenAdmin(
    adminJwt,
    authorization.toString(),
  ); // ตรวจสอบการเข้าสู่ระบบ

  if (!authenUser) {
    set.status = 401;
    logger.warn("Unauthorized deleteFile", {
      ...requestInfo,
      status: set.status,
    });
    return { success: false, message: "Unauthorized" };
  }

  try {
    if (!query.data) {
      set.status = 400;
      logger.warn("Missing query data", { ...requestInfo });
      return { success: false, message: "Missing query data" };
    }

    const secretKey = process.env.CRYPTO_KEY || "";
    const decodedData = await useDecodecryptQueryNew(query.data, secretKey);

    if (!decodedData) {
      set.status = 400;
      logger.warn("Invalid query data", { ...requestInfo });
      return { success: false, message: "Invalid query data" };
    }

    const files = await prisma.medicalFile.findUnique({
      where: { id: decodedData.fileId },
      select: { fileUrl: true },
    });

    if (files?.fileUrl) {
      await deleteFileFromPath(files.fileUrl);
    }

    await prisma.appointment.delete({
      where: { id: decodedData.appointment },
    });

    await prisma.medicalFile.delete({
      where: { id: decodedData.fileId },
    });

    broadcastStatusUpdate("update-followup", {
      caseId: decodedData.caseId,
      newStatus: CaseStatus.APPOINTED,
    });

    set.status = 200;
    logger.info("Delete Category File API success", {
      ...requestInfo,
      status: set.status,
    });
    return {
      success: true,
      message: "Category file deleted successfully",
    };
  } catch (error: any) {
    set.status = 500;
    logger.error("Update Category File API error", {
      ...requestInfo,
      status: set.status,
      error: error.message,
      stack: error.stack,
    });
  }
};
