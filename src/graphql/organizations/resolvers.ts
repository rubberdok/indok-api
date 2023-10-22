import { AuthenticationError } from "@/core/errors.js";
import { Role } from "@prisma/client";
import { Resolvers } from "../__types__.js";

export const resolvers: Resolvers = {
  Mutation: {
    async createOrganization(_root, { data }, ctx) {
      const { userId } = ctx.req.session;
      if (!userId) throw new AuthenticationError("You must be logged in to perform this action.");

      let organization;
      const { name, description } = data;
      if (description === null) {
        organization = await ctx.organizationService.create({
          name,
          userId,
        });
      } else {
        organization = await ctx.organizationService.create({
          name,
          description,
          userId,
        });
      }
      return {
        organization,
      };
    },

    async updateOrganization(_root, { data }, ctx) {
      const { userId } = ctx.req.session;
      if (!userId) throw new AuthenticationError("You must be logged in to perform this action.");

      const { id, name, description } = data;
      const newName = name === null ? undefined : name;
      const newDescription = description === null ? undefined : description;
      const organization = await ctx.organizationService.update(userId, id, {
        name: newName,
        description: newDescription,
      });
      return { organization };
    },

    async addMember(_root, { data }, ctx) {
      const { userId } = ctx.req.session;
      if (!userId) throw new AuthenticationError("You must be logged in to perform this action.");

      const { userId: memberId, organizationId, role } = data;
      const member = await ctx.organizationService.addMember(userId, {
        userId: memberId,
        organizationId,
        role: role ?? Role.MEMBER,
      });
      return { member };
    },

    async removeMember(_root, { data }, ctx) {
      const { userId } = ctx.req.session;
      if (!userId) throw new AuthenticationError("You must be logged in to perform this action.");

      const member = await ctx.organizationService.removeMember(userId, data);
      return { member };
    },
  },

  Organization: {
    async members(organization, _args, ctx) {
      const { userId } = ctx.req.session;
      if (!userId) throw new AuthenticationError("You must be logged in to perform this action.");

      const members = await ctx.organizationService.getMembers(userId, organization.id);
      return members;
    },
  },

  Member: {
    async organization(member, _args, ctx) {
      const organization = await ctx.organizationService.get(member.organizationId);
      return organization;
    },
  },
};
