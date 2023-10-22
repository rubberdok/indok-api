import { Role } from "@prisma/client";
import { Resolvers } from "../__types__.js";
import { assertIsAuthenticated } from "../auth.js";

export const resolvers: Resolvers = {
  Mutation: {
    async createOrganization(_root, { data }, ctx) {
      assertIsAuthenticated(ctx);
      const { userId } = ctx.req.session;

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
      assertIsAuthenticated(ctx);
      const { userId } = ctx.req.session;

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
      assertIsAuthenticated(ctx);
      const { userId } = ctx.req.session;

      const { userId: memberId, organizationId, role } = data;
      const member = await ctx.organizationService.addMember(userId, {
        userId: memberId,
        organizationId,
        role: role ?? Role.MEMBER,
      });
      return { member };
    },

    async removeMember(_root, { data }, ctx) {
      assertIsAuthenticated(ctx);
      const { userId } = ctx.req.session;

      const member = await ctx.organizationService.removeMember(userId, data);
      return { member };
    },
  },

  Organization: {
    async members(organization, _args, ctx) {
      assertIsAuthenticated(ctx);
      const { userId } = ctx.req.session;

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
