import type { DocumentService as DocumentServiceType } from "~/domain/documents.js";
import { type DocumentDependencies, buildDocuments } from "./documents.js";

type Dependencies = DocumentDependencies;

function DocumentService(dependencies: Dependencies): DocumentServiceType {
	return {
		documents: buildDocuments(dependencies),
	};
}

export { DocumentService };
