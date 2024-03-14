import type { DocumentRepositoryType } from "~/services/documents/documents.js";
import { type DocumentDependencies, buildDocuments } from "./documents.js";

type Dependencies = DocumentDependencies;

function DocumentRepository(
	dependencies: Dependencies,
): DocumentRepositoryType {
	return {
		documents: buildDocuments(dependencies),
	};
}

export { DocumentRepository };
export type { Dependencies };
