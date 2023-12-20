import type { QueryResolvers } from "./../../../types.generated.js";
export const serverTime: NonNullable<QueryResolvers["serverTime"]> = async () => {
  const serverTime = new Date();
  return { serverTime };
};
