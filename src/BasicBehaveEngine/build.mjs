import { rollup } from "rollup";
import { babel } from "@rollup/plugin-babel";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
await fs.rm("build", { recursive: true, force: true });
const bundle = await rollup({
    input: "index.ts",
    external: ["gl-matrix"],
    plugins: [
        nodeResolve({ extensions: [".ts", ".js"] }),
        babel({
            babelHelpers: "bundled",
            extensions: [".ts"],
            presets: [
                [
                    require.resolve("@babel/preset-typescript"),
                    { allowDeclareFields: true },
                ],
            ],
        }),
    ],
});
await bundle.write({ file: "build/index.js", format: "es", sourcemap: true });
await bundle.close();
execFileSync(
    process.execPath,
    [require.resolve("typescript/bin/tsc"), "--emitDeclarationOnly"],
    { stdio: "inherit" },
);
async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(file);
        else if (file.endsWith(".d.ts")) {
            const text = await fs.readFile(file, "utf8");
            await fs.writeFile(
                file,
                text.replace(
                    /(from\s+["'])(\.[^"']+)(["'])/g,
                    (_, a, b, c) => a + (b.endsWith(".js") ? b : b + ".js") + c,
                ),
            );
        }
    }
}
await walk("build");
