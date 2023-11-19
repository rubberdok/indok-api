import { FastifyPluginAsync } from "fastify";

import { BadRequestError, InternalServerError, PermissionDeniedError } from "@/domain/errors.js";
import { User } from "@/domain/users.js";

interface AuthService {
  ssoUrl(state?: string | null): { url: string; codeVerifier: string };
  getUser(data: { code: string; codeVerifier: string }): Promise<User>;
}

function getAuthPlugin(authService: AuthService): FastifyPluginAsync {
  return async (app) => {
    app.route<{
      Querystring: {
        state?: string;
      };
    }>({
      url: "/login",
      method: "GET",
      schema: {
        querystring: {
          type: "object",
          properties: {
            state: { type: "string" },
          },
        },
      },
      handler: async (req, reply) => {
        const { state } = req.query;
        const { codeVerifier, url } = authService.ssoUrl(state);
        req.session.set("codeVerifier", codeVerifier);

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
        const codeVerifier = req.session.get("codeVerifier");

        req.log.info("Authenticating user", { code, state, codeVerifier });

        if (!codeVerifier) {
          req.log.error("Code verifier not found in session");
          return reply.status(400).send(new BadRequestError("Code verifier not found in session"));
        }

        try {
          const user = await authService.getUser({ code, codeVerifier });
          req.session.set("authenticated", true);
          req.session.set("userId", user.id);

          req.log.info("User authenticated", { userId: user.id });
          await req.session.regenerate(["authenticated", "userId"]);

          return reply.redirect(303, state ?? "/");
        } catch (err) {
          req.log.error(err, "Authentication failed");
          throw new InternalServerError("Authentication failed");
        }
      },
    });

    app.route({
      method: "POST",
      url: "/logout",
      handler: async (req, reply) => {
        if (req.session.authenticated) {
          await req.session.destroy();
          req.log.info("User logged out");
          return reply.redirect(303, "/");
        }
        req.log.info("User not authenticated");
        return reply.redirect(303, "/");
      },
    });

    app.route({
      method: "GET",
      url: "/me",
      handler: async (req, reply) => {
        if (req.session.authenticated) {
          return { user: req.session.userId };
        }
        return reply.status(401).send(new PermissionDeniedError("Unauthorized"));
      },
    });
  };
}

export { getAuthPlugin };
