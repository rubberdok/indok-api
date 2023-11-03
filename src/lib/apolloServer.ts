import { unwrapResolverError } from "@apollo/server/errors";
import { Member, Organization, Prisma, Role, User } from "@prisma/client";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { GraphQLFormattedError } from "graphql";
import { ZodError } from "zod";

import { BaseError, codes, InternalServerError, ValidationError } from "@/core/errors.js";
import { IAuthService, ICabinService } from "@/services/index.js";
import { DomainUser } from "@/services/users/service.js";

export function getFormatErrorHandler(app?: FastifyInstance) {
  const formatError = (formattedError: GraphQLFormattedError, error: unknown): GraphQLFormattedError => {
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
    app?.log.error(originalError);

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
  return formatError;
}

export interface OrganizationService {
  hasRole(data: { userId: string; organizationId: string; role: Role }): Promise<boolean>;
  create(data: { name: string; description?: string; userId: string }): Promise<Organization>;
  update(userId: string, organizationId: string, data: { name?: string; description?: string }): Promise<Organization>;
  addMember(userId: string, data: { userId: string; organizationId: string; role: Role }): Promise<Member>;
  removeMember(userId: string, data: { userId: string; organizationId: string } | { id: string }): Promise<Member>;
  getMembers(userId: string, organizationId: string): Promise<Member[]>;
  get(id: string): Promise<Organization>;
}

interface UserService {
  get(id: string): Promise<DomainUser>;
  getAll(): Promise<DomainUser[]>;
  getByFeideID(feideId: string): Promise<DomainUser | null>;
  update(id: string, data: Prisma.UserUpdateInput): Promise<DomainUser>;
  login(id: string): Promise<DomainUser>;
  create(data: Prisma.UserCreateInput): Promise<DomainUser>;
  canUpdateYear(user: User): boolean;
}

export interface IContext {
  res: FastifyReply;
  req: FastifyRequest;
  userService: UserService;
  cabinService: ICabinService;
  authService: IAuthService;
  organizationService: OrganizationService;
}
