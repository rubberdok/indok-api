import { env } from "./config.js";
import postmark from "./lib/postmark.js";
import prisma from "./lib/prisma.js";
import { createRedisClient } from "./lib/redis.js";
import { CabinRepository } from "./repositories/cabins/index.js";
import { MemberRepository } from "./repositories/organizations/members.js";
import { OrganizationRepository } from "./repositories/organizations/organizations.js";
import { UserRepository } from "./repositories/users/index.js";
import { initServer } from "./server.js";
import { feideClient } from "./services/auth/clients.js";
import { AuthService } from "./services/auth/index.js";
import { FeideProvider } from "./services/auth/providers.js";
import { CabinService } from "./services/cabins/index.js";
import { MailService } from "./services/mail/index.js";
import { OrganizationService } from "./services/organizations/index.js";
import { UserService } from "./services/users/index.js";

const cabinRepository = new CabinRepository(prisma);
const userRepository = new UserRepository(prisma);
const memberRepository = new MemberRepository(prisma);
const organizationRepository = new OrganizationRepository(prisma);

const mailService = new MailService(postmark, env.NO_REPLY_EMAIL);
const cabinService = new CabinService(cabinRepository, mailService);
const userService = new UserService(userRepository);
const authService = new AuthService(userService, feideClient, FeideProvider);
const organizationService = new OrganizationService(organizationRepository, memberRepository, userService);

const dependencies = {
  cabinService,
  userService,
  authService,
  organizationService,
  createRedisClient: createRedisClient,
};

await initServer(dependencies, { port: env.PORT, host: "0.0.0.0" });
