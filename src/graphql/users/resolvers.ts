import { Resolvers } from "../__types__.js";

export const resolvers: Resolvers = {
  Query: {
    async user(_root, _args, ctx) {
      const { userId } = ctx.req.session;
      if (userId) {
        const user = await ctx.userService.get(userId);
        return {
          user: user,
        };
      }
      return {
        user: null,
      };
    },

    async users(_root, _args, ctx) {
      const users = await ctx.userService.getAll();
      return {
        users,
        total: users.length,
      };
    },
  },

  Mutation: {
    updateUser(_root, { id, data }, ctx) {
      return ctx.userService.update(id, {
        firstName: data.firstName,
        lastName: data.lastName,
        allergies: data.allergies ?? undefined,
        phoneNumber: data.phoneNumber ?? undefined,
        graduationYear: data.graduationYear,
      });
    },
  },

  User: {
    canUpdateYear(user, _args, ctx) {
      return ctx.userService.canUpdateYear(user);
    },
  },
};
