import { execaNode } from "execa";

describe("Development scripts", () => {
	describe("pnpm run dev", () => {
		it(
			"starts the development server, worker, graphql codegen, and prisma",
			async () => {
				const { stdout } = await execaNode({
					stdout: "inherit",
				})`./scripts/test.js`;
				console.log(stdout);
			},
			60 * 1000,
		);
	});
});
