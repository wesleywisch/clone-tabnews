import * as cookie from "cookie";
import session from "models/session.js";
import user from "models/user";
import {
  InternalServerError,
  MethodNotAllowedError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
} from "infra/errors";

function onNoMatchHandler(req, res) {
  const publicErrorObject = new MethodNotAllowedError();
  res.status(publicErrorObject.statusCode).json(publicErrorObject);
}

function onErrorHandler(error, req, res) {
  if (
    error instanceof ValidationError ||
    error instanceof NotFoundError ||
    error instanceof ForbiddenError
  ) {
    return res.status(error.statusCode).json(error);
  }

  if (error instanceof UnauthorizedError) {
    clearSessionCookie(res);
    return res.status(error.statusCode).json(error);
  }

  const publicErrorObject = new InternalServerError({
    cause: error,
  });

  console.error(publicErrorObject);

  res.status(publicErrorObject.statusCode).json(publicErrorObject);
}

function setSessionCookie(sessionToken, res) {
  const setCookie = cookie.serialize("session_id", sessionToken, {
    path: "/",
    maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000, // é necessário enviar em segundos
    secure: process.env.NODE_ENV === "production" ? true : false,
    httpOnly: true,
  });

  res.setHeader("Set-Cookie", setCookie);
}

function clearSessionCookie(res) {
  const setCookie = cookie.serialize("session_id", "invalid", {
    path: "/",
    maxAge: -1,
    secure: process.env.NODE_ENV === "production" ? true : false,
    httpOnly: true,
  });

  res.setHeader("Set-Cookie", setCookie);
}

async function injectAnonymousOrUser(req, res, next) {
  if (req.cookies?.session_id) {
    await injectAuthenticatedUser(req);
  } else {
    injectAnonymousUser(req);
  }

  return next();
}

async function injectAuthenticatedUser(req) {
  const sessionToken = req.cookies.session_id;
  const sessionObject = await session.findOneValidByToken(sessionToken);
  const userObject = await user.findOneById(sessionObject.user_id);

  req.context = {
    ...req.context,
    user: userObject,
  };
}

function injectAnonymousUser(req) {
  const anonymousUserObject = {
    features: ["read:activation_token", "create:session", "create:user"],
  };

  req.context = {
    ...req.context,
    user: anonymousUserObject,
  };
}

function canRequest(feature) {
  return function canRequestMiddleware(req, res, next) {
    const userTryingToRequest = req.context.user;

    if (userTryingToRequest.features.includes(feature)) {
      return next();
    }

    throw new ForbiddenError({
      message: "Você não possui permissão para executar esta ação.",
      action: `Verifique se o seu usuário possui a feature "${feature}"`,
    });
  };
}

const controller = {
  errorHandlers: {
    onNoMatch: onNoMatchHandler,
    onError: onErrorHandler,
  },
  setSessionCookie,
  clearSessionCookie,
  injectAnonymousOrUser,
  canRequest,
};

export default controller;
