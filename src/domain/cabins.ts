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
	month: number;
	year: number;
	days: CalendarDay[];
};

type CalendarDay = {
	calendarDate: DateTime;
	available: boolean;
	bookable: boolean;
	price: number;
	availableForCheckIn: boolean;
	availableForCheckOut: boolean;
};

export { Booking };
export type { NewBookingParams, BookingType, CalendarDay, CalendarMonth };
