import { Command } from "commander";
import FileSystemIde from "core/util/filesystem";
import fs from "fs";
import { Core } from "./core";
import { IpcMessenger } from "./messenger";

const program = new Command();

program.action(() => {
  try {
    const messenger = new IpcMessenger();
    // const ide = new IpcIde(messenger);
    const ide = new FileSystemIde();
    const core = new Core(messenger, ide);

    // setTimeout(() => {
    //   messenger.mock({
    //     messageId: "2fe7823c-10bd-4771-abb5-781f520039ec",
    //     messageType: "loadSubmenuItems",
    //     data: { title: "issue" },
    //   });
    // }, 1000);
  } catch (e) {
    fs.writeFileSync("./error.log", `${new Date().toISOString()} ${e}\n`);
    console.log("Error: ", e);
    process.exit(1);
  }
});

program.parse(process.argv);
