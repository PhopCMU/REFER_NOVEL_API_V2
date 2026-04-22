import Elysia, { t } from "elysia";
import { vetJwt } from "../libs/Jwt";
import {
  createdPet,
  deletePet,
  updatedPet,
} from "../controllers/PetController";

export const petsRouter = new Elysia({ prefix: "/pets" });

// === POST === //
petsRouter.use(vetJwt).post("/create", createdPet, {
  body: t.Object({ encodedData: t.String() }),
  tags: ["Pets"],
});

// === GET === //
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
