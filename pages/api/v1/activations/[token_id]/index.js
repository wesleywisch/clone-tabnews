import { createRouter } from "next-connect";
import controller from "infra/controller";
import activation from "models/activation";

const router = createRouter();

router.patch(patchHandler);

export default router.handler(controller.errorHandlers);

async function patchHandler(req, res) {
  const activationTokenId = req.query.token_id;

  const validActivationToken =
    await activation.findOneValidById(activationTokenId);
  const usedActivationToken =
    await activation.markTokenAsUsed(activationTokenId);

  await activation.activateUserByUserId(validActivationToken.user_id);

  return res.status(200).json(usedActivationToken);
}
