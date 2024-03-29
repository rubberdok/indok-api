import { z } from "zod";

/**
 * KnownDomainError is the base class for all errors in the application.
 * It is used to provide a consistent way to handle errors in the application.
 * It is also used to provide a consistent way to handle errors in the client.
 *
 * @param name - The name of the error, e.g. "InternalServerError", or "InvalidArgumentError"
 * @param description - Human-readable description of the error, e.g. "The email address is invalid"
 * @param code - A code that can be used to identify the error, e.g. "BAD_USER_INPUT", should be one of `codes`
 */
export class KnownDomainError<TName extends string = string> extends Error {
	public name: TName;
	constructor(
		name: TName,
		public description: string,
		public code: ErrorCode = errorCodes.ERR_INTERNAL_SERVER_ERROR,
		options?: { cause?: unknown },
	) {
		super(description, options);
		this.name = name;
		Error.captureStackTrace(this);
	}
}

/**
 * @deprecated use `InvalidArgumentErrorV2` instead
 */
export class InvalidArgumentError extends KnownDomainError<"InvalidArgumentError"> {
	public reason?: Record<string, string[] | undefined>;

	constructor(description: string, cause?: unknown) {
		super("InvalidArgumentError", description, errorCodes.ERR_BAD_USER_INPUT, {
			cause,
		});
		if (cause instanceof z.ZodError) {
			this.reason = cause.flatten().fieldErrors;
		}
	}
}

export class InternalServerError extends KnownDomainError<"InternalServerError"> {
	constructor(description: string, cause?: unknown) {
		super(
			"InternalServerError",
			description,
			errorCodes.ERR_INTERNAL_SERVER_ERROR,
			{ cause },
		);
	}
}

export class PermissionDeniedError extends KnownDomainError<"PermissionDeniedError"> {
	constructor(description: string, cause?: unknown) {
		super(
			"PermissionDeniedError",
			description,
			errorCodes.ERR_PERMISSION_DENIED,
			{ cause },
		);
	}
}

export class AuthenticationError extends KnownDomainError<"AuthenticationError"> {
	constructor(description: string, cause?: unknown) {
		super(
			"AuthenticationError",
			description,
			errorCodes.ERR_PERMISSION_DENIED,
			{ cause },
		);
	}
}

export class NotFoundError extends KnownDomainError<"NotFoundError"> {
	constructor(description: string, cause?: unknown) {
		super("NotFoundError", description, errorCodes.ERR_NOT_FOUND, { cause });
	}
}

export class BadRequestError extends KnownDomainError<"BadRequestError"> {
	constructor(description: string, cause?: unknown) {
		super("BadRequestError", description, errorCodes.ERR_BAD_REQUEST, {
			cause,
		});
	}
}

export class UnauthorizedError extends KnownDomainError<"UnauthorizedError"> {
	constructor(description: string, cause?: unknown) {
		super("UnauthorizedError", description, errorCodes.ERR_UNAUTHORIZED, {
			cause,
		});
	}
}

export class DownstreamServiceError extends KnownDomainError<"DownstreamServiceError"> {
	public detail?: string;
	public path?: string;

	constructor(
		description: string,
		cause?: unknown,
		params?: { detail?: string; path?: string },
	) {
		super(
			"DownstreamServiceError",
			description,
			errorCodes.ERR_DOWNSTREAM_SERVICE,
			{
				cause,
			},
		);
		const { detail, path } = params ?? {};
		this.detail = detail;
		this.path = path;
	}
}

export const errorCodes = {
	/**
	 * ERR_NOT_FOUND should be used for errors that arise as a result of a resource not being found,
	 * e.g. trying to get an organization that doesn't exist, trying to get a user that doesn't exist.
	 */
	ERR_NOT_FOUND: "NOT_FOUND",
	/**
	 * ERR_BAD_USER_INPUT should be used for errors that arise as a result of user input
	 * that is invalid, e.g. an invalid email address, duplicate username, trying to delete
	 * an organization that doesn't exist, etc.
	 *
	 * These errors are typically caused by the user, and as a consequence, are not tracked
	 * as closely as other errors, i.e., not sent to Sentry.
	 */
	ERR_BAD_USER_INPUT: "BAD_USER_INPUT",
	/**
	 * ERR_BAD_REQUEST should be used for errors that arise as a result of a malformed request,
	 */
	ERR_BAD_REQUEST: "BAD_REQUEST",
	/**
	 * ERR_PERMISSION_DENIED should be used for errors that arise as a result of a user trying
	 * to access a resource that they do not have permission to access, e.g. trying to delete
	 * an organization where the user is not an admin.
	 */
	ERR_PERMISSION_DENIED: "PERMISSION_DENIED",
	/**
	 * ERR_INTERNAL_SERVER_ERROR is a generic error that should be used for all errors that
	 * arise as a result of an internal server error, e.g. a database query failing, a network
	 * request failing, buggy code, etc.
	 */
	ERR_INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
	ERR_UNAUTHORIZED: "UNAUTHORIZED",
	ERR_DOWNSTREAM_SERVICE: "DOWNSTREAM_SERVICE",
} as const;

export type ErrorCode = (typeof errorCodes)[keyof typeof errorCodes];

const USER_FACING_ERRORS = new Set<string>([
	errorCodes.ERR_BAD_REQUEST,
	errorCodes.ERR_BAD_USER_INPUT,
	errorCodes.ERR_PERMISSION_DENIED,
	errorCodes.ERR_NOT_FOUND,
	errorCodes.ERR_UNAUTHORIZED,
]);

type UserFacingErrorCode = Extract<
	ErrorCode,
	| "BAD_REQUEST"
	| "BAD_USER_INPUT"
	| "PERMISSION_DENIED"
	| "NOT_FOUND"
	| "UNAUTHORIZED"
>;

export function isErrorWithCode(
	error: unknown,
): error is Error & { code: string } {
	if (!error) return false;
	if (!(error instanceof Error)) return false;
	if (!("code" in error)) return false;
	return typeof error.code === "string";
}

export function isUserFacingError(
	error?: unknown,
): error is Error & { code: UserFacingErrorCode } {
	if (isErrorWithCode(error)) {
		return USER_FACING_ERRORS.has(error.code);
	}
	return false;
}

const InvalidArgumentErrorSymbol = Symbol("InvalidArgumentError");
const InternalServerErrorSymbol = Symbol("InternalServerError");
const DomainErrorType = {
	InvalidArgumentError: InvalidArgumentErrorSymbol,
	InternalServerError: InternalServerErrorSymbol,
} as const;

type ErrorType = (typeof DomainErrorType)[keyof typeof DomainErrorType];

class DomainError<
	TErrorType extends ErrorType,
	TName extends string,
> extends Error {
	public code: ErrorCode;
	public type: TErrorType;
	public name: TName;

	constructor(
		message: string,
		options: {
			code: ErrorCode;
			type: TErrorType;
			cause?: unknown;
			name: TName;
		},
	) {
		super(message, { cause: options.cause });
		this.code = options.code;
		this.type = options.type;
		this.name = options.name;
		Error.captureStackTrace(this);
	}

	getStackTrace() {
		const errorObj = new Error();
		const propertyIsSupported = typeof errorObj?.stack === "string";
		if (propertyIsSupported) {
			return errorObj.stack;
		}
		return undefined;
	}
}

class InvalidArgumentErrorV2 extends DomainError<
	typeof DomainErrorType.InvalidArgumentError,
	"InvalidArgumentError"
> {
	public reason: Record<string, string[] | undefined> | undefined;

	constructor(
		message: string,
		options?: {
			reason?: Record<string, string[] | undefined>;
			cause?: unknown;
		},
	) {
		const { reason, ...rest } = options ?? {};
		super(message, {
			code: errorCodes.ERR_BAD_USER_INPUT,
			type: DomainErrorType.InvalidArgumentError,
			name: "InvalidArgumentError",
			...rest,
		});
		this.reason = reason;
	}
}

export { DomainErrorType, InvalidArgumentErrorV2 };
