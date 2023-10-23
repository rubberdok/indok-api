import { unwrapResolverError } from "@apollo/server/errors";
import { Member, Organization, Role } from "@prisma/client";
import { FastifyReply, FastifyRequest } from "fastify";
import { GraphQLFormattedError } from "graphql";
import { ZodError } from "zod";

import { BaseError, codes, InternalServerError, ValidationError } from "@/core/errors.js";
import { IAuthService, ICabinService, IUserService } from "@/services/index.js";

export const formatError = (formattedError: GraphQLFormattedError, error: unknown): GraphQLFormattedError => {
  if (error instanceof ValidationError || error instanceof ZodError) {
    return {
      ...formattedError,
      message: error.message,
      extensions: {
        code: codes.ERR_BAD_USER_INPUT,
      },
    };
  }
  const originalError = unwrapResolverError(error);
  let baseError: BaseError;
  if (originalError instanceof BaseError) {
    baseError = originalError;
  } else {
    baseError = new InternalServerError("Internal Server Error");
  }

  return {
    ...formattedError,
    message: baseError.message,
    extensions: {
      code: baseError.code,
    },
  };
};

interface OrganizationService {
  hasRole(data: { userId: string; organizationId: string; role: Role }): Promise<boolean>;
  create(data: { name: string; description?: string; userId: string }): Promise<Organization>;
  update(userId: string, organizationId: string, data: { name?: string; description?: string }): Promise<Organization>;
  addMember(userId: string, data: { userId: string; organizationId: string; role: Role }): Promise<Member>;
  removeMember(userId: string, data: { userId: string; organizationId: string } | { id: string }): Promise<Member>;
  getMembers(userId: string, organizationId: string): Promise<Member[]>;
  get(id: string): Promise<Organization>;
}

export interface IContext {
  res: FastifyReply;
  req: FastifyRequest;
  userService: IUserService;
  cabinService: ICabinService;
  authService: IAuthService;
  organizationService: OrganizationService;
}
