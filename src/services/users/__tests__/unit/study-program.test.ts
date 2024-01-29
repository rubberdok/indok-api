import { faker } from "@faker-js/faker";
import { type DeepMockProxy, mockDeep } from "jest-mock-extended";
import { InvalidArgumentError } from "~/domain/errors.js";
import type { EmailQueueType } from "~/services/mail/worker.js";
import {
	type PermissionService,
	type UserRepository,
	UserService,
} from "../../service.js";

describe("UserService", () => {
	let userService: UserService;
	let permissionService: DeepMockProxy<PermissionService>;
	let userRepository: DeepMockProxy<UserRepository>;

	beforeAll(() => {
		userRepository = mockDeep<UserRepository>();
		permissionService = mockDeep<PermissionService>();
		userService = new UserService(
			userRepository,
			permissionService,
			mockDeep<EmailQueueType>(),
		);
	});

	describe("StudyProgram", () => {
		describe("#createStudyProgram", () => {
			it("should raise InvalidArgumentError if name is too short", async () => {
				const actual = userService.createStudyProgram({
					name: "",
					externalId: faker.string.uuid(),
				});
				await expect(actual).rejects.toThrow(InvalidArgumentError);
				expect(userRepository.createStudyProgram).not.toHaveBeenCalled();
			});

			it("should try to create with valid params", async () => {
				await userService.createStudyProgram({
					name: faker.string.sample(10),
					externalId: faker.string.uuid(),
				});
				expect(userRepository.createStudyProgram).toHaveBeenCalled();
			});
		});
	});
});
