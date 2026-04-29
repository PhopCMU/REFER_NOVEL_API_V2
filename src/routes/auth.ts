import Elysia, { t } from "elysia";
import {
  userCheckOtp,
  userLinkResetPassword,
  userLogin,
  userProfile,
  userRegister,
  userResetPassword,
  userUpdateProfile,
  userVetProfiles,
} from "../controllers/UserController";
import { adminJwt, vetJwt } from "../libs/Jwt";
import {
  authCmuItAccount,
  authCmuItAccountCallback,
  getCmuItAccount,
  updatePermissions,
} from "../controllers/AuthCmuItAccountController";

export const authRouter = new Elysia({ prefix: "/auth" });

// === POST === //
authRouter.post("/register", userRegister, {
  body: t.Object({ encodedData: t.String() }),
  tags: ["Users"],
});

authRouter.post("/exchange-code", authCmuItAccount, {
  body: t.Object({ code: t.String() }),
  tags: ["Admin"],
});

authRouter.use(adminJwt).post("/cmuitaccount", authCmuItAccountCallback, {
  body: t.Object({ encodedData: t.String() }),
  tags: ["Admin"],
});

authRouter.use(vetJwt).post("/login", userLogin, {
  body: t.Object({ encodedData: t.String() }),
  tags: ["Users"],
});

authRouter.use(vetJwt).get("/profile", userProfile, {
  tags: ["Users"],
});

authRouter.use(vetJwt).put("/update-profile", userUpdateProfile, {
  query: t.Object({ data: t.String() }),
  tags: ["Users"],
});

authRouter.post("/reset-password", userLinkResetPassword, {
  body: t.Object({ encodedData: t.String() }),
  tags: ["Users"],
});

authRouter.post("/new-password", userResetPassword, {
  body: t.Object({ encodedData: t.String() }),

  tags: ["Users"],
});

// === GET === //
authRouter.use(adminJwt).get("/cmu-it-account", getCmuItAccount, {
  tags: ["Admin"],
});

authRouter.use(adminJwt).get("/vet-members", userVetProfiles, {
  tags: ["Admin"],
});

// === PUT === //
authRouter.put("/otp", userCheckOtp, {
  query: t.Object({ data: t.String() }),
  tags: ["Users"],
});

authRouter.use(adminJwt).put("/update-permissions", updatePermissions, {
  query: t.Object({ data: t.String() }),
  tags: ["Users"],
});
