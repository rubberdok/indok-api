import type { MutationResolvers } from "./../../../types.generated.js";
export const redirectUrl: NonNullable<MutationResolvers["redirectUrl"]> = async (_parent, { state }, ctx) => {
  const { url, codeVerifier } = ctx.authService.ssoUrl(state);

  // Add code verifier to session so that we can verify the code challenge
  // after the user has finished the authentication flow with Feide.
  ctx.req.session.set("codeVerifier", codeVerifier);
  return { url };
};
