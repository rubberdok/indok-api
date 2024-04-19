import { faker } from "@faker-js/faker";
import { type DeepMockProxy, mock } from "jest-mock-extended";
import {
	InternalServerError,
	InvalidArgumentError,
	NotFoundError,
	UnauthorizedError,
} from "~/domain/errors.js";
import type { EventSignUp, SlotType } from "~/domain/events/index.js";
import type { OrderType } from "~/domain/products.js";
import type { User } from "~/domain/users.js";
import { makeMockContext } from "~/lib/context.js";
import type {
	EventRepository,
	EventService,
	ProductService,
	UserService,
} from "../../service.js";
import { makeSignUpEvent, makeTicketEvent } from "../dependencies.js";
import { makeDependencies } from "./dependencies.js";

describe("EventService", () => {
	let service: EventService;
	let eventsRepository: DeepMockProxy<EventRepository>;
	let userService: DeepMockProxy<UserService>;
	let productService: DeepMockProxy<ProductService>;

	beforeAll(() => {
		({ eventsRepository, service, productService, userService } =
			makeDependencies());
	});

	describe("#signUp", () => {
		it("should return UnauthorizedError if not logged in", async () => {
			const ctx = makeMockContext();
			const result = await service.signUp(ctx, {
				eventId: faker.string.uuid(),
			});
			expect(result).toEqual({
				ok: false,
				error: expect.any(UnauthorizedError),
			});
		});

		it("should return InvalidArgumentError the event does not have an organization", async () => {
			const ctx = makeMockContext(mock<User>({ id: faker.string.uuid() }));
			eventsRepository.get.mockResolvedValueOnce(
				makeSignUpEvent({ organizationId: null }),
			);

			const result = await service.signUp(ctx, {
				eventId: faker.string.uuid(),
			});
			expect(result).toEqual({
				ok: false,
				error: expect.any(InvalidArgumentError),
			});
		});

		it("should return InternalServerError if order is not created", async () => {
			const ctx = makeMockContext(mock<User>({ id: faker.string.uuid() }));
			eventsRepository.get.mockResolvedValue(
				makeTicketEvent({
					organizationId: faker.string.uuid(),
					signUpsEnabled: true,
					signUpsStartAt: faker.date.past(),
					signUpsEndAt: faker.date.future(),
				}),
			);
			productService.orders.create.mockResolvedValueOnce({
				ok: false,
				error: new NotFoundError(""),
			});
			eventsRepository.createSignUp.mockResolvedValue({
				signUp: mock<EventSignUp>({ id: faker.string.uuid() }),
				event: makeSignUpEvent(),
				slot: mock<SlotType>(),
			});
			eventsRepository.getSlotWithRemainingCapacity.mockResolvedValue(
				mock<SlotType>({
					id: faker.string.uuid(),
					capacity: 10,
				}),
			);
			userService.get.mockResolvedValue(
				mock<User>({ id: faker.string.uuid() }),
			);

			const result = await service.signUp(ctx, {
				eventId: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					name: InternalServerError.name,
					description: expect.stringContaining("create order"),
				}),
			});
		});

		it("should return InternalServerError if adding the order to the sign up fails", async () => {
			const ctx = makeMockContext(mock<User>({ id: faker.string.uuid() }));
			eventsRepository.get.mockResolvedValue(
				makeTicketEvent({
					organizationId: faker.string.uuid(),
					signUpsEnabled: true,
					signUpsStartAt: faker.date.past(),
					signUpsEndAt: faker.date.future(),
				}),
			);
			productService.orders.create.mockResolvedValueOnce(
				mock({
					ok: true,
					data: {
						order: mock<OrderType>(),
					},
				}),
			);
			eventsRepository.createSignUp.mockResolvedValue({
				signUp: mock<EventSignUp>({ id: faker.string.uuid() }),
				event: makeSignUpEvent(),
				slot: mock<SlotType>(),
			});
			eventsRepository.getSlotWithRemainingCapacity.mockResolvedValue(
				mock<SlotType>({
					id: faker.string.uuid(),
					capacity: 10,
				}),
			);
			userService.get.mockResolvedValue(
				mock<User>({ id: faker.string.uuid() }),
			);
			eventsRepository.addOrderToSignUp.mockResolvedValue({
				ok: false,
				error: new InternalServerError(""),
			});

			const result = await service.signUp(ctx, {
				eventId: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					name: InternalServerError.name,
					description: expect.stringContaining("add order"),
				}),
			});
		});

		it("should return if an unexpected error is thrown", async () => {
			const ctx = makeMockContext(mock<User>({ id: faker.string.uuid() }));
			eventsRepository.get.mockResolvedValue(
				makeTicketEvent({
					organizationId: faker.string.uuid(),
					signUpsEnabled: true,
					signUpsStartAt: faker.date.past(),
					signUpsEndAt: faker.date.future(),
				}),
			);
			eventsRepository.getSlotWithRemainingCapacity.mockRejectedValue(
				new Error("Unexpected error"),
			);
			userService.get.mockResolvedValue(
				mock<User>({ id: faker.string.uuid() }),
			);

			const result = await service.signUp(ctx, {
				eventId: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					name: InternalServerError.name,
					description: expect.stringContaining("sign up user"),
				}),
			});
		});

		it("should return InternalServerError if we fail to sign up after 20 attempts", async () => {
			const ctx = makeMockContext(mock<User>({ id: faker.string.uuid() }));
			eventsRepository.get.mockResolvedValue(
				makeSignUpEvent({
					organizationId: faker.string.uuid(),
					signUpsEnabled: true,
					signUpsStartAt: faker.date.past(),
					signUpsEndAt: faker.date.future(),
				}),
			);
			eventsRepository.getSlotWithRemainingCapacity.mockResolvedValue(
				mock<SlotType>({
					id: faker.string.uuid(),
					capacity: 10,
				}),
			);
			userService.get.mockResolvedValue(
				mock<User>({ id: faker.string.uuid() }),
			);
			eventsRepository.createSignUp.mockRejectedValue(new NotFoundError(""));

			const result = await service.signUp(ctx, {
				eventId: faker.string.uuid(),
			});

			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					name: InternalServerError.name,
					description: expect.stringContaining("20 attempts"),
				}),
			});
		});
	});
});
