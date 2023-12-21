export const Role = {
	ADMIN: "ADMIN",
	MEMBER: "MEMBER",
} as const;

export type Role = (typeof Role)[keyof typeof Role];
