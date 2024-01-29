import { faker } from "@faker-js/faker";
import { jest } from "@jest/globals";
import type { Client } from "@vippsmobilepay/sdk";
import { type DeepMockProxy, mockDeep } from "jest-mock-extended";

const MockVippsClientFactory = (): {
	factory: typeof Client;
	client: DeepMockProxy<ReturnType<typeof Client>>;
} => {
	const mockClient = mockDeep<ReturnType<typeof Client>>({
		auth: {
			getToken: jest.fn<ReturnType<typeof Client>["auth"]["getToken"]>(() => {
				return Promise.resolve({
					ok: true as const,
					data: {
						access_token: faker.string.uuid(),
						expires_in: "3600",
						expires_on: faker.date.future().toISOString(),
						not_before: faker.date.past().toISOString(),
						resource: faker.internet.url(),
						token_type: "Bearer",
						ext_expires_in: "3600",
					},
				});
			}),
		},
	});
	return { factory: () => mockClient, client: mockClient };
};

export { MockVippsClientFactory };
