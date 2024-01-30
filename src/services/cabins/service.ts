import {
	type Booking,
	type BookingContact as PrismaBookingContact,
	type BookingSemester,
	type Cabin,
	FeaturePermission,
	Semester,
} from "@prisma/client";
import { DateTime } from "luxon";
import { z } from "zod";
import { BookingStatus } from "~/domain/cabins.js";
import {
	InternalServerError,
	InvalidArgumentError,
	KnownDomainError,
	NotFoundError,
	PermissionDeniedError,
} from "~/domain/errors.js";
import type { ResultAsync } from "~/lib/result.js";
import type { EmailQueueDataType } from "../mail/worker.js";

export interface BookingData {
	email: string;
	firstName: string;
	lastName: string;
	startDate: Date;
	endDate: Date;
	phoneNumber: string;
	cabinId: string;
}

type BookingContact = Pick<
	PrismaBookingContact,
	"email" | "name" | "phoneNumber" | "id"
>;

export interface CabinRepository {
	getCabinById(id: string): Promise<Cabin>;
	createBooking(data: BookingData): Promise<Booking>;
	updateBooking(id: string, data: Partial<Booking>): Promise<Booking>;
	getBookingById(id: string): Promise<Booking>;
	getOverlappingBookings(data: {
		bookingId: string;
		startDate: Date;
		endDate: Date;
		status: BookingStatus;
	}): Promise<Booking[]>;
	getCabinByBookingId(bookingId: string): Promise<Cabin>;
	findManyCabins(): Promise<Cabin[]>;
	updateBookingSemester(data: {
		semester: Semester;
		startAt?: Date;
		endAt?: Date;
		bookingsEnabled?: boolean;
	}): Promise<BookingSemester>;
	createBookingSemester(data: {
		semester: Semester;
		startAt: Date;
		endAt: Date;
		bookingsEnabled?: boolean;
	}): Promise<BookingSemester>;
	getBookingSemester(semester: Semester): Promise<BookingSemester | null>;
	getBookingContact(): Promise<BookingContact>;
	updateBookingContact(
		data: Partial<{
			name: string | null;
			phoneNumber: string | null;
			email?: string | null;
		}>,
	): Promise<BookingContact>;
}

export interface PermissionService {
	hasFeaturePermission(data: {
		userId: string;
		featurePermission: FeaturePermission;
	}): Promise<boolean>;
}

export interface MailService {
	sendAsync(jobData: EmailQueueDataType): Promise<void>;
}

export class CabinService {
	constructor(
		private cabinRepository: CabinRepository,
		private mailService: MailService,
		private permissionService: PermissionService,
	) {}

	getCabinByBookingId(bookingId: string): Promise<Cabin> {
		return this.cabinRepository.getCabinByBookingId(bookingId);
	}

	getCabin(id: string): Promise<Cabin> {
		return this.cabinRepository.getCabinById(id);
	}

	/**
	 * isInActiveBookingSemester returns true if the booking is in the given booking semester, and bookings are enabled.
	 * @param data.startDate - The start date of the booking
	 * @param data.endDate - The end date of the booking
	 * @param bookingSemester - The booking semester to check against
	 * @returns true if the booking is in the given booking semester, and bookings are enabled, false otherwise
	 */
	private isInActiveBookingSemester(
		data: { startDate: Date; endDate: Date },
		bookingSemester: BookingSemester | null,
	) {
		if (bookingSemester === null) return false;
		if (!bookingSemester.bookingsEnabled) return false;
		return (
			data.startDate >= bookingSemester.startAt &&
			data.endDate <= bookingSemester.endAt
		);
	}

	/**
	 * isCrossSemesterBooking returns true if the booking is a valid cross-semester booking, i.e.
	 * the booking starts in one semester, and ends in the other. Requires that both semeters have bookings enabled,
	 * and that the end of one semester overlaps with the start of the other. That is, if the start of the next semester
	 * is not before, or the day after the end of the previous semester, there can be no valid cross-semester bookings.
	 * @param data.startDate - The start date of the booking
	 * @param data.endDate - The end date of the booking
	 * @param bookingSemesters.fall - The fall booking semester
	 * @param bookingSemesters.spring - The spring booking semester
	 * @returns true if the booking is a valid cross-semester booking, false otherwise
	 */
	private isCrossSemesterBooking(
		data: { startDate: Date; endDate: Date },
		bookingSemesters: {
			fall: BookingSemester | null;
			spring: BookingSemester | null;
		},
	) {
		const { fall, spring } = bookingSemesters;
		// If one of the booking semeters are disabled, there can be no valid cross-semester bookings.
		if (!fall?.bookingsEnabled || !spring?.bookingsEnabled) return false;

		const endOfAutumnOverlapsWithStartOfSpring =
			DateTime.fromJSDate(fall.endAt).plus({ days: 1 }).startOf("day") >=
			DateTime.fromJSDate(spring.startAt).startOf("day");

		const endOfSpringOverlapsWithStartOfAutumn =
			DateTime.fromJSDate(spring.endAt).plus({ days: 1 }).startOf("day") >=
			DateTime.fromJSDate(fall.startAt).startOf("day");

		// If none of the booking semesters overlap, there can be no valid cross-semester bookings.
		if (
			!endOfAutumnOverlapsWithStartOfSpring &&
			!endOfSpringOverlapsWithStartOfAutumn
		)
			return false;

		const { startDate, endDate } = data;

		/**
		 * If the booking starts in fall and ends in spring, and the end of fall overlaps with the start of spring,
		 * the booking is valid.
		 */
		const startsInAutumn = startDate >= fall.startAt && startDate <= fall.endAt;
		const endsInSpring = endDate >= spring.startAt && endDate <= spring.endAt;
		if (startsInAutumn && endsInSpring && endOfAutumnOverlapsWithStartOfSpring)
			return true;

		/**
		 * If the booking starts in spring and ends in fall, and the end of spring overlaps with the start of fall,
		 * the booking is valid.
		 */
		const startsInSpring =
			startDate >= spring.startAt && startDate <= spring.endAt;
		const endsInAutumn = endDate >= fall.startAt && endDate <= fall.endAt;
		return (
			startsInSpring && endsInAutumn && endOfSpringOverlapsWithStartOfAutumn
		);
	}

	private validateBooking(
		data: BookingData,
		bookingSemesters: {
			spring: BookingSemester | null;
			fall: BookingSemester | null;
		},
	): BookingData {
		const { fall, spring } = bookingSemesters;

		if (!fall?.bookingsEnabled && !spring?.bookingsEnabled)
			throw new InvalidArgumentError("Bookings are not enabled.");

		const bookingSchema = z
			.object({
				firstName: z.string().min(1, "first name must be at least 1 character"),
				lastName: z.string().min(1, "last name must be at least 1 character"),
				startDate: z
					.date()
					.min(new Date(), { message: "start date must be in the future" }),
				endDate: z
					.date()
					.min(new Date(), { message: "end date must be in the future" }),
				email: z.string().email({ message: "invalid email" }),
				phoneNumber: z.string().regex(/^(0047|\+47|47)?\d{8}$/, {
					message: "invalid phone number",
				}),
				cabinId: z.string().uuid({ message: "invalid cabin id" }),
			})
			.refine((obj) => obj.endDate > obj.startDate, {
				message: "end date must be after start date",
			})
			.refine(
				(obj) => {
					const isValidAutumnBooking = this.isInActiveBookingSemester(
						obj,
						fall,
					);
					if (isValidAutumnBooking) return true;

					const isValidSpringBooking = this.isInActiveBookingSemester(
						obj,
						spring,
					);
					if (isValidSpringBooking) return true;

					const isValidCrossSemesterBooking = this.isCrossSemesterBooking(obj, {
						spring,
						fall,
					});
					return isValidCrossSemesterBooking;
				},
				{
					message:
						"booking is not in an active booking semester, and is not a valid cross-semester booking",
					path: ["startDate", "endDate"],
				},
			);
		try {
			return bookingSchema.parse(data);
		} catch (err) {
			if (err instanceof z.ZodError) {
				throw new InvalidArgumentError(err.message);
			}
			throw err;
		}
	}

	private async sendBookingConfirmation(booking: Booking) {
		await this.mailService.sendAsync({
			type: "cabin-booking-receipt",
			bookingId: booking.id,
		});
	}

	/**
	 * newBooking creates a new booking. Does not require any authentication.
	 *
	 * Sends a booking confirmation email to the user.
	 *
	 * @throws {InvalidArgumentError} if the booking data is invalid
	 *
	 * @param data - The booking data
	 * @returns The created booking
	 */
	async newBooking(data: BookingData): Promise<Booking> {
		const bookingSemesters = await this.getBookingSemesters();
		const validatedData = this.validateBooking(data, bookingSemesters);
		const booking = await this.cabinRepository.createBooking(validatedData);
		this.sendBookingConfirmation(booking);
		return booking;
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
		userId: string,
		id: string,
		status: BookingStatus,
	): Promise<Booking> {
		const hasPermission = await this.permissionService.hasFeaturePermission({
			userId,
			featurePermission: FeaturePermission.CABIN_ADMIN,
		});

		if (!hasPermission)
			throw new PermissionDeniedError(
				"You do not have permission to update this booking.",
			);

		if (status === BookingStatus.CONFIRMED) {
			const booking = await this.cabinRepository.getBookingById(id);
			const overlapping = await this.cabinRepository.getOverlappingBookings({
				bookingId: id,
				startDate: booking.startDate,
				endDate: booking.endDate,
				status,
			});
			if (overlapping.length > 0) {
				throw new InvalidArgumentError(
					"this booking overlaps with another confirmed booking",
				);
			}
		}
		return this.cabinRepository.updateBooking(id, { status });
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
		userId: string,
		data: {
			semester: Semester;
			startAt?: Date | null;
			endAt?: Date | null;
			bookingsEnabled?: boolean | null;
		},
	) {
		const hasPermission = await this.permissionService.hasFeaturePermission({
			userId,
			featurePermission: FeaturePermission.CABIN_ADMIN,
		});

		if (!hasPermission)
			throw new PermissionDeniedError(
				"You do not have permission to update the booking semester.",
			);

		const schema = z.object({
			semester: z.nativeEnum(Semester),
			startAt: z
				.date()
				.nullish()
				.transform((val) => val ?? undefined),
			endAt: z
				.date()
				.nullish()
				.transform((val) => val ?? undefined),
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
		semester: Semester;
		startAt?: Date | null;
		endAt?: Date | null;
		bookingsEnabled?: boolean | null;
	}) {
		try {
			const schema = z.object({
				semester: z.nativeEnum(Semester),
				startAt: z.date().default(
					DateTime.fromObject({
						month: data.semester === "SPRING" ? 1 : 8,
						day: 1,
					}).toJSDate(),
				),
				endAt: z.date().default(
					DateTime.fromObject({
						month: data.semester === "SPRING" ? 7 : 12,
						day: 31,
					}).toJSDate(),
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

	private async getBookingSemesters(): Promise<{
		spring: BookingSemester | null;
		fall: BookingSemester | null;
	}> {
		const [spring, fall] = await Promise.all([
			this.getBookingSemester("SPRING"),
			this.getBookingSemester("FALL"),
		]);
		return {
			spring,
			fall,
		};
	}

	/**
	 * getBookingSemester returns the booking semester for the given semester, or null if it does not exist.
	 */
	getBookingSemester(semester: Semester): Promise<BookingSemester | null> {
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
		userId: string,
		data: Partial<{
			name: string | null;
			email: string | null;
			phoneNumber: string | null;
		}>,
	): Promise<BookingContact> {
		const hasPermission = await this.permissionService.hasFeaturePermission({
			userId,
			featurePermission: FeaturePermission.CABIN_ADMIN,
		});

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

	async getBooking(by: { id: string }): ResultAsync<{ booking: Booking }> {
		try {
			const booking = await this.cabinRepository.getBookingById(by.id);
			return {
				ok: true,
				data: {
					booking,
				},
			};
		} catch (err) {
			if (err instanceof KnownDomainError) {
				return {
					ok: false,
					error: err,
				};
			}
			return {
				ok: false,
				error: new InternalServerError("An unknown error occurred"),
			};
		}
	}
}
