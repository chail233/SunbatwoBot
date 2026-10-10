import assert from "node:assert/strict";
import { cp, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

function createContext(text, isAdmin) {
    const messages = [];
    return {
        messages,
        ctx: {
            text,
            isAdmin,
            event: { group_id: "test-group" },
            adapter: {
                sendGroupMsg(groupId, message) {
                    assert.equal(groupId, "test-group");
                    messages.push(message);
                },
            },
        },
    };
}

test("sensitive user commands require admin access and preserve admin behavior", async () => {
    const projectRoot = fileURLToPath(new URL("../", import.meta.url));
    const fixtureRoot = await mkdtemp(join(tmpdir(), "sunbatwobot-command-security-"));
    const fixtureSrc = join(fixtureRoot, "src");
    let recorder;
    let cancelPending;
    let pendingId;

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
            'export default { DevMode: false, owner: "owner", targetGroupId: "test-group", CHAT_HISTORY_LIMIT: 1, EnableProactiveChat: true, mcpServers: [] };\n',
        );

        const fixtureModule = relativePath => pathToFileURL(join(fixtureSrc, relativePath));
        const { default: userCommands } = await import(fixtureModule("pipeline/handlers/user-commands.js"));
        const config = (await import(fixtureModule("config.js"))).default;
        recorder = (await import(fixtureModule("LLM/recorder.js"))).default;
        const approval = await import(fixtureModule("LLM/tool-approval.js"));
        cancelPending = approval.cancel;

        recorder.add({ role: "user", content: { text: "private cached context" } });
        recorder.add({ role: "user", content: { text: "private short context" } });
        pendingId = approval.hold({
            id: "pending-test",
            function: { name: "delete_file", arguments: '{"filepath":"private-script.js"}' },
        }, { userId: "owner", senderName: "owner" });
        assert.ok(pendingId);

        for (const command of ["#clear", "#msgs", "#cmsgs", "#sm", "#pchat false", "#do-pending", `#do-no ${pendingId}`]) {
            const { ctx, messages } = createContext(command, false);
            assert.equal(await userCommands(ctx), true, command);
            assert.deepEqual(messages, ["无权限"], command);
        }

        assert.equal(recorder.length, 1);
        assert.equal(config.EnableProactiveChat, true);

        const guestHelp = createContext("#help", false);
        await userCommands(guestHelp.ctx);
        assert.doesNotMatch(guestHelp.messages[0], /#(clear|msgs|cmsgs|sm|pchat|do-pending|do-yes|do-no)\b/);

        const adminShort = createContext("#msgs", true);
        await userCommands(adminShort.ctx);
        assert.match(adminShort.messages[0], /private short context/);

        const adminCache = createContext("#cmsgs", true);
        await userCommands(adminCache.ctx);
        assert.match(adminCache.messages[0], /private cached context/);

        const adminPending = createContext("#do-pending", true);
        await userCommands(adminPending.ctx);
        assert.match(adminPending.messages[0], /private-script\.js/);

        const adminHelp = createContext("#help", true);
        await userCommands(adminHelp.ctx);
        assert.match(adminHelp.messages[0], /#do-pending/);

        const adminPchat = createContext("#pchat false", true);
        await userCommands(adminPchat.ctx);
        assert.equal(config.EnableProactiveChat, false);
        assert.deepEqual(adminPchat.messages, ["关闭了主动回复"]);
    }
    finally {
        if (pendingId && cancelPending) cancelPending(pendingId);
        if (recorder) recorder.clear();
        await rm(fixtureRoot, { recursive: true, force: true });
    }
});
