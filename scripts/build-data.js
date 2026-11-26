#!/usr/bin/env node
/**
 * 產生 data/pokemon.js
 *
 * 資料來源：
 *   1. PokeAPI（https://pokeapi.co）— 英文名、繁中名、圖鑑描述、屬性、身高體重、圖片、叫聲
 *   2. 神奇寶貝百科（https://wiki.52poke.com）— 香港譯名
 *
 * 用法：node scripts/build-data.js
 */

const fs = require('node:fs');
const path = require('node:path');

const LIMIT = 151;
const OUT_FILE = path.join(__dirname, '..', 'data', 'pokemon.js');
const UA = 'pokemon-kids-pokedex/1.0 (personal, non-commercial project)';

const spriteUrl = (id) => `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${id}.png`;
const artUrl = (id) =>
  `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${id}.png`;

// 抓不到或抓錯時的人工修正（key = 全國圖鑑編號）
const HK_OVERRIDES = {};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': UA, accept: '*/*' },
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      await sleep(400 * (i + 1));
    }
  }
  throw lastErr;
}

async function fetchJson(url) {
  return JSON.parse(await fetchText(url));
}

/** 限制同時執行的數量 */
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function cleanText(text) {
  return text
    .replace(/[\n\r\f\t]/g, ' ')
    .replace(/\u00a0/g, ' ')
    // 全形數字改成半形，小朋友較易讀
    .replace(/[\uff10-\uff19]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, ' ')
    .trim();
}

function pickFlavor(entries, lang) {
  const list = entries.filter((e) => e.language.name === lang);
  if (!list.length) return null;
  const entry = list[list.length - 1]; // PokeAPI 依版本先後排序，最後一筆最新
  return { text: cleanText(entry.flavor_text), version: entry.version.name };
}

function stripTags(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

function cellText(cell) {
  return stripTags(cell)
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 解析神奇寶貝百科「名字」表格，回傳 { taiwan, official, hk } */
function parseNameTable(html) {
  const start = html.indexOf('id=".E5.90.8D.E5.AD.97"');
  if (start < 0) return null;
  const segment = html.slice(start, start + 40000);
  const end = segment.indexOf('</table>');
  if (end < 0) return null;

  const rows = [...segment.slice(0, end).matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].slice(1);
  const entries = [];
  for (const [, row] of rows) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
    if (cells.length < 3) continue; // 跳過「顯示更多」之類的單格列
    const region = cells.length >= 4 ? cellText(cells[1])[0] || '' : '';
    const nameCell = cells.length >= 4 ? cells[2] : cells[1];
    const name = cellText(nameCell)[0] || '';
    const source = (nameCell.match(/title="([^"]*)"/) || [])[1] || '';
    if (name) entries.push({ region, name, source });
  }

  const taiwan = entries.find((e) => e.region === '台灣')?.name || null;
  const official = entries.find((e) => e.region === '任天堂')?.name || null;
  const hkRows = entries.filter((e) => e.region === '香港');

  // 港譯取「不是有線版本、也不是台灣譯名」的第一個名字，也就是動畫／漫畫的經典港譯
  const preferred = hkRows.filter((e) => !e.source.includes('有線') && e.name !== taiwan);
  const hk = (preferred[0] || hkRows[0] || null)?.name || null;

  return { taiwan, official, hk, hkRows };
}

async function fetchHongKongName(zhName) {
  const candidates = [zhName, zhName.replace(/[♀♂]/g, '')];
  for (const title of [...new Set(candidates)]) {
    const url = `https://wiki.52poke.com/wiki/${encodeURIComponent(title)}`;
    try {
      const html = await fetchText(url);
      const parsed = parseNameTable(html);
      if (parsed?.hk) return parsed;
    } catch {
      // 換下一個候選標題
    }
    await sleep(150);
  }
  return null;
}

async function main() {
  console.log(`抓取 PokeAPI 1–${LIMIT} …`);
  const ids = Array.from({ length: LIMIT }, (_, i) => i + 1);

  const basic = await mapLimit(ids, 6, async (id) => {
    const [pokemon, species] = await Promise.all([
      fetchJson(`https://pokeapi.co/api/v2/pokemon/${id}`),
      fetchJson(`https://pokeapi.co/api/v2/pokemon-species/${id}`),
    ]);
    return { id, pokemon, species };
  });

  const items = basic.map(({ id, pokemon, species }) => {
    const en = species.names.find((n) => n.language.name === 'en')?.name || pokemon.name;
    const zhOfficial = species.names.find((n) => n.language.name === 'zh-hant')?.name || '';
    const descEn = pickFlavor(species.flavor_text_entries, 'en');
    const descZh = pickFlavor(species.flavor_text_entries, 'zh-hant');
    return {
      id,
      en: en.replace(/\b\w/g, (c) => c.toUpperCase()),
      zhOfficial,
      types: pokemon.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
      heightDm: pokemon.height,
      weightHg: pokemon.weight,
      descEn: descEn?.text || '',
      versionEn: descEn?.version || '',
      descZh: descZh?.text || '',
      versionZh: descZh?.version || '',
      sprite: spriteUrl(id),
      art: artUrl(id),
      cry: pokemon.cries?.latest || '',
    };
  });

  console.log(`抓取神奇寶貝百科港譯（${LIMIT} 頁）…`);
  const failures = [];
  const retry = [];
  const apply = (item, parsed) => {
    item.zhHK = parsed.hk;
    item.zhOfficial = parsed.official || item.zhOfficial;
  };

  await mapLimit(items, 2, async (item) => {
    await sleep(250);
    const parsed = await fetchHongKongName(item.zhOfficial || item.en);
    if (parsed?.hk) apply(item, parsed);
    else retry.push(item);
  });

  // 網站偶爾會限流，失敗的逐隻慢慢重試
  if (retry.length) {
    console.log(`  第一輪有 ${retry.length} 隻失敗，逐隻重試…`);
    for (const item of retry) {
      await sleep(1200);
      const parsed = await fetchHongKongName(item.zhOfficial || item.en);
      if (parsed?.hk) apply(item, parsed);
      else failures.push(`${item.id} ${item.en}`);
    }
  }

  for (const item of items) {
    if (!item.zhHK) item.zhHK = item.zhOfficial;
    if (HK_OVERRIDES[item.id]) item.zhHK = HK_OVERRIDES[item.id];
  }

  // 欄位順序固定，輸出較易讀
  const data = items.map((p) => ({
    id: p.id,
    gen: 1,
    en: p.en,
    zhHK: p.zhHK,
    zhOfficial: p.zhOfficial,
    types: p.types,
    heightDm: p.heightDm,
    weightHg: p.weightHg,
    descEn: p.descEn,
    versionEn: p.versionEn,
    descZh: p.descZh,
    versionZh: p.versionZh,
    sprite: p.sprite,
    art: p.art,
    cry: p.cry,
  }));

  const problems = [];
  if (data.length !== LIMIT) problems.push(`筆數為 ${data.length}，預期 ${LIMIT}`);
  for (const p of data) {
    if (!p.en) problems.push(`#${p.id} 缺英文名`);
    if (!p.zhHK) problems.push(`#${p.id} 缺港譯名`);
    if (!p.descEn) problems.push(`#${p.id} 缺英文描述`);
    if (!p.descZh) problems.push(`#${p.id} 缺繁中描述`);
    if (!p.types.length) problems.push(`#${p.id} 缺屬性`);
  }

  const banner = `// 由 scripts/build-data.js 自動產生，請勿手動編輯。
// 資料來源：PokeAPI（pokeapi.co）＋ 神奇寶貝百科（wiki.52poke.com）
// 產生時間：${new Date().toISOString()}
`;
  const body = `window.POKEDEX_DATA = ${JSON.stringify(data, null, 2)};\n`;

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${banner}\n${body}`, 'utf8');

  console.log(`\n已寫入 ${path.relative(process.cwd(), OUT_FILE)}（${data.length} 筆）`);
  const check = [1, 7, 25, 94, 133, 149, 150, 151];
  console.log('抽查：');
  for (const id of check) {
    const p = data[id - 1];
    if (p) console.log(`  #${String(id).padStart(3, '0')} ${p.en} → ${p.zhHK}（官方：${p.zhOfficial}）`);
  }
  if (failures.length) {
    console.log(`\n港譯抓取失敗（已暫用官方譯名，請在 HK_OVERRIDES 補上）：`);
    for (const f of failures) console.log('  ' + f);
  }
  if (problems.length) {
    console.log('\n資料檢查有問題：');
    for (const p of problems) console.log('  ' + p);
    process.exitCode = 1;
  } else {
    console.log('\n資料檢查通過 ✓');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
