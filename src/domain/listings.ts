class Listing {
	id: string;
	name: string;
	description: string;
	closesAt: Date;
	applicationUrl: string;
	organizationId: string;

	constructor(
		params: Omit<Listing, "description" | "applicationUrl"> &
			Partial<Pick<Listing, "description" | "applicationUrl">>,
	) {
		this.id = params.id;
		this.name = params.name;
		this.description = params.description ?? "";
		this.closesAt = params.closesAt;
		this.applicationUrl = params.applicationUrl ?? "";
		this.organizationId = params.organizationId;
	}
}

export { Listing };
