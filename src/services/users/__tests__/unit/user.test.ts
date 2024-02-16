import { faker } from "@faker-js/faker";
import { jest } from "@jest/globals";
import dayjs from "dayjs";
import { type DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import type { User } from "~/domain/users.js";
import {
	type MailService,
	type UserRepository,
	UserService,
} from "../../service.js";

const time = new Date(`${dayjs().year() + 1}-01-01`);

let service: UserService;
let repo: DeepMockProxy<UserRepository>;
let mailService: DeepMockProxy<MailService>;

beforeAll(() => {
	repo = mockDeep<UserRepository>();
	mailService = mockDeep<MailService>();
	service = new UserService(repo, mailService);

	jest.useFakeTimers().setSystemTime(time);
});

describe("UserService", () => {
	interface TestCase {
		name: string;
		input: Partial<{
			firstName: string | null;
			graduationYear: number | null;
		}>;
		existing: User;
		expected: Partial<User>;
	}

	const testCases: TestCase[] = [
		{
			name: "set firstLogin to false",
			input: {
				firstName: "test",
			},
			expected: {
				firstName: "test",
				firstLogin: false,
			},
			existing: mock<User>({
				firstLogin: true,
			}),
		},
		{
			name: "not set `graduationYearUpdatedAt` on first login",
			input: {
				graduationYear: dayjs().year() + 1,
			},
			expected: {
				firstLogin: false,
				graduationYear: dayjs().year() + 1,
			},
			existing: mock<User>({
				firstLogin: true,
				graduationYear: null,
				graduationYearUpdatedAt: null,
			}),
		},
		{
			name: "set `graduationYearUpdatedAt` on on graduation year update",
			input: {
				graduationYear: dayjs().year() + 1,
			},
			expected: {
				graduationYear: dayjs().year() + 1,
				graduationYearUpdatedAt: time,
			},
			existing: mock<User>({
				firstLogin: false,
				graduationYear: null,
				graduationYearUpdatedAt: null,
			}),
		},
		{
			name: "disallow updating graduation year if canUpdateYear is false",
			input: {
				graduationYear: dayjs().year() + 1,
			},
			expected: {},
			existing: mock<User>({
				firstLogin: false,
				graduationYear: dayjs().year(),
				canUpdateYear: false,
			}),
		},
		{
			name: "update `graduationYearUpdatedAt` if canUpdateYear is `true`",
			input: {
				graduationYear: dayjs().year() + 1,
			},
			expected: {
				graduationYear: dayjs().year() + 1,
				graduationYearUpdatedAt: time,
			},
			existing: mock<User>({
				firstLogin: false,
				graduationYear: dayjs().year(),
				canUpdateYear: true,
			}),
		},
	];

	test.each(testCases)(
		"should $name",
		async ({ existing, input, expected }) => {
			repo.get.mockResolvedValueOnce(existing);
			repo.update.mockResolvedValueOnce(mock<User>());

			await service.update(existing.id, input);

			expect(repo.update).toHaveBeenCalledWith(existing.id, expected);
		},
	);

	it("logging in should set lastLogin", async () => {
		repo.update.mockReturnValueOnce(
			Promise.resolve(mock<User>({ graduationYearUpdatedAt: null })),
		);
		const id = faker.string.uuid();

		await service.login(id);

		expect(repo.update).toHaveBeenCalledWith(id, { lastLogin: time });
	});
});
