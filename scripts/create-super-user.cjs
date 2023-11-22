#!/usr/bin/env node

require("yargs")
  .scriptName("create-super-user")
  .usage("$0 <cmd> [args]")
  .command(
    "make-super [userId]",
    "welcome ter yargs!",
    (yargs) => {
      yargs.positional("userId", {
        type: "string",
        describe: "the user id to promote to a super user",
      });
    },
    async function (argv) {
      console.log("Promoting user to a super user...");
      const { PrismaClient } = require("@prisma/client");
      const prismaClient = new PrismaClient();
      const updatedUser = await prismaClient.user.update({
        where: { id: argv.userId },
        data: { isSuperUser: true },
      });
      console.log(`Successfully promoted ${updatedUser.id} to a super user!`);
    }
  )
  .help().argv;
