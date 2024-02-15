import { mockDeep } from "jest-mock-extended";
import {
	type EventRepository,
	EventService,
	type PermissionService,
	type ProductService,
	type UserService,
} from "../../service.js";
import type { SignUpQueueType } from "../../worker.js";

function makeDependencies() {
	const permissionService = mockDeep<PermissionService>();
	const eventsRepository = mockDeep<EventRepository>();
	const userService = mockDeep<UserService>();
	const productService = mockDeep<ProductService>();
	const service = new EventService(
		eventsRepository,
		permissionService,
		userService,
		productService,
		mockDeep<SignUpQueueType>(),
	);
	return {
		permissionService,
		eventsRepository,
		service,
		userService,
		productService,
	};
}
export { makeDependencies };
