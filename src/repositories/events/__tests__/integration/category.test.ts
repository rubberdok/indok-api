import { faker } from "@faker-js/faker";
import { InvalidArgumentError, NotFoundError } from "~/domain/errors.js";
import { makeMockContext } from "~/lib/context.js";
import prisma from "~/lib/prisma.js";
import { EventRepository } from "../../repository.js";

describe("EventRepository", () => {
	let eventRepository: EventRepository;

	beforeAll(() => {
		eventRepository = new EventRepository(prisma);
	});

	describe("#createCategory", () => {
		it("should create a category", async () => {
			const name = faker.string.sample(20);
			const category = await eventRepository.createCategory({
				name,
			});

			expect(category).toEqual(
				expect.objectContaining({
					name,
				}),
			);
		});

		it("should throw InvalidArgumentError if a category with that name already exists", async () => {
			const name = faker.string.sample(20);
			await eventRepository.createCategory({
				name,
			});
			const duplicateCategory = eventRepository.createCategory({
				name,
			});

			await expect(duplicateCategory).rejects.toThrow(InvalidArgumentError);
		});
	});

	describe("#updateCategory", () => {
		it("should update an existing category", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create a category
			 */
			const category = await eventRepository.createCategory({
				name: faker.string.sample(20),
			});

			/**
			 * Act
			 *
			 * 1. Update the category
			 */
			const newName = faker.string.sample(20);
			const updatedCategory = await eventRepository.updateCategory({
				id: category.id,
				name: newName,
			});

			expect(updatedCategory).toEqual(
				expect.objectContaining({
					name: newName,
					id: category.id,
				}),
			);
		});

		it("should throw InvalidArgumentError if a category with that name already exists", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create a category
			 * 2. Create a second category
			 */
			const existingName = faker.string.sample(20);
			await eventRepository.createCategory({
				name: existingName,
			});
			const categoryToUpdate = await eventRepository.createCategory({
				name: faker.string.sample(20),
			});

			/**
			 * Act
			 *
			 * 1. Update the category
			 */
			const updatedCategory = eventRepository.updateCategory({
				id: categoryToUpdate.id,
				name: existingName,
			});

			await expect(updatedCategory).rejects.toThrow(InvalidArgumentError);
		});
	});

	describe("#deleteCategory", () => {
		it("should delete an existing category", async () => {
			/**
			 * Arrange
			 *
			 * 1. Create a category
			 */
			const category = await eventRepository.createCategory({
				name: faker.string.sample(20),
			});

			/**
			 * Act
			 *
			 * 1. Delete the category
			 */
			const deletedCategory = await eventRepository.deleteCategory({
				id: category.id,
			});

			expect(deletedCategory).toEqual(
				expect.objectContaining({
					id: category.id,
				}),
			);
		});

		it("should throw NotFoundError if a category with that ID does not exist", async () => {
			/**
			 * Act
			 *
			 * 1. Update the category
			 */
			const deletedCategory = eventRepository.deleteCategory({
				id: faker.string.uuid(),
			});

			await expect(deletedCategory).rejects.toThrow(NotFoundError);
		});
	});

	describe("#getCategories", () => {
		it("should return all categories", async () => {
			const category = await eventRepository.createCategory({
				name: faker.string.uuid(),
			});

			const categories = await eventRepository.getCategories();

			expect(categories).toContainEqual(
				expect.objectContaining({
					id: category.id,
					name: category.name,
				}),
			);
		});

		it("should return all for an event", async () => {
			const category = await eventRepository.createCategory({
				name: faker.string.uuid(),
			});

			const event = await eventRepository.create(makeMockContext(), {
				categories: [{ id: category.id }],
				event: {
					id: faker.string.uuid(),
					organizationId: null,
					startAt: new Date(),
					type: "BASIC",
					signUpsEnabled: false,
					version: 0,
					name: faker.string.uuid(),
					contactEmail: faker.string.uuid(),
					description: faker.string.uuid(),
					endAt: new Date(),
					location: faker.string.uuid(),
					signUpsRetractable: false,
				},
			});

			if (!event.ok) throw event.error;

			const categories = await eventRepository.getCategories({
				eventId: event.data.event.id,
			});

			expect(categories).toEqual([
				expect.objectContaining({
					id: category.id,
					name: category.name,
				}),
			]);
		});
	});
});
