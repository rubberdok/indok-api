import { type DeepMockProxy, mock } from "jest-mock-extended";
import { CabinService } from "../../index.js";
import type {
	FileService,
	ICabinRepository,
	MailService,
	PermissionService,
} from "../../service.js";

function makeDependencies() {
	const cabinRepository: DeepMockProxy<ICabinRepository> =
		mock<ICabinRepository>();
	const mailService: DeepMockProxy<MailService> = mock<MailService>();
	const permissionService: DeepMockProxy<PermissionService> =
		mock<PermissionService>();
	const fileService: DeepMockProxy<FileService> = mock<FileService>();

	const cabinService: CabinService = new CabinService(
		cabinRepository,
		mailService,
		permissionService,
		fileService,
	);

	return {
		cabinRepository,
		mailService,
		permissionService,
		cabinService,
		fileService,
	};
}

export { makeDependencies };
