import type { Role } from "@prisma/client";

/**
 * Create a mock implementation of the hasRole method on the MemberRepository.
 * @param state - The state of the user to mimic, i.e. the user's current relation to the organization
 * @param state.userId - The ID of the user
 * @param state.role - The current role of the user in the organization with organizationId, null if the user it not a member
 * @param state.organizationId - The ID of the organization
 * @returns A mock implementation of the hasRole method on the MemberRepository
 */
export function getMockHasRoleImplementation(state: {
	organizationId: string;
	userId: string;
	role: Role | null;
}): (data: {
	organizationId: string;
	userId: string;
	role: Role;
}) => Promise<boolean> {
	function hasRole(data: {
		organizationId: string;
		userId: string;
		role: Role;
	}): Promise<boolean> {
		if (data.organizationId !== state.organizationId)
			return Promise.resolve(false);
		if (data.userId !== state.userId) return Promise.resolve(false);
		if (data.role !== state.role) return Promise.resolve(false);
		return Promise.resolve(true);
	}
	return hasRole;
}
