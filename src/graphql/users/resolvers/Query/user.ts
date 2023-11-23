import type { QueryResolvers } from "./../../../types.generated.js";
export const user: NonNullable<QueryResolvers["user"]> = async (_parent, _arg, ctx) => {
  const { userId } = ctx.req.session;
  if (userId) {
    const user = await ctx.userService.get(userId);
    console.log({ user, userId });
    return {
      user: user,
    };
  }
  return {
    user: null,
  };
};
