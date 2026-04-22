import Elysia, { t } from "elysia";

import { adminJwt, vetJwt } from "../libs/Jwt";
import {
  createMedicalFile,
  createReferralCase,
  deleteAppointmentFile,
  deleteCategoryFile,
  referralCaseAppointment,
  referralCases,
  referralCasesAdmin,
  referralCasesUpdateStatus,
  updateAppointmentFile,
  updateCategoryFile,
} from "../controllers/ReferralController";

export const caseReferRouter = new Elysia({ prefix: "/case" });

// === POST === //
caseReferRouter.use(vetJwt).post("/referral-cases", createReferralCase, {
  // ✅ OpenAPI documentation (optional)
  detail: {
    summary: "Create a new referral case with encrypted metadata and files",
    tags: ["Case"],
    requestBody: {
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            properties: {
              encodedData: {
                type: "string",
                description: "Encrypted JSON metadata",
              },
              files: {
                type: "array",
                items: { type: "string", format: "binary" },
                description: "Binary files to upload",
              },
            },
            required: ["encodedData", "files"],
          },
        },
      },
    },
  },
});

caseReferRouter.use(vetJwt).post("/medical-file", createMedicalFile, {
  detail: {
    summary: "Create a new file for a case with caseId category and file",
    tags: ["Case"],
    requestBody: {
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            properties: {
              caseId: {
                type: "string",
                description: "Id of the case",
              },
              animalCodeId: {
                type: "string",
                description: "animalCodeId of the case",
              },
              category: {
                type: "string",
                description: "Category of the file",
              },
              file: {
                type: "array",
                items: { type: "string", format: "binary" },
                description: "Binary files to upload",
              },
            },
            required: ["caseId", "animalCodeId", "category", "files"],
          },
        },
      },
    },
  },
});

caseReferRouter.use(vetJwt).put("/file/category", updateCategoryFile, {
  query: t.Object({
    data: t.String(),
  }),
  tags: ["Case"],
});

caseReferRouter.use(vetJwt).delete("/file/delete", deleteCategoryFile, {
  query: t.Object({
    data: t.String(),
  }),
  tags: ["Case"],
});

// Conuter
caseReferRouter
  .use(adminJwt)
  .post("/counter/update-case-status", referralCasesUpdateStatus, {
    body: t.Object({
      encodedData: t.String(),
    }),
    tags: ["Case"],
  });

caseReferRouter
  .use(adminJwt)
  .post("/referral-appointment", referralCaseAppointment, {
    // ✅ OpenAPI documentation (optional)
    detail: {
      summary: "referral case appointment with encrypted metadata and files",
      tags: ["Case"],
      requestBody: {
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                encodedData: {
                  type: "string",
                  description: "Encrypted JSON metadata",
                },
                files: {
                  type: "array",
                  items: { type: "string", format: "binary" },
                  description: "Binary files to upload",
                },
              },
              required: ["encodedData", "files"],
            },
          },
        },
      },
    },
  });

// === GET === //

caseReferRouter.use(vetJwt).get("/cases-referrals", referralCases, {
  query: t.Object({
    data: t.String(),
  }),
  tags: ["Case"],
});

// Counter
caseReferRouter
  .use(adminJwt)
  .get("/counter/cases-referrals", referralCasesAdmin, {
    query: t.Object({
      data: t.String(),
    }),
    tags: ["Case"],
  });

caseReferRouter
  .use(adminJwt)
  .delete("/counter/file/delete", deleteAppointmentFile, {
    query: t.Object({
      data: t.String(),
    }),
    tags: ["Case"],
  });

caseReferRouter
  .use(adminJwt)
  .put("/counter/file/referral-appointment/update", updateAppointmentFile, {
    body: t.Object({
      encodedData: t.String(),
      files: t.File({
        description: "Binary files to upload",
        implementation: "multer",
        multiple: true,
      }),
    }),
    tags: ["Case"],
  });
