import type { QueryResolvers } from "./../../../types.generated.js";
export const serverTime: NonNullable<QueryResolvers["serverTime"]> = () => {
	const serverTime = new Date();
	return { serverTime };
};
