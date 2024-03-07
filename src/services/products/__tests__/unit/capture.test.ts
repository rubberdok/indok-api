import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import {
	type DownstreamServiceError,
	type InternalServerError,
	InvalidArgumentError,
	NotFoundError,
} from "~/domain/errors.js";
import type {
	MerchantType,
	OrderType,
	PaymentAttemptType,
} from "~/domain/products.js";
import { makeMockContext } from "~/lib/context.js";
import type { TResult } from "~/lib/result.js";
import { makeDependencies } from "./dependencies.js";

describe("ProductService", () => {
	describe("#capture", () => {
		interface TestCase {
			name: string;
			order: OrderType | null;
			paymentAttempt: PaymentAttemptType | null;
			expected: TResult<
				{ paymentAttempt: PaymentAttemptType; order: OrderType },
				| InvalidArgumentError
				| InternalServerError
				| DownstreamServiceError
				| NotFoundError
			>;
		}
		const testCases: TestCase[] = [
			{
				name: "should not attempt to capture if the order is already CAPTURED",
				order: mock<OrderType>({ paymentStatus: "CAPTURED" }),
				paymentAttempt: mock<PaymentAttemptType>({ state: "AUTHORIZED" }),
				expected: {
					ok: false,
					error: expect.any(InvalidArgumentError),
				},
			},
			{
				name: "should not attempt to capture if the order is already REFUNDED",
				order: mock<OrderType>({ paymentStatus: "REFUNDED" }),
				paymentAttempt: mock<PaymentAttemptType>({ state: "AUTHORIZED" }),
				expected: {
					ok: false,
					error: expect.any(InvalidArgumentError),
				},
			},
			{
				name: "should not attempt to capture if the order is already CANCELLED",
				order: mock<OrderType>({ paymentStatus: "CANCELLED" }),
				paymentAttempt: mock<PaymentAttemptType>({ state: "AUTHORIZED" }),
				expected: {
					ok: false,
					error: expect.any(InvalidArgumentError),
				},
			},
			{
				name: "should not attempt to capture if the payment attempt is not AUTHORIZED",
				order: mock<OrderType>({ paymentStatus: "CREATED" }),
				paymentAttempt: mock<PaymentAttemptType>({ state: "CREATED" }),
				expected: {
					ok: false,
					error: expect.any(InvalidArgumentError),
				},
			},
			{
				name: "should not attempt to capture if the payment attempt is not found ",
				order: mock<OrderType>({ paymentStatus: "CREATED" }),
				paymentAttempt: null,
				expected: {
					ok: false,
					error: expect.any(NotFoundError),
				},
			},
			{
				name: "should not attempt to capture if the order is not found ",
				order: null,
				paymentAttempt: mock<PaymentAttemptType>({ state: "AUTHORIZED" }),
				expected: {
					ok: false,
					error: expect.any(NotFoundError),
				},
			},
		];
		test.each(testCases)(
			"$name",
			async ({ order, paymentAttempt, expected }) => {
				/**
				 * Arrange
				 */
				const { productService, productRepository, mockVippsClient } =
					makeDependencies();

				productRepository.getOrder.mockResolvedValue({
					ok: true,
					data: {
						order,
					},
				});
				productRepository.getPaymentAttempt.mockResolvedValue({
					ok: true,
					data: {
						paymentAttempt,
					},
				});
				productRepository.getMerchant.mockResolvedValue({
					ok: true,
					data: {
						merchant: mock<MerchantType>(),
					},
				});
				mockVippsClient.payment.capture.mockResolvedValue({
					ok: true,
					data: {
						amount: {
							value: 100 * 100,
							currency: "NOK",
						},
						reference: paymentAttempt?.reference ?? "",
						state: "AUTHORIZED",
						aggregate: mock(),
						pspReference: mock(),
					},
				});

				const result = await productService.payments.capture(
					makeMockContext(),
					{
						reference: faker.string.uuid(),
					},
				);
				expect(result).toEqual(expected);
			},
		);
	});
});
