#!/usr/bin/env node
// bin/opencode-imperial-wrapper.js
// Wrapper script that detects platform and spawns the correct binary

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { getPlatformPackageCandidates, getBinaryPath } from "./platform.js";

const require = createRequire(import.meta.url);
const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Detect libc family on Linux
 * @returns {string | null} 'glibc', 'musl', or null if detection fails
 */
function getLibcFamily() {
  if (process.platform !== "linux") {
    return undefined; // Not needed on non-Linux
  }
  
  try {
    const detectLibc = require("detect-libc");
    return detectLibc.familySync();
  } catch {
    // detect-libc not available
    return null;
  }
}

function supportsAvx2() {
  if (process.arch !== "x64") {
    return null;
  }

  if (process.env.OPENCODE_IMPERIAL_FORCE_BASELINE === "1" || process.env.OH_MY_OPENCODE_FORCE_BASELINE === "1") {
    return false;
  }

  if (process.platform === "linux") {
    try {
      const cpuInfo = readFileSync("/proc/cpuinfo", "utf8").toLowerCase();
      return cpuInfo.includes("avx2");
    } catch {
      return null;
    }
  }

  if (process.platform === "darwin") {
    const probe = spawnSync("sysctl", ["-n", "machdep.cpu.leaf7_features"], {
      encoding: "utf8",
    });

    if (probe.error || probe.status !== 0) {
      return null;
    }

    return probe.stdout.toUpperCase().includes("AVX2");
  }

  return null;
}

function getSignalExitCode(signal) {
  const signalCodeByName = {
    SIGINT: 2,
    SIGILL: 4,
    SIGKILL: 9,
    SIGTERM: 15,
  };

  return 128 + (signalCodeByName[signal] ?? 1);
}

export function resolveInstalledBinaries(packageCandidates, platform) {
  return packageCandidates
    .map((pkg) => {
      try {
        return { pkg, binPath: require.resolve(getBinaryPath(pkg, platform)) };
      } catch {
        return null;
      }
    })
    .filter((entry) => entry !== null);
}

export function tryInstallPlatformPackage(pkg) {
  if (process.env.OPENCODE_IMPERIAL_DISABLE_AUTO_INSTALL === "1") {
    return false;
  }

  const installAttempts = [
    { command: "npm", args: ["install", "--no-save", pkg] },
    { command: "bun", args: ["add", "--no-save", pkg] },
  ];

  for (const attempt of installAttempts) {
    const result = spawnSync(attempt.command, attempt.args, {
      cwd: PACKAGE_ROOT,
      stdio: "inherit",
    });

    if (!result.error && (result.status ?? 1) === 0) {
      return true;
    }
  }

  return false;
}

export function main() {
  const { platform, arch } = process;
  const libcFamily = getLibcFamily();
  const avx2Supported = supportsAvx2();
  
  let packageCandidates;
  try {
    packageCandidates = getPlatformPackageCandidates({
      platform,
      arch,
      libcFamily,
      preferBaseline: avx2Supported === false,
    });
  } catch (error) {
    console.error(`\nopencode-imperial: ${error.message}\n`);
    process.exit(1);
  }

  let resolvedBinaries = resolveInstalledBinaries(packageCandidates, platform);

  if (resolvedBinaries.length === 0) {
    const primaryPackage = packageCandidates[0];
    console.error(`\nopencode-imperial: Platform binary not installed.`);
    console.error(`Attempting to install ${primaryPackage} automatically...\n`);

    if (tryInstallPlatformPackage(primaryPackage)) {
      resolvedBinaries = resolveInstalledBinaries(packageCandidates, platform);
    }

    if (resolvedBinaries.length === 0) {
      console.error(`\nopencode-imperial: Automatic platform package install failed.`);
      console.error(`\nYour platform: ${platform}-${arch}${libcFamily === "musl" ? "-musl" : ""}`);
      console.error(`Expected packages (in order): ${packageCandidates.join(", ")}`);
      console.error(`\nTo fix, run:`);
      console.error(`  npm install ${primaryPackage}\n`);
      process.exit(1);
    }
  }

  for (let index = 0; index < resolvedBinaries.length; index += 1) {
    const currentBinary = resolvedBinaries[index];
    const hasFallback = index < resolvedBinaries.length - 1;
    const result = spawnSync(currentBinary.binPath, process.argv.slice(2), {
      stdio: "inherit",
    });

    if (result.error) {
      if (hasFallback) {
        continue;
      }

      console.error(`\nopencode-imperial: Failed to execute binary.`);
      console.error(`Error: ${result.error.message}\n`);
      process.exit(2);
    }

    if (result.signal === "SIGILL" && hasFallback) {
      continue;
    }

    if (result.signal) {
      process.exit(getSignalExitCode(result.signal));
    }

    process.exit(result.status ?? 1);
  }

  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
