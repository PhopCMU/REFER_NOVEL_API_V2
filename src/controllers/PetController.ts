import { Context } from "elysia";
import { verifyVetTokenVet } from "../utils/authGuard";
import { logger } from "../utils/logger";
import { getRequestInfo } from "../utils/requestInfo";
import {
  useDecodecryptBodyNew,
  useDecodecryptQueryNew,
} from "../utils/useCodes";
import { PrismaClient } from "@prisma/client";
import { generateUniqueCode } from "../utils/generateCode";

const prisma = new PrismaClient();

// === POST ===
export const createdPet = async ({
  body,
  vetJwt,
  set,
  request,
}: Context & {
  body: {
    encodedData: string;
  };
  request: any;
  vetJwt: any;
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
  try {
    if (!body.encodedData) {
      set.status = 400;
      logger.warn("Missing body data", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Missing body data",
      };
    }

    const secretKey = process.env.CRYPTO_KEY || "";
    const decodedData = await useDecodecryptBodyNew(
      body.encodedData,
      secretKey,
    );

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

    const newYear = new Date().getFullYear();
    const codeId = generateUniqueCode("PET", "03", newYear.toString(), []);

    const pet = await prisma.animal.create({
      data: {
        ownerId: decodedData.ownerId,
        name: decodedData.name,
        weight: decodedData.weight.toString() || "0",
        animal_codeId: codeId,
        color: decodedData.color,
        age: decodedData.age,
        sex: decodedData.sex || "M",
        sterilization: decodedData.sterilization || "UNKNOWN",
        species: decodedData.species || "Dog",
        exoticdescription: decodedData.exoticdescription || "",
        breed: decodedData.breed || "",
      },
    });

    if (!pet) {
      set.status = 400;
      logger.warn("Pet Create API error", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Pet Create API error",
      };
    }

    set.status = 200;
    logger.info("Pet Create API success", {
      ...requestInfo,
      status: set.status,
    });
    return {
      success: true,
      message: "Pet Create API success",
    };
  } catch (error) {
    set.status = 500;
    logger.error("Create Pet API error", {
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

// === DELETE ===
export const deletePet = async ({
  query,
  vetJwt,
  set,
  request,
}: Context & {
  query: {
    data: string;
  };
  request: any;
  vetJwt: any;
}) => {
  const requestInfo = getRequestInfo(request);

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
      logger.warn("Missing query data: [API Delete Pet]", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Missing query data: [API Delete Pet]",
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

    const pet = await prisma.animal.delete({
      where: {
        id: decodedData,
      },
    });
    if (!pet) {
      set.status = 400;
      logger.warn("Pet Delete API error", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Pet Delete API error",
      };
    }

    set.status = 200;
    logger.info("Pet Delete API success", {
      ...requestInfo,
      status: set.status,
    });
    return {
      success: true,
      message: "Pet Delete API success",
    };
  } catch (error) {
    set.status = 500;
    logger.error("Delete Pet API error", {
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

// === UPDATE ===
export const updatedPet = async ({
  query,
  vetJwt,
  set,
  request,
}: Context & {
  query: {
    data: string;
  };
  request: any;
  vetJwt: any;
}) => {
  const requestInfo = getRequestInfo(request);

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
      logger.warn("Missing query data: [API Update Pet]", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Missing query data: [API Update Pet]",
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

    const pet = await prisma.animal.update({
      where: {
        id: decodedData.id,
      },
      data: {
        name: decodedData.name,
        weight: decodedData.weight || "0",
        color: decodedData.color,
        age: decodedData.age,
        sex: decodedData.sex,
        sterilization: decodedData.sterilization,
        species: decodedData.species,
        exoticdescription: decodedData.exoticdescription || "",
        breed: decodedData.breed,
        updatedAt: new Date(),
      },
    });

    if (!pet) {
      set.status = 400;
      logger.warn("Pet Update API error", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Pet Update API error",
      };
    }

    set.status = 200;
    logger.info("Pet Update API success", {
      ...requestInfo,
      status: set.status,
    });
    return {
      success: true,
      message: "Pet Update API success",
    };
  } catch (error: any) {
    set.status = 500;
    logger.error("Update Pet API error", {
      status: set.status,
      JSONStringify: error,
    });
    return {
      success: false,
      message: "Internal server error",
    };
  }
};
