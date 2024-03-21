import { randomUUID } from "node:crypto";
import { compact, range, sumBy } from "lodash-es";
import { DateTime, Interval } from "luxon";
import { z } from "zod";
import {
	Booking,
	type BookingContact,
	type BookingSemester,
	BookingSemesterEnum,
	type BookingSemesterEnumType,
	BookingStatus,
	type BookingStatusType,
	type BookingTerms,
	type BookingType,
	type Cabin,
	type CalendarDay,
	type CalendarMonth,
} from "~/domain/cabins.js";
import {
	type DownstreamServiceError,
	InternalServerError,
	InvalidArgumentError,
	InvalidArgumentErrorV2,
	NotFoundError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import type { RemoteFile } from "~/domain/files.js";
import {
	FeaturePermission,
	type FeaturePermissionType,
} from "~/domain/organizations.js";
import type { Context } from "~/lib/context.js";
import { Result, type ResultAsync, type TResult } from "~/lib/result.js";
import type { ICabinService, NewBookingParams } from "~/lib/server.js";
import type { EmailQueueDataType } from "../mail/worker.js";

export interface ICabinRepository {
	getCabinById(id: string): Promise<Cabin>;
	createBooking(
		params: BookingType,
	): ResultAsync<{ booking: BookingType }, InternalServerError | NotFoundError>;
	updateBooking(
		id: string,
		data: Partial<Pick<BookingType, "status" | "feedback">>,
	): ResultAsync<{ booking: BookingType }, NotFoundError | InternalServerError>;
	getBookingById(
		id: string,
	): ResultAsync<{ booking: BookingType }, NotFoundError | InternalServerError>;
	getOverlappingBookings(
		booking: BookingType,
		params: Pick<BookingType, "status">,
	): ResultAsync<{ bookings: BookingType[] }, InternalServerError>;
	getCabinByBookingId(bookingId: string): Promise<Cabin>;
	findManyCabins(): Promise<Cabin[]>;
	updateBookingSemester(data: {
		semester: BookingSemesterEnumType;
		startAt?: Date;
		endAt?: Date;
		bookingsEnabled?: boolean;
	}): Promise<BookingSemester>;
	createBookingSemester(data: {
		semester: BookingSemesterEnumType;
		startAt: Date;
		endAt: Date;
		bookingsEnabled?: boolean;
	}): Promise<BookingSemester>;
	getBookingSemester(
		semester: BookingSemesterEnumType,
	): Promise<BookingSemester | null>;
	getBookingContact(): Promise<BookingContact>;
	updateBookingContact(
		data: Partial<{
			name: string | null;
			phoneNumber: string | null;
			email?: string | null;
		}>,
	): Promise<BookingContact>;
	createCabin(params: {
		name: string;
		capacity: number;
		internalPrice: number;
		externalPrice: number;
		internalPriceWeekend: number;
		externalPriceWeekend: number;
	}): ResultAsync<{ cabin: Cabin }, InternalServerError>;
	findManyBookings(
		ctx: Context,
		params: {
			cabinId?: string;
			endAtGte?: Date;
			bookingStatus?: BookingStatusType;
		},
	): ResultAsync<
		{
			bookings: BookingType[];
			total: number;
		},
		InternalServerError
	>;
	updateCabin(
		ctx: Context,
		params: { id: string } & Partial<{
			name: string;
			capacity: number;
			internalPrice: number;
			externalPrice: number;
			internalPriceWeekend: number;
			externalPriceWeekend: number;
		}>,
	): ResultAsync<{ cabin: Cabin }, InternalServerError | NotFoundError>;
	createBookingTerms(
		ctx: Context,
		data: { fileId: string },
	): ResultAsync<{ bookingTerms: BookingTerms }, InternalServerError>;
	getBookingTerms(
		ctx: Context,
		params: { id?: string },
	): ResultAsync<
		{ bookingTerms: BookingTerms },
		NotFoundError | InternalServerError
	>;
}

export interface PermissionService {
	hasFeaturePermission(
		ctx: Context,
		data: {
			featurePermission: FeaturePermissionType;
		},
	): Promise<boolean>;
}

export interface MailService {
	sendAsync(jobData: EmailQueueDataType): Promise<void>;
}

export interface FileService {
	createFileUploadUrl(
		ctx: Context,
		params: { extension: string },
	): ResultAsync<
		{ url: string; file: RemoteFile },
		| DownstreamServiceError
		| InternalServerError
		| UnauthorizedError
		| InvalidArgumentError
	>;
}

export class CabinService implements ICabinService {
	constructor(
		private cabinRepository: ICabinRepository,
		private mailService: MailService,
		private permissionService: PermissionService,
		private fileService: FileService,
	) {}
	async updateBookingTerms(
		ctx: Context,
	): ResultAsync<
		{ bookingTerms: BookingTerms; uploadUrl: string },
		| DownstreamServiceError
		| InternalServerError
		| UnauthorizedError
		| PermissionDeniedError
		| InvalidArgumentErrorV2
	> {
		if (!ctx.user) {
			return Result.error(
				new UnauthorizedError("You must be logged in to perform this action"),
			);
		}

		const hasPermission = await this.permissionService.hasFeaturePermission(
			ctx,
			{
				featurePermission: FeaturePermission.CABIN_ADMIN,
			},
		);

		if (!hasPermission) {
			return Result.error(
				new PermissionDeniedError(
					"You do not have permission to update the booking terms.",
				),
			);
		}

		const createFileUploadUrlResult =
			await this.fileService.createFileUploadUrl(ctx, { extension: "pdf" });
		if (!createFileUploadUrlResult.ok) {
			switch (createFileUploadUrlResult.error.name) {
				case "DownstreamServiceError":
				case "InternalServerError":
				case "UnauthorizedError":
					return Result.error(createFileUploadUrlResult.error);
				case "InvalidArgumentError":
					return Result.error(
						new InvalidArgumentErrorV2(
							"Failed to create a file upload url",
							createFileUploadUrlResult.error,
						),
					);
			}
		}

		const createBookingTermsResult =
			await this.cabinRepository.createBookingTerms(ctx, {
				fileId: createFileUploadUrlResult.data.file.id,
			});
		if (!createBookingTermsResult.ok) {
			return createBookingTermsResult;
		}

		const { bookingTerms } = createBookingTermsResult.data;

		return {
			ok: true,
			data: { bookingTerms, uploadUrl: createFileUploadUrlResult.data.url },
		};
	}

	async getBookingTerms(
		ctx: Context,
		params?: { id?: string | null } | null,
	): ResultAsync<
		{ bookingTerms: BookingTerms },
		NotFoundError | InternalServerError
	> {
		const getBookingTermsResult = await this.cabinRepository.getBookingTerms(
			ctx,
			{
				id: params?.id ?? undefined,
			},
		);
		return getBookingTermsResult;
	}

	async findManyBookings(
		ctx: Context,
		params?: { bookingStatus?: BookingStatusType | null } | null,
	): ResultAsync<
		{ bookings: BookingType[]; total: number },
		PermissionDeniedError | UnauthorizedError | InternalServerError
	> {
		ctx.log.info({ params }, "find many bookings");
		if (!ctx.user) {
			return {
				ok: false,
				error: new UnauthorizedError(
					"You must be logged in to perform this action",
				),
			};
		}

		const hasPermission = await this.permissionService.hasFeaturePermission(
			ctx,
			{
				featurePermission: FeaturePermission.CABIN_ADMIN,
			},
		);

		if (!hasPermission) {
			ctx.log.warn({ params }, "permission denied");
			return Result.error(
				new PermissionDeniedError(
					"You do not have permission to view the bookings.",
				),
			);
		}

		const findManyBookingsResult = await this.cabinRepository.findManyBookings(
			ctx,
			{
				bookingStatus: params?.bookingStatus ?? undefined,
			},
		);
		if (!findManyBookingsResult.ok) {
			return Result.error(
				new InternalServerError(
					"Failed to find bookings",
					findManyBookingsResult.error,
				),
			);
		}

		return {
			ok: true,
			data: {
				bookings: findManyBookingsResult.data.bookings,
				total: findManyBookingsResult.data.total,
			},
		};
	}

	async createCabin(
		ctx: Context,
		params: {
			name: string;
			capacity: number;
			internalPrice: number;
			externalPrice: number;
			internalPriceWeekend: number;
			externalPriceWeekend: number;
		},
	): ResultAsync<
		{
			cabin: Cabin;
		},
		| PermissionDeniedError
		| UnauthorizedError
		| InvalidArgumentErrorV2
		| InternalServerError
	> {
		if (!ctx.user) {
			return {
				ok: false,
				error: new UnauthorizedError(
					"You must be logged in to perform this action",
				),
			};
		}

		const hasPermission = await this.permissionService.hasFeaturePermission(
			ctx,
			{
				featurePermission: FeaturePermission.CABIN_ADMIN,
			},
		);

		if (hasPermission !== true) {
			return {
				ok: false,
				error: new PermissionDeniedError(
					"You do not have permission to create a new cabin.",
				),
			};
		}

		const schema = z.object({
			name: z.string().min(1),
			capacity: z.number().min(0),
			internalPrice: z.number().min(0),
			externalPrice: z.number().min(0),
			internalPriceWeekend: z.number().min(0),
			externalPriceWeekend: z.number().min(0),
		});
		const parseResult = schema.safeParse(params);
		if (!parseResult.success) {
			return Result.error(
				new InvalidArgumentErrorV2("Invalid cabin data", {
					reason: parseResult.error.flatten().fieldErrors,
					cause: parseResult.error,
				}),
			);
		}

		const createCabinResult = await this.cabinRepository.createCabin(params);

		if (!createCabinResult.ok) {
			return Result.error(
				new InternalServerError(
					"Unexpected error occurred while creating cabin",
					createCabinResult.error,
				),
			);
		}

		return createCabinResult;
	}

	async updateCabin(
		ctx: Context,
		params: { id: string } & Partial<{
			name: string | null;
			capacity: number | null;
			internalPrice: number | null;
			externalPrice: number | null;
			internalPriceWeekend: number | null;
			externalPriceWeekend: number | null;
		}>,
	): ResultAsync<
		{ cabin: Cabin },
		| InternalServerError
		| InvalidArgumentErrorV2
		| UnauthorizedError
		| PermissionDeniedError
		| NotFoundError
	> {
		if (!ctx.user) {
			return Result.error(
				new UnauthorizedError("You must be logged in to perform this action"),
			);
		}
		const hasPermission = await this.permissionService.hasFeaturePermission(
			ctx,
			{
				featurePermission: FeaturePermission.CABIN_ADMIN,
			},
		);
		if (!hasPermission) {
			return Result.error(
				new PermissionDeniedError(
					"You do not have permission to update this cabin.",
				),
			);
		}

		ctx.log.info({ cabinId: params.id }, "updating cabin");
		const schema = z.object({
			id: z.string().uuid(),
			name: z
				.string()
				.min(1)
				.nullish()
				.transform((val) => val ?? undefined),
			capacity: z
				.number()
				.min(0)
				.nullish()
				.transform((val) => val ?? undefined),
			internalPrice: z
				.number()
				.min(0)
				.nullish()
				.transform((val) => val ?? undefined),
			externalPrice: z
				.number()
				.min(0)
				.nullish()
				.transform((val) => val ?? undefined),
			internalPriceWeekend: z
				.number()
				.min(0)
				.nullish()
				.transform((val) => val ?? undefined),
			externalPriceWeekend: z
				.number()
				.min(0)
				.nullish()
				.transform((val) => val ?? undefined),
		});
		const parseResult = schema.safeParse(params);
		if (!parseResult.success) {
			return Result.error(
				new InvalidArgumentErrorV2("Invalid cabin update data", {
					reason: parseResult.error.flatten().fieldErrors,
					cause: parseResult.error,
				}),
			);
		}

		const fieldsToUpdate = parseResult.data;
		const updateCabinResult = await this.cabinRepository.updateCabin(
			ctx,
			fieldsToUpdate,
		);

		if (!updateCabinResult.ok) {
			switch (updateCabinResult.error.name) {
				case "InternalServerError": {
					return Result.error(
						new InternalServerError(
							"An unknown error occurred",
							updateCabinResult.error,
						),
					);
				}
				case "NotFoundError": {
					ctx.log.info({ cabinId: params.id }, "cabin not found");
					return Result.error(
						new NotFoundError(
							"The cabin you tried to update does not exist",
							updateCabinResult.error,
						),
					);
				}
			}
		}

		ctx.log.info({ cabinId: params.id }, "cabin updated");
		return updateCabinResult;
	}

	async newBooking(
		ctx: Context,
		params: NewBookingParams,
	): ResultAsync<
		{
			booking: BookingType;
		},
		InvalidArgumentErrorV2 | InternalServerError
	> {
		const cabins = await Promise.all(
			params.cabins.map((cabin) => this.cabinRepository.getCabinById(cabin.id)),
		);

		const getValidBookingIntervalsResult = await this.getValidBookingIntervals(
			ctx,
			{
				cabins,
				minimumBookingDurationDays: 2,
			},
		);
		if (!getValidBookingIntervalsResult.ok) {
			return getValidBookingIntervalsResult;
		}
		const { validBookingIntervals } = getValidBookingIntervalsResult.data;

		const validateResult = this.validateBooking(ctx, {
			validBookingIntervals,
			cabins,
			data: params,
		});
		if (!validateResult.ok) {
			return validateResult;
		}
		const { validated: validatedData } = validateResult.data;
		const {
			startDate,
			endDate,
			internalParticipantsCount,
			externalParticipantsCount,
		} = validatedData;
		const totalCostResult = await this.totalCost(ctx, {
			cabins: params.cabins,
			startDate,
			endDate,
			guests: {
				internal: internalParticipantsCount,
				external: externalParticipantsCount,
			},
		});
		if (!totalCostResult.ok) {
			switch (totalCostResult.error.name) {
				case "NotFoundError": {
					return Result.error(
						new InvalidArgumentErrorV2(
							"The cabin you tried to book does not exist",
							{
								reason: {
									cabins: ["The cabin you tried to book does not exist"],
								},
								cause: totalCostResult.error,
							},
						),
					);
				}
				case "InvalidArgumentError": {
					return Result.error(
						new InvalidArgumentErrorV2(
							"Failed to calculate the total cost of the booking",
							{
								cause: totalCostResult.error,
							},
						),
					);
				}
				case "InternalServerError": {
					return Result.error(
						new InternalServerError(
							"An unknown error occurred when calculating the total cost of the booking",
							totalCostResult.error,
						),
					);
				}
			}
		}

		const newBooking = new Booking(
			new Booking({
				...validatedData,
				createdAt: new Date(),
				totalCost: totalCostResult.data.totalCost,
				status: "PENDING",
				id: randomUUID(),
				feedback: "",
			}),
		);

		const createBookingResult =
			await this.cabinRepository.createBooking(newBooking);
		if (!createBookingResult.ok) {
			switch (createBookingResult.error.name) {
				case "NotFoundError":
					return Result.error(
						new InvalidArgumentErrorV2(
							"The cabin you tried to book does not exist",
							{
								cause: createBookingResult.error,
							},
						),
					);
				case "InternalServerError":
					return Result.error(
						new InternalServerError(
							"An unknown error occurred",
							createBookingResult.error,
						),
					);
			}
		}
		const { booking } = createBookingResult.data;
		await this.sendBookingConfirmation(booking);
		return Result.success({ booking });
	}

	getCabinByBookingId(bookingId: string): Promise<Cabin> {
		return this.cabinRepository.getCabinByBookingId(bookingId);
	}

	getCabin(id: string): Promise<Cabin> {
		return this.cabinRepository.getCabinById(id);
	}

	private validateBooking(
		ctx: Context,
		params: {
			data: NewBookingParams;
			validBookingIntervals: Interval[];
			cabins: Cabin[];
		},
	): TResult<
		{
			validated: Omit<
				BookingType,
				"id" | "status" | "totalCost" | "createdAt" | "feedback"
			>;
		},
		InvalidArgumentErrorV2
	> {
		const { validBookingIntervals } = params;

		const bookingSchema = z
			.object({
				firstName: z.string().min(1, "first name must be at least 1 character"),
				lastName: z.string().min(1, "last name must be at least 1 character"),
				startDate: z
					.date()
					.min(new Date(), { message: "start date must be in the future" })
					.transform((date) =>
						DateTime.fromJSDate(date).startOf("day").toJSDate(),
					),
				endDate: z
					.date()
					.min(new Date(), { message: "end date must be in the future" })
					.transform((date) =>
						DateTime.fromJSDate(date).endOf("day").toJSDate(),
					),
				email: z.string().email({ message: "invalid email" }),
				phoneNumber: z.string().regex(/^(0047|\+47|47)?\d{8}$/, {
					message: "invalid phone number",
				}),
				cabins: z
					.array(
						z.object({ id: z.string().uuid({ message: "invalid cabin id" }) }),
					)
					.min(1, "at least one cabin must be booked"),
				internalParticipantsCount: z
					.number()
					.min(0, "internal participants must be at least 0"),
				externalParticipantsCount: z
					.number()
					.min(0, "external participants must be at least 0"),
				questions: z
					.string()
					.nullish()
					.transform((val) => val ?? ""),
			})
			.refine(
				(obj) => {
					const checkIn = DateTime.fromJSDate(obj.startDate);
					const checkOut = DateTime.fromJSDate(obj.endDate);
					const interval = Interval.fromDateTimes(checkIn, checkOut);
					return this.isIntervalGteMinimumDays(ctx, {
						interval,
						minimumBookingDurationDays: 2,
					});
				},
				{
					message: "the booking must be at least 1 day long",
					path: ["startDate", "endDate"],
				},
			)
			.refine(
				(booking) => {
					const isAvailableForCheckIn = this.isDateBookable(ctx, {
						date: DateTime.fromJSDate(booking.startDate),
						validBookingIntervals,
					});
					return isAvailableForCheckIn;
				},
				{
					message: "cabin is not available for check-in at the selected date",
					path: ["startDate"],
				},
			)
			.refine(
				(booking) => {
					const isAvailableForCheckOut = this.isDateBookable(ctx, {
						validBookingIntervals,
						date: DateTime.fromJSDate(booking.endDate),
					});
					return isAvailableForCheckOut;
				},
				{
					message: "cabin is not available for check-out at the selected date",
					path: ["endDate"],
				},
			)
			.refine(
				(booking) => {
					const checkIn = DateTime.fromJSDate(booking.startDate);
					const checkOut = DateTime.fromJSDate(booking.endDate);
					const isBookingIntervalAvailable = this.isBookingIntervalAvailable(
						ctx,
						{
							validBookingIntervals,
							checkIn,
							checkOut,
						},
					);
					return isBookingIntervalAvailable;
				},
				{
					message: "selected cabins are not available for the selected dates",
					path: ["startDate"],
				},
			)
			.refine(
				(obj) => {
					const maximumParticipants = sumBy(params.cabins, "capacity");
					const totalParticipants =
						obj.internalParticipantsCount + obj.externalParticipantsCount;
					return totalParticipants <= maximumParticipants;
				},
				{
					message: "too many participants for the selected cabins",
					path: ["internalParticipantsCount", "externalParticipantsCount"],
				},
			);
		const parseResult = bookingSchema.safeParse(params.data);
		if (!parseResult.success) {
			return Result.error(
				new InvalidArgumentErrorV2("invalid booking data", {
					reason: parseResult.error.flatten().fieldErrors,
					cause: parseResult.error,
				}),
			);
		}
		return Result.success({ validated: parseResult.data });
	}

	private async sendBookingConfirmation(booking: BookingType) {
		await this.mailService.sendAsync({
			type: "cabin-booking-receipt",
			bookingId: booking.id,
		});
	}

	/**
	 * updateBookingStatus updates the status of a booking. Requires MEMBER role and CABIN_ADMIN permission.
	 *
	 * @throws {PermissionDeniedError} if the user does not have permission to update the booking
	 * @throws {InvalidArgumentError} if the new status is CONFIRMED and the booking overlaps with another booking
	 * @param userId - The id of the user performing the update
	 * @param id - The id of the booking to update
	 * @param status - The new status of the booking
	 * @returns The updated booking
	 */
	async updateBookingStatus(
		ctx: Context,
		params: {
			bookingId: string;
			status: BookingStatusType;
			feedback?: string | null;
		},
	): ResultAsync<
		{ booking: BookingType },
		| InternalServerError
		| NotFoundError
		| InvalidArgumentError
		| PermissionDeniedError
		| UnauthorizedError
	> {
		const { bookingId: id, status, feedback } = params;
		if (!ctx.user) {
			return {
				ok: false,
				error: new UnauthorizedError(
					"You must be logged in to perform this action",
				),
			};
		}

		const hasPermission = await this.permissionService.hasFeaturePermission(
			ctx,
			{
				featurePermission: FeaturePermission.CABIN_ADMIN,
			},
		);

		if (!hasPermission)
			return {
				ok: false,
				error: new PermissionDeniedError(
					"You do not have permission to update this booking.",
				),
			};

		if (status === BookingStatus.CONFIRMED) {
			const getBookingResult = await this.cabinRepository.getBookingById(id);
			if (!getBookingResult.ok) {
				return getBookingResult;
			}
			const { booking } = getBookingResult.data;

			const getValidBookingIntervalsResult =
				await this.getValidBookingIntervals(ctx, {
					cabins: booking.cabins,
					minimumBookingDurationDays: 2,
				});
			if (!getValidBookingIntervalsResult.ok) {
				return getValidBookingIntervalsResult;
			}
			const { validBookingIntervals } = getValidBookingIntervalsResult.data;

			const isAvailableForBooking = this.isBookingIntervalAvailable(ctx, {
				validBookingIntervals,
				checkIn: DateTime.fromJSDate(booking.startDate),
				checkOut: DateTime.fromJSDate(booking.endDate),
			});

			if (!isAvailableForBooking) {
				return {
					ok: false,
					error: new InvalidArgumentError(
						"this booking overlaps with another confirmed booking",
					),
				};
			}
		}
		return this.cabinRepository.updateBooking(id, {
			status,
			feedback: feedback ?? undefined,
		});
	}

	/**
	 * findManyCabins returns all cabins.
	 */
	findManyCabins(): Promise<Cabin[]> {
		return this.cabinRepository.findManyCabins();
	}

	/**
	 * updateBookingSemester updates a booking semester. If a booking semester does not already
	 * exist for the given semester, a new one will be created, with `startAt` default to the
	 * first day of the semester and `endAt` default to the last day of the semester.
	 *
	 * @requires a membership in an organization with the CABIN_ADMIN feature permission.
	 *
	 * @param userId - The id of the user performing the update
	 * @param data - The new booking semester data
	 * @returns The updated booking semester
	 */
	async updateBookingSemester(
		ctx: Context,
		data: {
			semester: BookingSemesterEnumType;
			startAt?: Date | null;
			endAt?: Date | null;
			bookingsEnabled?: boolean | null;
		},
	): Promise<BookingSemester> {
		const hasPermission = await this.permissionService.hasFeaturePermission(
			ctx,
			{
				featurePermission: FeaturePermission.CABIN_ADMIN,
			},
		);

		if (!hasPermission)
			throw new PermissionDeniedError(
				"You do not have permission to update the booking semester.",
			);

		const schema = z.object({
			semester: z.nativeEnum(BookingSemesterEnum),
			startAt: z
				.date()
				.nullish()
				.transform((val) => val ?? undefined)
				.transform((val) => {
					if (val) {
						return DateTime.fromJSDate(val).startOf("day").toJSDate();
					}
					return val;
				}),
			endAt: z
				.date()
				.nullish()
				.transform((val) => val ?? undefined)
				.transform((val) => {
					if (val) {
						return DateTime.fromJSDate(val).endOf("day").toJSDate();
					}
					return val;
				}),
			bookingsEnabled: z
				.boolean()
				.nullish()
				.transform((val) => val ?? undefined),
		});
		try {
			const { semester, startAt, endAt, bookingsEnabled } = schema.parse(data);

			return await this.cabinRepository.updateBookingSemester({
				semester,
				startAt,
				endAt,
				bookingsEnabled,
			});
		} catch (err) {
			if (err instanceof z.ZodError) {
				throw new InvalidArgumentError(err.message);
			}
			if (err instanceof NotFoundError) {
				/**
				 * If the booking semester does not exist, create it.
				 */
				return this.createBookingSemester(data);
			}
			throw err;
		}
	}

	/**
	 * createBookingSemester creates a new booking semester. If `startAt` or `endAt` is not provided, they will default to
	 * the first and last day of the semester respectively. If `bookingEnabled` is not provided, it will default to `false`.
	 */
	private async createBookingSemester(data: {
		semester: BookingSemesterEnumType;
		startAt?: Date | null;
		endAt?: Date | null;
		bookingsEnabled?: boolean | null;
	}): Promise<BookingSemester> {
		try {
			const schema = z.object({
				semester: z.nativeEnum(BookingSemesterEnum),
				startAt: z
					.date()
					.default(
						DateTime.fromObject({
							month: data.semester === "SPRING" ? 1 : 8,
							day: 1,
						}).toJSDate(),
					)
					.transform((date) =>
						DateTime.fromJSDate(date).startOf("day").toJSDate(),
					),
				endAt: z
					.date()
					.default(
						DateTime.fromObject({
							month: data.semester === "SPRING" ? 7 : 12,
							day: 31,
						}).toJSDate(),
					)
					.transform((date) =>
						DateTime.fromJSDate(date).endOf("day").toJSDate(),
					),
				bookingsEnabled: z.boolean().default(false),
			});

			const { semester, startAt, endAt, bookingsEnabled } = schema.parse(data);

			return await this.cabinRepository.createBookingSemester({
				semester,
				startAt: startAt,
				endAt: endAt,
				bookingsEnabled,
			});
		} catch (err) {
			if (err instanceof z.ZodError) {
				throw new InvalidArgumentError(err.message);
			}
			throw err;
		}
	}

	private async getBookingSemesters(): ResultAsync<
		{ semesters: BookingSemester[] },
		InternalServerError
	> {
		try {
			const semesters = await Promise.all([
				this.getBookingSemester("SPRING"),
				this.getBookingSemester("FALL"),
			]);
			return {
				ok: true,
				data: {
					semesters: compact(semesters),
				},
			};
		} catch (err) {
			return {
				ok: false,
				error: new InternalServerError(
					"An unknown error occurred when fetching booking semesters",
					err,
				),
			};
		}
	}

	private isIntervalGteMinimumDays(
		_ctx: Context,
		params: {
			interval: Interval;
			minimumBookingDurationDays: number;
		},
	): boolean {
		const { interval, minimumBookingDurationDays } = params;
		return interval.count("days") >= minimumBookingDurationDays;
	}

	/**
	 * getBookingSemester returns the booking semester for the given semester, or null if it does not exist.
	 */
	getBookingSemester(
		semester: BookingSemesterEnumType,
	): Promise<BookingSemester | null> {
		return this.cabinRepository.getBookingSemester(semester);
	}

	/**
	 * updateBookingContact updates the booking contact information.
	 *
	 * @throws {PermissionDeniedError} if the user does not have permission to update the booking contact
	 * @throws {InvalidArgumentError} if the new booking contact data is invalid
	 * @param userId - The id of the user performing the update
	 * @param data - The new booking contact data
	 *
	 */
	async updateBookingContact(
		ctx: Context,
		data: Partial<{
			name: string | null;
			email: string | null;
			phoneNumber: string | null;
		}>,
	): Promise<BookingContact> {
		const hasPermission = await this.permissionService.hasFeaturePermission(
			ctx,
			{
				featurePermission: FeaturePermission.CABIN_ADMIN,
			},
		);

		if (!hasPermission)
			throw new PermissionDeniedError(
				"You do not have permission to update the booking contact.",
			);

		const schema = z.object({
			name: z
				.string()
				.nullish()
				.transform((val) => val ?? undefined),
			email: z
				.string()
				.email()
				.nullish()
				.transform((val) => val ?? undefined),
			phoneNumber: z
				.string()
				.regex(/^(0047|\+47|47)?\d{8}$/, {
					message: "invalid phone number",
				})
				.nullish()
				.transform((val) => val ?? undefined),
		});

		try {
			const { name, email, phoneNumber } = schema.parse(data);

			return await this.cabinRepository.updateBookingContact({
				name,
				email,
				phoneNumber,
			});
		} catch (err) {
			if (err instanceof z.ZodError) {
				throw new InvalidArgumentError(err.message);
			}
			throw err;
		}
	}

	/**
	 * getBookingContact returns the booking contact information.
	 */
	async getBookingContact(): Promise<BookingContact> {
		return await this.cabinRepository.getBookingContact();
	}

	async getBooking(
		ctx: Context,
		by: { id: string },
	): ResultAsync<{ booking: Booking }, InternalServerError | NotFoundError> {
		ctx.log.info({ bookingId: by.id }, "get booking");
		const getBookingResult = await this.cabinRepository.getBookingById(by.id);
		return getBookingResult;
	}

	async getBookingByIdAndEmail(
		ctx: Context,
		by: { id: string; email: string },
	): ResultAsync<{ booking: Booking }, InternalServerError | NotFoundError> {
		ctx.log.info({ bookingId: by.id }, "get booking by id and email");
		const getBookingResult = await this.cabinRepository.getBookingById(by.id);
		if (!getBookingResult.ok) {
			return getBookingResult;
		}
		const { booking } = getBookingResult.data;
		if (booking.email !== by.email) {
			ctx.log.warn(
				{ bookingId: by.id },
				"booking does not match the email provided",
			);
			return {
				ok: false,
				error: new NotFoundError("Booking not found"),
			};
		}
		return getBookingResult;
	}

	/**
	 * Sunday to Thursday use internalPrice/externalPrice
	 * Friday and Saturday use internalPriceWeekend/externalPriceWeekend
	 *
	 * If there are more internal participants than external, use internal price, else use external price
	 */
	async totalCost(
		ctx: Context,
		data: {
			startDate: Date;
			endDate: Date;
			guests: {
				internal: number;
				external: number;
			};
			cabins: { id: string }[];
		},
	): ResultAsync<
		{ totalCost: number },
		InternalServerError | NotFoundError | InvalidArgumentError
	> {
		const { startDate, endDate, guests } = data;
		const cabins = await Promise.all(
			data.cabins.map((cabin) => this.cabinRepository.getCabinById(cabin.id)),
		);

		const interval = DateTime.fromJSDate(startDate).until(
			DateTime.fromJSDate(endDate),
		);
		let totalCost = 0;
		if (interval.isValid) {
			for (const day of interval.splitBy({ days: 1 })) {
				const date = day.start;
				if (date) {
					const getPriceResult = this.getPrice(ctx, {
						cabins,
						date,
						guests,
					});
					if (!getPriceResult.ok) {
						return getPriceResult;
					}
					totalCost += getPriceResult.data.price;
				}
			}
		} else {
			return {
				ok: false,
				error: new InvalidArgumentError("Invalid date interval"),
			};
		}
		return { ok: true, data: { totalCost } };
	}

	/**
	 * getAvailabilityCalendar returns `count` months from `month` and `year` for the given cabins and guests,
	 * with the availability and pricing of each day in each month. The result of this method is intended to be
	 * used to display a calendar of availability and pricing for the given cabins and guests.
	 */
	async getAvailabilityCalendar(
		ctx: Context,
		params: {
			month: number;
			year: number;
			count: number;
			cabins: { id: string }[];
			guests: {
				internal: number;
				external: number;
			};
		},
	): ResultAsync<
		{
			calendarMonths: CalendarMonth[];
		},
		InternalServerError
	> {
		const cabins = await Promise.all(
			params.cabins.map((cabin) => this.cabinRepository.getCabinById(cabin.id)),
		);

		const getValidBookingIntervalsResult = await this.getValidBookingIntervals(
			ctx,
			{
				cabins,
				minimumBookingDurationDays: 2,
			},
		);
		if (!getValidBookingIntervalsResult.ok) {
			return getValidBookingIntervalsResult;
		}
		const { validBookingIntervals, occupiedDateIntervals } =
			getValidBookingIntervalsResult.data;

		const getCalendarMonthsResult = this.getCalendarMonths(ctx, params);
		if (!getCalendarMonthsResult.ok) {
			return getCalendarMonthsResult;
		}
		const { months: calendarMonths } = getCalendarMonthsResult.data;

		for (const calendarMonth of calendarMonths) {
			const getAvailabilityForMonthResult = this.getAvailabilityForMonth(ctx, {
				calendarMonth,
				validBookingIntervals,
				occupiedDateIntervals,
				cabins,
				guests: params.guests,
			});
			if (!getAvailabilityForMonthResult.ok) {
				return getAvailabilityForMonthResult;
			}
		}
		return Result.success({ calendarMonths });
	}

	private isInternalPrice(
		_ctx: Context,
		params: { guests: { internal: number; external: number } },
	): boolean {
		return params.guests.internal >= params.guests.external;
	}

	private isOnlyAvailableForCheckIn(
		_ctx: Context,
		params: {
			date: DateTime;
			validBookingIntervals: Interval[];
		},
	): boolean {
		const { date, validBookingIntervals } = params;

		const isAvailableForCheckIn = validBookingIntervals.some((interval) => {
			const { start } = interval;
			if (!start) return false;
			// Luxon intervals are half-open, so the result of running difference on intervals is that the
			// end date of the interval is exactly the start time of the unavailable day.
			return +start === +date;
		});
		return isAvailableForCheckIn;
	}

	/**
	 * isOnlyAvailableForCheckOut returns true if the given date is available for check-out, otherwise false.
	 *
	 * Being available for check out means that the date is preceded by at least one day where bookings are enabled,
	 * and the date is not occupied by any other booking.
	 */
	private isOnlyAvailableForCheckOut(
		_ctx: Context,
		params: {
			date: DateTime;
			validBookingIntervals: Interval[];
		},
	): boolean {
		const { date, validBookingIntervals } = params;
		const nextDay = date.plus({ days: 1 }).startOf("day");
		const isAvailableForCheckOut = validBookingIntervals.some((interval) => {
			const { end } = interval;
			if (!end) return false;
			// Luxon intervals are half-open, so the result of running difference on intervals is that the
			// end date of the interval is exactly the start time of the unavailable day.
			return +end === +nextDay;
		});
		return isAvailableForCheckOut;
	}

	/**
	 * isDateBookable is true if the date is today or in the future, and is within a bookable date interval.
	 */
	private isDateBookable(
		_ctx: Context,
		params: { date: DateTime; validBookingIntervals: Interval[] },
	): boolean {
		const { date, validBookingIntervals } = params;
		return validBookingIntervals.some((interval) => interval.contains(date));
	}

	/**
	 * isDateAvailable returns true if the date is not occupied by any other booking, otherwise false.
	 */
	private isDateAvailable(
		_ctx: Context,
		params: { date: DateTime; occupiedDateIntervals: Interval[] },
	): boolean {
		const { date, occupiedDateIntervals } = params;
		return occupiedDateIntervals.every((interval) => !interval.contains(date));
	}

	private isBookingIntervalAvailable(
		_ctx: Context,
		params: {
			checkIn: DateTime;
			checkOut: DateTime;
			validBookingIntervals: Interval[];
		},
	): boolean {
		const { checkIn, checkOut, validBookingIntervals } = params;
		const bookingInterval = Interval.fromDateTimes(checkIn, checkOut);
		// the interval has to be available for the entire duration, there can be no overlap with occupied intervals
		return validBookingIntervals.some((interval) =>
			interval.engulfs(bookingInterval),
		);
	}

	private getAvailabilityForMonth(
		ctx: Context,
		params: {
			calendarMonth: CalendarMonth;
			validBookingIntervals: Interval[];
			occupiedDateIntervals: Interval[];
			guests: {
				internal: number;
				external: number;
			};
			cabins: Cabin[];
		},
	): TResult<{ calendarMonth: CalendarMonth }, InternalServerError> {
		const {
			calendarMonth,
			validBookingIntervals,
			occupiedDateIntervals,
			guests,
		} = params;
		for (const calendarDay of calendarMonth.days) {
			const isBookable = this.isDateBookable(ctx, {
				date: calendarDay.calendarDate,
				validBookingIntervals: validBookingIntervals,
			});

			const availableForCheckIn = this.isOnlyAvailableForCheckIn(ctx, {
				date: calendarDay.calendarDate,
				validBookingIntervals,
			});

			const availableForCheckOut = this.isOnlyAvailableForCheckOut(ctx, {
				date: calendarDay.calendarDate,
				validBookingIntervals,
			});
			const price = this.getPrice(ctx, {
				date: calendarDay.calendarDate,
				guests,
				cabins: params.cabins,
			});
			if (!price.ok) {
				return price;
			}

			calendarDay.price = price.data.price;
			calendarDay.available = this.isDateAvailable(ctx, {
				date: calendarDay.calendarDate,
				occupiedDateIntervals,
			});
			calendarDay.bookable = isBookable;
			calendarDay.availableForCheckIn = availableForCheckIn;
			calendarDay.availableForCheckOut = availableForCheckOut;
		}
		return {
			ok: true,
			data: { calendarMonth: calendarMonth },
		};
	}

	/**
	 * getValidBookingIntervals returns a list of intervals where bookings are allowed, i.e.
	 * intervals where there are bookable dates and no occupied dates. The intervals are half-open,
	 * meaning that the end date of the interval is the start date of the next interval. Thus,
	 * the interval [start, end) is the same as the interval [start, end-1]. As a result,
	 * the intervals that are derived from bookings, booking semesters, etc. are all adjusted
	 * to have their end date be the start date of the next day. This is to make it easier to
	 * find the valid intervals.
	 */
	private async getValidBookingIntervals(
		ctx: Context,
		params: {
			cabins: { id: string }[];
			minimumBookingDurationDays: number;
		},
	): ResultAsync<
		{ validBookingIntervals: Interval[]; occupiedDateIntervals: Interval[] },
		InternalServerError
	> {
		const { cabins, minimumBookingDurationDays } = params;
		const occupiedDateIntervalsResult = await this.getOccupiedDateIntervals(
			ctx,
			{ cabins },
		);
		const bookingSemesters = await this.getBookingSemesters();
		if (!bookingSemesters.ok) {
			return bookingSemesters;
		}
		const bookableDateIntervalsResult = this.getBookableDateIntervals(ctx, {
			bookingSemesters: bookingSemesters.data.semesters,
		});
		if (!occupiedDateIntervalsResult.ok) {
			return occupiedDateIntervalsResult;
		}
		if (!bookableDateIntervalsResult.ok) {
			return bookableDateIntervalsResult;
		}
		const { validBookingIntervals } = this.createValidBookingIntervals(ctx, {
			occupiedDateIntervals: occupiedDateIntervalsResult.data.intervals,
			bookableDateIntervals: bookableDateIntervalsResult.data.intervals,
			minimumBookingDurationDays,
		});
		return {
			ok: true,
			data: {
				validBookingIntervals,
				occupiedDateIntervals: occupiedDateIntervalsResult.data.intervals,
			},
		};
	}

	/**
	 * A valid booking interval is any interval which is at least minimumBookingDuration long, is engulfed by a bookable date interval, and does not overlap with any occupied date intervals.
	 */
	private createValidBookingIntervals(
		ctx: Context,
		params: {
			occupiedDateIntervals: Interval[];
			bookableDateIntervals: Interval[];
			minimumBookingDurationDays: number;
		},
	): { validBookingIntervals: Interval[] } {
		const {
			occupiedDateIntervals,
			bookableDateIntervals,
			minimumBookingDurationDays,
		} = params;
		const validBookingIntervals: Interval[] = [];
		for (const bookableDateInterval of bookableDateIntervals) {
			const potentiallyValidBookingIntervals = bookableDateInterval.difference(
				...occupiedDateIntervals,
			);
			for (const potentiallyValidBookingInterval of potentiallyValidBookingIntervals) {
				if (
					potentiallyValidBookingInterval.isValid &&
					this.isIntervalGteMinimumDays(ctx, {
						interval: potentiallyValidBookingInterval,
						minimumBookingDurationDays,
					})
				) {
					validBookingIntervals.push(potentiallyValidBookingInterval);
				}
			}
		}

		return { validBookingIntervals };
	}

	/**
	 * utility for generating a range of months with their days.
	 */
	private getCalendarMonths(
		_ctx: Context,
		params: { month: number; year: number; count: number },
	): TResult<{ months: CalendarMonth[] }, InternalServerError> {
		const { month, year, count } = params;
		const calendarMonths: CalendarMonth[] = [];
		for (const offset of range(0, count)) {
			const start = DateTime.fromObject({ month, year })
				.startOf("month")
				.plus({ months: offset });
			const end = start.endOf("month");
			const interval = Interval.fromDateTimes(start, end).splitBy({ days: 1 });
			const daysInMonth = interval.map((interval) => interval.start);
			if (!areDaysValid(daysInMonth)) {
				return {
					ok: false,
					error: new InternalServerError("Failed to generate calendar"),
				};
			}
			const calendarDays: CalendarDay[] = [];
			for (const day of daysInMonth) {
				calendarDays.push({
					calendarDate: day,
					available: false,
					bookable: false,
					price: 0,
					availableForCheckIn: false,
					availableForCheckOut: false,
				});
			}
			const calendarMonth: CalendarMonth = {
				month: start.get("month"),
				year: start.get("year"),
				days: calendarDays,
			};
			calendarMonths.push(calendarMonth);
		}

		return {
			ok: true,
			data: { months: calendarMonths },
		};
	}

	private getBookableDateIntervals(
		_ctx: Context,
		params: {
			bookingSemesters: BookingSemester[];
		},
	): TResult<{ intervals: Interval[] }, InternalServerError> {
		const { bookingSemesters } = params;
		const intervals: Interval[] = [];

		for (const bookingSemester of bookingSemesters) {
			if (bookingSemester.bookingsEnabled) {
				const startOfDayTomorrow = DateTime.now()
					.startOf("day")
					.plus({ days: 1 });
				/**
				 * We require bookings to be in the future, meaning you cannot book a cabin for today, regardless
				 * of the time of day. As such, the bookable date interval starts no earlier than tomorrow.
				 */
				const startAt = DateTime.max(
					DateTime.fromJSDate(bookingSemester.startAt).startOf("day"),
					startOfDayTomorrow,
				);
				const endAt = DateTime.fromJSDate(bookingSemester.endAt).endOf("day");
				const interval = Interval.fromDateTimes(startAt, endAt);
				// Invalid intervals can occur if endAt < now
				if (interval.isValid) {
					intervals.push(interval);
				}
			}
		}

		const mergedIntervals = Interval.merge(intervals);
		/**
		 * Offset endAt by 1 day (startOf) to account for the fact that intervals are half-open,
		 * and we want to include the end date in the interval.
		 * We offset after merging to avoid merging intervals that are not actually overlapping.
		 */
		const intervalsOffsetByOneDay = mergedIntervals.map((interval) => {
			const previousEnd = interval.end;
			return interval.set({
				end: previousEnd?.plus({ days: 1 }).startOf("day"),
			});
		});

		return {
			ok: true,
			data: { intervals: intervalsOffsetByOneDay },
		};
	}

	private async getOccupiedDateIntervals(
		ctx: Context,
		params: { cabins: { id: string }[] },
	): ResultAsync<{ intervals: Interval[] }, InternalServerError> {
		const { cabins } = params;
		const intervals: Interval[] = [];

		for (const cabin of cabins) {
			const bookings = await this.cabinRepository.findManyBookings(ctx, {
				cabinId: cabin.id,
				bookingStatus: "CONFIRMED",
			});
			if (!bookings.ok) {
				return {
					ok: false,
					error: new InternalServerError("Failed to get occupied dates"),
				};
			}
			for (const booking of bookings.data.bookings) {
				const startAt = DateTime.fromJSDate(booking.startDate).startOf("day");
				/**
				 * Offset endAt by 1 day (startOf) to account for the fact that intervals are half-open,
				 * and we want to include the end date in the interval.
				 */
				const endAt = DateTime.fromJSDate(booking.endDate)
					.plus({ days: 1 })
					.startOf("day");
				intervals.push(Interval.fromDateTimes(startAt, endAt));
			}
		}
		return {
			ok: true,
			data: { intervals },
		};
	}

	private getPrice(
		ctx: Context,
		params: {
			cabins: Cabin[];
			guests: { internal: number; external: number };
			date: DateTime;
		},
	): TResult<{ price: number }, InternalServerError> {
		const { guests, cabins } = params;

		if (cabins.length === 0) {
			return {
				ok: true,
				data: {
					price: 0,
				},
			};
		}

		const internalPriceWeekday = sumBy(cabins, "internalPrice");
		const internalPriceWeekend = sumBy(cabins, "internalPriceWeekend");
		const externalPriceWeekday = sumBy(cabins, "externalPrice");
		const externalPriceWeekend = sumBy(cabins, "externalPriceWeekend");

		const isWeekendNight =
			params.date.weekday === 5 || params.date.weekday === 6;

		const isInternalPrice = this.isInternalPrice(ctx, { guests });
		let price: number | undefined = undefined;
		if (isInternalPrice && isWeekendNight) {
			price = internalPriceWeekend;
		} else if (isInternalPrice && !isWeekendNight) {
			price = internalPriceWeekday;
		} else if (isWeekendNight) {
			price = externalPriceWeekend;
		} else {
			price = externalPriceWeekday;
		}
		return {
			ok: true,
			data: {
				price,
			},
		};
	}
}

function areDaysValid(days: (DateTime | null)[]): days is DateTime[] {
	return days.every((day) => day !== null);
}
