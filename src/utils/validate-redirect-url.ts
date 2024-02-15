import { env } from "~/config.js";
import { InvalidArgumentError } from "~/domain/errors.js";
import type { Result } from "~/lib/result.js";

function assertValidRedirectUrl(url: string): void {
	const result = isValidRedirectUrl(url);
	if (!result.ok) {
		throw result.error;
	}
}

function isValidRedirectUrl(
	url: string,
): Result<{ urlAsString: string; url: URL }, InvalidArgumentError> {
	try {
		const parsedUrl = new URL(url);
		if (!env.REDIRECT_ORIGINS.some((origin) => origin === parsedUrl.origin)) {
			return {
				ok: false,
				error: new InvalidArgumentError(
					`Invalid redirect URL. Must be one of ${env.REDIRECT_ORIGINS.join(
						", ",
					)}`,
				),
			};
		}
		return {
			ok: true,
			data: { url: parsedUrl, urlAsString: parsedUrl.toString() },
		};
	} catch (err) {
		return {
			ok: false,
			error: new InvalidArgumentError(
				`Invalid redirect URL. Must be one of ${env.REDIRECT_ORIGINS.join(
					", ",
				)}`,
				err,
			),
		};
	}
}

export { assertValidRedirectUrl, isValidRedirectUrl };
