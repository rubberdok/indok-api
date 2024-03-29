import { faker } from "@faker-js/faker";
import { type DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import { NotFoundError, UnauthorizedError } from "~/domain/errors.js";
import type { EventSignUp } from "~/domain/events/index.js";
import { Order } from "~/domain/products.js";
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

	describe("#getOrderForSignUp", () => {
		it("should return UnauthorizedError if the user is not logged in", async () => {
			const ctx = makeMockContext();
			const result = await eventService.getOrderForSignUp(ctx, {
				eventId: faker.string.uuid(),
			});
			expect(result).toEqual({
				ok: false,
				error: expect.any(UnauthorizedError),
			});
		});

		it("should return NotFoundError if the sign up is not confirmed", async () => {
			mockEventRepository.getActiveSignUp.mockResolvedValueOnce({
				ok: true,
				data: {
					signUp: mock<EventSignUp>({
						participationStatus: "ON_WAITLIST",
					}),
				},
			});

			const user = mock<User>({ id: faker.string.uuid() });
			const ctx = makeMockContext(user);

			const result = await eventService.getOrderForSignUp(ctx, {
				eventId: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(NotFoundError),
			});
		});

		it("should return NotFoundError if the sign up does not have an order", async () => {
			mockEventRepository.getActiveSignUp.mockResolvedValueOnce({
				ok: true,
				data: {
					signUp: mock<EventSignUp>({
						participationStatus: "CONFIRMED",
						orderId: null,
					}),
				},
			});

			const user = mock<User>({ id: faker.string.uuid() });
			const ctx = makeMockContext(user);

			const result = await eventService.getOrderForSignUp(ctx, {
				eventId: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(NotFoundError),
			});
		});

		it("should return the order if found", async () => {
			mockEventRepository.getActiveSignUp.mockResolvedValueOnce({
				ok: true,
				data: {
					signUp: mock<EventSignUp>({
						participationStatus: "CONFIRMED",
						orderId: faker.string.uuid(),
					}),
				},
			});
			mockProductService.orders.get.mockResolvedValue({
				ok: true,
				data: {
					order: new Order({
						id: faker.string.uuid(),
						userId: faker.string.uuid(),
						productId: faker.string.uuid(),
						attempt: 1,
						createdAt: new Date(),
						paymentStatus: "CREATED",
						purchasedAt: null,
						totalPrice: 100,
						updatedAt: new Date(),
						version: 1,
						capturedPaymentAttemptReference: null,
					}),
				},
			});

			const user = mock<User>({ id: faker.string.uuid() });
			const ctx = makeMockContext(user);

			const result = await eventService.getOrderForSignUp(ctx, {
				eventId: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: true,
				data: {
					order: expect.any(Order),
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
			mockProductService.orders.get.mockResolvedValue({
				ok: true,
				data: {
					order: new Order({
						id: faker.string.uuid(),
						userId: faker.string.uuid(),
						productId: faker.string.uuid(),
						attempt: 1,
						createdAt: new Date(),
						paymentStatus: "CREATED",
						purchasedAt: null,
						totalPrice: 100,
						updatedAt: new Date(),
						version: 1,
						capturedPaymentAttemptReference: null,
					}),
				},
			});

			const user = mock<User>({ id: faker.string.uuid(), isSuperUser: false });
			const ctx = makeMockContext(user);

			await eventService.getOrderForSignUp(ctx, {
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
			mockProductService.orders.get.mockResolvedValue({
				ok: true,
				data: {
					order: new Order({
						id: faker.string.uuid(),
						userId: faker.string.uuid(),
						productId: faker.string.uuid(),
						attempt: 1,
						createdAt: new Date(),
						paymentStatus: "CREATED",
						purchasedAt: null,
						totalPrice: 100,
						updatedAt: new Date(),
						version: 1,
						capturedPaymentAttemptReference: null,
					}),
				},
			});

			const user = mock<User>({ id: faker.string.uuid(), isSuperUser: true });
			const ctx = makeMockContext(user);
			const otherUserId = faker.string.uuid();

			await eventService.getOrderForSignUp(ctx, {
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
