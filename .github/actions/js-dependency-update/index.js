const core = require("@actions/core");
const exec = require("@actions/exec");
const github = require("@actions/github");

const validateBranchName = ({ branchName }) =>
  /^[a-zA-Z0-9_\-\.\/]+$/.test(branchName);

const validateDirName = ({ dirName }) => /^[a-zA-Z0-9_\-\/]+$/.test(dirName);

async function run() {
  const baseBranch = core.getInput("base-branch");
  const targetBranch = core.getInput("target-branch");
  const workingDirectory = core.getInput("working-directory");
  const debug = core.getInput("debug");
  const ghToken = core.getInput("gh-token", { required: true });

  core.setSecret(ghToken);

  if (!validateBranchName({ branchName: baseBranch })) {
    core.setFailed(
      "Invalid base branch name. Branch names should ony contains letters, numbers, underscore, hyphens, periods and forward slash.",
    );
    return;
  }
  if (!validateBranchName({ branchName: targetBranch })) {
    core.setFailed(
      "Invalid target branch name. Branch names should ony contains letters, numbers, underscore, hyphens, periods and forward slash.",
    );
    return;
  }
  if (!validateDirName({ dirName: workingDirectory })) {
    core.setFailed(
      "Invalid directory name. Directory names should ony contains letters, numbers, underscore, hyphens and forward slash.",
    );
    return;
  }

  core.info("base branch", baseBranch);
  core.info("target branch", targetBranch);
  core.info("working directory", workingDirectory);

  await exec.exec("npm update", [], {
    cwd: workingDirectory,
  });

  const gitStatus = await exec.getExecOutput(
    "git status -s package-*.json",
    [],
    {
      cwd: workingDirectory,
    },
  );

  if (gitStatus.stdout.length > 0) {
    core.info("dependencies have been updated.");

    await exec.exec(`git config --global user.email "gh-automation@gmail.com"`);
    await exec.exec(`git config --global user.name "Nityanand Rai"`);

    await exec.exec(`git switch -c ${targetBranch}`, [], {
      cwd: workingDirectory,
    });
    await exec.exec(`git add package.json package-lock.json`, [], {
      cwd: workingDirectory,
    });
    await exec.exec(`git commit -m "update package dependencies"`, [], {
      cwd: workingDirectory,
    });
    await exec.exec(`git push -u origin ${targetBranch} -f`, [], {
      cwd: workingDirectory,
    });

    const octokit = github.getOctokit(ghToken);

    try {
      await octokit.rest.pulls.create({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        title: `Update NPM dependencies`,
        body: `This pull request updates NPM packages`,
        base: baseBranch,
        head: targetBranch,
      });
    } catch (e) {
      core.error(
        "[js-dependency-update] : Something went wrong while creating the PR. Check logs below.",
      );
      core.setFailed(e.message);
      core.error(e);
    }
  }

  core.info("I am a custom JS action");
}

run();
