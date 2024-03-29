import { merge } from "lodash-es";
import type { OrderType, ProductType } from "~/domain/products.js";
import type { User } from "~/domain/users.js";
import type { EmailClient } from "~/lib/postmark.js";
import type { EmailQueueDataType, EmailQueueType } from "./worker.js";

type LayoutContent = {
	websiteUrl: string;
	productName: string;
	parentCompany: string;
	companyName: string;
	contactMail: string;
	actionUrl?: string;
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

type OrderReceipt = BaseMailContent<
	"order-receipt",
	{
		order: Pick<OrderType, "id" | "totalPrice"> & { purchasedAt: string };
		product: Pick<ProductType, "name">;
		user: Pick<User, "firstName">;
	}
>;

export type MailContent =
	| EventWaitlistNotification
	| CabinBookingReceipt
	| UserRegistration
	| OrderReceipt;

type MailServiceDependencies = {
	emailQueue: EmailQueueType;
	emailClient: EmailClient;
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

export type Attachment = {
	name: string;
	/**
	 * Base64 encoded content
	 */
	content: string;
	contentType: string;
	contentId: string;
	contentLength?: number;
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

		async send(data: MailContent, attachments?: Attachment[]) {
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
				Attachments: attachments?.map(
					({ name, content, contentType, contentId, contentLength }) => ({
						Content: content,
						Name: name,
						ContentType: contentType,
						ContentID: contentId,
						ContentLength: contentLength,
					}),
				),
			});
		},
	};
};

export { buildMailService };
export type { MailService };
