import { faker } from "@faker-js/faker";
import type { Cabin } from "@prisma/client";
import { type DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import { PermissionDeniedError, UnauthorizedError } from "~/domain/errors.js";
import { makeMockContext } from "~/lib/context.js";
import { CabinService } from "../../index.js";
import type {
	ICabinRepository,
	MailService,
	PermissionService,
} from "../../service.js";

describe("CabinService", () => {
	let cabinService: CabinService;
	let cabinRepository: DeepMockProxy<ICabinRepository>;
	let mailService: DeepMockProxy<MailService>;
	let permissionService: DeepMockProxy<PermissionService>;

	beforeAll(() => {
		cabinRepository = mockDeep<ICabinRepository>();
		mailService = mockDeep<MailService>();
		permissionService = mockDeep<PermissionService>();
		cabinService = new CabinService(
			cabinRepository,
			mailService,
			permissionService,
		);
	});
	describe("#createCabin", () => {
		it("should return UnauthorizedError if not logged in", async () => {
			const result = await cabinService.createCabin(makeMockContext(null), {
				name: "test",
				capacity: 10,
				internalPrice: 100,
				externalPrice: 100,
			});

			expect(result).toEqual({
				ok: false,
				error: expect.any(UnauthorizedError),
			});
		});

		it("should return PermissionDeniedError if the user does not have CABIN_ADMIN permission", async () => {
			permissionService.hasFeaturePermission.mockImplementationOnce(
				(_ctx, { featurePermission }) => {
					if (featurePermission === "CABIN_ADMIN") {
						return Promise.resolve(false);
					}
					throw new Error("Unexpected call to hasFeaturePermission");
				},
			);

			const result = await cabinService.createCabin(
				makeMockContext({ id: faker.string.uuid() }),
				{
					name: "test",
					capacity: 10,
					internalPrice: 100,
					externalPrice: 100,
				},
			);

			expect(result).toEqual({
				ok: false,
				error: expect.any(PermissionDeniedError),
			});
		});

		it("should create a cabin", async () => {
			permissionService.hasFeaturePermission.mockImplementationOnce(
				(_ctx, { featurePermission }) => {
					if (featurePermission === "CABIN_ADMIN") {
						return Promise.resolve(true);
					}
					throw new Error("Unexpected call to hasFeaturePermission");
				},
			);
			cabinRepository.createCabin.mockResolvedValueOnce({
				ok: true,
				data: {
					cabin: mock<Cabin>({
						id: faker.string.uuid(),
						name: "test",
						capacity: 10,
						internalPrice: 100,
						externalPrice: 100,
					}),
				},
			});

			const result = await cabinService.createCabin(
				makeMockContext({ id: faker.string.uuid() }),
				{
					name: "test",
					capacity: 10,
					internalPrice: 100,
					externalPrice: 100,
				},
			);

			expect(result.ok).toBe(true);
		});
	});
});
