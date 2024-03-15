import type { InvalidArgumentErrorV2, NotFoundError } from "~/domain/errors.js";
import type { OrganizationMember } from "~/domain/organizations.js";

export type {
	Organization as OrganizationMapper,
	OrganizationMember as MemberMapper,
} from "~/domain/organizations.js";

type AddMemberErrorResponseMapper = {
	error: InvalidArgumentErrorV2 | NotFoundError;
};

type AddMemberSuccessResponseMapper = {
	member: OrganizationMember;
};

export type { AddMemberErrorResponseMapper, AddMemberSuccessResponseMapper };
