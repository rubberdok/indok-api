#!/usr/bin/env node"use strict""use strict""use strict"

require("yargs")
	.scriptName("create-super-user")
	.usage("$0 <cmd> [args]")
	.command(
		"make-super [userId]",
		"make an existing user a super user",
		(yargs) => {
			yargs.positional("userId", {
				type: "string",
				describe: "the user id to promote to a super user",
			});
		},
		async (argv) => {
			console.log("Promoting user to a super user...");
			const { PrismaClient } = require("@prisma/client");
			const prismaClient = new PrismaClient();
			const updatedUser = await prismaClient.user.update({
				where: { id: argv.userId },
				data: { isSuperUser: true },
			});
			console.log(`Successfully promoted ${updatedUser.id} to a super user!`);
		},
	)
	.help().argv;
