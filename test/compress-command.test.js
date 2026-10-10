import assert from "node:assert/strict";
import { cp, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

test("#compress waits for completion and reports rejected compression", async () => {
    const projectRoot = fileURLToPath(new URL("../", import.meta.url));
    const fixtureRoot = await mkdtemp(join(tmpdir(), "sunbatwobot-compress-command-"));
    const fixtureSrc = join(fixtureRoot, "src");
    let recorder;
    let logger;
    let originalSummarizeCache;
    let originalLogError;
    let originalRecorderState;

    try {
        await writeFile(join(fixtureRoot, "package.json"), '{"type":"module"}\n');
        await symlink(
            join(projectRoot, "node_modules"),
            join(fixtureRoot, "node_modules"),
            process.platform === "win32" ? "junction" : "dir",
        );
        await cp(join(projectRoot, "src"), fixtureSrc, {
            recursive: true,
            filter: source => basename(source) !== "configDev.js",
        });
        await writeFile(
            join(fixtureSrc, "configDev.js"),
            'export default { DevMode: false, owner: "owner", targetGroupId: "test-group", mcpServers: [] };\n',
        );

        const fixtureModule = relativePath => pathToFileURL(join(fixtureSrc, relativePath));
        const { default: userCommands } = await import(fixtureModule("pipeline/handlers/user-commands.js"));
        recorder = (await import(fixtureModule("LLM/recorder.js"))).default;
        logger = (await import(fixtureModule("utils/logger.js"))).default;
        originalSummarizeCache = recorder.summarizeCache;
        originalLogError = logger.error;
        originalRecorderState = {
            messages: recorder._messages,
            cache: recorder._cache,
            midSummary: recorder._midSummary,
            needsSummarization: recorder._needsSummarization,
        };

        const sent = [];
        const ctx = {
            text: "#compress",
            isAdmin: true,
            event: { group_id: "test-group" },
            adapter: { sendGroupMsg: (_groupId, message) => sent.push(message) },
        };
        let finishCompression;
        let compressionFinished = false;
        recorder.summarizeCache = () => new Promise(resolve => {
            finishCompression = () => {
                recorder._midSummary = "compressed summary";
                compressionFinished = true;
                resolve();
            };
        });

        const pendingCommand = userCommands(ctx);
        await new Promise(resolve => setImmediate(resolve));
        assert.deepEqual(sent, []);
        finishCompression();
        assert.equal(await pendingCommand, true);
        assert.equal(compressionFinished, true);
        assert.equal(recorder.getMidSummary(), "compressed summary");
        assert.deepEqual(sent, ["压缩完成"]);

        const loggedErrors = [];
        logger.error = (...args) => loggedErrors.push(args);
        recorder.summarizeCache = async () => {
            throw new Error("compression probe");
        };
        sent.length = 0;

        assert.equal(await userCommands(ctx), true);
        assert.deepEqual(sent, ["压缩失败"]);
        assert.equal(loggedErrors.length, 1);
        assert.match(loggedErrors[0][0], /短期记忆压缩失败/);
        assert.match(loggedErrors[0][1].message, /compression probe/);
    }
    finally {
        if (recorder && originalSummarizeCache) recorder.summarizeCache = originalSummarizeCache;
        if (logger && originalLogError) logger.error = originalLogError;
        if (recorder && originalRecorderState) {
            recorder._messages = originalRecorderState.messages;
            recorder._cache = originalRecorderState.cache;
            recorder._midSummary = originalRecorderState.midSummary;
            recorder._needsSummarization = originalRecorderState.needsSummarization;
        }
        await rm(fixtureRoot, { recursive: true, force: true });
    }
});
