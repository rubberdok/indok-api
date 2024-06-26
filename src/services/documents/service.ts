import type { DocumentService as DocumentServiceType } from "~/domain/documents.js";
import { type CategoryDependencies, buildCategories } from "./categories.js";
import { type DocumentDependencies, buildDocuments } from "./documents.js";

type DocumentServiceDependencies = DocumentDependencies & CategoryDependencies;

function DocumentService(dependencies: DocumentServiceDependencies): DocumentServiceType {
  return {
    documents: buildDocuments(dependencies),
    categories: buildCategories(dependencies),
  };
}

export { DocumentService };
export type { DocumentServiceDependencies }
