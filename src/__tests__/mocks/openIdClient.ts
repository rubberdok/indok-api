import { faker } from "@faker-js/faker";
import { type DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import { merge } from "lodash-es";
import type { IdTokenClaims } from "openid-client";
import type { User } from "~/domain/users.js";
import type { OpenIDClient } from "../../services/auth/service.js";

type UserResponse = Pick<User, "id" | "email"> & { name: string };
export type MockOpenIdClient = DeepMockProxy<OpenIDClient> & {
	updateUserResponseMock: (user: UserResponse) => void;
};

export function newMockOpenIdClient(): MockOpenIdClient {
	const mockClient = mockDeep<OpenIDClient>();
	mockClient.authorizationUrl.mockReturnValue("https://example.com");

	const mockClientWithUpdateUserResponseMock = merge(mockClient, {
		updateUserResponseMock(user: UserResponse) {
			updateUserResponseMock(mockClient, user);
		},
	});
	mockClientWithUpdateUserResponseMock.updateUserResponseMock({
		id: faker.string.uuid(),
		email: faker.internet.exampleEmail({ firstName: faker.string.uuid() }),
		name: faker.person.fullName(),
	});

	return mockClientWithUpdateUserResponseMock;
}

function updateUserResponseMock(
	mockOpenIdClient: DeepMockProxy<OpenIDClient>,
	user: UserResponse,
) {
	mockOpenIdClient.callback.mockResolvedValue({
		id_token: "id_token",
		access_token: "access_token",
		expired: () => false,
		claims() {
			return mock<IdTokenClaims>({
				sub: user.id,
				email: user.email,
				name: user.name,
				"https://n.feide.no/claims/userid_sec": [`feide:${user.email}`],
				"https://n.feide.no/claims/eduPersonPrincipalName": user.email,
			});
		},
	});
	mockOpenIdClient.userinfo.mockResolvedValue({
		sub: user.id,
		email: user.email,
		name: user.name,
		"https://n.feide.no/claims/userid_sec": [`feide:${user.email}`],
		"https://n.feide.no/claims/eduPersonPrincipalName": user.email,
	});
}
