import { faker } from "@faker-js/faker";
import { type DeepMockProxy, mock } from "jest-mock-extended";
import { InternalServerError, UnauthorizedError } from "~/domain/errors.js";
import type { EventType } from "~/domain/events/event.js";
import type { User } from "~/domain/users.js";
import { makeMockContext } from "~/lib/context.js";
import type {
	EventRepository,
	EventService,
	PermissionService,
} from "../../service.js";
import { makeDependencies } from "./dependencies.js";

describe("EventService", () => {
	let eventService: InstanceType<typeof EventService>;
	let eventRepository: DeepMockProxy<EventRepository>;
	let permissionService: DeepMockProxy<PermissionService>;

	beforeAll(() => {
		const deps = makeDependencies();
		eventService = deps.service;
		eventRepository = deps.eventsRepository;
		permissionService = deps.permissionService;
	});

	describe("#findManySignUpsForUser", () => {
		it("should return UnauthorizedError if the user is not logged in", async () => {
			const ctx = makeMockContext();
			const result = await eventService.findManySignUpsForUser(ctx, {
				userId: faker.string.uuid(),
			});
			expect(result).toEqual({
				ok: false,
				error: expect.any(UnauthorizedError),
			});
		});

		it("should return UnauthorizedError if trying to view another user's sign ups", async () => {
			const user = mock<User>({ id: faker.string.uuid() });
			const ctx = makeMockContext(user);
			const result = await eventService.findManySignUpsForUser(ctx, {
				userId: faker.string.uuid(),
			});
			expect(result).toEqual({
				ok: false,
				error: expect.any(UnauthorizedError),
			});
		});

		it("should return InternalServerError if it encounters an unexpected error", async () => {
			const user = mock<User>({ id: faker.string.uuid() });
			eventRepository.get.mockResolvedValue(
				mock<EventType>({ organizationId: faker.string.uuid() }),
			);
			permissionService.hasRole.mockResolvedValue(true);
			eventRepository.findManySignUps.mockResolvedValue({
				ok: false,
				error: new InternalServerError(""),
			});

			const ctx = makeMockContext(user);
			const result = await eventService.findManySignUpsForUser(ctx, {
				userId: user.id,
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(InternalServerError),
			});
		});

		it("should return sign ups and the total", async () => {
			const user = mock<User>({ id: faker.string.uuid() });
			eventRepository.get.mockResolvedValue(
				mock<EventType>({ organizationId: faker.string.uuid() }),
			);
			permissionService.hasRole.mockResolvedValue(true);
			eventRepository.findManySignUps.mockResolvedValue({
				ok: true,
				data: {
					signUps: [],
					total: 0,
				},
			});

			const ctx = makeMockContext(user);
			const result = await eventService.findManySignUpsForUser(ctx, {
				userId: user.id,
			});

			expect(eventRepository.findManySignUps).toHaveBeenCalledWith({
				userId: user.id,
				orderBy: "desc",
			});
			expect(result).toEqual({
				ok: true,
				data: {
					signUps: [],
					total: 0,
				},
			});
		});

		it("should order results", async () => {
			const user = mock<User>({ id: faker.string.uuid() });
			eventRepository.get.mockResolvedValue(
				mock<EventType>({ organizationId: faker.string.uuid() }),
			);
			permissionService.hasRole.mockResolvedValue(true);
			eventRepository.findManySignUps.mockResolvedValue({
				ok: true,
				data: {
					signUps: [],
					total: 0,
				},
			});

			const ctx = makeMockContext(user);
			const result = await eventService.findManySignUpsForUser(ctx, {
				userId: user.id,
				orderBy: "asc",
			});

			expect(eventRepository.findManySignUps).toHaveBeenCalledWith({
				userId: user.id,
				orderBy: "asc",
			});
			expect(result).toEqual({
				ok: true,
				data: {
					signUps: [],
					total: 0,
				},
			});
		});

		it("should filter on participation status", async () => {
			const user = mock<User>({ id: faker.string.uuid() });
			eventRepository.get.mockResolvedValue(
				mock<EventType>({ organizationId: faker.string.uuid() }),
			);
			permissionService.hasRole.mockResolvedValue(true);
			eventRepository.findManySignUps.mockResolvedValue({
				ok: true,
				data: {
					signUps: [],
					total: 0,
				},
			});

			const ctx = makeMockContext(user);
			const result = await eventService.findManySignUpsForUser(ctx, {
				userId: user.id,
				participationStatus: "CONFIRMED",
			});

			expect(eventRepository.findManySignUps).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: user.id,
					status: "CONFIRMED",
				}),
			);
			expect(result).toEqual({
				ok: true,
				data: {
					signUps: [],
					total: 0,
				},
			});
		});

		it("should return sign ups and the total", async () => {
			const user = mock<User>({ id: faker.string.uuid() });
			eventRepository.get.mockResolvedValue(
				mock<EventType>({ organizationId: faker.string.uuid() }),
			);
			permissionService.hasRole.mockResolvedValue(true);
			eventRepository.findManySignUps.mockResolvedValue({
				ok: true,
				data: {
					signUps: [],
					total: 0,
				},
			});

			const ctx = makeMockContext(user);
			const result = await eventService.findManySignUpsForUser(ctx, {
				userId: user.id,
			});

			expect(eventRepository.findManySignUps).toHaveBeenCalledWith({
				userId: user.id,
				orderBy: "desc",
			});
			expect(result).toEqual({
				ok: true,
				data: {
					signUps: [],
					total: 0,
				},
			});
		});
	});
});
