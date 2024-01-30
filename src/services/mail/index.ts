import { merge } from "lodash-es";
import type { IMailClient } from "~/lib/postmark.js";
import type { EmailQueueDataType, EmailQueueType } from "./worker.js";

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

type MailServiceDependencies = {
	emailQueue: EmailQueueType;
	emailClient: IMailClient;
};

type MailServiceOptions = {
	companyName: string;
	noReplyEmail: string;
	productName: string;
	parentCompany: string;
	contactMail: string;
	websiteUrl: string;
};

type MailService = {
	sendAsync: (jobData: EmailQueueDataType) => Promise<void>;
	sendAsyncBulk: (jobData: EmailQueueDataType[]) => Promise<void>;
	send: (data: MailContent) => Promise<void>;
};

const buildMailService = (
	{ emailQueue, emailClient }: MailServiceDependencies,
	options: MailServiceOptions,
): MailService => {
	return {
		async sendAsync(jobData: EmailQueueDataType) {
			await emailQueue.add("send-email", jobData);
		},

		async sendAsyncBulk(jobData: EmailQueueDataType[]) {
			await emailQueue.addBulk(
				jobData.map((data) => ({
					data,
					name: "send-email",
				})),
			);
		},

		async send(data: MailContent) {
			const { to, from, content, templateAlias } = data;
			const defaultContent: LayoutContent = {
				companyName: options.companyName,
				parentCompany: options.parentCompany,
				contactMail: options.contactMail,
				productName: options.productName,
				websiteUrl: options.websiteUrl,
			};

			const contentWithDefaults = merge({}, defaultContent, content);

			await emailClient.sendEmailWithTemplate({
				To: to,
				From: from ?? options.noReplyEmail,
				TemplateAlias: templateAlias,
				TemplateModel: contentWithDefaults,
			});
		},
	};
};

export { buildMailService };
export type { MailService };
