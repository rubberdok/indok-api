import { Booking, Cabin, Member, Organization, Prisma, Event } from "@prisma/client";
import { merge } from "lodash-es";

import { env } from "@/config.js";
import { BookingStatus } from "@/domain/cabins.js";
import { Role } from "@/domain/organizations.js";
import { User } from "@/domain/users.js";
import { CabinRepository } from "@/repositories/cabins/index.js";
import { EventRepository } from "@/repositories/events/repository.js";
import { MemberRepository } from "@/repositories/organizations/members.js";
import { OrganizationRepository } from "@/repositories/organizations/organizations.js";
import { UserRepository } from "@/repositories/users/index.js";
import { feideClient } from "@/services/auth/clients.js";
import { FeideProvider } from "@/services/auth/providers.js";
import { AuthService } from "@/services/auth/service.js";
import { CabinService } from "@/services/cabins/service.js";
import { EventService } from "@/services/events/service.js";
import { MailService } from "@/services/mail/index.js";
import { OrganizationService } from "@/services/organizations/service.js";
import { UserService } from "@/services/users/service.js";

import postmark from "../postmark.js";
import prisma from "../prisma.js";
import { createRedisClient } from "../redis.js";

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

export interface BookingData
  extends Pick<
    Prisma.BookingCreateInput,
    "email" | "firstName" | "lastName" | "startDate" | "endDate" | "phoneNumber" | "cabinId"
  > {}

export interface ICabinService {
  newBooking(data: BookingData): Promise<Booking>;
  updateBookingStatus(id: string, status: BookingStatus): Promise<Booking>;
  getCabin(id: string): Promise<Cabin>;
}

interface GetUserParams {
  code: string;
  codeVerifier: string;
}

interface IAuthService {
  getUser(data: GetUserParams): Promise<User>;
  ssoUrl(state?: string | null): {
    url: string;
    codeChallenge: string;
    codeVerifier: string;
  };
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
}

export interface ServiceDependencies {
  userService: IUserService;
  organizationService: IOrganizationService;
  authService: IAuthService;
  cabinService: ICabinService;
  eventService: IEventService;
}

export interface ServerDependencies {
  createRedisClient: typeof createRedisClient;
  serviceDependencies: ServiceDependencies;
}

/**
 * Utility function to create a `Dependencies` object with the specified overrides.
 * @param overrides - The overrides to apply to the default `Dependencies` object.
 * @returns A `Dependencies` object with the specified overrides.
 */
export function dependenciesFactory(
  overrides?: Partial<{
    serviceDependencies: Partial<ServiceDependencies>;
    createRedisClient: typeof createRedisClient;
  }>
): ServerDependencies {
  const cabinRepository = new CabinRepository(prisma);
  const userRepository = new UserRepository(prisma);
  const memberRepository = new MemberRepository(prisma);
  const organizationRepository = new OrganizationRepository(prisma);
  const eventRepository = new EventRepository(prisma);

  const mailService = new MailService(postmark, env.NO_REPLY_EMAIL);
  const cabinService = new CabinService(cabinRepository, mailService);
  const userService = new UserService(userRepository);
  const authService = new AuthService(userService, feideClient, FeideProvider);
  const organizationService = new OrganizationService(organizationRepository, memberRepository, userService);
  const eventService = new EventService(eventRepository, organizationService);

  const defaultServiceDependencies: ServiceDependencies = {
    cabinService,
    userService,
    authService,
    organizationService,
    eventService,
  };

  const serviceDependencies = merge(defaultServiceDependencies, overrides?.serviceDependencies);
  const createRedisClientFn = overrides?.createRedisClient ?? createRedisClient;

  const defaultDependencies: ServerDependencies = {
    serviceDependencies,
    createRedisClient: createRedisClientFn,
  };

  return defaultDependencies;
}
