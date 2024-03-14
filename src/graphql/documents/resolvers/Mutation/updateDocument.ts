import { InternalServerError } from "~/domain/errors.js";
import type { MutationResolvers } from "./../../../types.generated.js";
export const updateDocument: NonNullable<MutationResolvers["updateDocument"]> =
	async (_parent, _arg, _ctx) => {
		throw new InternalServerError("Not implemented");
	};
