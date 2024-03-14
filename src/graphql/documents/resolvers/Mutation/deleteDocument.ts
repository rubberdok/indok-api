import { InternalServerError } from "~/domain/errors.js";
import type { MutationResolvers } from "./../../../types.generated.js";
export const deleteDocument: NonNullable<MutationResolvers["deleteDocument"]> =
	async (_parent, _arg, _ctx) => {
		throw new InternalServerError("Not implemented");
	};
