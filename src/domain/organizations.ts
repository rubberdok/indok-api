const OrganizationRole = {
	ADMIN: "ADMIN",
	MEMBER: "MEMBER",
} as const;
type OrganizationRoleType =
	(typeof OrganizationRole)[keyof typeof OrganizationRole];

const FeaturePermission = {
	ARCHIVE_VIEW_DOCUMENTS: "ARCHIVE_VIEW_DOCUMENTS",
	ARCHIVE_WRITE_DOCUMENTS: "ARCHIVE_WRITE_DOCUMENTS",
	EVENT_WRITE_SIGN_UPS: "EVENT_WRITE_SIGN_UPS",
	CABIN_ADMIN: "CABIN_ADMIN",
} as const;

type FeaturePermissionType =
	(typeof FeaturePermission)[keyof typeof FeaturePermission];

class Organization {
	id: string;
	name: string;
	description: string;
	logoFileId?: string | null;
	featurePermissions: FeaturePermissionType[];

	constructor(params: Organization) {
		this.id = params.id;
		this.name = params.name;
		this.description = params.description;
		this.logoFileId = params.logoFileId;
		this.featurePermissions = params.featurePermissions;
	}
}

class OrganizationMember {
	id: string;
	userId: string;
	organizationId: string;
	role: OrganizationRoleType;

	constructor(params: OrganizationMember) {
		this.id = params.id;
		this.userId = params.userId;
		this.organizationId = params.organizationId;
		this.role = params.role;
	}
}

export {
	OrganizationRole,
	FeaturePermission,
	Organization,
	OrganizationMember,
};
export type { OrganizationRoleType, FeaturePermissionType };
