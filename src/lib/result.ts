type TResult<TData extends Record<string, unknown>, TError extends Error> =
	| SuccessResult<TData>
	| ErrorResult<TError>;

type SuccessResult<TData extends Record<string, unknown>> = {
	ok: true;
	data: TData;
};

type ErrorResult<TError> = {
	ok: false;
	error: TError;
};

type ResultAsync<
	TData extends Record<string, unknown>,
	TError extends Error,
> = Promise<TResult<TData, TError>>;

export type { TResult, ResultAsync, ErrorResult, SuccessResult };
export { Result };

const Result = {
	error<TError>(error: TError): ErrorResult<TError> {
		return {
			ok: false,
			error,
		};
	},
	success<TData extends Record<string, unknown>>(
		data: TData,
	): SuccessResult<TData> {
		return {
			ok: true,
			data,
		};
	},
};
