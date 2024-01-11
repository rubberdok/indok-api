import type { User } from "@prisma/client";
import type { Processor } from "bullmq";
import type { MailService } from "./index.js";

type UserRepository = {
	get(id: string): Promise<User>;
};

const MailWorker = (
	mailService: MailService,
	userRepository: UserRepository,
): Processor<
	{ subject: string; receiverId: string },
	{ status: string },
	"waitlist" | "welcome"
> => {
	return async (job) => {
		const { subject, receiverId } = job.data;
		console.log("sending email", job.name);
		const user = await userRepository.get(receiverId);
		console.log("Sending email to", user.id);
		switch (job.name) {
			case "waitlist":
				await mailService.send({
					To: user.email,
					TemplateAlias: "event-wait-list",
					TemplateModel: {
						subject,
					},
				});
				return { status: "sent" };
			case "welcome":
				await mailService.send({
					To: user.email,
					TemplateAlias: "welcome",
					TemplateModel: {
						subject,
						firstName: user.firstName,
						lastName: user.lastName,
					},
				});
				return { status: "sent" };
		}
	};
};

export { MailWorker };
