import { Context } from "elysia";
import { verifyRecaptcha } from "../utils/recaptcha";
import {
  useDecodecryptBodyNew,
  useDecodecryptQueryNew,
} from "../utils/useCodes";
import { getRequestInfo } from "../utils/requestInfo";
import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";
import { verifyVetTokenAdmin } from "../utils/authGuard";

const prisma = new PrismaClient();

export const feedback = async ({
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
      "feedback",
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

    await prisma.feedback.create({
      data: {
        ipAddress: requestInfo.ip,
        rating: decodedData.rating,
        comment: decodedData.comment,
      },
    });

    set.status = 200;
    logger.info("Feedback created successfully", {
      ...requestInfo,
      status: set.status,
      rating: decodedData.rating, // log เฉพาะที่จำเป็น
    });

    return { message: "Feedback success" };
  } catch (error) {
    set.status = 500;

    logger.error("Feedback API error", {
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

export const ReportFeedback = async ({
  request,
  query,
  set,
  adminJwt,
}: Context & { adminJwt: any; request: any; query: { data: string } }) => {
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
    const decodedData = await useDecodecryptQueryNew(query.data, secretKey);

    const feedbacks = await prisma.feedback.findMany({
      where: {
        createdAt: {
          gte: new Date(decodedData.start),
          lte: new Date(decodedData.end),
        },
      },
    });

    set.status = 200;
    logger.info("Feedback report created successfully", {
      ...requestInfo,
      status: set.status,
      feedbackId: decodedData.feedbackId, // log เฉพาะที่จำเป็น
    });

    // Cover IP addresses Ex. 10.110.50.10 => 10.110.xxx.xxx
    const coverIp = feedbacks.map((feedback) => {
      const ipParts = feedback.ipAddress.split(".");
      const comment = feedback.comment ? feedback.comment : "";
      const dateTime = feedback.createdAt.toISOString();
      const id = feedback.id;
      const rating = feedback.rating ? feedback.rating : 0;
      return {
        ipAddress: `${ipParts[0]}.${ipParts[1]}.xxx.xxx`,
        comment,
        rating,
        dateTime,
        id,
      };
    });

    return { message: "Feedback report success", results: coverIp };
  } catch (error) {
    set.status = 500;

    logger.error("Feedback report API error", {
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
