import type { DocumentServiceDependencies } from "~/services/documents/service.js";
import { type CategoryDependencies, buildCategories } from "./categories.js";
import { type DocumentDependencies, buildDocuments } from "./documents.js";

type Dependencies = DocumentDependencies & CategoryDependencies;

function DocumentRepository(
	dependencies: Dependencies,
): DocumentServiceDependencies["repository"] {
	return {
		documents: buildDocuments(dependencies),
		categories: buildCategories(dependencies),
	};
}

export { DocumentRepository };
export type { Dependencies };
