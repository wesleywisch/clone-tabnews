import { createRouter } from "next-connect";
import controller from "infra/controller";
import authentication from "models/authentication.js";
import session from "models/session.js";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.post(controller.canRequest("create:session"), postHandler);
router.delete(deleteHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(req, res) {
  const userInputValues = req.body;

  const authenticatedUser = await authentication.getAuthenticatedUser(
    userInputValues.email,
    userInputValues.password,
  );

  const newSession = await session.create(authenticatedUser.id);

  controller.setSessionCookie(newSession.token, res);

  return res.status(201).json(newSession);
}

async function deleteHandler(req, res) {
  const sessionToken = req.cookies.session_id;

  const sessionObject = await session.findOneValidByToken(sessionToken);
  const expiredSession = await session.expireById(sessionObject.id);
  controller.clearSessionCookie(res);

  res.status(200).json(expiredSession);
}
