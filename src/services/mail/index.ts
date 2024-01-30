import { merge } from "lodash-es";
import type { IMailClient } from "~/lib/postmark.js";

type LayoutContent = {
	websiteUrl: string;
	productName: string;
	parentCompany: string;
	companyName: string;
	contactMail: string;
};

type BaseMailContent<
	TAlias extends string,
	TData extends Record<string, object>,
> = {
	to: string;
	from?: string;
	templateAlias: TAlias;
	content: TData & Partial<LayoutContent>;
};

type EventWaitlistNotification = BaseMailContent<
	"event-wait-list",
	{
		event: {
			name: string;
			startAt: string;
			location?: string;
			price?: string;
			url: string;
		};
	}
>;

type CabinBookingReceipt = BaseMailContent<
	"cabin-booking-receipt",
	{
		booking: {
			price: string;
		};
	}
>;

type UserRegistration = BaseMailContent<
	"user-registration",
	{
		user: {
			firstName: string;
			lastName: string;
			studyProgram?: string;
		};
	}
>;

export type MailContent =
	| EventWaitlistNotification
	| CabinBookingReceipt
	| UserRegistration;

export class MailService {
	constructor(
		private client: IMailClient,
		private defaults: {
			companyName: string;
			noReplyEmail: string;
			productName: string;
			parentCompany: string;
			contactMail: string;
			websiteUrl: string;
		},
	) {}

	send(data: MailContent) {
		const { to, from, content, templateAlias } = data;
		const defaultContent: LayoutContent = {
			companyName: this.defaults.companyName,
			parentCompany: this.defaults.parentCompany,
			contactMail: this.defaults.contactMail,
			productName: this.defaults.productName,
			websiteUrl: this.defaults.websiteUrl,
		};

		const contentWithDefaults = merge({}, defaultContent, content);

		return this.client.sendEmailWithTemplate({
			To: to,
			From: from ?? this.defaults.noReplyEmail,
			TemplateAlias: templateAlias,
			TemplateModel: contentWithDefaults,
		});
	}
}
