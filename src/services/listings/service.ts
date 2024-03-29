import { ZodError, z } from "zod";
import {
	InvalidArgumentError,
	PermissionDeniedError,
} from "~/domain/errors.js";
import type { Listing } from "~/domain/listings.js";
import {
	OrganizationRole,
	type OrganizationRoleType,
} from "~/domain/organizations.js";
import type { Context } from "~/lib/context.js";

export interface ListingRepository {
	get(id: string): Promise<Listing>;
	create(data: {
		name: string;
		description?: string;
		closesAt: Date;
		applicationUrl?: string;
		organizationId: string;
	}): Promise<Listing>;
	update(
		id: string,
		listing: Partial<{
			name: string;
			description: string;
			closesAt: Date;
			applicationUrl: string;
		}>,
	): Promise<Listing>;
	findMany(params?: { organizationId?: string }): Promise<Listing[]>;
	delete(id: string): Promise<Listing>;
}

export interface PermissionService {
	hasRole(
		ctx: Context,
		data: {
			organizationId: string;
			role: OrganizationRoleType;
		},
	): Promise<boolean>;
}

export class ListingService {
	constructor(
		private readonly listingRepository: ListingRepository,
		private readonly permissionService: PermissionService,
	) {}

	/**
	 * get returns a listing by id
	 * @param id - the id of the listing
	 */
	get(id: string): Promise<Listing> {
		return this.listingRepository.get(id);
	}

	/**
	 * findMany returns all listings
	 */
	findMany(params?: { organizationId?: string | null }): Promise<Listing[]> {
		if (params?.organizationId) {
			return this.listingRepository.findMany({
				organizationId: params.organizationId,
			});
		}
		return this.listingRepository.findMany();
	}

	/**
	 * create creates a new listing
	 * @throws {InvalidArgumentError} if data is invalid
	 * @param data - the data to create a listing
	 * @returns the created listing
	 */
	async create(
		ctx: Context,
		data: {
			name: string;
			description?: string | null;
			closesAt: Date;
			applicationUrl?: string | null;
			organizationId: string;
		},
	): Promise<Listing> {
		await this.assertHasPermission(ctx, data.organizationId);

		const listingSchema = z.object({
			name: z.string().min(2).max(100),
			description: z
				.string()
				.max(10_000)
				.nullish()
				.transform((description) => description ?? undefined),
			closesAt: z.date().min(new Date()),
			applicationUrl: z
				.string()
				.url()
				.nullish()
				.transform((url) => url ?? undefined),
			organizationId: z.string().uuid(),
		});
		try {
			const listing = listingSchema.parse(data);
			return this.listingRepository.create(listing);
		} catch (err) {
			if (err instanceof ZodError) {
				throw new InvalidArgumentError(err.message, err);
			}
			throw err;
		}
	}

	/**
	 * update updates a listing
	 * @throws {InvalidArgumentError} if data is invalid
	 * @param id - the id of the listing
	 * @param data - the data to update a listing
	 * @returns the updated listing
	 */
	async update(
		ctx: Context,
		id: string,
		data: {
			name?: string | null;
			description?: string | null;
			closesAt?: Date | null;
			applicationUrl?: string | null;
		},
	): Promise<Listing> {
		const listing = await this.listingRepository.get(id);
		await this.assertHasPermission(ctx, listing.organizationId);

		const listingSchema = z.object({
			name: z
				.string()
				.min(2)
				.max(100)
				.nullish()
				.transform((val) => val ?? undefined),
			description: z
				.string()
				.max(10_000)
				.nullish()
				.transform((val) => val ?? undefined),
			closesAt: z
				.date()
				.min(new Date())
				.nullish()
				.transform((val) => val ?? undefined),
			applicationUrl: z
				.string()
				.url()
				.nullish()
				.transform((val) => val ?? undefined),
		});
		try {
			const listing = listingSchema.parse(data);
			return this.listingRepository.update(id, listing);
		} catch (err) {
			if (err instanceof ZodError) {
				throw new InvalidArgumentError(err.message);
			}
			throw err;
		}
	}

	/**
	 * delete deletes a listing
	 * @param userId - the id of the user
	 * @param id - the id of the listing to delete
	 */
	async delete(ctx: Context, id: string): Promise<Listing> {
		const listing = await this.listingRepository.get(id);
		await this.assertHasPermission(ctx, listing.organizationId);

		return this.listingRepository.delete(id);
	}

	private async assertHasPermission(
		ctx: Context,
		organizationId: string,
	): Promise<void> {
		const isMember = await this.permissionService.hasRole(ctx, {
			organizationId,
			role: OrganizationRole.MEMBER,
		});

		if (isMember === false) {
			throw new PermissionDeniedError(
				"You do not have permission to update this listing.",
			);
		}
	}
}
