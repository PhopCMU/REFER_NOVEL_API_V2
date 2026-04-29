import Elysia, { t } from "elysia";

import {
  createdOwner,
  deleteOwner,
  getOwners,
  getOwnersByAdmins,
  updateOwner,
} from "../controllers/OwnerController";
import { adminJwt, vetJwt } from "../libs/Jwt";

export const ownersRouter = new Elysia({ prefix: "/owners" });

// === POST === //
ownersRouter.use(vetJwt).post("/create", createdOwner, {
  body: t.Object({ encodedData: t.String() }),
  tags: ["Owners"],
});

// === GET === //
ownersRouter.use(vetJwt).get("/", getOwners, {
  query: t.Object({ data: t.String() }),
  tags: ["Owners"],
});

ownersRouter.use(adminJwt).get("/admin/list", getOwnersByAdmins, {
  tags: ["Admin"],
});

// === DELETE === //
ownersRouter.use(vetJwt).delete("/delete", deleteOwner, {
  query: t.Object({ data: t.String() }),
  tags: ["Owners"],
});

// === UPDATE === //
ownersRouter.use(vetJwt).put("/update", updateOwner, {
  query: t.Object({ data: t.String() }),
  tags: ["Owners"],
});
