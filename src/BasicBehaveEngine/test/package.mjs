import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(new URL("../package.json", import.meta.url));
const output = await fs.mkdtemp(path.join(os.tmpdir(), "gltf-interactivity-package-"));
const consumer = path.join(output, "consumer");
const run = (command, args, cwd = root) => execFileSync(command, args, {
    cwd, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"],
});
const [pack] = JSON.parse(run("npm", ["pack", "--json", "--pack-destination", output]));
const tarball = path.join(output, pack.filename);
const files = pack.files.map(file => file.path);
for (const file of ["build/index.js", "build/index.d.ts", "LICENSE", "README.md", "CHANGELOG.md"])
    assert.ok(files.includes(file), `Missing ${file}`);
assert.ok(files.every(file => file.startsWith("build/") ||
    ["LICENSE", "README.md", "CHANGELOG.md", "package.json"].includes(file)), "Unexpected packed files");

await fs.mkdir(consumer);
await fs.writeFile(path.join(consumer, "package.json"), JSON.stringify({
    private: true, type: "module",
    dependencies: { "@khronosgroup/gltf-interactivity-engine": `file:${tarball}` },
}));
run("npm", ["install", "--no-audit", "--no-fund"], consumer);
const installed = path.join(consumer, "node_modules/@khronosgroup/gltf-interactivity-engine");
const metadata = JSON.parse(await fs.readFile(path.join(installed, "package.json"), "utf8"));
assert.equal(metadata.version, pack.version);
assert.equal(metadata.publishConfig.access, "public");
for (const entry of [metadata.main, metadata.browser, metadata.types,
    metadata.exports["."].import, metadata.exports["."].types])
    await fs.access(path.join(installed, entry));

await fs.writeFile(path.join(consumer, "smoke.mjs"), `
import assert from 'node:assert/strict';
import { BasicBehaveEngine, DOMEventBus, GraphRejectedError, getCustomEventChannel,
    validateInteractivityExtension, validateInteractivityGraph } from '@khronosgroup/gltf-interactivity-engine';
globalThis.document = new EventTarget();
const graph = {
    types: [{signature:'float'}], variables:[{type:0,value:[0]}],
    declarations:[{op:'math/add'},{op:'variable/set'},{op:'event/onStart'}],
    nodes:[
        {declaration:2, flows:{out:{node:2,socket:'in'}}},
        {declaration:0, values:{a:{type:0,value:[2]},b:{type:0,value:[3]}}},
        {declaration:1, configuration:{variables:{value:[0]}}, values:{'0':{node:1,socket:'value'}}}
    ]
};
validateInteractivityGraph(graph);
validateInteractivityExtension({graphs:[graph]});
assert.throws(()=>validateInteractivityExtension({graphs:[]}), /Invalid KHR_interactivity/);
assert.equal(getCustomEventChannel({id:'smoke'},0),'KHR_INTERACTIVITY:smoke');
assert.ok(new GraphRejectedError('smoke') instanceof Error);
const engine = new BasicBehaveEngine(60,new DOMEventBus());
try {
    engine.loadBehaveGraph(graph);
    assert.deepEqual(engine.variables[0].value,[5]);
    assert.deepEqual(graph.variables[0].value,[0]);
} finally { engine.dispose(); }
console.log('Packed ESM import, validation and graph execution passed');
`);
process.stdout.write(run(process.execPath, ["smoke.mjs"], consumer));

await fs.writeFile(path.join(consumer, "types.mts"), `
import { BasicBehaveEngine, DOMEventBus, GraphRejectedError, InteractivityValueType,
    getCustomEventChannel, validateInteractivityExtension, validateInteractivityGraph,
    type IBehaveEngine, type IEventBus, type IInteractivityGraph }
    from '@khronosgroup/gltf-interactivity-engine';
const bus: IEventBus = new DOMEventBus();
const engine: IBehaveEngine = new BasicBehaveEngine(60,bus);
const graph: IInteractivityGraph = {declarations:[],nodes:[],events:[],variables:[],types:[{signature:InteractivityValueType.FLOAT}]};
validateInteractivityGraph(graph);
validateInteractivityExtension({graphs:[graph]});
engine.loadBehaveGraph(graph,false);
const channel: string = getCustomEventChannel({id:'smoke'},0);
const rejection: Error = new GraphRejectedError(channel);
engine.dispose();
void rejection;
`);
run(process.execPath, [require.resolve("typescript/bin/tsc"), "--noEmit", "--strict",
    "--module", "NodeNext", "--moduleResolution", "NodeNext", "--target", "ES2022",
    "--lib", "ES2022,DOM", "types.mts"], consumer);
const publish = JSON.parse(run("npm", ["publish", "--dry-run", "--json"]));
assert.equal(publish.name, metadata.name);
assert.equal(publish.version, metadata.version);
assert.deepEqual(publish.files.map(file => file.path).sort(), [...files].sort());
const sha256 = createHash("sha256").update(await fs.readFile(tarball)).digest("hex");
const result = {
    sourceRevision: run("git", ["rev-parse", "HEAD"]).trim(),
    name: metadata.name, version: metadata.version, tarball, sha256,
    import: true, execution: true, validation: true, nodeNextTypes: true, publishDryRun: true,
};
await fs.writeFile(path.join(output, "result.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
