import assert from "node:assert/strict";
import { once } from "node:events";
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import WebSocket from "ws";

function connect(url, options = {}) {
    return new Promise((resolve, reject) => {
        const client = new WebSocket(url, options);
        client.once("open", () => resolve({ client, statusCode: 101 }));
        client.once("unexpected-response", (_request, response) => {
            response.resume();
            resolve({ client, statusCode: response.statusCode });
        });
        client.once("error", reject);
    });
}

async function closeClient(client) {
    if (client.readyState === WebSocket.CLOSED) return;

    await new Promise(resolve => {
        const finish = () => {
            clearTimeout(timeout);
            resolve();
        };
        const timeout = setTimeout(() => {
            client.terminate();
            finish();
        }, 1000);
        client.once("close", finish);
        client.close();
    });
}

test("OneBot WebSocket requires a token and delivers events only after authenticated upgrade", async () => {
    const projectRoot = fileURLToPath(new URL("../", import.meta.url));
    const fixtureRoot = await mkdtemp(join(tmpdir(), "sunbatwobot-ws-security-"));
    const fixtureSrc = join(fixtureRoot, "src");
    const configDevPath = join(fixtureSrc, "configDev.js");
    const token = "websocket-test-token";
    let wss;
    let explicitHostWss;
    const clients = [];

    try {
        await mkdir(join(fixtureSrc, "bot"), { recursive: true });
        await mkdir(join(fixtureSrc, "utils"), { recursive: true });
        await writeFile(join(fixtureRoot, "package.json"), '{"type":"module"}\n');
        await symlink(
            join(projectRoot, "node_modules"),
            join(fixtureRoot, "node_modules"),
            process.platform === "win32" ? "junction" : "dir",
        );
        for (const relativePath of [
            "src/config.js",
            "src/bot/server.js",
            "src/bot/adapter.js",
            "src/utils/logger.js",
        ]) {
            await cp(join(projectRoot, relativePath), join(fixtureRoot, relativePath));
        }
        await writeFile(configDevPath, `export default { DevMode: false, token: ${JSON.stringify(token)}, wsPort: 0 };\n`);

        const { startOneBotServer } = await import(pathToFileURL(join(fixtureSrc, "bot/server.js")));
        const config = (await import(pathToFileURL(join(fixtureSrc, "config.js")))).default;
        const configuredToken = config.token;
        try {
            for (const invalidToken of [null, "", "your_token_here"]) {
                config.token = invalidToken;
                assert.throws(() => startOneBotServer(() => {}), /non-placeholder OneBot token/);
            }
        }
        finally {
            config.token = configuredToken;
        }

        let resolveEvent;
        const receivedEvent = new Promise(resolve => {
            resolveEvent = resolve;
        });
        wss = startOneBotServer(event => resolveEvent(event));
        await once(wss, "listening");

        const address = wss.address();
        assert.ok(address && typeof address !== "string");
        assert.equal(address.address, "127.0.0.1");
        const url = `ws://127.0.0.1:${address.port}/onebot/v11/ws`;

        const missingToken = await connect(url);
        assert.equal(missingToken.statusCode, 401);
        missingToken.client.terminate();

        const wrongToken = await connect(url, { headers: { Authorization: "Bearer wrong-token" } });
        assert.equal(wrongToken.statusCode, 401);
        wrongToken.client.terminate();

        const wrongQueryToken = await connect(`${url}?access_token=wrong-token`);
        assert.equal(wrongQueryToken.statusCode, 401);
        wrongQueryToken.client.terminate();

        const headerAuth = await connect(url, { headers: { Authorization: `Bearer ${token}` } });
        assert.equal(headerAuth.statusCode, 101);
        clients.push(headerAuth.client);

        const event = {
            post_type: "message",
            message_type: "group",
            user_id: "owner",
            group_id: "test-group",
            raw_message: "authenticated websocket probe",
        };
        const eventTimeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("authenticated event was not delivered")), 3000).unref();
        });
        headerAuth.client.send(JSON.stringify(event));
        assert.deepEqual(await Promise.race([receivedEvent, eventTimeout]), event);

        const queryAuth = await connect(`${url}?access_token=${encodeURIComponent(token)}`);
        assert.equal(queryAuth.statusCode, 101);
        clients.push(queryAuth.client);

        config.wsHost = "127.0.0.2";
        explicitHostWss = startOneBotServer(() => {});
        await once(explicitHostWss, "listening");
        const explicitHostAddress = explicitHostWss.address();
        assert.ok(explicitHostAddress && typeof explicitHostAddress !== "string");
        assert.equal(explicitHostAddress.address, "127.0.0.2");
        await new Promise(resolve => explicitHostWss.close(resolve));
        explicitHostWss = null;
    }
    finally {
        await Promise.all(clients.map(closeClient));
        if (explicitHostWss) await new Promise(resolve => explicitHostWss.close(resolve));
        if (wss) await new Promise(resolve => wss.close(resolve));
        await rm(fixtureRoot, { recursive: true, force: true });
    }
});
