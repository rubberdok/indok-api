import type { MutationResolvers } from "./../../../types.generated.js";
export const updateDocument: NonNullable<MutationResolvers["updateDocument"]> =
	async (_parent, { data }, ctx) => {
		const updateResult = await ctx.documents.documents.update(ctx, data);

		if (!updateResult.ok) throw updateResult.error;
		return { document: updateResult.data.document };
	};
