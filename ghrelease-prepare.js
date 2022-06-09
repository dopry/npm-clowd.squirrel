#!/usr/bin/env node

"use strict";

/**
 * // TODO : review how https://github.com/kribblo/node-ffmpeg-installer/blob/master/platforms/win32-ia32/package.json
 * // does xplat installs.
 *
 * Download a clowd.squirrel release from github, unzip it, and install it to the bin folder.
 *
 * example asset URl
 * https://github.com/clowd/Clowd.Squirrel/releases/download/2.9.40/SquirrelTools-2.9.40.zip
 */

const path = require("path");
const mkdirp = require("mkdirp");
const fs = require("fs");
const fetch = require("node-fetch");
const os = require("os");
const { pipeline } = require("stream");
const { promisify } = require("util");
const extract = require("extract-zip");
const { spawn } = require("child_process");
const { createWriteStream } = fs;
const streamPipeline = promisify(pipeline);

// Supported architectures from Node's `process.arch`
// see:  https://nodejs.org/api/process.html#processarch
const ARCHS = [
  "arm",
  "arm64",
  "ia32",
  "mips",
  "mipsel",
  "ppc",
  "ppc64",
  "s390",
  "s390x",
  "x64",
];
// valid nodejs platforms
const PLATFORMS = [
  "aix",
  "darwin",
  "freebsd",
  "linux",
  "openbsd",
  "sunos",
  "win32",
];

async function getModulePath() {
  const global =
    process.env.npm_config_global && process.env.npm_config_global == "true";
  const prefix = global
    ? process.env.npm_config_global_prefix
    : process.env.npm_config_local_prefix;
  const suffix = ["node_modules", ...process.env.npm_package_name.split("/")];
  const module_path = path.join(prefix, ...suffix);
  await mkdirp(module_path);
  return module_path;
}

async function getAssetPath(platform = process.platform, arch = process.arch) {
  const module_path = await getModulePath();
  return path.join(module_path, "assets", platform, arch);
}

function validateGhOwner(packageJson) {
  if (!packageJson.ghreleaseInstaller.owner) {
    throw "'ghreleaseInstaller.owner' property must be specified";
  }
  return packageJson.ghreleaseInstaller.owner;
}

function validateGhRepo(packageJson) {
  if (!packageJson.ghreleaseInstaller.repo) {
    throw "'ghreleaseInstaller.repo' property must be specified";
  }
  return packageJson.ghreleaseInstaller.repo;
}

function validateGhVersion(packageJson) {
  if (!packageJson.ghreleaseInstaller.version) {
    throw "'ghreleaseInstaller.version' property must be specified";
  }
  const version = packageJson.ghreleaseInstaller.version;
  return version[0] === "v" ? version.substr(1) : version; // strip the 'v' if necessary v0.0.1 => 0.0.1
}

function validateGhAssetName(packageJson) {
  if (!packageJson.ghreleaseInstaller.assetName) {
    throw "'ghreleaseInstaller.assetName' property must be specified, allowed template vars are ${version}, ${platform}, ${arch}";
  }
  return packageJson.ghreleaseInstaller.assetName;
}

function validateSupportedCpu(packageJson) {
  if (!packageJson.cpu) {
    throw new Error("'cpu' property must be specified ");
  }
  if (!packageJson.cpu.every((cpu) => ARCHS.includes(cpu))) {
    throw new Error(
      "'cpu' property must be an array of valid node.js process.arch"
    );
  }
  return packageJson.cpu;
}

function validateSupportedOS(packageJson) {
  if (!packageJson.os) {
    throw new Error("'os' property must be specified ");
  }
  if (!packageJson.os.every((os) => PLATFORMS.includes(os))) {
    throw new Error(
      "'os' property must be an array of valid node.js process.platform"
    );
  }
  return packageJson.os;
}

function getConfigFromPackageJson() {
  var packageJsonPath = path.join(".", "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    console.error(
      "Unable to find package.json. " +
        "Please run this script at root of the package you want to be installed"
    );
    return;
  }

  var packageJson = JSON.parse(fs.readFileSync(packageJsonPath));
  const owner = validateGhOwner(packageJson);
  const repo = validateGhRepo(packageJson);
  const version = validateGhVersion(packageJson);
  const assetName = validateGhAssetName(packageJson);
  const supportedArchitectures = validateSupportedCpu(packageJson);
  const supportedPlatforms = validateSupportedOS(packageJson);

  return {
    supportedArchitectures,
    supportedPlatforms,
    owner,
    repo,
    version,
    assetName,
  };
}

async function downloadAsset(
  { owner, repo, version, assetName: assetNameTemplate },
  platform = process.platform,
  arch = process.arch
) {
  const assetName = assetNameTemplate
    .replace("${platform}", platform)
    .replace("${arch}", arch)
    .replace("${version}", version);
  const url = `https://github.com/${owner}/${repo}/releases/download/${version}/${assetName}`;
  console.log(`Downloading ${url}`);
  const response = await fetch(url);

  if (!response.ok)
    throw new Error(
      `Failed Downloading Release Asset for ${version} from GitHub: ${response.statusText}`
    );
  const archivePath = path.join(os.tmpdir(), assetName);
  await streamPipeline(response.body, createWriteStream(archivePath));
  return archivePath;
}

async function prepare(
  config,
  platform = process.platform,
  arch = platform.arch
) {
  console.log(`Prepaing ${platform}-${arch}`);
  const archivePath = await downloadAsset(config, platform, arch);
  const extractPath = path.join("assets");
  console.log(`Extracting Archive to ${extractPath}`);
  await extract(archivePath, { dir: path.resolve(extractPath) });
}

async function main() {
  try {
    const config = getConfigFromPackageJson();
    prepare(config);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
