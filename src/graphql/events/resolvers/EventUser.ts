import type { EventUserResolvers } from "./../../types.generated.js";
export const EventUser: EventUserResolvers = {
	/* Implement EventUser resolver logic here */
	ticketStatus: async ({ id, eventId }, _args, ctx) => {
		const getOrderForSignUpResult = await ctx.events.getOrderForSignUp(ctx, {
			eventId,
			userId: id,
		});
		if (!getOrderForSignUpResult.ok) {
			switch (getOrderForSignUpResult.error.name) {
				case "UnauthorizedError":
				case "NotFoundError":
					return null;
				case "InvalidArgumentError":
				case "InternalServerError":
				case "PermissionDeniedError":
					throw getOrderForSignUpResult.error;
			}
		}
		const { order } = getOrderForSignUpResult.data;
		if (order.paymentStatus === "CAPTURED") {
			return "BOUGHT";
		}
		return "NOT_BOUGHT";
	},
	signUp: async ({ eventId, id }, _args, ctx) => {
		const getSignUpResult = await ctx.events.getSignUp(ctx, {
			eventId,
			userId: id,
		});
		if (!getSignUpResult.ok) {
			switch (getSignUpResult.error.name) {
				case "UnauthorizedError":
				case "NotFoundError":
					return null;
				case "InternalServerError":
					throw getSignUpResult.error;
			}
		}
		const { signUp } = getSignUpResult.data;
		return signUp;
	},
	ticket: async ({ eventId, id }, _args, ctx) => {
		const getOrderForSignUpResult = await ctx.events.getOrderForSignUp(ctx, {
			eventId,
			userId: id,
		});
		if (!getOrderForSignUpResult.ok) {
			switch (getOrderForSignUpResult.error.name) {
				case "UnauthorizedError":
				case "NotFoundError":
					return null;
				case "InvalidArgumentError":
				case "InternalServerError":
				case "PermissionDeniedError":
					throw getOrderForSignUpResult.error;
			}
		}
		const { order } = getOrderForSignUpResult.data;
		return order;
	},
};
