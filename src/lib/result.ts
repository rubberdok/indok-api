import type { KnownDomainError } from "~/domain/errors.js";

type Result<TData, TError extends Error = KnownDomainError> =
	| {
			ok: true;
			data: TData;
	  }
	| {
			ok: false;
			error: TError;
			message: string;
	  };

export type { Result };
