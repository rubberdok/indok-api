import type {
	InternalServerError,
	InvalidArgumentErrorV2,
	NotFoundError,
} from "~/domain/errors.js";
import type {
	FeaturePermissionType,
	Organization,
	OrganizationMember,
	OrganizationRoleType,
} from "~/domain/organizations.js";
import type { StudyProgram, User } from "~/domain/users.js";
import type { Context } from "~/lib/context.js";
import type { ResultAsync } from "~/lib/result.js";
import type { IOrganizationService } from "~/lib/server.js";
import { buildMembers } from "./members.js";
import { buildOrganizations } from "./organizations.js";
import { buildPermissions } from "./permissions.js";

interface OrganizationRepository {
	create(data: {
		name: string;
		description?: string;
		userId: string;
		featurePermissions?: FeaturePermissionType[];
		colorScheme?: string;
	}): Promise<Organization>;
	update(
		id: string,
		data: Partial<{
			name: string;
			description: string;
			featurePermissions: FeaturePermissionType[];
			logoFileId: string;
			colorScheme: string;
		}>,
	): Promise<Organization>;
	get(id: string): Promise<Organization>;
	findMany(): Promise<Organization[]>;
	findManyByUserId(data?: { userId?: string }): Promise<Organization[]>;
}

interface MemberRepository {
	create(
		data:
			| {
					userId: string;
					organizationId: string;
					role?: string;
			  }
			| {
					email: string;
					organizationId: string;
					role?: string;
			  },
	): ResultAsync<
		{ member: OrganizationMember },
		NotFoundError | InvalidArgumentErrorV2 | InternalServerError
	>;
	remove(
		data: { id: string } | { userId: string; organizationId: string },
	): Promise<OrganizationMember>;
	findMany(data: {
		organizationId: string;
		role?: OrganizationRoleType;
	}): Promise<OrganizationMember[]>;
	get(
		data: { userId: string; organizationId: string } | { id: string },
	): Promise<OrganizationMember>;
	hasRole(data: {
		userId: string;
		organizationId: string;
		role: OrganizationRoleType;
	}): Promise<boolean>;
	updateRole(
		ctx: Context,
		data: {
			memberId: string;
			role: OrganizationRoleType;
		},
	): ResultAsync<
		{ member: OrganizationMember },
		InternalServerError | NotFoundError
	>;
}

interface PermissionService {
	hasRole(
		ctx: Context,
		data: {
			organizationId: string;
			role: OrganizationRoleType;
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
