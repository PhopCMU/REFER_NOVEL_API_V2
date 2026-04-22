import { Context } from "elysia";
import { getRequestInfo } from "../utils/requestInfo";
import { logger } from "../utils/logger";
import { verifyVetTokenVet } from "../utils/authGuard";

export const services = async ({
  set,
  request,
  vetJwt,
}: Context & { request: any; vetJwt: any }) => {
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

  try {
  } catch (error) {
    set.status = 500;
    logger.error("Services List API error", {
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
