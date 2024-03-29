import { EventParticipationStatus } from "~/domain/events/sign-ups.js";
import type { SignUpResolvers } from "./../../types.generated.js";
export const SignUp: SignUpResolvers = {
	/* Implement SignUp resolver logic here */
	event: (signUp, _args, ctx) => {
		return ctx.events.get(signUp.eventId);
	},
	participationStatus: (signUp) => {
		switch (signUp.participationStatus) {
			case EventParticipationStatus.CONFIRMED:
				return "CONFIRMED";
			case EventParticipationStatus.ON_WAITLIST:
				return "ON_WAITLIST";
			case EventParticipationStatus.RETRACTED:
				return "RETRACTED";
			case EventParticipationStatus.REMOVED:
				return "REMOVED";
		}
	},
	user: (signUp, _args, ctx) => {
		return ctx.users.get(signUp.userId);
	},
	order: async (signUp, _args, ctx) => {
		const getOrderResult = await ctx.events.getOrderForSignUp(ctx, {
			eventId: signUp.eventId,
			userId: signUp.userId,
		});
		if (!getOrderResult.ok) {
			switch (getOrderResult.error.name) {
				case "UnauthorizedError":
				case "NotFoundError":
					return null;
				case "InternalServerError":
				case "PermissionDeniedError":
				case "InvalidArgumentError":
					throw getOrderResult.error;
			}
		}
		return getOrderResult.data.order;
	},
	approximatePositionOnWaitList: async (signUp, _args, ctx) => {
		const { eventId } = signUp;
		const getApproximatePositionResult =
			await ctx.events.getApproximatePositionOnWaitingList(ctx, { eventId });

		if (!getApproximatePositionResult.ok) {
			switch (getApproximatePositionResult.error.name) {
				case "UnauthorizedError":
				case "NotFoundError":
				case "InvalidArgumentError":
					return null;
				case "InternalServerError":
					throw getApproximatePositionResult.error;
			}
		}

		const { position } = getApproximatePositionResult.data;
		return position;
	},
};
