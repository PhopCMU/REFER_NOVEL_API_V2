import Elysia, { t } from "elysia";

import {
  createdOwner,
  deleteOwner,
  getOwners,
  updateOwner,
} from "../controllers/OwnerController";
import { vetJwt } from "../libs/Jwt";

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
