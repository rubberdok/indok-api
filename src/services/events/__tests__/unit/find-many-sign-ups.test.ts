import { mock, type DeepMockProxy } from "jest-mock-extended";
import type {
	EventRepository,
	EventService,
	PermissionService,
} from "../../service.js";
import { makeDependencies } from "./dependencies.js";
import { faker } from "@faker-js/faker";
import { makeMockContext } from "~/lib/context.js";
import {
	InternalServerError,
	InvalidArgumentError,
	NotFoundError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import type { User } from "~/domain/users.js";
import type { EventType } from "~/domain/events/event.js";

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

	describe("#findManySignUps", () => {
		it("should return UnauthorizedError if the user is not logged in", async () => {
			const ctx = makeMockContext();
			const result = await eventService.findManySignUps(ctx, {
				eventId: faker.string.uuid(),
			});
			expect(result).toEqual({
				ok: false,
				error: expect.any(UnauthorizedError),
			});
		});

		it("should return InvalidArgumentError if the organization the event belongs to has been deleted", async () => {
			const user = mock<User>({ id: faker.string.uuid() });
			eventRepository.get.mockResolvedValue(
				mock<EventType>({ organizationId: null }),
			);

			const ctx = makeMockContext(user);
			const result = await eventService.findManySignUps(ctx, {
				eventId: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(InvalidArgumentError),
			});
		});

		it("should return PermissionDeniedError if the user does not have permission to view the sign-ups", async () => {
			const user = mock<User>({ id: faker.string.uuid() });
			eventRepository.get.mockResolvedValue(
				mock<EventType>({ organizationId: faker.string.uuid() }),
			);
			permissionService.hasRole.mockResolvedValue(false);

			const ctx = makeMockContext(user);
			const result = await eventService.findManySignUps(ctx, {
				eventId: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(PermissionDeniedError),
			});
		});

		it("should return NotFoundError if the event is not found", async () => {
			const user = mock<User>({ id: faker.string.uuid() });
			eventRepository.get.mockResolvedValue(
				mock<EventType>({ organizationId: faker.string.uuid() }),
			);
			permissionService.hasRole.mockResolvedValue(true);
			eventRepository.findManySignUps.mockResolvedValue({
				ok: false,
				error: new NotFoundError(""),
			});

			const ctx = makeMockContext(user);
			const result = await eventService.findManySignUps(ctx, {
				eventId: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(NotFoundError),
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
			const result = await eventService.findManySignUps(ctx, {
				eventId: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(InternalServerError),
			});
		});

		it("should return NotFoundError if eventRepository.get throws", async () => {
			const user = mock<User>({ id: faker.string.uuid() });
			eventRepository.get.mockRejectedValue(new NotFoundError(""));

			const ctx = makeMockContext(user);
			const result = await eventService.findManySignUps(ctx, {
				eventId: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(NotFoundError),
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
			const result = await eventService.findManySignUps(ctx, {
				eventId: faker.string.uuid(),
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
