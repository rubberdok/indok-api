import type { MutationResolvers } from "./../../../types.generated.js";
export const retractSignUp: NonNullable<MutationResolvers["retractSignUp"]> =
	async (_parent, { data }, ctx) => {
		const retractSignUpResult = await ctx.events.retractSignUp(ctx, data);
		if (!retractSignUpResult.ok) {
			throw retractSignUpResult.error;
		}
		const { signUp } = retractSignUpResult.data;
		return { signUp };
	};
