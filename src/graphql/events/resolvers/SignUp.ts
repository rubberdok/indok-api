import { ParticipationStatus } from "@prisma/client";
import type { SignUpResolvers } from "./../../types.generated.js";
export const SignUp: SignUpResolvers = {
	/* Implement SignUp resolver logic here */
	event: (signUp, _args, ctx) => {
		return ctx.events.get(signUp.eventId);
	},
	participationStatus: (signUp) => {
		switch (signUp.participationStatus) {
			case ParticipationStatus.CONFIRMED:
				return "CONFIRMED";
			case ParticipationStatus.ON_WAITLIST:
				return "ON_WAITLIST";
			case ParticipationStatus.RETRACTED:
				return "RETRACTED";
			case ParticipationStatus.REMOVED:
				return "REMOVED";
		}
	},
	user: (signUp, _args, ctx) => {
		return ctx.users.get(signUp.userId);
	}
};
