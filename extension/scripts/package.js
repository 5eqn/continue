const { exec } = require("child_process");
const fs = require("fs");

exec("npm install", (error) => {
  if (error) throw error;
  console.log("npm install completed");

  exec("npm run typegen", (error) => {
    if (error) throw error;
    console.log("npm run typegen completed");

    exec("npm run clientgen", (error) => {
      if (error) throw error;
      console.log("npm run clientgen completed");

      process.chdir("react-app");

      exec("npm install", (error) => {
        if (error) throw error;
        console.log("npm install in react-app completed");

        exec("npm run build", (error) => {
          if (error) throw error;
          console.log("npm run build in react-app completed");

          process.chdir("..");

          if (!fs.existsSync("build")) {
            fs.mkdirSync("build");
          }

          exec("vsce package --out ./build", (error) => {
            if (error) throw error;
            console.log("vsce package completed");
          });
        });
      });
    });
  });
});
