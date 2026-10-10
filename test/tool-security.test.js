import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, rmdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildRunJsEnvironment, buildRunJsNodeArgs, buildRunJsScriptArgs, executeRunJs, getRunJsWritableDirectories } from "../src/LLM/run-js-executor.js";
import { requiresAdminConfirmation } from "../src/LLM/tool-approval-policy.js";

test("run_JS and delete_file require confirmation for administrators and non-administrators", () => {
    const gatedTools = ["create_file", "delete_file", "run_JS"];
    const adminConfirmTools = ["delete_file", "run_JS"];

    assert.equal(requiresAdminConfirmation("run_JS", { isAdmin: true }, false, gatedTools, adminConfirmTools), true);
    assert.equal(requiresAdminConfirmation("run_JS", { isAdmin: false }, false, gatedTools, adminConfirmTools), true);
    assert.equal(requiresAdminConfirmation("delete_file", { isAdmin: true }, false, gatedTools, adminConfirmTools), true);
    assert.equal(requiresAdminConfirmation("delete_file", { isAdmin: false }, false, gatedTools, adminConfirmTools), true);
    assert.equal(requiresAdminConfirmation("create_file", { isAdmin: true }, false, gatedTools, adminConfirmTools), false);
    assert.equal(requiresAdminConfirmation("create_file", { isAdmin: false }, false, gatedTools, adminConfirmTools), true);
    assert.equal(requiresAdminConfirmation("run_JS", { isAdmin: true }, true, gatedTools, adminConfirmTools), false);
    assert.equal(requiresAdminConfirmation("get_memory", { isAdmin: false }, false, gatedTools, adminConfirmTools), false);
});

test("run_JS child environment excludes credentials and user configuration", () => {
    assert.deepEqual(buildRunJsEnvironment({
        PATH: "/usr/bin",
        HOME: "/home/bot",
        NODE_PATH: "/opt/private-modules",
        NODE_OPTIONS: "--require /tmp/injected.js",
        API_KEY: "secret",
    }, "linux"), { PATH: "/usr/bin" });

    assert.deepEqual(buildRunJsEnvironment({
        Path: "C:\\Windows\\System32",
        SystemRoot: "C:\\Windows",
        WINDIR: "C:\\Windows",
        TEMP: "C:\\Temp",
        USERPROFILE: "C:\\Users\\bot",
        API_KEY: "secret",
    }, "win32"), {
        PATH: "C:\\Windows\\System32",
        SystemRoot: "C:\\Windows",
        WINDIR: "C:\\Windows",
    });
});

test("run_JS node arguments confine file permissions to configured directories", () => {
    const projectRoot = resolve(tmpdir(), "bot");
    const skills = join(projectRoot, "src", "skills");
    const workspace = join(projectRoot, "src", "workspace");
    const nodeArgs = buildRunJsNodeArgs(join(workspace, "probe.js"), { value: 1 }, {
        allowedDirectories: [skills, workspace],
        projectRoot,
        platform: "linux",
    });

    assert.ok(nodeArgs.includes("--permission"));
    assert.ok(nodeArgs.includes(`--allow-fs-read=${skills}`));
    assert.equal(nodeArgs.some(arg => arg.startsWith("--allow-fs-write=")), false);
    assert.equal(nodeArgs.some(arg => arg.includes("configDev.js")), false);
    assert.equal(nodeArgs.includes("--allow-child-process"), false);
});

test("only built-in skill manager entry points receive skill write access", () => {
    const srcDirectory = resolve(tmpdir(), "bot", "src");
    assert.deepEqual(getRunJsWritableDirectories(
        join(srcDirectory, "skills", "skill-manager", "scripts", "install-skill.js"),
        srcDirectory,
    ), [join(srcDirectory, "skills")]);
    assert.deepEqual(getRunJsWritableDirectories(
        join(srcDirectory, "skills", "skill-manager", "scripts", "uninstall-skill.js"),
        srcDirectory,
    ), [join(srcDirectory, "skills")]);
    assert.deepEqual(getRunJsWritableDirectories(join(srcDirectory, "workspace", "probe.js"), srcDirectory), []);
});

test("the configured GitHub token is passed only to the built-in skill installer", () => {
    const srcDirectory = resolve(tmpdir(), "bot", "src");
    const args = { repo: "owner/repo" };
    const token = "test-token";
    const installerPath = join(srcDirectory, "skills", "skill-manager", "scripts", "install-skill.js");

    assert.deepEqual(buildRunJsScriptArgs(installerPath, args, srcDirectory, token), {
        repo: "owner/repo",
        githubToken: token,
    });
    assert.deepEqual(JSON.parse(JSON.stringify(buildRunJsScriptArgs(installerPath, args, srcDirectory, null))), args);
    assert.deepEqual(buildRunJsScriptArgs(join(srcDirectory, "workspace", "probe.js"), args, srcDirectory, token), args);
    assert.deepEqual(args, { repo: "owner/repo" });
});

test("skill manager API no longer imports the private bot configuration", async () => {
    const api = await import("../src/skills/skill-manager/scripts/github-api.js");
    assert.equal(typeof api.installSkill, "function");
    assert.equal(typeof api.uninstallSkill, "function");
});

test("callTool requires run_JS approval and records confirmed edit_file results", async (t) => {
    const srcDirectory = fileURLToPath(new URL("../src/", import.meta.url));
    const configDevPath = join(srcDirectory, "configDev.js");
    if (existsSync(configDevPath)) {
        t.skip("refusing to replace an existing local configDev.js");
        return;
    }

    const workspace = join(srcDirectory, "workspace");
    const workspaceExisted = existsSync(workspace);
    const scriptPath = join(workspace, `approval-probe-${randomUUID()}.js`);
    const editFilePath = join(workspace, `approval-edit-${randomUUID()}.txt`);
    const secretName = "RUN_JS_APPROVAL_TEST_SECRET";
    const previousSecret = process.env[secretName];
    let createdConfig = false;

    try {
        await writeFile(configDevPath, "export default { DevMode: false, githubToken: 'fixture-token' };\n");
        createdConfig = true;
        await mkdir(workspace, { recursive: true });
        await writeFile(scriptPath, `
            console.log(JSON.stringify({
                secret: process.env.${secretName} ?? null,
                environmentKeys: Object.keys(process.env).sort(),
            }));
        `);
        await writeFile(editFilePath, "before");
        process.env[secretName] = "parent-secret-marker";

        const { callTool } = await import("../src/LLM/tools.js");
        const { confirm } = await import("../src/LLM/tool-approval.js");
        const recorder = (await import("../src/LLM/recorder.js")).default;
        recorder.clear();

        const toolCall = {
            id: randomUUID(),
            function: {
                name: "run_JS",
                arguments: JSON.stringify({ filepath: `workspace/${basename(scriptPath)}` }),
            },
        };
        const pending = await callTool(toolCall, {
            isAdmin: true,
            userId: "owner",
            senderName: "Owner",
        });
        assert.match(pending, /待确认操作/);
        const approvalId = pending.match(/#([a-f0-9]{4})/)?.[1];
        assert.ok(approvalId);

        const confirmation = await confirm(approvalId);
        assert.equal(confirmation.ok, true);
        const recordedMessage = recorder.getAll().at(-1);
        assert.ok(recordedMessage);
        const recordedResult = JSON.parse(recordedMessage.content).text;
        assert.match(recordedResult, /"secret":null/);
        const approvalResult = JSON.parse(recordedResult.slice(recordedResult.indexOf("\n") + 1));
        assert.ok(approvalResult.environmentKeys.includes("PATH"));
        assert.equal(approvalResult.environmentKeys.includes(secretName), false);
        assert.equal(recordedResult.includes("parent-secret-marker"), false);

        recorder.clear();
        const editToolCall = {
            id: randomUUID(),
            function: {
                name: "edit_file",
                arguments: JSON.stringify({
                    filepath: `workspace/${basename(editFilePath)}`,
                    edits: [{ oldText: "before", newText: "after" }],
                }),
            },
        };
        const editPending = await callTool(editToolCall, {
            isAdmin: false,
            userId: "member",
            senderName: "Member",
        });
        assert.match(editPending, /待确认操作/);
        const editApprovalId = editPending.match(/#([a-f0-9]{4})/)?.[1];
        assert.ok(editApprovalId);

        const editConfirmation = await confirm(editApprovalId);
        assert.equal(editConfirmation.ok, true);
        assert.equal(await readFile(editFilePath, "utf8"), "after");
        const editResult = JSON.parse(recorder.getAll().at(-1).content).text;
        assert.match(editResult, /edit_file调用结果:\n文件编辑成功/);
        assert.equal(editResult.includes("undefined"), false);
    }
    finally {
        if (previousSecret === undefined) delete process.env[secretName];
        else process.env[secretName] = previousSecret;
        await rm(scriptPath, { force: true });
        await rm(editFilePath, { force: true });
        if (createdConfig) await rm(configDevPath, { force: true });
        if (!workspaceExisted) {
            await rmdir(workspace).catch(error => {
                if (error.code !== "ENOENT" && error.code !== "ENOTEMPTY") throw error;
            });
        }
    }
});

test("run_JS executes with a clean environment and cannot read outside allowed directories", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "sunbatwobot-run-js-"));
    const srcDir = join(projectRoot, "src");
    const workspace = join(srcDir, "workspace");
    const skills = join(srcDir, "skills");
    await mkdir(workspace, { recursive: true });
    await mkdir(skills, { recursive: true });
    await writeFile(join(projectRoot, "package.json"), '{"type":"module"}');

    try {
        const configPath = join(srcDir, "configDev.js");
        await writeFile(configPath, "export default { secret: 'not-for-child' };\n");
        const probePath = join(workspace, "probe.js");
        await writeFile(probePath, `
            import { readFileSync, symlinkSync, writeFileSync } from "node:fs";
            let configRead;
            try {
                readFileSync(${JSON.stringify(configPath)}, "utf8");
                configRead = "allowed";
            } catch (error) {
                configRead = error.code;
            }
            let writeResult;
            try {
                writeFileSync(new URL("./blocked.txt", import.meta.url), "blocked");
                writeResult = "allowed";
            } catch (error) {
                writeResult = error.code;
            }
            let symlinkResult;
            try {
                symlinkSync(${JSON.stringify(configPath)}, new URL("./outside-link.js", import.meta.url));
                symlinkResult = "allowed";
            } catch (error) {
                symlinkResult = error.code;
            }
            console.log(JSON.stringify({
                configRead,
                writeResult,
                symlinkResult,
                environmentKeys: Object.keys(process.env).sort(),
                secret: process.env.RUN_JS_TEST_SECRET ?? null,
                home: process.env.HOME ?? null,
                args: JSON.parse(process.argv[2]),
            }));
        `);

        const result = await executeRunJs(probePath, { value: "ok" }, {
            allowedDirectories: [workspace, skills],
            projectRoot,
            sourceEnv: {
                PATH: process.env.PATH,
                HOME: "/private/home",
                RUN_JS_TEST_SECRET: "secret-marker",
            },
        });
        const output = JSON.parse(result.stdout.trim());

        assert.equal(output.configRead, "ERR_ACCESS_DENIED");
        assert.equal(output.writeResult, "ERR_ACCESS_DENIED");
        assert.equal(output.symlinkResult, "ERR_ACCESS_DENIED");
        assert.ok(output.environmentKeys.includes("PATH"));
        assert.equal(output.environmentKeys.includes("RUN_JS_TEST_SECRET"), false);
        assert.equal(output.secret, null);
        assert.equal(output.home, null);
        assert.deepEqual(output.args, { value: "ok" });

        const installerPath = join(skills, "skill-manager", "scripts", "install-skill.js");
        await mkdir(dirname(installerPath), { recursive: true });
        await writeFile(installerPath, `
            import { writeFileSync } from "node:fs";
            writeFileSync(new URL("../../installed.txt", import.meta.url), "installed");
            console.log("installed");
        `);
        const installerResult = await executeRunJs(installerPath, {}, {
            allowedDirectories: [workspace, skills],
            writableDirectories: getRunJsWritableDirectories(installerPath, srcDir),
            projectRoot,
            sourceEnv: { PATH: process.env.PATH },
        });
        assert.equal(installerResult.stdout.trim(), "installed");
        assert.equal(await readFile(join(skills, "installed.txt"), "utf8"), "installed");
    }
    finally {
        await rm(projectRoot, { recursive: true, force: true });
    }
});
