import { Context } from "elysia";
import { logger } from "../utils/logger";
import { getRequestInfo } from "../utils/requestInfo";
import {
  useDecodecryptBodyNew,
  useDecodecryptQueryNew,
} from "../utils/useCodes";
import { PrismaClient } from "@prisma/client";
import { verifyVetTokenVet } from "../utils/authGuard";
import { generateUniqueCode } from "../utils/generateCode";

const prisma = new PrismaClient();

// === POST ===
export const createdOwner = async ({
  set,
  request,
  body,
  vetJwt,
}: Context & { body: { encodedData: string }; vetJwt: any }) => {
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

    const checkDuplicate = await prisma.owner.findFirst({
      where: {
        // hospitalId: authenUser.hospitalId,
        veterinarianId: authenUser.id,
        OR: [
          { email: decodedData.email },
          { firstName: decodedData.firstName },
          { lastName: decodedData.lastName },
        ],
      },
      select: {
        firstName: true,
        email: true,
      },
    });

    if (checkDuplicate) {
      if (checkDuplicate.email === decodedData.email) {
        set.status = 400;
        logger.warn("User Email already exists", {
          ...requestInfo,
          status: set.status,
        });
        return {
          success: false,
          message: "User Email already exists",
        };
      }
      if (checkDuplicate.firstName === decodedData.firstName) {
        set.status = 400;
        logger.warn("User Name already exists", {
          ...requestInfo,
          status: set.status,
        });
        return {
          success: false,
          message: "User Name already exists",
        };
      }
    }

    const newYear = new Date().getFullYear();
    const codeId = generateUniqueCode("OWN", "02", newYear.toString(), []);

    const owner = await prisma.owner.create({
      data: {
        firstName: decodedData.firstName,
        lastName: decodedData.lastName,
        owner_codeId: codeId,
        email: decodedData.email || "example.com",
        phone: decodedData.phone,
        address: decodedData.address,
        hospitalId: decodedData.hospitalId,
        veterinarianId: decodedData.veterinarianId,
      },
    });

    if (!owner) {
      set.status = 400;
      logger.warn("Owner Create API error", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Owner Create API error",
      };
    }

    set.status = 200;
    logger.info("Owner Create API success", {
      ...requestInfo,
      status: set.status,
    });
    return {
      success: true,
      message: "Owner Create API success",
    };
  } catch (error) {
    set.status = 500;
    logger.error("Owner Create API error", {
      ...requestInfo,
      status: set.status,
      JSONStringify: error,
    });
    return {
      success: false,
      message: "Internal server error",
    };
  }
};

// === GET ===
export const getOwners = async ({
  set,
  request,
  vetJwt,
  query,
}: Context & { query: { data: string }; request: any; vetJwt: any }) => {
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
    if (!query.data) {
      set.status = 400;
      logger.warn("Data Not Found", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Data Not Found",
      };
    }

    const secretKey = process.env.CRYPTO_KEY || "";
    const decodedData = await useDecodecryptQueryNew(query.data, secretKey);

    if (!decodedData) {
      set.status = 400;
      logger.warn("Data Not Found", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Data Not Found",
      };
    }

    const owners = await prisma.owner.findMany({
      where: {
        veterinarianId: decodedData.veterinarianId,
        // hospitalId: decodedData.hospitalId,
      },
      include: {
        animals: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!owners) {
      set.status = 400;
      logger.warn("Owner Get API error", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Owner Get API error",
      };
    }

    set.status = 200;
    logger.info("Owner Get API success", {
      ...requestInfo,
      status: set.status,
    });
    return {
      success: true,
      message: "Owner Get API success",
      _data: owners,
    };
  } catch (error: any) {
    set.status = 500;
    logger.error("User Register API error", {
      ...requestInfo,
      status: set.status,
      JSONStringify: error,
    });
    return {
      success: false,
      message: "Internal server error",
    };
  }
};

// === PUT ===
export const updateOwner = async ({
  request,
  query,
  set,
  vetJwt,
}: Context & { vetJwt: any; request: any; query: { data: string } }) => {
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
    const decodedData = await useDecodecryptQueryNew(query.data, secretKey);

    if (!decodedData) {
      set.status = 400;
      logger.warn("Data Not Found", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Data Not Found",
      };
    }

    const owner = await prisma.owner.update({
      where: {
        id: decodedData.id,
      },
      data: {
        firstName: decodedData.firstName,
        lastName: decodedData.lastName,
        email: decodedData.email,
        phone: decodedData.phone,
        address: decodedData.address,
      },
    });

    if (!owner) {
      set.status = 400;
      logger.warn("Owner Update API error", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Owner Update API error",
      };
    }

    set.status = 200;
    logger.info("Owner Update API success", {
      ...requestInfo,
      status: set.status,
    });
    return {
      success: true,
      message: "Owner Update API success",
      _data: owner,
    };
  } catch (error) {
    set.status = 500;
    logger.error("Owner Update API error", {
      ...requestInfo,
      status: set.status,
      JSONStringify: error,
    });
    return {
      success: false,
      message: "Internal server error",
    };
  }
};

// === DELETE ===
export const deleteOwner = async ({
  request,
  query,
  set,
  vetJwt,
}: Context & { vetJwt: any; request: any; query: { data: string } }) => {
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
    const decodedData = await useDecodecryptQueryNew(query.data, secretKey);

    if (!decodedData) {
      set.status = 400;
      logger.warn("Data Not Found", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Data Not Found",
      };
    }

    const owner = await prisma.owner.delete({
      where: {
        id: decodedData,
      },
    });

    if (!owner) {
      set.status = 400;
      logger.warn("Owner Delete API error", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Owner Delete API error",
      };
    }

    set.status = 200;
    logger.info("Owner Delete API success", {
      ...requestInfo,
      status: set.status,
    });
    return {
      success: true,
      message: "Owner Delete API success",
      _data: owner,
    };
  } catch (error) {
    set.status = 500;
    logger.error("Owner Delete API error", {
      ...requestInfo,
      status: set.status,
      JSONStringify: error,
    });
    return {
      success: false,
      message: "Internal server error",
    };
  }
};
