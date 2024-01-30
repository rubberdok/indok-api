import { faker } from "@faker-js/faker";
import { QueueEvents } from "bullmq";
import { Redis } from "ioredis";
import { type DeepMockProxy, mockDeep } from "jest-mock-extended";
import { range } from "lodash-es";
import { DateTime } from "luxon";
import type { Logger } from "pino";
import type { ServerClient } from "postmark";
import { env } from "~/config.js";
import { Queue } from "~/lib/bullmq/queue.js";
import { Worker } from "~/lib/bullmq/worker.js";
import prisma from "~/lib/prisma.js";
import type { IOrganizationService } from "~/lib/server.js";
import { EventRepository } from "~/repositories/events/repository.js";
import { MemberRepository } from "~/repositories/organizations/members.js";
import { OrganizationRepository } from "~/repositories/organizations/organizations.js";
import { UserRepository } from "~/repositories/users/index.js";
import { makeMockContext } from "~/services/context.js";
import { MailService } from "~/services/mail/index.js";
import {
	type EmailQueueType,
	type EmailWorkerType,
	getEmailHandler,
} from "~/services/mail/worker.js";
import { OrganizationService } from "~/services/organizations/service.js";
import { PermissionService } from "~/services/permissions/service.js";
import { UserService } from "~/services/users/service.js";
import { EventService } from "../../service.js";
import {
	SignUpQueueName,
	type SignUpQueueType,
	type SignUpWorkerType,
	getSignUpWorkerHandler,
} from "../../worker.js";

describe("EventService", () => {
	let redis: Redis;
	let emailQueue: EmailQueueType;
	let signUpQueue: SignUpQueueType;
	let eventService: EventService;
	let userService: UserService;
	let signUpWorker: SignUpWorkerType;
	let emailWorker: EmailWorkerType;
	let organizationService: IOrganizationService;
	let queueEventsRedis: Redis;
	let signUpQueueEvents: QueueEvents;
	let emailQueueEvents: QueueEvents;
	let mailClient: DeepMockProxy<ServerClient>;

	beforeAll(() => {
		redis = new Redis(env.REDIS_CONNECTION_STRING, {
			maxRetriesPerRequest: 0,
		});
		queueEventsRedis = new Redis(env.REDIS_CONNECTION_STRING, {
			maxRetriesPerRequest: 0,
		});

		emailQueue = new Queue("email", { connection: redis });
		signUpQueue = new Queue(SignUpQueueName, { connection: redis });
		mailClient = mockDeep<ServerClient>();

		const userRepository = new UserRepository(prisma);
		const organizationRepository = new OrganizationRepository(prisma);
		const memberRepository = new MemberRepository(prisma);
		const permissionService = new PermissionService(
			memberRepository,
			userRepository,
			organizationRepository,
		);
		const eventRepository = new EventRepository(prisma);
		userService = new UserService(
			userRepository,
			permissionService,
			emailQueue,
		);
		eventService = new EventService(
			eventRepository,
			permissionService,
			userService,
			signUpQueue,
		);
		organizationService = new OrganizationService(
			organizationRepository,
			memberRepository,
			permissionService,
		);
		const mailService = new MailService(mailClient, env.NO_REPLY_EMAIL);

		const emailWorkerHandler = getEmailHandler({
			eventService,
			userService,
			mailService,
		});
		emailWorker = new Worker(
			emailWorkerHandler.name,
			emailWorkerHandler.handler,
			{
				connection: redis,
			},
		);

		const signUpWorkerHandler = getSignUpWorkerHandler({
			events: eventService,
			emailQueue,
			log: mockDeep<Logger>(),
		});

		signUpWorker = new Worker(
			signUpWorkerHandler.name,
			signUpWorkerHandler.handler,
			{
				connection: redis,
			},
		);

		signUpQueueEvents = new QueueEvents(signUpWorkerHandler.name, {
			connection: queueEventsRedis,
		});
		emailQueueEvents = new QueueEvents(emailWorkerHandler.name, {
			connection: queueEventsRedis,
		});
	});

	afterAll(async () => {
		await emailQueue.close();
		await signUpQueue.close();
		await signUpWorker.close();
		await emailWorker.close();
		await signUpQueueEvents.close();
		redis.disconnect();
		queueEventsRedis.disconnect();
	});

	describe("#retractSignUp", () => {
		it("should promote the first user on the wait list, and send them an email", async () => {
			/**
			 * Create two users, one event, and sign up both users for the event.
			 * The first should be CONFIRMED, the second should be WAIT_LIST.
			 */
			const eventOwner = await userService.create({
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				username: faker.string.uuid(),
				email: faker.internet.email({ firstName: faker.string.uuid() }),
				feideId: faker.string.uuid(),
			});
			const confirmedUser = await userService.create({
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				username: faker.string.uuid(),
				email: faker.internet.email({ firstName: faker.string.uuid() }),
				feideId: faker.string.uuid(),
				graduationYear: DateTime.now().year + 2,
			});
			const waitListUser = await userService.create({
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				username: faker.string.uuid(),
				email: faker.internet.email({ firstName: faker.string.uuid() }),
				feideId: faker.string.uuid(),
				graduationYear: DateTime.now().year + 2,
			});

			const organization = await organizationService.create(eventOwner.id, {
				name: faker.string.sample(20),
			});

			let event = await eventService.create(
				eventOwner.id,
				organization.id,
				{
					name: faker.string.sample(20),
					startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
				},
				{
					capacity: 1,
					signUpsStartAt: faker.date.past(),
					signUpsEndAt: faker.date.future(),
					slots: [{ capacity: 1, gradeYears: [1, 2, 3, 4, 5] }],
					signUpsEnabled: true,
				},
			);

			const ctx = makeMockContext(confirmedUser);
			const confirmedSignUp = await eventService.signUp(
				ctx,
				confirmedUser.id,
				event.id,
			);
			const waitListSignUp = await eventService.signUp(
				ctx,
				waitListUser.id,
				event.id,
			);

			expect(confirmedSignUp.participationStatus).toBe("CONFIRMED");
			expect(waitListSignUp.participationStatus).toBe("ON_WAITLIST");
			event = await eventService.get(event.id);
			expect(event.signUpDetails?.remainingCapacity).toBe(0);

			/**
			 * Act
			 *
			 * Retract the confirmed user's sign up, and wait for jobs to finish
			 */
			await eventService.retractSignUp(confirmedUser.id, event.id);
			const signUpJobs = await signUpQueue.getJobs();
			await Promise.all(
				signUpJobs.map((job) =>
					job
						.waitUntilFinished(signUpQueueEvents)
						.then((res) => expect(res.ok).toBe(true)),
				),
			);
			const emailJobs = await emailQueue.getJobs();
			await Promise.all(
				emailJobs.map((job) => job.waitUntilFinished(emailQueueEvents)),
			);

			event = await eventService.get(event.id);
			expect(event.signUpDetails?.remainingCapacity).toBe(0);

			/**
			 * Assert
			 *
			 * The confirmed user's sign up should be cancelled, and the wait list user should be promoted
			 * to confirmed.
			 * The promoted user should receive an email.
			 */
			const retractedSignUp = await eventService.getSignUpAvailability(
				confirmedUser.id,
				event.id,
			);
			expect(retractedSignUp).toBe("WAITLIST_AVAILABLE");
			const promotedSignUp = await eventService.getSignUpAvailability(
				waitListUser.id,
				event.id,
			);
			expect(promotedSignUp).toBe("CONFIRMED");
			expect(mailClient.sendEmailWithTemplate).toHaveBeenCalledWith(
				expect.objectContaining({
					To: waitListUser.email,
					From: env.NO_REPLY_EMAIL,
					TemplateAlias: "event-wait-list",
					TemplateModel: expect.objectContaining({
						eventName: event.name,
						eventStartAt: expect.any(String),
					}),
				}),
			);
		});

		it("stress test", async () => {
			/**
			 * Create two users, one event, and sign up both users for the event.
			 * The first should be CONFIRMED, the second should be WAIT_LIST.
			 */
			const eventOwner = await userService.create({
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				username: faker.string.uuid(),
				email: faker.internet.email({ firstName: faker.string.uuid() }),
				feideId: faker.string.uuid(),
			});
			const confirmedUsers = await Promise.all(
				range(0, 100).map(
					async () =>
						await userService.create({
							firstName: faker.person.firstName(),
							lastName: faker.person.lastName(),
							username: faker.string.uuid(),
							email: faker.internet.email({ firstName: faker.string.uuid() }),
							feideId: faker.string.uuid(),
							graduationYear: DateTime.now().year + 2,
						}),
				),
			);
			const waitListUsers = await Promise.all(
				range(0, 100).map(
					async () =>
						await userService.create({
							firstName: faker.person.firstName(),
							lastName: faker.person.lastName(),
							username: faker.string.uuid(),
							email: faker.internet.email({ firstName: faker.string.uuid() }),
							feideId: faker.string.uuid(),
							graduationYear: DateTime.now().year + 2,
						}),
				),
			);

			const shouldRemainOnWaitListUsers = await Promise.all(
				range(0, 100).map(
					async () =>
						await userService.create({
							firstName: faker.person.firstName(),
							lastName: faker.person.lastName(),
							username: faker.string.uuid(),
							email: faker.internet.email({ firstName: faker.string.uuid() }),
							feideId: faker.string.uuid(),
							graduationYear: DateTime.now().year + 2,
						}),
				),
			);

			const organization = await organizationService.create(eventOwner.id, {
				name: faker.string.sample(20),
			});

			let event = await eventService.create(
				eventOwner.id,
				organization.id,
				{
					name: faker.string.sample(20),
					startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
				},
				{
					capacity: 100,
					signUpsStartAt: faker.date.past(),
					signUpsEndAt: faker.date.future(),
					slots: [
						{ capacity: 50, gradeYears: [1, 2, 3, 4, 5] },
						{ capacity: 50, gradeYears: [1, 2, 3, 4, 5] },
					],
					signUpsEnabled: true,
				},
			);

			for (const user of confirmedUsers) {
				const ctx = makeMockContext(user);
				const confirmedSignUp = await eventService.signUp(
					ctx,
					user.id,
					event.id,
				);
				expect(confirmedSignUp.participationStatus).toBe("CONFIRMED");
			}

			for (const user of waitListUsers) {
				const ctx = makeMockContext(user);
				const waitListSignUp = await eventService.signUp(
					ctx,
					user.id,
					event.id,
				);
				expect(waitListSignUp.participationStatus).toBe("ON_WAITLIST");
			}

			for (const user of shouldRemainOnWaitListUsers) {
				const ctx = makeMockContext(user);
				const waitListSignUp = await eventService.signUp(
					ctx,
					user.id,
					event.id,
				);
				expect(waitListSignUp.participationStatus).toBe("ON_WAITLIST");
			}

			event = await eventService.get(event.id);
			expect(event.signUpDetails?.remainingCapacity).toBe(0);

			/**
			 * Act
			 *
			 * Retract the confirmed user's sign up, and wait for jobs to finish
			 */
			await Promise.all(
				confirmedUsers.map((user) =>
					eventService.retractSignUp(user.id, event.id),
				),
			);
			const signUpJobs = await signUpQueue.getJobs();
			await Promise.all(
				signUpJobs.map((job) =>
					job
						.waitUntilFinished(signUpQueueEvents)
						.then((res) => expect(res.ok).toBe(true)),
				),
			);
			const emailJobs = await emailQueue.getJobs();
			await Promise.all(
				emailJobs.map((job) => job.waitUntilFinished(emailQueueEvents)),
			);

			event = await eventService.get(event.id);
			expect(event.signUpDetails?.remainingCapacity).toBe(0);

			/**
			 * Assert
			 *
			 * The confirmed user's sign up should be cancelled, and the wait list user should be promoted
			 * to confirmed.
			 * The promoted user should receive an email.
			 */
			for (const user of confirmedUsers) {
				const retractedSignUp = await eventService.getSignUpAvailability(
					user.id,
					event.id,
				);
				expect(retractedSignUp).toBe("WAITLIST_AVAILABLE");
			}
			for (const user of waitListUsers) {
				const promotedSignUp = await eventService.getSignUpAvailability(
					user.id,
					event.id,
				);
				expect(promotedSignUp).toBe("CONFIRMED");
				expect(mailClient.sendEmailWithTemplate).toHaveBeenCalledWith(
					expect.objectContaining({
						To: user.email,
						From: env.NO_REPLY_EMAIL,
						TemplateAlias: "event-wait-list",
						TemplateModel: expect.objectContaining({
							eventName: event.name,
							eventStartAt: expect.any(String),
						}),
					}),
				);
			}

			for (const user of shouldRemainOnWaitListUsers) {
				const signUpAvailability = await eventService.getSignUpAvailability(
					user.id,
					event.id,
				);
				expect(signUpAvailability).toBe("ON_WAITLIST");
			}
		}, 10_000);
	});
});
