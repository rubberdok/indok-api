import { BadRequestError, InternalServerError } from "@/domain/errors.js";
import { User } from "@/domain/users.js";
import { FastifyPluginAsync } from "fastify";

interface AuthService {
  ssoUrl(state?: string | null): { url: string; codeVerifier: string };
  getUser(data: { code: string; codeVerifier: string }): Promise<User>;
}

function getAuthPlugin(authService: AuthService): FastifyPluginAsync {
  return async (app) => {
    app.route<{
      Querystring: {
        state: string;
      };
    }>({
      url: "/login",
      method: "GET",
      schema: {
        querystring: {
          state: { type: "string" },
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
        state: string;
      };
    }>({
      url: "/authenticate",
      method: "GET",
      schema: {
        querystring: {
          code: { type: "string" },
          state: { type: "string" },
        },
      },
      handler: async (req, reply) => {
        const { code, state } = req.query;
        const codeVerifier = req.session.get("codeVerifier");

        req.log.info("Authenticating user", { code, state, codeVerifier });

        if (!codeVerifier) {
          throw new BadRequestError("Missing code verifier");
        }

        try {
          const user = await authService.getUser({ code, codeVerifier });
          req.session.set("authenticated", true);
          req.session.set("userId", user.id);
          req.log.info("User authenticated", { userId: user.id });

          return reply.redirect(303, state);
        } catch (err) {
          req.log.error(err, "Authentication failed");
          throw new InternalServerError("Authentication failed");
        }
      },
    });
  };
}

export { getAuthPlugin };
