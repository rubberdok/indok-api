import type { MutationResolvers } from "./../../../types.generated.js";
export const signUp: NonNullable<MutationResolvers["signUp"]> = async (
	_parent,
	{ data },
	ctx,
) => {
	const { eventId } = data;
	const signUpResult = await ctx.events.signUp(ctx, {
		userId: ctx.user?.id,
		eventId: eventId,
		userProvidedInformation: data.userProvidedInformation,
	});
	if (!signUpResult.ok) {
		throw signUpResult.error;
	}
	const { signUp } = signUpResult.data;
	return { signUp };
};
