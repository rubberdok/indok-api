import { jest } from "@jest/globals";
import { Prisma, User } from "@prisma/client";
import dayjs from "dayjs";
import { DeepMockProxy, mockDeep } from "jest-mock-extended";

import { UserRepository, UserService } from "../../service.js";

const dummyUser = mockDeep<User>();

const time = new Date(`${dayjs().year() + 1}-01-01`);

let service: UserService;
let repo: DeepMockProxy<UserRepository>;

beforeAll(() => {
  repo = mockDeep<UserRepository>();
  service = new UserService(repo);

  jest.useFakeTimers().setSystemTime(time);
});

describe("UserService", () => {
  interface TestCase {
    name: string;
    input: Partial<Prisma.UserUpdateInput>;
    updateInput: Partial<Prisma.UserUpdateInput>;
    existing: User;
    expected: User;
  }

  const testCases: TestCase[] = [
    {
      name: "set firstLogin to false",
      input: {
        firstName: "test",
      },
      updateInput: {
        firstName: "test",
        firstLogin: false,
      },
      existing: {
        ...dummyUser,
        id: "1",
        firstLogin: true,
      },
      expected: {
        ...dummyUser,
        firstName: "test",
        firstLogin: false,
      },
    },
    {
      name: "not set `graduationYearUpdatedAt` on first login",
      input: {
        graduationYear: dayjs().year() + 1,
      },
      updateInput: {
        firstLogin: false,
        graduationYear: dayjs().year() + 1,
      },
      existing: {
        ...dummyUser,
        id: "1",
        firstLogin: true,
        graduationYear: null,
        graduationYearUpdatedAt: null,
      },
      expected: {
        ...dummyUser,
        graduationYearUpdatedAt: null,
        graduationYear: dayjs().year() + 1,
      },
    },
    {
      name: "set `graduationYearUpdatedAt` on on graduation year update",
      input: {
        graduationYear: dayjs().year() + 1,
      },
      updateInput: {
        graduationYear: dayjs().year() + 1,
        graduationYearUpdatedAt: time,
      },
      existing: {
        ...dummyUser,
        id: "1",
        firstLogin: false,
        graduationYear: null,
        graduationYearUpdatedAt: null,
      },
      expected: {
        ...dummyUser,
        graduationYearUpdatedAt: time,
        graduationYear: dayjs().year() + 1,
      },
    },
    {
      name: "disallow updating graduation year within one year",
      input: {
        graduationYear: dayjs().year() + 1,
      },
      updateInput: {},
      existing: {
        ...dummyUser,
        id: "1",
        firstLogin: false,
        graduationYear: dayjs().year(),
        graduationYearUpdatedAt: dayjs(time).subtract(1, "year").add(1, "minute").toDate(),
      },
      expected: {
        ...dummyUser,
        graduationYearUpdatedAt: time,
        graduationYear: dayjs().year(),
      },
    },
    {
      name: "update `graduationYearUpdatedAt` if changed after one year",
      input: {
        graduationYear: dayjs().year() + 1,
      },
      updateInput: {
        graduationYear: dayjs().year() + 1,
        graduationYearUpdatedAt: time,
      },
      existing: {
        ...dummyUser,
        id: "1",
        firstLogin: false,
        graduationYear: dayjs().year(),
        graduationYearUpdatedAt: dayjs(time).subtract(1, "year").subtract(1, "minute").toDate(),
      },
      expected: {
        ...dummyUser,
        graduationYearUpdatedAt: time,
        graduationYear: dayjs().year() + 1,
      },
    },
  ];

  test.each(testCases)("should $name", async ({ existing, expected, input, updateInput }) => {
    repo.get.mockReturnValueOnce(Promise.resolve(existing));
    repo.update.mockReturnValueOnce(Promise.resolve(expected));

    await service.update(existing.id, input);

    expect(repo.get).toBeCalledWith(existing.id);
    expect(repo.update).toBeCalledWith(existing.id, updateInput);
  });

  it("logging in should set lastLogin", async () => {
    repo.update.mockReturnValueOnce(Promise.resolve(dummyUser));

    await service.login(dummyUser.id);

    expect(repo.update).toBeCalledWith(dummyUser.id, { lastLogin: time });
  });
});
