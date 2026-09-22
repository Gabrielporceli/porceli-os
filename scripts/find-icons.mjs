#!/usr/bin/env node
/**
 * Busca ícones do iconsax-react sem sair do terminal.
 *
 *   npm run icons                 → lista as categorias e quantos ícones tem cada uma
 *   npm run icons -- calend       → ícones cujo NOME casa com "calend"
 *   npm run icons -- @arrow       → todos os ícones da CATEGORIA "arrow"
 *
 * Lê o dist/meta-data.json que vem dentro do próprio pacote, então o
 * resultado é sempre o da versão instalada — não tem como ficar
 * desatualizado nem depende de estar online.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const metaPath = require.resolve("iconsax-react/dist/meta-data.json");
const meta = JSON.parse(readFileSync(metaPath, "utf8"));

const total = meta.categories.reduce((n, c) => n + c.icons.length, 0);
const query = process.argv.slice(2).join(" ").trim().toLowerCase();

if (!query) {
  console.log(`\n${total} ícones em ${meta.categories.length} categorias:\n`);
  for (const c of meta.categories) {
    console.log(`  ${c.name.padEnd(18)} ${String(c.icons.length).padStart(3)}`);
  }
  console.log(`\nestilos: ${meta.variants.join(", ")}`);
  console.log(`\nbusca por nome:      npm run icons -- calend`);
  console.log(`busca por categoria: npm run icons -- @arrow\n`);
  process.exit(0);
}

const byCategory = query.startsWith("@");
const needle = byCategory ? query.slice(1) : query;

const hits = [];
for (const c of meta.categories) {
  if (byCategory) {
    if (c.name.toLowerCase().includes(needle)) {
      hits.push(...c.icons.map((i) => [i, c.name]));
    }
  } else {
    hits.push(...c.icons.filter((i) => i.toLowerCase().includes(needle)).map((i) => [i, c.name]));
  }
}

if (!hits.length) {
  console.log(`\nnada com "${needle}". Veja as categorias com: npm run icons\n`);
  process.exit(1);
}

const width = Math.max(...hits.map(([i]) => i.length));
console.log(`\n${hits.length} resultado(s):\n`);
for (const [icon, category] of hits) {
  console.log(`  ${icon.padEnd(width)}  ${category}`);
}
console.log(`\nimport { ${hits.slice(0, 3).map(([i]) => i).join(", ")} } from "iconsax-react";\n`);
