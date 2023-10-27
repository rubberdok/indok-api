import { BadRequestError, InternalServerError, InvalidArgumentError } from "@/core/errors.js";
import { LogoutStatus, Resolvers } from "../__types__.js";

export const resolvers: Resolvers = {
  Mutation: {
    redirectUrl(_root, { state }, ctx) {
      const { url, codeVerifier } = ctx.authService.ssoUrl(state);

      // Add code verifier to session so that we can verify the code challenge
      // after the user has finished the authentication flow with Feide.
      ctx.req.session.set("codeVerifier", codeVerifier);
      return { url };
    },

    async logout(_root, _args, ctx) {
      if (!ctx.req.session.authenticated) {
        throw new BadRequestError("User is not authenticated");
      }
      try {
        await ctx.req.session.destroy();
      } catch (err) {
        ctx.req.log.error(err, "Failed to destroy session");
        throw new InternalServerError("Failed to destroy session");
      }

      return {
        status: LogoutStatus.Success,
      };
    },

    async authenticate(_root, { code }, ctx) {
      // Find the code verifier from the session that was used
      // to generate the code challenge for the authentication flow
      // in `redirectUrl`
      ctx.req.log.info("Authenticating user");
      const codeVerifier = ctx.req.session.get("codeVerifier");

      if (!codeVerifier) {
        throw new InvalidArgumentError("Code verifier not found");
      }

      try {
        const user = await ctx.authService.getUser({
          code,
          codeVerifier,
        });

        ctx.req.session.userId = user.id;
        ctx.req.session.authenticated = true;

        // Regenerate the session to prevent session fixation attacks
        await ctx.req.session.regenerate(["userId", "authenticated"]);
        ctx.req.log.info("User authenticated");
        return {
          user,
        };
      } catch (err) {
        ctx.req.session.codeVerifier = undefined;
        ctx.req.log.error("Failed to authenticate user", err);
        throw err;
      }
    },
  },
};
