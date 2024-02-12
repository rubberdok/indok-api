type Result<TData extends Record<string, unknown>, TError extends Error> =
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
	TError extends Error,
> = Promise<Result<TData, TError>>;

export type { Result, ResultAsync };
