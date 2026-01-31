import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const root = process.cwd();
const aurDir = join(root, "aur");
const aurRepoDir = join(root, "aur-repo");

function run(cmd: string, args: string[], options: { cwd?: string } = {}) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    cwd: options.cwd ?? root,
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(" ")}`);
  }
}

function runCapture(cmd: string, args: string[], options: { cwd?: string } = {}) {
  const result = spawnSync(cmd, args, {
    stdio: ["ignore", "pipe", "pipe"],
    cwd: options.cwd ?? root,
    env: process.env,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(" ")}`);
  }

  return result.stdout.trim();
}

function ensureCleanGit(cwd: string, label: string) {
  const status = runCapture("git", ["status", "--porcelain"], { cwd });
  if (status.trim().length > 0) {
    console.log(`Repository ${label} is not clean. Auto-committing...`);
    run("git", ["add", "."], { cwd });
    run("git", ["commit", "-m", "chore: pre-release cleanup"], { cwd });
  }
}

function updateJsonVersion(path: string, version: string) {
  const content = readFileSync(path, "utf8");
  const data = JSON.parse(content) as Record<string, unknown>;
  data.version = version;
  writeFileSync(path, `${JSON.stringify(data, null, "\t")}\n`);
}

function updateCargoTomlVersion(path: string, version: string) {
  const content = readFileSync(path, "utf8");
  const updated = content.replace(/^version = ".*"$/m, `version = "${version}"`);
  writeFileSync(path, updated);
}

function updatePkgbuild(path: string, version: string, sha256: string) {
  const content = readFileSync(path, "utf8");
  const updated = content
    .replace(/^pkgver=.*$/m, `pkgver=${version}`)
    .replace(/^sha256sums=\('.*'\)$/m, `sha256sums=('${sha256}')`);
  writeFileSync(path, updated);
}

async function chooseVersion(currentVersion: string) {
  const parts = currentVersion.split(".").map((value) => Number(value));
  if (parts.length !== 3 || parts.some((value) => Number.isNaN(value))) {
    throw new Error(`Invalid current version: ${currentVersion}`);
  }

  const [major, minor, patch] = parts;
  const options = [
    { key: "major", label: `major -> ${major + 1}.0.0`, version: `${major + 1}.0.0` },
    { key: "minor", label: `minor -> ${major}.${minor + 1}.0`, version: `${major}.${minor + 1}.0` },
    { key: "patch", label: `patch -> ${major}.${minor}.${patch + 1}`, version: `${major}.${minor}.${patch + 1}` },
  ];

  const rl = readline.createInterface({ input, output });
  try {
    console.log(`Current version: ${currentVersion}`);
    console.log("Choose release type:");
    options.forEach((option, index) => {
      console.log(` ${index + 1}) ${option.label}`);
    });

    while (true) {
      const answer = (await rl.question("Option (1-3 or name): ")).trim().toLowerCase();
      const byIndex = Number(answer);
      if (!Number.isNaN(byIndex) && byIndex >= 1 && byIndex <= options.length) {
        return options[byIndex - 1];
      }

      const byKey = options.find((option) => option.key === answer);
      if (byKey) {
        return byKey;
      }

      console.log("Invalid option, try again.");
    }
  } finally {
    rl.close();
  }
}

async function main() {
  // Check if AUR repo exists
  const hasAur = existsSync(aurRepoDir);
  if (!hasAur) {
    console.log("⚠️  aur-repo/ not found. AUR publish will be skipped.");
    console.log("   To enable: git clone ssh://aur@aur.archlinux.org/witch-bin.git aur-repo\n");
  }

  ensureCleanGit(root, "main");
  if (hasAur) {
    ensureCleanGit(aurRepoDir, "AUR");
  }

  const pkgPath = join(root, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
  if (!pkg.version) {
    throw new Error("Could not find version in package.json");
  }

  const choice = await chooseVersion(pkg.version);
  const newVersion = choice.version;

  // Update versions
  updateJsonVersion(pkgPath, newVersion);
  updateCargoTomlVersion(join(root, "apps/desktop/src-tauri", "Cargo.toml"), newVersion);
  updateJsonVersion(join(root, "apps/desktop/src-tauri", "tauri.conf.json"), newVersion);

  // Build
  console.log("Building the app...");
  run("bun", ["run", "build"]);

  // Find generated .deb
  const debDir = join(root, "apps/desktop/src-tauri", "target", "release", "bundle", "deb");
  const expectedDeb = join(debDir, `witch_${newVersion}_amd64.deb`);
  let debPath = expectedDeb;

  if (!existsSync(expectedDeb)) {
    if (!existsSync(debDir)) {
      throw new Error(`Deb directory not found: ${debDir}`);
    }
    const candidates = readdirSync(debDir).filter((file) => file.endsWith(".deb"));
    if (candidates.length === 1) {
      debPath = join(debDir, candidates[0]);
    } else if (candidates.length === 0) {
      throw new Error("No .deb file found in bundle directory");
    } else {
      throw new Error(`Multiple .deb files found: ${candidates.join(", ")}`);
    }
  }

  // Compute sha256 for AUR
  const sha256 = runCapture("sha256sum", [debPath]).split(/\s+/)[0];

  // Update PKGBUILDs
  updatePkgbuild(join(aurDir, "PKGBUILD"), newVersion, sha256);
  if (hasAur) {
    updatePkgbuild(join(aurRepoDir, "PKGBUILD"), newVersion, sha256);

    // Generate .SRCINFO
    const srcinfo = runCapture("makepkg", ["--printsrcinfo"], { cwd: aurRepoDir });
    writeFileSync(join(aurRepoDir, ".SRCINFO"), `${srcinfo}\n`);
  }

  // Commit and tag main repo
  run("git", [
    "add",
    "package.json",
    "apps/desktop/src-tauri/Cargo.toml",
    "apps/desktop/src-tauri/tauri.conf.json",
    "aur/PKGBUILD",
  ]);
  run("git", ["commit", "-m", `release v${newVersion}`]);
  run("git", ["tag", `v${newVersion}`]);
  run("git", ["push"]);
  run("git", ["push", "--tags"]);

  // Create/update GitHub release
  const releaseTag = `v${newVersion}`;
  const releaseExists = spawnSync("gh", ["release", "view", releaseTag], {
    stdio: "ignore",
  });

  if (releaseExists.status === 0) {
    run("gh", ["release", "upload", releaseTag, debPath, "--clobber"]);
  } else {
    run("gh", ["release", "create", releaseTag, debPath, "--title", releaseTag, "--notes", `Release ${releaseTag}`]);
  }

  // Publish to AUR
  if (hasAur) {
    run("git", ["add", "PKGBUILD", ".SRCINFO"], { cwd: aurRepoDir });
    run("git", ["commit", "-m", `release v${newVersion}`], { cwd: aurRepoDir });
    run("git", ["push"], { cwd: aurRepoDir });
    console.log(`\n✨ Release ${newVersion} published to GitHub + AUR!`);
  } else {
    console.log(`\n✨ Release ${newVersion} published to GitHub!`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
