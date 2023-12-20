import { faker } from "@faker-js/faker";
import { User } from "@prisma/client";
import { DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import { DateTime } from "luxon";
import { PermissionDeniedError } from "~/domain/errors.js";
import {
  PermissionService,
  UserRepository,
  UserService,
} from "../../service.js";

describe("UserService", () => {
  let userService: UserService;
  let permissionService: DeepMockProxy<PermissionService>;
  let userRepository: DeepMockProxy<UserRepository>;

  beforeAll(() => {
    userRepository = mockDeep<UserRepository>();
    permissionService = mockDeep<PermissionService>();
    userService = new UserService(userRepository, permissionService);
  });

  describe("superUpdateUser", () => {
    describe("as a super user", () => {
      it("should update isSuperUser", async () => {
        /**
         * Arrange
         *
         * Mock isSuperUser to return true
         * Mock superUpdateUser to return a user
         */
        permissionService.isSuperUser.mockResolvedValue({ isSuperUser: true });
        userRepository.update.mockResolvedValue(mock<User>());

        /**
         * Act
         *
         * Call update with isSuperUser set to true
         */
        const callerUserId = faker.string.uuid();
        const updateUserId = faker.string.uuid();
        const actual = userService.superUpdateUser(callerUserId, updateUserId, {
          isSuperUser: true,
        });

        /**
         * Assert
         *
         * Expect the update call to include isSuperUser
         */
        await expect(actual).resolves.not.toThrow();
        expect(userRepository.update).toHaveBeenCalledWith(updateUserId, {
          isSuperUser: true,
        });
        expect(permissionService.isSuperUser).toHaveBeenCalledWith(
          callerUserId,
        );
      });

      it("should set graduationYearUpdatedAt or firstLogin", async () => {
        /**
         * Arrange
         *
         * Mock isSuperUser to return true
         * Mock update to return a user
         */
        permissionService.isSuperUser.mockResolvedValue({ isSuperUser: true });
        userRepository.update.mockResolvedValue(mock<User>());

        /**
         * Act
         *
         * Call update with isSuperUser set to true
         */
        const callerUserId = faker.string.uuid();
        const updateUserId = faker.string.uuid();
        const actual = userService.superUpdateUser(callerUserId, updateUserId, {
          graduationYear: DateTime.now().year,
        });

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
         * Arrange
         *
         * Mock isSuperUser to return true
         */
        permissionService.isSuperUser.mockResolvedValue({ isSuperUser: false });

        /**
         * Act
         *
         * Call update with isSuperUser set to true
         */
        const callerUserId = faker.string.uuid();
        const actual = userService.superUpdateUser(
          callerUserId,
          faker.string.uuid(),
          { isSuperUser: true },
        );

        /**
         * Assert
         *
         * Expect the update call to throw PermissionDeniedError
         */
        expect(actual).rejects.toThrow(PermissionDeniedError);
        expect(userRepository.update).not.toHaveBeenCalled();
        expect(permissionService.isSuperUser).toHaveBeenCalledWith(
          callerUserId,
        );
      });
    });
  });
});
