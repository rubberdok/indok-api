import { merge } from "lodash-es";

import { env } from "@/config.js";
import { User } from "@/domain/users.js";
import { CabinRepository } from "@/repositories/cabins/index.js";
import { EventRepository } from "@/repositories/events/repository.js";
import { ListingRepository } from "@/repositories/listings/repository.js";
import { MemberRepository } from "@/repositories/organizations/members.js";
import { OrganizationRepository } from "@/repositories/organizations/organizations.js";
import { UserRepository } from "@/repositories/users/index.js";
import { feideClient } from "@/services/auth/clients.js";
import { FeideProvider } from "@/services/auth/providers.js";
import { AuthService } from "@/services/auth/service.js";
import { CabinService } from "@/services/cabins/service.js";
import { EventService } from "@/services/events/service.js";
import { ListingService } from "@/services/listings/index.js";
import { MailService } from "@/services/mail/index.js";
import { OrganizationService } from "@/services/organizations/service.js";
import { UserService } from "@/services/users/service.js";

import { ApolloServerDependencies } from "../apollo-server.js";
import postmark from "../postmark.js";
import prisma from "../prisma.js";
import { createRedisClient } from "../redis.js";

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

export interface ServerDependencies {
  createRedisClient: typeof createRedisClient;
  authService: IAuthService;
  apolloServerDependencies: ApolloServerDependencies;
}

/**
 * Utility function to create a `Dependencies` object with the specified overrides.
 * @param overrides - The overrides to apply to the default `Dependencies` object.
 * @returns A `Dependencies` object with the specified overrides.
 */
export function dependenciesFactory(
  overrides?: Partial<{
    authService: IAuthService;
    apolloServerDependencies: Partial<ApolloServerDependencies>;
    createRedisClient: typeof createRedisClient;
  }>
): ServerDependencies {
  const cabinRepository = new CabinRepository(prisma);
  const userRepository = new UserRepository(prisma);
  const memberRepository = new MemberRepository(prisma);
  const organizationRepository = new OrganizationRepository(prisma);
  const eventRepository = new EventRepository(prisma);
  const listingRepository = new ListingRepository(prisma);

  const mailService = new MailService(postmark, env.NO_REPLY_EMAIL);
  const cabinService = new CabinService(cabinRepository, mailService);
  const userService = new UserService(userRepository);
  const authService = overrides?.authService ?? new AuthService(userService, feideClient, FeideProvider);
  const organizationService = new OrganizationService(organizationRepository, memberRepository, userService);
  const eventService = new EventService(eventRepository, organizationService);
  const listingService = new ListingService(listingRepository, organizationService);

  const defaultApolloServerDependencies: ApolloServerDependencies = {
    cabinService,
    userService,
    organizationService,
    eventService,
    listingService,
  };

  const apolloServerDependencies = merge(defaultApolloServerDependencies, overrides?.apolloServerDependencies);
  const createRedisClientFn = overrides?.createRedisClient ?? createRedisClient;

  const defaultDependencies: ServerDependencies = {
    authService,
    apolloServerDependencies,
    createRedisClient: createRedisClientFn,
  };

  return defaultDependencies;
}
