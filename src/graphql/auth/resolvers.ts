import { ApolloServerErrorCode } from "@apollo/server/errors";
import { GraphQLError } from "graphql";

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

    logout(_root, _args, ctx) {
      if (!ctx.req.session.authenticated) {
        throw new GraphQLError("not authenticated", {
          extensions: { code: ApolloServerErrorCode.BAD_REQUEST },
        });
      }

      ctx.req.session.destroy((err) => {
        throw new Error(err);
      });

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
        throw new GraphQLError("code verifier is required in session", {
          extensions: { code: ApolloServerErrorCode.BAD_REQUEST },
        });
      }

      try {
        const user = await ctx.authService.getUser({
          code,
          codeVerifier,
        });

        ctx.req.session.userId = user.id;
        ctx.req.session.authenticated = true;

        // Regenerate the session to prevent session fixation attacks
        ctx.req.session.regenerate(["userId", "authenticated"]);
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
