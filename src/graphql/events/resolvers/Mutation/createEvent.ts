import { ApolloServerErrorCode } from "@apollo/server/errors";
import { GraphQLError } from "graphql";
import type { MutationResolvers } from "./../../../types.generated.js";

export const createEvent: NonNullable<
	MutationResolvers["createEvent"]
> = async (_parent, { data }, ctx) => {
	const { type, signUpDetails, categories, ...event } = data.event;
	const { tickets } = signUpDetails ?? {};

	let createEventResult: Awaited<ReturnType<typeof ctx.events.create>>;
	if (type === "BASIC") {
		createEventResult = await ctx.events.create(ctx, {
			type: "BASIC",
			event: event,
			categories,
		});
	} else if (!signUpDetails) {
		throw new GraphQLError(
			"signUpDetails must be provided for this event type",
			{ extensions: { code: ApolloServerErrorCode.BAD_USER_INPUT } },
		);
	} else if (type === "SIGN_UPS") {
		createEventResult = await ctx.events.create(ctx, {
			type: "SIGN_UPS",
			event: {
				...event,
				capacity: signUpDetails.capacity,
				signUpsEndAt: signUpDetails.signUpsEndAt,
				signUpsStartAt: signUpDetails.signUpsStartAt,
			},
			categories,
			slots: signUpDetails.slots,
		});
	} else if (!tickets) {
		throw new GraphQLError(
			"signUpDetails.tickets must be provided for this event type",
			{ extensions: { code: ApolloServerErrorCode.BAD_USER_INPUT } },
		);
	} else if (type === "TICKETS") {
		createEventResult = await ctx.events.create(ctx, {
			type: "TICKETS",
			event: {
				...event,
				capacity: signUpDetails.capacity,
				signUpsEndAt: signUpDetails.signUpsEndAt,
				signUpsStartAt: signUpDetails.signUpsStartAt,
			},
			categories,
			slots: signUpDetails.slots,
			tickets: tickets,
		});
	} else {
		throw new GraphQLError("Unexpected invalid input", {
			extensions: { code: ApolloServerErrorCode.BAD_USER_INPUT },
		});
	}

	if (!createEventResult.ok) {
		throw createEventResult.error;
	}

	const { event: createdEvent } = createEventResult.data;

	return { event: createdEvent };
};
