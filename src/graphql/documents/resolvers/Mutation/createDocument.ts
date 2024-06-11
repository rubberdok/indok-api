import type { MutationResolvers } from "./../../../types.generated.js";
export const createDocument: NonNullable<
	MutationResolvers["createDocument"]
> = async (_parent, { data }, ctx) => {
	const createResult = await ctx.documents.documents.create(ctx, data);
	if (!createResult.ok) throw createResult.error;

	const { document, uploadUrl } = createResult.data;
	return {
		document,
		uploadUrl,
	};
};
