import Elysia, { t } from "elysia";
import { feedback, ReportFeedback } from "../controllers/FeedbackController";
import { adminJwt } from "../libs/Jwt";

export const feedbackRouter = new Elysia({ prefix: "/feedback" });

feedbackRouter.post("/", feedback, {
  body: t.Object({ encodedData: t.String() }),
  tags: ["Feedback"],
});

feedbackRouter.use(adminJwt).get("/list", ReportFeedback, {
  query: t.Object({ data: t.String() }),
  tags: ["Feedback"],
});
