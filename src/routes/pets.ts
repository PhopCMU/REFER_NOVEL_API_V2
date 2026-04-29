import Elysia, { t } from "elysia";
import { adminJwt, vetJwt } from "../libs/Jwt";
import {
  createdPet,
  deletePet,
  getPets,
  updatedPet,
} from "../controllers/PetController";

export const petsRouter = new Elysia({ prefix: "/pets" });

// === POST === //
petsRouter.use(vetJwt).post("/create", createdPet, {
  body: t.Object({ encodedData: t.String() }),
  tags: ["Pets"],
});

// === GET === //
petsRouter.use(adminJwt).get("/admin/list", getPets, {
  tags: ["Pets"],
});
// === DELETE === //
petsRouter.use(vetJwt).delete("/delete", deletePet, {
  query: t.Object({ data: t.String() }),
  tags: ["Pets"],
});
// === UPDATE === //
petsRouter.use(vetJwt).put("/update", updatedPet, {
  query: t.Object({ data: t.String() }),
  tags: ["Pets"],
});
