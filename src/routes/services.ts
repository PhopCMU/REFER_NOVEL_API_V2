import Elysia from "elysia";
import { services } from "../controllers/ServiceController";
import { vetJwt } from "../libs/Jwt";

export const serviceRouter = new Elysia({ prefix: "/services" });

// === GET === //
serviceRouter.use(vetJwt).get("/list", services, {
  tags: ["Services"],
});
