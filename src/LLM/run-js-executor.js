import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

const commonEnvironmentKeys = ["PATH"];
const windowsEnvironmentKeys = ["SystemRoot", "WINDIR"];

/** @typedef {Record<string, string|undefined>} ChildEnvironment */

/**
 * Copy only variables needed to start the Node runtime.
 * @param {ChildEnvironment} source
 * @param {string} platform
 * @returns {ChildEnvironment}
 */
export function buildRunJsEnvironment(source = process.env, platform = process.platform) {
    const allowedKeys = platform === "win32"
        ? [...commonEnvironmentKeys, ...windowsEnvironmentKeys]
        : commonEnvironmentKeys;
    /** @type {ChildEnvironment} */
    const result = {};

    for (const allowedKey of allowedKeys) {
        const sourceKey = platform === "win32"
            ? Object.keys(source).find(key => key.toUpperCase() === allowedKey.toUpperCase())
            : allowedKey;
        if (sourceKey && source[sourceKey] !== undefined) {
            result[allowedKey] = source[sourceKey];
        }
    }

    return result;
}

/**
 * Pass the configured token only to the built-in installer entry point.
 * @param {string} scriptPath
 * @param {object} args
 * @param {string} srcDirectory
 * @param {string|null|undefined} githubToken
 * @returns {object}
 */
export function buildRunJsScriptArgs(scriptPath, args, srcDirectory, githubToken) {
    const installerPath = resolve(srcDirectory, "skills/skill-manager/scripts/install-skill.js");
    return resolve(scriptPath) === installerPath
        ? { ...args, githubToken: githubToken ?? undefined }
        : args;
}

/**
 * Only the built-in skill manager scripts may mutate the skills directory.
 * @param {string} scriptPath
 * @param {string} srcDirectory
 * @returns {string[]}
 */
export function getRunJsWritableDirectories(scriptPath, srcDirectory) {
    const resolvedScript = resolve(scriptPath);
    const installerScripts = [
        resolve(srcDirectory, "skills/skill-manager/scripts/install-skill.js"),
        resolve(srcDirectory, "skills/skill-manager/scripts/uninstall-skill.js"),
    ];
    return installerScripts.includes(resolvedScript)
        ? [resolve(srcDirectory, "skills")]
        : [];
}

function isWithin(directory, candidate) {
    const pathFromDirectory = relative(directory, candidate);
    return pathFromDirectory === "" ||
        (!isAbsolute(pathFromDirectory) && pathFromDirectory !== ".." && !pathFromDirectory.startsWith(`..${sep}`));
}

function addModuleResolutionPaths(scriptPath, projectRoot, readPaths) {
    let current = dirname(resolve(scriptPath));
    const root = resolve(projectRoot);

    while (isWithin(root, current)) {
        const packageJson = resolve(current, "package.json");
        const nodeModules = resolve(current, "node_modules");
        if (existsSync(packageJson)) readPaths.add(packageJson);
        if (existsSync(nodeModules)) readPaths.add(nodeModules);
        if (current === root) break;

        const parent = dirname(current);
        if (parent === current) break;
        current = parent;
    }
}

/**
 * Apply Node filesystem permission allowlists to a child script.
 * @param {string} scriptPath
 * @param {object} args
 * @param {{allowedDirectories: string[], writableDirectories?: string[], projectRoot: string, platform?: string}} options
 * @returns {string[]}
 */
export function buildRunJsNodeArgs(scriptPath, args, options) {
    const platform = options.platform ?? process.platform;
    const allowedDirectories = options.allowedDirectories.map(directory => resolve(directory));
    const writableDirectories = (options.writableDirectories ?? [])
        .map(directory => resolve(directory))
        .filter(directory => allowedDirectories.some(allowed => isWithin(allowed, directory)));
    const readPaths = new Set(allowedDirectories);
    addModuleResolutionPaths(scriptPath, options.projectRoot, readPaths);

    const nodeArgs = [];
    if (platform === "win32") nodeArgs.push("--use-system-ca");
    nodeArgs.push("--permission");
    for (const readPath of readPaths) {
        nodeArgs.push(`--allow-fs-read=${readPath}`);
    }
    for (const writePath of writableDirectories) {
        nodeArgs.push(`--allow-fs-write=${writePath}`);
    }
    nodeArgs.push(resolve(scriptPath), JSON.stringify(args));
    return nodeArgs;
}

/**
 * Execute a JavaScript tool in a restricted Node child process.
 * @param {string} scriptPath
 * @param {object} args
 * @param {{allowedDirectories: string[], writableDirectories?: string[], projectRoot: string, sourceEnv?: ChildEnvironment, platform?: string}} options
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
export function executeRunJs(scriptPath, args, options) {
    const nodeArgs = buildRunJsNodeArgs(scriptPath, args, options);

    return new Promise((resolvePromise, rejectPromise) => {
        execFile(process.execPath, nodeArgs, {
            timeout: 30000,
            env: buildRunJsEnvironment(options.sourceEnv, options.platform),
        }, (error, stdout, stderr) => {
            if (error) {
                if (stderr) rejectPromise(new Error(stderr.trim()));
                else rejectPromise(error);
            }
            else {
                resolvePromise({ stdout, stderr });
            }
        });
    });
}
