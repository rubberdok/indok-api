import type { MutationResolvers } from "./../../../types.generated.js";
export const deleteDocument: NonNullable<MutationResolvers["deleteDocument"]> =
	async (_parent, { data }, ctx) => {
		const deleteResult = await ctx.documents.documents.delete(ctx, data);

		if (!deleteResult.ok) throw deleteResult.error;
		return { document: deleteResult.data.document };
	};
