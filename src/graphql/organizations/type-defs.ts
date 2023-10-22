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
    ADMIN
    MEMBER
  }

  input UpdateOrganizationInput {
    id: ID!
    name: String
    description: String
  }

  type UpdateOrganizationResponse {
    organization: Organization!
  }

  input CreateOrganizationInput {
    name: String!
    description: String
  }

  type CreateOrganizationResponse {
    organization: Organization!
  }

  input AddMemberInput {
    userId: ID!
    organizationId: ID!
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
    createOrganization(data: CreateOrganizationInput!): CreateOrganizationResponse!
    updateOrganization(data: UpdateOrganizationInput!): UpdateOrganizationResponse!
    addMember(data: AddMemberInput!): AddMemberResponse!
    removeMember(data: RemoveMemberInput!): RemoveMemberResponse!
  }
`;
