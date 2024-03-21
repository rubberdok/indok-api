import { mockDeep } from "jest-mock-extended";
import {
	type BlobStorageAdapter,
	type FileRepository,
	FileService,
} from "../../service.js";

function makeDependencies() {
	const fileRepository = mockDeep<FileRepository>();
	const blobStorageAdapter = mockDeep<BlobStorageAdapter>();
	const files = FileService({ fileRepository, blobStorageAdapter });

	return { fileRepository, blobStorageAdapter, files };
}

export { makeDependencies };
