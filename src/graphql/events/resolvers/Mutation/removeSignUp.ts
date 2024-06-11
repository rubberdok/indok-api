import type { MutationResolvers } from "./../../../types.generated.js";
export const removeSignUp: NonNullable<
	MutationResolvers["removeSignUp"]
> = async (_parent, { data }, ctx) => {
	const removeSignUpResult = await ctx.events.removeSignUp(ctx, data);
	if (!removeSignUpResult.ok) {
		throw removeSignUpResult.error;
	}
	const { signUp } = removeSignUpResult.data;
	return { signUp };
};
