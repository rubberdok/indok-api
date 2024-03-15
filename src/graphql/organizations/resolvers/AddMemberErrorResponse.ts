import type { AddMemberErrorResponseResolvers } from "./../../types.generated.js";
export const AddMemberErrorResponse: AddMemberErrorResponseResolvers = {
	code: ({ error }) => {
		switch (error.name) {
			case "InvalidArgumentError":
				return "ALREADY_MEMBER";
			case "NotFoundError":
				return "USER_NOT_FOUND";
		}
	},
	message: ({ error }) => {
		switch (error.name) {
			case "InvalidArgumentError":
				return "User is already a member of the organization";
			case "NotFoundError":
				return "User not found";
		}
	},
};
