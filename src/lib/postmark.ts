import { ServerClient, type TemplatedMessage } from "postmark";
import { env } from "~/config.js";

export default new ServerClient(env.POSTMARK_API_TOKEN);

type Modify<M, N> = Omit<M, Extract<keyof M, keyof N>> & N;

export type IMailClient = ServerClient;

export const TemplateAlias = {
	EVENT_WAIT_LIST: "event-wait-list",
	CABIN_BOOKING_RECEIPT: "cabin-booking-receipt",
	WELCOME: "welcome",
} as const;

type CabinBookingReceipt = {
	firstName: string;
	lastName: string;
};

type Model = {
	[TemplateAlias.EVENT_WAIT_LIST]: {
		subject: string;
	};
	[TemplateAlias.CABIN_BOOKING_RECEIPT]: CabinBookingReceipt;
	[TemplateAlias.WELCOME]: {
		firstName: string;
		lastName: string;
	};
};

export type EmailContent = Modify<
	TemplatedMessage,
	{
		From?: string;
	}
> &
	(
		| {
				TemplateAlias: typeof TemplateAlias.EVENT_WAIT_LIST;
				TemplateModel: Model[typeof TemplateAlias.EVENT_WAIT_LIST];
		  }
		| {
				TemplateAlias: typeof TemplateAlias.CABIN_BOOKING_RECEIPT;
				TemplateModel: Model[typeof TemplateAlias.CABIN_BOOKING_RECEIPT];
		  }
		| {
				TemplateAlias: typeof TemplateAlias.WELCOME;
				TemplateModel: Model[typeof TemplateAlias.WELCOME];
		  }
	);
