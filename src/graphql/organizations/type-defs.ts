import { gql } from "graphql-tag";

export const typeDefs = gql`
  type Organization {
    id: ID!
    name: String!
    description: String!
    members: [Member!]!
  }

  type Member {
    id: ID!
    user: User!
    organization: Organization!
    role: Role!
  }

  enum Role {
    """
    An admin of the organization, can do everything a member can,
    # and can also manage members in the organization and delete the organization.
    """
    ADMIN
    """
    A member of the organization, can do everything except
    manage members in the organization and delete the organization.
    """
    MEMBER
  }

  input UpdateOrganizationInput {
    """
    The ID of the organization to update
    """
    id: ID!
    """
    The new name of the organization
    Omitting the value or passing null will leave the name unchanged
    """
    name: String
    """
    The new description of the organization, cannot exceed 10 000 characters
    Omitting the value or passing null will leave the description unchanged
    """
    description: String
  }

  type UpdateOrganizationResponse {
    organization: Organization!
  }

  input CreateOrganizationInput {
    """
    The name of the organization, must be unique and between 1 and 100 characters
    """
    name: String!
    """
    The description of the organization, cannot exceed 10 000 characters
    """
    description: String
  }

  type CreateOrganizationResponse {
    organization: Organization!
  }

  input AddMemberInput {
    """
    The ID of the user to add to the organization
    """
    userId: ID!
    """
    The ID of the organization to add the user to
    """
    organizationId: ID!
    """
    The role of the user in the organization, defaults to Role.MEMBER
    """
    role: Role
  }

  type AddMemberResponse {
    member: Member!
  }

  input RemoveMemberByIdInput {
    id: ID!
  }

  input RemoveMemberByUserIdAndOrganizationIdInput {
    userId: ID!
    organizationId: ID!
  }

  union RemoveMemberInput = RemoveMemberByIdInput | RemoveMemberByUserIdAndOrganizationIdInput

  type RemoveMemberResponse {
    member: Member!
  }

  type Mutation {
    """
    Create a new organization, and add the current user as an admin of the organization.
    """
    createOrganization(data: CreateOrganizationInput!): CreateOrganizationResponse!

    """
    Update an organization with the given name and description.
    Passing null or omitting a value will leave the value unchanged.
    """
    updateOrganization(data: UpdateOrganizationInput!): UpdateOrganizationResponse!

    """
    Add a member to the organization
    """
    addMember(data: AddMemberInput!): AddMemberResponse!

    """
    Remove a member from the organization
    If the data.id is given, the membership will be removed by ID.
    If the data.userId and data.organizationId is given, the membership will be removed by the user and organization IDs.
    """
    removeMember(data: RemoveMemberInput!): RemoveMemberResponse!
  }
`;
