const core = require("@actions/core");

const run = async () => {
  const prTitle = core.getInput("pr-title");

  if (prTitle.trim() && prTitle.trim().startsWith("feat")) {
    core.info("PR is feature");
  } else {
    core.error("PR is not a feature");
  }
};
