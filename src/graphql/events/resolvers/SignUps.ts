import type { ParticipationStatus } from "@prisma/client";
import type { ApolloContext } from "~/lib/apollo-server.js";
import type { SignUpsResolvers } from "./../../types.generated.js";
export const SignUps: SignUpsResolvers = {
	/* Implement SignUps resolver logic here */
	confirmed: async ({ id }, _args, ctx) => {
		return await findManySignUpsByStatus(ctx, {
			eventId: id,
			participationStatus: "CONFIRMED",
		});
	},
	retracted: async ({ id }, _args, ctx) => {
		return await findManySignUpsByStatus(ctx, {
			eventId: id,
			participationStatus: "RETRACTED",
		});
	},
	waitList: async ({ id }, _args, ctx) => {
		return await findManySignUpsByStatus(ctx, {
			eventId: id,
			participationStatus: "ON_WAITLIST",
		});
	},
};

async function findManySignUpsByStatus(
	ctx: ApolloContext,
	params: { eventId: string; participationStatus: ParticipationStatus },
) {
	const { eventId, participationStatus } = params;
	const result = await ctx.events.findManySignUps(ctx, {
		eventId,
		participationStatus,
	});
	if (!result.ok) {
		switch (result.error.name) {
			case "UnauthorizedError":
			case "PermissionDeniedError":
			case "NotFoundError":
				return { signUps: [], total: 0 };
			case "InvalidArgumentError":
			case "InternalServerError":
				throw result.error;
		}
	}
	const { signUps, total } = result.data;
	return { signUps, total };
}
