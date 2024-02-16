import { faker } from "@faker-js/faker";
import { type DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import { DateTime } from "luxon";
import { PermissionDeniedError } from "~/domain/errors.js";
import type { User } from "~/domain/users.js";
import { makeMockContext } from "~/lib/context.js";
import {
	type MailService,
	type UserRepository,
	UserService,
} from "../../service.js";

describe("UserService", () => {
	let userService: UserService;
	let userRepository: DeepMockProxy<UserRepository>;
	let mailService: DeepMockProxy<MailService>;

	beforeAll(() => {
		userRepository = mockDeep<UserRepository>();
		mailService = mockDeep<MailService>();
		userService = new UserService(userRepository, mailService);
	});

	describe("superUpdateUser", () => {
		describe("as a super user", () => {
			it("should update isSuperUser", async () => {
				/**
				 * Arrange
				 * Mock superUpdateUser to return a user
				 */
				userRepository.update.mockResolvedValue(mock<User>());

				/**
				 * Act
				 *
				 * Call update with isSuperUser set to true
				 */
				const callerUserId = faker.string.uuid();
				const updateUserId = faker.string.uuid();
				const actual = userService.superUpdateUser(
					makeMockContext(mock<User>({ id: callerUserId, isSuperUser: true })),
					updateUserId,
					{
						isSuperUser: true,
					},
				);

				/**
				 * Assert
				 *
				 * Expect the update call to include isSuperUser
				 */
				await expect(actual).resolves.not.toThrow();
				expect(userRepository.update).toHaveBeenCalledWith(updateUserId, {
					isSuperUser: true,
				});
			});

			it("should set graduationYearUpdatedAt or firstLogin", async () => {
				userRepository.update.mockResolvedValue(mock<User>());

				/**
				 * Act
				 *
				 * Call update with isSuperUser set to true
				 */
				const callerUserId = faker.string.uuid();
				const updateUserId = faker.string.uuid();
				const actual = userService.superUpdateUser(
					makeMockContext({ id: callerUserId, isSuperUser: true }),
					updateUserId,
					{
						graduationYear: DateTime.now().year,
					},
				);

				/**
				 * Assert
				 *
				 * Expect the update call to update graduation year without setting graduationYearUpdatedAt or firstLogin
				 */
				await expect(actual).resolves.not.toThrow();
				expect(userRepository.update).toHaveBeenCalledWith(updateUserId, {
					graduationYear: DateTime.now().year,
					graduationYearUpdatedAt: undefined,
					firstLogin: undefined,
				});
			});
		});

		describe("as a non-super user", () => {
			it("should raise PermissionDeniedError", async () => {
				/**
				 * Act
				 *
				 * Call update with isSuperUser set to true
				 */
				const callerUserId = faker.string.uuid();
				const actual = userService.superUpdateUser(
					makeMockContext({ id: callerUserId, isSuperUser: false }),
					faker.string.uuid(),
					{ isSuperUser: true },
				);

				/**
				 * Assert
				 *
				 * Expect the update call to throw PermissionDeniedError
				 */
				await expect(actual).rejects.toThrow(PermissionDeniedError);
				expect(userRepository.update).not.toHaveBeenCalled();
			});
		});
	});
});
