import { faker } from "@faker-js/faker";
import { type DeepMockProxy, mock } from "jest-mock-extended";
import {
	InternalServerError,
	InvalidArgumentError,
	UnauthorizedError,
} from "~/domain/errors.js";
import { makeMockContext } from "~/lib/context.js";
import type {
	CreateBasicEventParams,
	CreateTicketEventParams,
	EventRepository,
	EventService,
	PermissionService,
	ProductService,
} from "../../service.js";
import { makeBasicEvent } from "../dependencies.js";
import { makeDependencies } from "./dependencies.js";

describe("EventService", () => {
	let service: EventService;
	let eventsRepository: DeepMockProxy<EventRepository>;
	let permissionService: DeepMockProxy<PermissionService>;
	let productService: DeepMockProxy<ProductService>;

	beforeAll(() => {
		({ eventsRepository, service, permissionService, productService } =
			makeDependencies());
	});

	describe("#create", () => {
		it("should return InternalServerError if products.create fails with UnauthorizedError", async () => {
			// Arrange
			const ctx = makeMockContext(null);
			permissionService.hasRole.mockResolvedValue(true);
			productService.products.create.mockResolvedValueOnce({
				ok: false,
				error: new UnauthorizedError("Unauthorized"),
			});

			// Act
			const result = await service.create(ctx, {
				type: "TICKETS",
				event: mock<CreateTicketEventParams["event"]>(),
				tickets: {
					price: 100,
					merchantId: faker.string.uuid(),
				},
				slots: [],
			});

			// Assert
			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					name: InternalServerError.name,
					cause: expect.any(UnauthorizedError),
				}),
			});
		});

		it("should return InvalidArgumentError if a slot has invalid data", async () => {
			// Arrange
			const ctx = makeMockContext(null);
			permissionService.hasRole.mockResolvedValue(true);
			productService.products.create.mockResolvedValueOnce({
				ok: false,
				error: new UnauthorizedError("Unauthorized"),
			});

			// Act
			const result = await service.create(ctx, {
				type: "TICKETS",
				event: mock<CreateTicketEventParams["event"]>(),
				tickets: {
					price: 100,
					merchantId: faker.string.uuid(),
				},
				slots: [{ capacity: 10 }, { capacity: -1 }],
			});

			// Assert
			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					name: InvalidArgumentError.name,
					cause: expect.any(InvalidArgumentError),
				}),
			});
		});

		it("should return InvalidArgumentError if event data is invalid", async () => {
			// Arrange
			const ctx = makeMockContext(null);
			permissionService.hasRole.mockResolvedValue(true);

			// Act
			const result = await service.create(ctx, {
				type: "BASIC",
				event: mock<CreateBasicEventParams["event"]>({
					...makeBasicEvent(),
					name: "",
					organizationId: faker.string.uuid(),
				}),
			});

			// Assert
			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					name: InvalidArgumentError.name,
					cause: expect.any(InvalidArgumentError),
				}),
			});
		});

		it("should return InvalidArgumentError if repository.create fails with InvalidArgumentError", async () => {
			// Arrange
			const ctx = makeMockContext(null);
			permissionService.hasRole.mockResolvedValue(true);
			eventsRepository.create.mockResolvedValue({
				ok: false,
				error: new InvalidArgumentError("repository.create"),
			});

			// Act
			const result = await service.create(ctx, {
				type: "BASIC",
				event: mock<CreateBasicEventParams["event"]>({
					...makeBasicEvent(),
					organizationId: faker.string.uuid(),
				}),
			});

			// Assert
			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					name: InvalidArgumentError.name,
					description: expect.stringContaining("repository"),
					cause: expect.any(InvalidArgumentError),
				}),
			});
		});

		it("should return InternalServerError if repository.create fails with InternalServerError", async () => {
			// Arrange
			const ctx = makeMockContext(null);
			permissionService.hasRole.mockResolvedValue(true);
			eventsRepository.create.mockResolvedValue({
				ok: false,
				error: new InternalServerError("repository.create"),
			});

			// Act
			const result = await service.create(ctx, {
				type: "BASIC",
				event: mock<CreateBasicEventParams["event"]>({
					...makeBasicEvent(),
					organizationId: faker.string.uuid(),
				}),
			});

			// Assert
			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					name: InternalServerError.name,
					description: expect.stringContaining("repository"),
					cause: expect.any(InternalServerError),
				}),
			});
		});
	});
});
