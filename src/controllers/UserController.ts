import { Context } from "elysia";
import { logger } from "../utils/logger";
import { getRequestInfo } from "../utils/requestInfo";
import {
  useDecodecryptBodyNew,
  useDecodecryptQueryNew,
  useEncodecrypt,
} from "../utils/useCodes";
import { verifyRecaptcha } from "../utils/recaptcha";
import { useHashPassword } from "../utils/useHashPassword";
import { PrismaClient } from "@prisma/client";
import { generateOTP, generateUniqueCode } from "../utils/generateCode";
import { sendTemplateEmail } from "../email/emailservice";
import { UserProps } from "../types/type";
import { verifyVetTokenAdmin } from "../utils/authGuard";

const prisma = new PrismaClient();

export const userRegister = async ({
  body,
  set,
  request,
}: Context & {
  request: any;
  body: { encodedData: string };
  set: any;
}) => {
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
      "signup",
      0.5,
    );

    if (!recaptcha.success) {
      set.status = 400;
      logger.warn("Recaptcha verification failed", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Recaptcha verification failed",
      };
    }

    const reCheck = await prisma.veterinarian.findUnique({
      where: {
        email: decodedData.email,
      },
    });

    if (reCheck) {
      set.status = 400;
      logger.warn("Email already exists", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Email already exists",
      };
    }

    const email = decodedData.email.toLowerCase();
    const hashPassword = useHashPassword(decodedData.password, email);

    // 1. ตรวจสอบก่อนว่า decodedData และ workplace มีค่าอยู่จริง
    if (!decodedData || !decodedData.workplaces) {
      throw new Error("Invalid data: workplaces is missing");
    }

    // 2. ใช้ชื่อฟิลด์ให้ตรงกับที่ Frontend ส่งมา (เช็คตัวสะกด s ด้วยครับ)
    const workplaceIds = Array.isArray(decodedData.workplaces)
      ? decodedData.workplaces
      : [];

    const workplaceConnect = workplaceIds.map((id: string) => ({ id: id }));

    const newYear = new Date().getFullYear();
    const codeId = generateUniqueCode("VET", "01", newYear.toString(), []);

    await prisma.veterinarian.create({
      data: {
        email: decodedData.email,
        vet_codeId: codeId,
        firstName: decodedData.firstName,
        lastName: decodedData.lastName,
        password: hashPassword,
        ceLicense: decodedData.ceLicense,
        phone: decodedData.phone,
        lineID: decodedData.lineID,
        hospitals: {
          connect: workplaceConnect,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    set.status = 200;
    logger.info("User Register API success", {
      ...requestInfo,
      status: set.status,
    });
    return {
      success: true,
      message: "Success",
    };
  } catch (error) {
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

export const userLogin = async ({
  body,
  set,
  request,
  vetJwt,
}: Context & {
  request: any;
  body: { encodedData: string };
  set: any;
  vetJwt: any;
}) => {
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
      "signin",
      0.5,
    );

    if (!recaptcha.success) {
      set.status = 400;
      logger.warn("Recaptcha verification failed", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Recaptcha verification failed",
      };
    }

    const email = decodedData.email.toLowerCase();
    const hashPassword = useHashPassword(decodedData.password, email);
    const hospital = decodedData.selectedHospital;

    const user = await prisma.veterinarian.findUnique({
      where: {
        email: decodedData.email,
        password: hashPassword,
        hospitals: {
          some: {
            id: hospital,
          },
        },
      },
      select: {
        id: true,
        email: true,
        vet_codeId: true,
        firstName: true,
        lastName: true,
        ceLicense: true,
        hospitals: {
          where: {
            id: hospital,
          },
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      set.status = 400;
      logger.warn(
        "User not found or password is incorrect or hospital not found",
        {
          ...requestInfo,
          status: set.status,
        },
      );
      return {
        success: false,
        message: "Check your email and password or hospital",
      };
    }

    // ตรวจสอบอีกครั้งว่า user มี hospital ที่เลือกจริงๆ
    if (!user || user.hospitals.length === 0) {
      set.status = 400;
      logger.warn("User not found or hospital mismatch", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Check your email and password or hospital",
      };
    }

    const selectedHospital = user.hospitals[0]; // ตอนนี้มีค่าเดียวแน่นอน

    const token = await vetJwt.sign({
      id: user.id,
      email: user.email,
      vet_codeId: user.vet_codeId,
      firstName: user.firstName,
      lastName: user.lastName,
      ceLicense: user.ceLicense,
      hospitalId: selectedHospital.id,
      hospitalName: selectedHospital.name,
    });

    set.status = 200;

    logger.info("User Login API success", {
      ...requestInfo,
      status: set.status,
      vetCodeId: user.vet_codeId,
      user: user.firstName + " " + user.lastName,
      hospital: user.hospitals[0].name,
      email: user.email,
    });

    return {
      success: true,
      message: "Success",
      token: token,
    };
  } catch (error) {
    set.status = 500;
    logger.error("User Login API error", {
      ...requestInfo,
      status: set.status,
      JSONStringify: error,
    });
    logger.error(error);
    return {
      success: false,
      message: "Internal server error",
    };
  }
};

export const userLinkResetPassword = async ({
  body,
  set,
  request,
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
      "forgot_password",
      0.5,
    );

    if (!recaptcha.success) {
      set.status = 400;
      logger.warn("Recaptcha verification failed", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Recaptcha verification failed",
      };
    }

    const _OTP = generateOTP();

    const vet = await prisma.veterinarian.update({
      where: {
        email: decodedData.email,
      },
      data: {
        otp: _OTP.otp,
        expotp: _OTP.expotp,
      },
      select: {
        id: true,
        email: true,
        vet_codeId: true,
        firstName: true,
        lastName: true,
        expotp: true,
      },
    });

    if (!vet) {
      set.status = 400;
      logger.warn("User not found", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "User not found",
      };
    }

    const { id, email, firstName, lastName, vet_codeId, expotp } = vet;

    const payload: UserProps = {
      id: id,
      email: email,
      firstName: firstName,
      lastName: lastName,
      vet_codeId: vet_codeId,
      exp: expotp,
    };

    const encodedToken = useEncodecrypt(payload);

    const _URL =
      "http://localhost:5230/forgot-password?id=" +
      encodeURIComponent(encodedToken);

    await sendTemplateEmail(email, "reset-password", "รหัสผ่านใหม่ของคุณ", {
      fnameTh: firstName,
      lnameTh: lastName,
      codeId: vet_codeId,
      otp: _OTP.otp,
      resetLink: _URL.toString(),
    });

    set.status = 200;
    logger.info("User Link Reset Password API success", {
      ...requestInfo,
      status: set.status,
    });
    return {
      success: true,
      message: "Success",
    };
  } catch (error) {
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

export const userCheckOtp = async ({
  query,
  set,
  request,
}: Context & { request: any; query: { data: string } }) => {
  const requestInfo = getRequestInfo(request);
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
    const decodedData = await useDecodecryptBodyNew(query.data, secretKey);

    const recaptcha = await verifyRecaptcha(
      decodedData.recaptchaToken,
      "otp_check",
      0.5,
    );

    if (!recaptcha.success) {
      set.status = 400;
      logger.warn("Recaptcha verification failed", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Recaptcha verification failed",
      };
    }

    const check = await prisma.veterinarian.update({
      where: {
        id: decodedData.id,
        otp: decodedData.otp,
      },
      data: {
        otp: null,
        expotp: null,
      },
      select: {
        otp: true,
        expotp: true,
      },
    });

    if (check?.otp === null && check?.expotp === null) {
      set.status = 200;
      logger.info("User Otp API success", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: true,
        message: "Success",
      };
    } else {
      set.status = 400;
      logger.warn("User Otp API failed", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "User Otp API failed",
      };
    }
  } catch (error) {
    set.status = 500;
    logger.error("User Otp API error", {
      ...requestInfo,
      status: set.status,
      JSONStringify: error,
    });
    return {
      success: false,
      message: "OTP Expired or Invalid",
    };
  }
};

export const userResetPassword = async ({
  body,
  set,
  request,
}: Context & { body: { encodedData: string }; request: any }) => {
  const requestInfo = getRequestInfo(request);

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
  try {
    const secretKey = process.env.CRYPTO_KEY || "";
    const decodedData = await useDecodecryptBodyNew(
      body.encodedData,
      secretKey,
    );

    const recaptcha = await verifyRecaptcha(
      decodedData.recaptchaToken,
      "reset_password",
      0.5,
    );

    if (!recaptcha.success) {
      set.status = 400;
      logger.warn("Recaptcha verification failed", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Recaptcha verification failed",
      };
    }

    const email = decodedData.email.toLowerCase();
    const hashPassword = useHashPassword(decodedData.password, email);

    const user = await prisma.veterinarian.update({
      where: {
        id: decodedData.id,
        vet_codeId: decodedData.vet_codeId,
        otp: null,
        expotp: null,
      },
      data: {
        password: hashPassword,
      },
    });

    if (!user) {
      set.status = 400;
      logger.warn("User Reset Password API failed", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "User Reset Password API failed",
      };
    }

    set.status = 200;
    logger.info("User Reset Password API success", {
      ...requestInfo,
      status: set.status,
    });
    return {
      success: true,
      message: "Success",
    };
  } catch (error) {
    set.status = 500;
    logger.error("User Reset Password API error", {
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

export const userProfile = async ({
  set,
  request,
  vetJwt,
}: Context & {
  request: any;
  set: any;
  vetJwt: any;
}) => {
  const requestInfo = getRequestInfo(request);
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.replace("Bearer ", "");
    const decodedToken = await vetJwt.verify(token);

    if (!decodedToken) {
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

    const user = await prisma.veterinarian.findUnique({
      where: {
        id: decodedToken.id,
        vet_codeId: decodedToken.vet_codeId,
      },
      select: {
        id: true,
        email: true,
        vet_codeId: true,
        firstName: true,
        lastName: true,
        ceLicense: true,
        phone: true,
        lineID: true,
        hospitals: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    set.status = 200;
    logger.info("User Profile API success", {
      ...requestInfo,
      status: set.status,
    });
    return {
      success: true,
      message: "Success",
      data: user,
    };
  } catch (error) {
    set.status = 500;
    logger.error("User Profile API error", {
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

export const userUpdateProfile = async ({
  query,
  set,
  request,
  vetJwt,
}: Context & {
  request: any;
  query: { data: string };
  set: any;
  vetJwt: any;
}) => {
  const requestInfo = getRequestInfo(request);
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.replace("Bearer ", "");
    const decodedToken = await vetJwt.verify(token);

    if (!decodedToken) {
      set.status = 401;
      logger.warn("Unauthorized", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: false,
        message: "Unauthorized",
      };
    } else {
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

      await prisma.veterinarian.update({
        where: {
          id: decodedToken.id,
          vet_codeId: decodedToken.vet_codeId,
        },
        data: {
          firstName: decodedData.firstName,
          lastName: decodedData.lastName,
          phone: decodedData.phone,
          lineID: decodedData.lineID,
          ceLicense: decodedData.ceLicense,
        },
      });

      set.status = 200;
      logger.info("User Update Profile API success", {
        ...requestInfo,
        status: set.status,
      });
      return {
        success: true,
        message: "Success",
      };
    }
  } catch (error) {
    set.status = 500;
    logger.error("User Update Profile API error", {
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

export const userVetProfiles = async ({
  set,
  request,
  adminJwt,
}: Context & {
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
    logger.warn("Unauthorized", {
      ...requestInfo,
      status: set.status,
    });
    return {
      success: false,
      message: "Unauthorized",
    };
  }

  const admin = await prisma.cmuItAccount.findFirst({
    where: {
      email: authenUser.email,
    },
  });

  if (!admin) {
    set.status = 403;
    logger.warn("Forbidden", {
      ...requestInfo,
      status: set.status,
    });
    return {
      success: false,
      message: "Forbidden",
    };
  }

  try {
    const users = await prisma.veterinarian.findMany({
      select: {
        id: true,
        email: true,
        vet_codeId: true,
        firstName: true,
        lastName: true,
        ceLicense: true,
        phone: true,
        lineID: true,
        hospitals: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    set.status = 200;
    logger.info("User Profiles API success", {
      ...requestInfo,
      status: set.status,
    });
    return {
      success: true,
      message: "Success",
      data: users,
    };
  } catch (error) {
    set.status = 500;
    logger.error("User Profiles API error", {
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
