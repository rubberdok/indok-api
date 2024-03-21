import type { DateTime } from "luxon";

const BookingStatus = {
	PENDING: "PENDING",
	CONFIRMED: "CONFIRMED",
	CANCELLED: "CANCELLED",
	REJECTED: "REJECTED",
} as const;

type BookingStatusType = (typeof BookingStatus)[keyof typeof BookingStatus];

const BookingSemesterEnum = {
	SPRING: "SPRING",
	FALL: "FALL",
} as const;
type BookingSemesterEnumType =
	(typeof BookingSemesterEnum)[keyof typeof BookingSemesterEnum];

interface BookingType {
	id: string;
	startDate: Date;
	endDate: Date;
	email: string;
	firstName: string;
	lastName: string;
	phoneNumber: string;
	cabins: { id: string }[];
	status: BookingStatusType;
	totalCost: number;
	internalParticipantsCount: number;
	externalParticipantsCount: number;
	createdAt: Date;
	questions: string;
	feedback: string;
}

class Booking implements BookingType {
	constructor(params: NewBookingParams) {
		this.id = params.id;
		this.startDate = params.startDate;
		this.endDate = params.endDate;
		this.email = params.email;
		this.firstName = params.firstName;
		this.lastName = params.lastName;
		this.phoneNumber = params.phoneNumber;
		this.cabins = params.cabins;
		this.status = params.status;
		this.totalCost = params.totalCost;
		this.internalParticipantsCount = params.internalParticipantsCount;
		this.externalParticipantsCount = params.externalParticipantsCount;
		this.createdAt = params.createdAt;
		this.questions = params.questions;
		this.feedback = params.feedback;
	}
	feedback: string;
	questions: string;
	createdAt: Date;
	internalParticipantsCount: number;
	externalParticipantsCount: number;
	totalCost: number;
	status: BookingStatusType;
	id: string;
	startDate: Date;
	endDate: Date;
	email: string;
	firstName: string;
	lastName: string;
	phoneNumber: string;
	cabins: { id: string }[];
}

type NewBookingParams = {
	id: string;
	startDate: Date;
	endDate: Date;
	email: string;
	firstName: string;
	lastName: string;
	phoneNumber: string;
	cabins: { id: string }[];
	status: BookingStatusType;
	totalCost: number;
	internalParticipantsCount: number;
	externalParticipantsCount: number;
	createdAt: Date;
	questions: string;
	feedback: string;
};

type CalendarMonth = {
	// The month of the year (1 - 12)
	month: number;
	// The year of the month
	year: number;
	// All the days in the month
	days: CalendarDay[];
};

type CalendarDay = {
	// The date of the day
	calendarDate: DateTime;
	// Available means that the date is not previously occupied, or otherwise made unavailable
	available: boolean;
	// Bookable means that bookings have been enabled for the date
	bookable: boolean;
	// Price is the price of the date
	price: number;
	/**
	 * Available for check-in means that the date is available for check-in
	 * e.g. it is not a single date squeezed between two occupied dates
	 */
	availableForCheckIn: boolean;
	/**
	 * Available for check-out means that the date is available for check-out
	 * e.g. it is not directly preceded by an occupied date
	 */
	availableForCheckOut: boolean;
};

class Cabin {
	id: string;
	name: string;
	capacity: number;
	internalPrice: number;
	internalPriceWeekend: number;
	externalPrice: number;
	externalPriceWeekend: number;
	createdAt: Date;

	constructor(params: {
		id: string;
		name: string;
		capacity: number;
		internalPrice: number;
		internalPriceWeekend: number;
		externalPrice: number;
		externalPriceWeekend: number;
		createdAt: Date;
	}) {
		this.id = params.id;
		this.name = params.name;
		this.capacity = params.capacity;
		this.internalPrice = params.internalPrice;
		this.internalPriceWeekend = params.internalPriceWeekend;
		this.externalPrice = params.externalPrice;
		this.externalPriceWeekend = params.externalPriceWeekend;
		this.createdAt = params.createdAt;
	}
}

class BookingSemester {
	semester: BookingSemesterEnumType;
	startAt: Date;
	endAt: Date;
	updatedAt: Date;
	id: string;
	bookingsEnabled: boolean;

	constructor(params: {
		semester: BookingSemesterEnumType;
		startAt: Date;
		endAt: Date;
		updatedAt: Date;
		id: string;
		bookingsEnabled: boolean;
	}) {
		this.semester = params.semester;
		this.startAt = params.startAt;
		this.endAt = params.endAt;
		this.updatedAt = params.updatedAt;
		this.id = params.id;
		this.bookingsEnabled = params.bookingsEnabled;
	}
}

class BookingContact {
	id: string;
	name: string;
	email: string;
	phoneNumber: string;
	updatedAt: Date;

	constructor(params: {
		id: string;
		name: string;
		email: string;
		phoneNumber: string;
		updatedAt: Date;
	}) {
		this.id = params.id;
		this.name = params.name;
		this.email = params.email;
		this.phoneNumber = params.phoneNumber;
		this.updatedAt = params.updatedAt;
	}
}

class BookingTerms {
	id: string;
	fileId: string;
	createdAt: Date;

	constructor(params: { id: string; fileId: string; createdAt: Date }) {
		this.id = params.id;
		this.fileId = params.fileId;
		this.createdAt = params.createdAt;
	}
}

export {
	BookingTerms,
	Booking,
	Cabin,
	BookingSemester,
	BookingContact,
	BookingStatus,
	BookingSemesterEnum,
};
export type {
	NewBookingParams,
	BookingType,
	CalendarDay,
	CalendarMonth,
	BookingStatusType,
	BookingSemesterEnumType,
};
