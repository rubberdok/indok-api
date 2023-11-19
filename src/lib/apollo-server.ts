import { unwrapResolverError } from "@apollo/server/errors";
import { Booking, Cabin, Member, Organization, Prisma, Event } from "@prisma/client";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { GraphQLFormattedError } from "graphql";
import { ZodError } from "zod";

import { BookingStatus } from "@/domain/cabins.js";
import { BaseError, codes, InternalServerError, ValidationError } from "@/domain/errors.js";
import { Role } from "@/domain/organizations.js";
import { User } from "@/domain/users.js";

export function getFormatErrorHandler(log?: Partial<FastifyInstance["log"]>) {
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
    log?.error?.(originalError);

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

export interface ApolloContext extends ApolloServerDependencies {
  res: FastifyReply;
  req: FastifyRequest;
}

declare module "graphql" {
  interface GraphQLErrorExtensions {
    code: string;
  }
}

interface IOrganizationService {
  hasRole(data: { userId: string; organizationId: string; role: Role }): Promise<boolean>;
  create(data: { name: string; description?: string; userId: string }): Promise<Organization>;
  update(userId: string, organizationId: string, data: { name?: string; description?: string }): Promise<Organization>;
  addMember(userId: string, data: { userId: string; organizationId: string; role: Role }): Promise<Member>;
  removeMember(userId: string, data: { userId: string; organizationId: string } | { id: string }): Promise<Member>;
  getMembers(userId: string, organizationId: string): Promise<Member[]>;
  get(id: string): Promise<Organization>;
}

interface IUserService {
  get(id: string): Promise<User>;
  getAll(): Promise<User[]>;
  getByFeideID(feideId: string): Promise<User | null>;
  update(id: string, data: Prisma.UserUpdateInput): Promise<User>;
  login(id: string): Promise<User>;
  create(data: Prisma.UserCreateInput): Promise<User>;
  canUpdateYear(user: Pick<User, "graduationYearUpdatedAt">): boolean;
}

export interface BookingData {
  email: string;
  firstName: string;
  lastName: string;
  startDate: Date;
  endDate: Date;
  phoneNumber: string;
  cabinId: string;
}

export interface ICabinService {
  newBooking(data: BookingData): Promise<Booking>;
  updateBookingStatus(id: string, status: BookingStatus): Promise<Booking>;
  getCabin(id: string): Promise<Cabin>;
}

interface IEventService {
  create(
    userId: string,
    organizationId: string,
    data: {
      name: string;
      description?: string | null;
      startAt: Date;
      endAt?: Date | null;
      location?: string | null;
      spots?: number | null;
      slots?: { spots: number }[] | null;
    }
  ): Promise<Event>;
  get(id: string): Promise<Event>;
  findMany(data?: { onlyFutureEvents?: boolean | null }): Promise<Event[]>;
}

export interface ApolloServerDependencies {
  userService: IUserService;
  organizationService: IOrganizationService;
  cabinService: ICabinService;
  eventService: IEventService;
}
