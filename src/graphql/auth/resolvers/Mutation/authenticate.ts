import { InvalidArgumentError } from "@/domain/errors.js";

import type { MutationResolvers } from "./../../../types.generated.js";
export const authenticate: NonNullable<MutationResolvers["authenticate"]> = async (_parent, { code }, ctx) => {
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
};
