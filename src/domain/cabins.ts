import type { DateTime } from "luxon";

export const BookingStatus = {
	PENDING: "PENDING",
	CONFIRMED: "CONFIRMED",
	CANCELLED: "CANCELLED",
	REJECTED: "REJECTED",
} as const;

export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

interface BookingType {
	id: string;
	startDate: Date;
	endDate: Date;
	email: string;
	firstName: string;
	lastName: string;
	phoneNumber: string;
	cabins: { id: string }[];
	status: BookingStatus;
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
	status: BookingStatus;
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
	status: BookingStatus;
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

export { Booking };
export type { NewBookingParams, BookingType, CalendarDay, CalendarMonth };
