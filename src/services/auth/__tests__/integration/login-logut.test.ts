import { faker } from "@faker-js/faker";
import { jest } from "@jest/globals";
import type { FastifyRequest } from "fastify";
import { mock, mockDeep } from "jest-mock-extended";
import { DateTime } from "luxon";
import { makeTestServices } from "~/__tests__/dependencies-factory.js";
import { AuthenticationError } from "~/domain/errors.js";
import type { User } from "~/domain/users.js";
import type { UserService } from "../../service.js";

describe("AuthService", () => {
	let userService: UserService;
	let authService: ReturnType<typeof makeTestServices>["auth"];

	beforeAll(() => {
		jest.useFakeTimers();
		const services = makeTestServices();
		userService = services.users;
		authService = services.auth;
	});
	afterAll(() => {
		jest.useRealTimers();
	});

	describe("login", () => {
		it("should regenerate the session and set userId and authenticate", async () => {
			const user = await userService.create({
				email: faker.internet.email(),
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				feideId: faker.string.uuid(),
				username: faker.string.sample(),
			});

			jest.setSystemTime(DateTime.now().plus({ minutes: 5 }).toJSDate());
			const req = mockDeep<FastifyRequest>();
			const actual = await authService.login(
				req,
				mock<User>({
					id: user.id,
				}),
			);

			expect(req.session.regenerate).toHaveBeenCalledWith([
				"authenticated",
				"userId",
			]);
			expect(req.session.set).toHaveBeenCalledWith("authenticated", true);
			expect(req.session.set).toHaveBeenCalledWith("userId", user.id);
			expect(actual.id).toEqual(user.id);
			expect(actual.lastLogin).not.toEqual(user.lastLogin);
		});
	});

	describe("logout", () => {
		it("should destroy the session if authenticated", async () => {
			const req = mockDeep<FastifyRequest>({
				session: { authenticated: true, userId: faker.string.uuid() },
			});
			req.session.get.mockImplementation((key) => req.session[key]);
			await authService.logout(req);

			expect(req.session.destroy).toHaveBeenCalled();
		});

		it("should throw AuthenticationError if not logged in", async () => {
			const req = mockDeep<FastifyRequest>({
				session: { authenticated: false },
			});
			req.session.get.mockImplementation((key) => req.session[key]);

			const actual = authService.logout(req);

			await expect(actual).rejects.toThrow(AuthenticationError);
		});
	});
});
