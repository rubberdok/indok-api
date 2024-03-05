import type { MutationResolvers } from "./../../../types.generated.js";
export const uploadFile: NonNullable<MutationResolvers["uploadFile"]> = async (
	_parent,
	{ data },
	ctx,
) => {
	const { extension } = data;
	const createFileUploadUrlResult = await ctx.files.createFileUploadUrl(ctx, {
		extension,
	});
	if (!createFileUploadUrlResult.ok) {
		throw createFileUploadUrlResult.error;
	}

	const { file, url } = createFileUploadUrlResult.data;
	return {
		file: file,
		sasUrl: url,
	};
};
