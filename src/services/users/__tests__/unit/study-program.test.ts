import { faker } from "@faker-js/faker";
import { type DeepMockProxy, mockDeep } from "jest-mock-extended";
import { InvalidArgumentError } from "~/domain/errors.js";
import {
	type MailService,
	type PermissionService,
	type UserRepository,
	UserService,
} from "../../service.js";

describe("UserService", () => {
	let userService: UserService;
	let permissionService: DeepMockProxy<PermissionService>;
	let userRepository: DeepMockProxy<UserRepository>;
	let mailService: DeepMockProxy<MailService>;

	beforeAll(() => {
		userRepository = mockDeep<UserRepository>();
		permissionService = mockDeep<PermissionService>();
		mailService = mockDeep<MailService>();
		userService = new UserService(
			userRepository,
			permissionService,
			mailService,
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
