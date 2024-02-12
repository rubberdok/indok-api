import type { KnownDomainError } from "~/domain/errors.js";

type Result<
	TData extends Record<string, unknown>,
	TError extends Error = KnownDomainError,
> =
	| {
			ok: true;
			data: TData;
	  }
	| {
			ok: false;
			error: TError;
	  };

type ResultAsync<
	TData extends Record<string, unknown>,
	TError extends Error = KnownDomainError,
> = Promise<Result<TData, TError>>;

export type { Result, ResultAsync };
