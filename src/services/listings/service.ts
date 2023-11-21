import { Listing } from "@prisma/client";
import { ZodError, z } from "zod";

import { InvalidArgumentError } from "@/domain/errors.js";

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
    }>
  ): Promise<Listing>;
  findMany(): Promise<Listing[]>;
}

export class ListingService {
  constructor(private readonly listingRepository: ListingRepository) {}

  /**
   * get returns a listing by id
   * @param id - the id of the listing
   */
  async get(id: string): Promise<Listing> {
    return this.listingRepository.get(id);
  }

  /**
   * findMany returns all listings
   */
  async findMany(): Promise<Listing[]> {
    return this.listingRepository.findMany();
  }

  /**
   * create creates a new listing
   * @throws {InvalidArgumentError} if data is invalid
   * @param data - the data to create a listing
   * @returns the created listing
   */
  async create(data: {
    name: string;
    description?: string | null;
    closesAt: Date;
    applicationUrl?: string | null;
    organizationId: string;
  }): Promise<Listing> {
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
        throw new InvalidArgumentError(err.message);
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
    id: string,
    data: {
      name?: string | null;
      description?: string | null;
      closesAt?: Date | null;
      applicationUrl?: string | null;
    }
  ): Promise<Listing> {
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
}
