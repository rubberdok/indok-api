interface FileType {
	id: string;
	userId: string | null;
	name: string;
}

class RemoteFile implements FileType {
	constructor({
		id,
		userId,
		name,
	}: { id: string; name: string; userId: string | null }) {
		this.id = id;
		this.userId = userId;
		this.name = name;
	}
	name: string;
	userId: string | null;
	id: string;
}

export { RemoteFile, type FileType };
