import { faker } from "@faker-js/faker";
import type { EventSignUp } from "@prisma/client";
import { type DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import { NotFoundError, UnauthorizedError } from "~/domain/errors.js";
import type { User } from "~/domain/users.js";
import { makeMockContext } from "~/lib/context.js";
import type { EventRepository } from "~/repositories/events/repository.js";
import {
	EventService,
	type PermissionService,
	type ProductService,
	type UserService,
} from "../../service.js";

describe("EventService", () => {
	let eventService: EventService;
	let mockEventRepository: DeepMockProxy<EventRepository>;
	let mockPermissionService: DeepMockProxy<PermissionService>;
	let mockUserService: DeepMockProxy<UserService>;
	let mockProductService: DeepMockProxy<ProductService>;

	beforeAll(() => {
		mockEventRepository = mockDeep<EventRepository>();
		mockPermissionService = mockDeep<PermissionService>();
		mockUserService = mockDeep<UserService>();
		mockProductService = mockDeep<ProductService>();
		eventService = new EventService(
			mockEventRepository,
			mockPermissionService,
			mockUserService,
			mockProductService,
			mockDeep(),
		);
	});

	describe("#getSignUp", () => {
		it("should return UnauthorizedError if the user is not logged in", async () => {
			const ctx = makeMockContext();
			const result = await eventService.getSignUp(ctx, {
				eventId: faker.string.uuid(),
			});
			expect(result).toEqual({
				ok: false,
				error: expect.any(UnauthorizedError),
			});
		});

		it("should return NotFoundError if the sign up is not found", async () => {
			mockEventRepository.getActiveSignUp.mockResolvedValue({
				ok: false,
				error: new NotFoundError("Event sign-up not found"),
			});

			const user = mock<User>({ id: faker.string.uuid() });
			const ctx = makeMockContext(user);

			const result = await eventService.getSignUp(ctx, {
				eventId: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(NotFoundError),
			});
		});

		it("should return the sign up if found", async () => {
			mockEventRepository.getActiveSignUp.mockResolvedValueOnce({
				ok: true,
				data: {
					signUp: {
						...mock<EventSignUp>(),
						participationStatus: "CONFIRMED",
					},
				},
			});

			const user = mock<User>({ id: faker.string.uuid() });
			const ctx = makeMockContext(user);

			const result = await eventService.getSignUp(ctx, {
				eventId: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: true,
				data: {
					signUp: expect.objectContaining({
						participationStatus: "CONFIRMED",
					}),
				},
			});
		});

		it("should use the user ID from context if not a super user", async () => {
			mockEventRepository.getActiveSignUp.mockResolvedValueOnce({
				ok: true,
				data: {
					signUp: mock<EventSignUp>({
						participationStatus: "CONFIRMED",
						orderId: faker.string.uuid(),
					}),
				},
			});

			const user = mock<User>({ id: faker.string.uuid(), isSuperUser: false });
			const ctx = makeMockContext(user);

			await eventService.getSignUp(ctx, {
				eventId: faker.string.uuid(),
				userId: faker.string.uuid(),
			});

			expect(mockEventRepository.getActiveSignUp).toHaveBeenCalledWith(
				expect.anything(),
				{
					userId: user.id,
					eventId: expect.any(String),
				},
			);
		});

		it("should use the userId parameter if the user is a super user", async () => {
			mockEventRepository.getActiveSignUp.mockResolvedValueOnce({
				ok: true,
				data: {
					signUp: mock<EventSignUp>({
						participationStatus: "CONFIRMED",
						orderId: faker.string.uuid(),
					}),
				},
			});

			const user = mock<User>({ id: faker.string.uuid(), isSuperUser: true });
			const ctx = makeMockContext(user);
			const otherUserId = faker.string.uuid();

			await eventService.getSignUp(ctx, {
				eventId: faker.string.uuid(),
				userId: otherUserId,
			});

			expect(mockEventRepository.getActiveSignUp).toHaveBeenCalledWith(
				expect.anything(),
				{
					userId: otherUserId,
					eventId: expect.any(String),
				},
			);
		});
	});
});
