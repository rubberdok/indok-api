import type { FeaturePermission, Member, Organization } from "@prisma/client";
import type { Role } from "~/domain/organizations.js";
import type { StudyProgram, User } from "~/domain/users.js";
import type { Context } from "~/lib/context.js";
import type { IOrganizationService } from "~/lib/server.js";
import { buildMembers } from "./members.js";
import { buildOrganizations } from "./organizations.js";
import { buildPermissions } from "./permissions.js";

interface OrganizationRepository {
	create(data: {
		name: string;
		description?: string;
		userId: string;
		featurePermissions?: FeaturePermission[];
	}): Promise<Organization>;
	update(
		id: string,
		data: Partial<{
			name: string;
			description: string;
			featurePermissions: FeaturePermission[];
			logoFileId: string;
		}>,
	): Promise<Organization>;
	get(id: string): Promise<Organization>;
	findMany(): Promise<Organization[]>;
	findManyByUserId(data?: { userId?: string }): Promise<Organization[]>;
}

interface MemberRepository {
	create(data: {
		userId: string;
		organizationId: string;
		role?: string;
	}): Promise<Member>;
	remove(
		data: { id: string } | { userId: string; organizationId: string },
	): Promise<Member>;
	findMany(data: { organizationId: string; role?: Role }): Promise<Member[]>;
	get(
		data: { userId: string; organizationId: string } | { id: string },
	): Promise<Member>;
	hasRole(data: {
		userId: string;
		organizationId: string;
		role: Role;
	}): Promise<boolean>;
}

interface PermissionService {
	hasRole(
		ctx: Context,
		data: {
			organizationId: string;
			role: Role;
		},
	): Promise<boolean>;
}

interface UserService {
	get(id: string): Promise<User>;
	getStudyProgram(by: { id: string }): Promise<StudyProgram | null>;
}

type Dependencies = {
	organizationRepository: OrganizationRepository;
	memberRepository: MemberRepository;
	userService: UserService;
};

function OrganizationService(dependencies: Dependencies): IOrganizationService {
	const permissions = buildPermissions(dependencies);
	return {
		members: buildMembers(dependencies, { permissions }),
		organizations: buildOrganizations(dependencies, { permissions }),
		permissions,
	};
}

export type {
	Dependencies,
	UserService,
	PermissionService,
	OrganizationRepository,
	MemberRepository,
};
export { OrganizationService };
