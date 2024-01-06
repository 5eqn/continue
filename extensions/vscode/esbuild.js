const esbuild = require("esbuild");
const ncp = require("ncp").ncp;
const fs = require("fs");
const { exec } = require("child_process");

(async () => {
  // Bundles the extension into one file
  await esbuild.build({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    outfile: "out/extension.js",
    external: ["vscode", "esbuild", "../sync.node"],
    format: "cjs",
    platform: "node",
    sourcemap: true,
    loader: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      ".node": "file",
    },
  });

  exec("npm run build-release:rust", (error, stdout, stderr) => {
    if (error) {
      console.log("Error building sync.node");
      console.log("stdout: ", stdout);
      console.log("stderr: ", stderr);
      throw error;
    }

    ncp.ncp("sync.node", "out/sync.node", (err) => {
      if (err) {
        return console.error(err);
      }
    });

    // Return instead of copying if on ARM Mac
    // This is an env var created in the GH Action
    if (process.env.target === "darwin-arm64") {
      return;
    }

    fs.mkdirSync("out/node_modules", { recursive: true });

    ncp.ncp("node_modules/esbuild", "out/node_modules/esbuild", function (err) {
      if (err) {
        return console.error(err);
      }
    });

    ncp.ncp(
      "node_modules/@esbuild",
      "out/node_modules/@esbuild",
      function (err) {
        if (err) {
          return console.error(err);
        }
      }
    );
  });
})();
