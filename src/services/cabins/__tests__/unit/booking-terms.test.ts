import { faker } from "@faker-js/faker";
import { BookingTerms } from "~/domain/cabins.js";
import {
	DownstreamServiceError,
	InternalServerError,
	NotFoundError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import { RemoteFile } from "~/domain/files.js";
import { FeaturePermission } from "~/domain/organizations.js";
import { makeMockContext } from "~/lib/context.js";
import { Result } from "~/lib/result.js";
import { makeDependencies } from "./dependencies.js";

describe("Cabin service", () => {
	const { cabinService, cabinRepository, fileService, permissionService } =
		makeDependencies();
	describe("#updateBookingTerms", () => {
		it("creates a new bookingTerms and return a file upload URL", async () => {
			const ctx = makeMockContext({ id: faker.string.uuid() });
			permissionService.hasFeaturePermission.mockResolvedValue(true);
			fileService.createFileUploadUrl.mockResolvedValue(
				Result.success({
					url: faker.internet.url(),
					file: new RemoteFile({
						id: faker.string.uuid(),
						userId: faker.string.uuid(),
						name: faker.system.filePath(),
					}),
				}),
			);
			cabinRepository.createBookingTerms.mockResolvedValue(
				Result.success({
					bookingTerms: new BookingTerms({
						id: faker.string.uuid(),
						fileId: faker.string.uuid(),
						createdAt: new Date(),
					}),
				}),
			);

			const result = await cabinService.updateBookingTerms(ctx);

			expect(result).toEqual(
				Result.success({
					bookingTerms: expect.any(BookingTerms),
					uploadUrl: expect.any(String),
				}),
			);
		});

		it("returns UnauthorizedError if not logged in", async () => {
			const ctx = makeMockContext(null);

			const result = await cabinService.updateBookingTerms(ctx);

			expect(result).toEqual(Result.error(expect.any(UnauthorizedError)));
		});

		it("returns PermissionDeniedError if the user does not have the permission required", async () => {
			const ctx = makeMockContext({ id: faker.string.uuid() });
			permissionService.hasFeaturePermission.mockResolvedValue(false);

			const result = await cabinService.updateBookingTerms(ctx);

			expect(result).toEqual(Result.error(expect.any(PermissionDeniedError)));
		});

		it("requires CABIN_ADMIN permission", async () => {
			const ctx = makeMockContext({ id: faker.string.uuid() });

			await cabinService.updateBookingTerms(ctx);

			expect(permissionService.hasFeaturePermission).toHaveBeenCalledWith(ctx, {
				featurePermission: FeaturePermission.CABIN_ADMIN,
			});
		});

		it("requires CABIN_ADMIN permission", async () => {
			const ctx = makeMockContext({ id: faker.string.uuid() });

			await cabinService.updateBookingTerms(ctx);

			expect(permissionService.hasFeaturePermission).toHaveBeenCalledWith(ctx, {
				featurePermission: FeaturePermission.CABIN_ADMIN,
			});
		});

		it("returns an error if the file upload fails", async () => {
			const ctx = makeMockContext({ id: faker.string.uuid() });
			permissionService.hasFeaturePermission.mockResolvedValue(true);
			fileService.createFileUploadUrl.mockResolvedValue(
				Result.error(
					new DownstreamServiceError("Failed to create file upload URL"),
				),
			);

			const result = await cabinService.updateBookingTerms(ctx);

			expect(result).toEqual(Result.error(expect.any(DownstreamServiceError)));
		});

		it("returns an error if the bookingTerms creation fails", async () => {
			const ctx = makeMockContext({ id: faker.string.uuid() });
			permissionService.hasFeaturePermission.mockResolvedValue(true);
			fileService.createFileUploadUrl.mockResolvedValue(
				Result.success({
					url: faker.internet.url(),
					file: new RemoteFile({
						id: faker.string.uuid(),
						userId: faker.string.uuid(),
						name: faker.system.filePath(),
					}),
				}),
			);
			cabinRepository.createBookingTerms.mockResolvedValue(
				Result.error(new InternalServerError("Failed to create bookingTerms")),
			);

			const result = await cabinService.updateBookingTerms(ctx);

			expect(result).toEqual(Result.error(expect.any(InternalServerError)));
		});
	});

	describe("#getBookingTerms", () => {
		it("returns the booking terms", async () => {
			const ctx = makeMockContext({ id: faker.string.uuid() });
			cabinRepository.getBookingTerms.mockResolvedValue(
				Result.success({
					bookingTerms: new BookingTerms({
						id: faker.string.uuid(),
						fileId: faker.string.uuid(),
						createdAt: new Date(),
					}),
				}),
			);

			const result = await cabinService.getBookingTerms(ctx);

			expect(result).toEqual(
				Result.success({
					bookingTerms: expect.any(BookingTerms),
				}),
			);
		});

		it("does not require authentication", async () => {
			const ctx = makeMockContext(null);
			cabinRepository.getBookingTerms.mockResolvedValue(
				Result.success({
					bookingTerms: new BookingTerms({
						id: faker.string.uuid(),
						fileId: faker.string.uuid(),
						createdAt: new Date(),
					}),
				}),
			);

			const result = await cabinService.getBookingTerms(ctx);

			expect(result).toEqual(
				Result.success({
					bookingTerms: expect.any(BookingTerms),
				}),
			);
		});

		it("returns an error if the booking terms does not exist", async () => {
			const ctx = makeMockContext({ id: faker.string.uuid() });
			cabinRepository.getBookingTerms.mockResolvedValue(
				Result.error(new NotFoundError("Failed to get booking terms")),
			);

			const result = await cabinService.getBookingTerms(ctx);

			expect(result).toEqual(Result.error(expect.any(NotFoundError)));
		});
	});
});
