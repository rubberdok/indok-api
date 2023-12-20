import { FastifyPluginAsync, FastifyRequest } from "fastify";
import { BadRequestError, InternalServerError, PermissionDeniedError } from "~/domain/errors.js";
import { User } from "~/domain/users.js";

export interface AuthService {
  authorizationUrl(req: FastifyRequest, redirect?: string | null): string;
  authorizationCallback(req: FastifyRequest, data: { code: string }): Promise<User>;
  login(req: FastifyRequest, user: User): Promise<User>;
  logout(req: FastifyRequest): Promise<void>;
}

function getAuthPlugin(authService: AuthService): FastifyPluginAsync {
  return async (app) => {
    app.route<{
      Querystring: {
        redirect?: string;
      };
    }>({
      url: "/login",
      method: "GET",
      schema: {
        querystring: {
          type: "object",
          properties: {
            redirect: { type: "string" },
          },
        },
      },
      handler: async (req, reply) => {
        const { redirect } = req.query;
        const url = authService.authorizationUrl(req, redirect);

        return reply.redirect(303, url);
      },
    });

    app.route<{
      Querystring: {
        code: string;
        state?: string;
      };
    }>({
      url: "/authenticate",
      method: "GET",
      schema: {
        querystring: {
          type: "object",
          properties: {
            code: { type: "string" },
            state: { type: "string" },
          },
          required: ["code"],
        },
      },
      handler: async (req, reply) => {
        const { code, state } = req.query;
        try {
          const user = await authService.authorizationCallback(req, { code });

          await authService.login(req, user);

          return reply.redirect(303, state ?? "/");
        } catch (err) {
          if (err instanceof Error) {
            req.log.error(err, "Authentication failed");
            if (err instanceof BadRequestError) return reply.status(400).send(err);
            return reply.send(new InternalServerError("Authentication failed"));
          }
        }
      },
    });

    app.route({
      method: "POST",
      url: "/logout",
      handler: async (req, reply) => {
        await authService.logout(req);
        req.log.info("User logged out");
        return reply.redirect(303, "/");
      },
    });

    app.route({
      method: "GET",
      url: "/me",
      handler: async (req, reply) => {
        if (req.session.authenticated) {
          return reply.status(200).send({ user: req.session.userId });
        }
        return reply.status(401).send(new PermissionDeniedError("Unauthorized"));
      },
    });
  };
}

export { getAuthPlugin };
