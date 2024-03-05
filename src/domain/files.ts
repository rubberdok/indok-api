interface FileType {
	id: string;
	userId: string | null;
}

class File implements FileType {
	constructor({ id, userId }: { id: string; userId: string | null }) {
		this.id = id;
		this.userId = userId;
	}
	userId: string | null;
	id: string;
}

export { File, type FileType };
