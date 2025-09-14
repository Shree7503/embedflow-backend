import router from "./router";
import Documents from "@/api/v1/user/projects/documents"
import { verifyUserToken } from "@/middlewares/user.auth.middleware";

router.use("/:projectId/doc",verifyUserToken,Documents);

export default router;
