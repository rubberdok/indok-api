import { faker } from "@faker-js/faker";
import { InvalidArgumentError } from "~/domain/errors.js";
import prisma from "~/lib/prisma.js";
import { UserRepository } from "../../index.js";

describe("UserRepository", () => {
	let userRepository: UserRepository;

	beforeAll(() => {
		userRepository = new UserRepository(prisma);
	});

	describe("StudyProgram", () => {
		describe("#createStudyProgram", () => {
			it("should create a new study program if it does not exist", async () => {
				const studyProgram = await userRepository.createStudyProgram({
					name: faker.string.sample(20),
					externalId: faker.string.uuid(),
				});
				expect(studyProgram).toBeDefined();
			});

			it("should raise InvalidArgumentError if a study program with the same external ID already exists", async () => {
				/**
				 * Arrange
				 *
				 * Create a study program with an external ID
				 */
				const externalId = faker.string.uuid();
				await userRepository.createStudyProgram({
					name: faker.string.sample(20),
					externalId,
				});

				const actual = userRepository.createStudyProgram({
					name: faker.string.sample(20),
					externalId,
				});
				await expect(actual).rejects.toThrow(InvalidArgumentError);
			});

			it("should raise InvalidArgumentError if a study program with the same name already exists", async () => {
				/**
				 * Arrange
				 *
				 * Create a study program with a name
				 */
				const name = faker.string.sample(20);
				await userRepository.createStudyProgram({
					name,
					externalId: faker.string.uuid(),
				});

				const actual = userRepository.createStudyProgram({
					name,
					externalId: faker.string.uuid(),
				});
				await expect(actual).rejects.toThrow(InvalidArgumentError);
			});
		});

		describe("#getStudyProgram", () => {
			it("should return a study program by id if it exists", async () => {
				const studyProgram = await userRepository.createStudyProgram({
					name: faker.string.sample(20),
					externalId: faker.string.uuid(),
				});
				const actual = await userRepository.getStudyProgram({
					id: studyProgram.id,
				});
				expect(actual).toEqual(studyProgram);
			});

			it("should return a study program by external id if it exists", async () => {
				const externalId = faker.string.uuid();
				const studyProgram = await userRepository.createStudyProgram({
					name: faker.string.sample(20),
					externalId,
				});
				const actual = await userRepository.getStudyProgram({
					externalId,
				});
				expect(actual).toEqual(studyProgram);
			});

			it("should return null if study program does not exist", async () => {
				const actual = await userRepository.getStudyProgram({
					externalId: faker.string.uuid(),
				});
				expect(actual).toBeNull();
			});
		});
	});
});
