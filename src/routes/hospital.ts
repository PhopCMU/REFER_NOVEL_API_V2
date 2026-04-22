import Elysia, { t } from "elysia";
import {
  getHospitalDashboard,
  getHospitals,
  hospitals,
  updateHospitals,
} from "../controllers/HospitalsController";
import { adminJwt, vetJwt } from "../libs/Jwt";

export const hospitalRouter = new Elysia({ prefix: "/hospitals" });

// === POST ===
hospitalRouter.post("/worksplace", hospitals, {
  body: t.Object({ encodedData: t.String() }),
  tags: ["Hospitals"],
});

hospitalRouter.use(vetJwt).post("/worksplace/update", updateHospitals, {
  body: t.Object({ encodedData: t.String() }),
  tags: ["Hospitals"],
});

// === GET ===
hospitalRouter.get("/list", getHospitals, {
  tags: ["Hospitals"],
});

hospitalRouter.use(adminJwt).get("/list/admin", getHospitalDashboard, {
  query: t.Object({
    data: t.String(),
  }),
  tags: ["Hospitals"],
});

// === DELETE ===

// === UPDATE ===
