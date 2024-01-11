import type { User } from "@prisma/client";
import type { Processor } from "bullmq";
import type { Logger } from "pino";
import type { MailService } from "./index.js";

type UserRepository = {
	get(id: string): Promise<User>;
};

const MailWorker = (
	mailService: MailService,
	userRepository: UserRepository,
	log?: Logger,
): Processor<
	{ subject: string; receiverId: string },
	{ status: string },
	"waitlist" | "welcome"
> => {
	return async (job) => {
		log?.info({ job: { name: job.name, data: job.data } }, "starting job");
		const { subject, receiverId } = job.data;
		const user = await userRepository.get(receiverId);
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
