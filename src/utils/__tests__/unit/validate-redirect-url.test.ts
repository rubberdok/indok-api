import { env } from "~/config.js";
import { InvalidArgumentError } from "~/domain/errors.js";
import type { Result } from "~/lib/result.js";
import {
	assertValidRedirectUrl,
	isValidRedirectUrl,
} from "~/utils/validate-redirect-url.js";

describe("Validate redirect URL", () => {
	describe("#isValidRedirectUrl", () => {
		interface TestCase {
			input: string;
			origins: string[];
			expected: Result<{ urlAsString: string; url: URL }, InvalidArgumentError>;
		}

		const testCases: TestCase[] = [
			{
				input: "https://example.com",
				origins: ["https://example.com"],
				expected: {
					ok: true,
					data: {
						urlAsString: "https://example.com/",
						url: new URL("https://example.com/"),
					},
				},
			},
			{
				input: "https://example.com",
				origins: ["https://indokntnu.no", "https://example.com"],
				expected: {
					ok: true,
					data: {
						urlAsString: "https://example.com/",
						url: new URL("https://example.com/"),
					},
				},
			},
			{
				input: "example.com",
				origins: ["https://example.com"],
				expected: {
					ok: false,
					error: expect.any(InvalidArgumentError),
				},
			},
			{
				input: "https://example.other-domain.com",
				origins: ["https://example.com"],
				expected: {
					ok: false,
					error: expect.any(InvalidArgumentError),
				},
			},
			{
				input: "https://other-domain.com",
				origins: ["https://example.com"],
				expected: {
					ok: false,
					error: expect.any(InvalidArgumentError),
				},
			},
			{
				input: "not-a-url",
				origins: ["https://example.com"],
				expected: {
					ok: false,
					error: expect.any(InvalidArgumentError),
				},
			},
		];

		test.each(testCases)(
			"should return $expected.ok for $input and approved origins $origins",
			({ input, expected, origins }) => {
				env.REDIRECT_ORIGINS = origins;
				const result = isValidRedirectUrl(input);
				expect(result).toEqual(expected);
			},
		);
	});
	describe("#assertValidRedirectUrl", () => {
		it("should throw if the URL is invalid", () => {
			expect(() => assertValidRedirectUrl("not-a-url")).toThrow(
				InvalidArgumentError,
			);
		});
	});
});
