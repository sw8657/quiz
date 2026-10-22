// 구몬 실전 고정 문제지 5세트를 만들어 treasure-map-math.dc.html 안 KUMON_SETS에 박아 넣는다.
// 실행: node src/make-kumon-sets.mjs   (다시 돌리면 문제가 전부 바뀌어 예전 기록과 비교가 끊기니 꼭 필요할 때만)
import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('./treasure-map-math.dc.html', import.meta.url);
const src = readFileSync(file, 'utf8');
const body = src.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
globalThis.localStorage = { _:{}, getItem(k){ return this._[k] ?? null; }, setItem(k,v){ this._[k]=String(v); } };
globalThis.window = { location:{ search:'' }, matchMedia:()=>({ matches:false }) };
globalThis.React = { createElement:(t,p,...c)=>({t,p,c}), Fragment:'frag' };
const C = new Function('DCLogic', body + ';return Component;')(class { constructor(p){ this.props=p||{}; } setState(){} });
const g = new C({});

const sets = [], used = new Set();
while(sets.length < 5){
  const lines = g.kumonBuild('full').map(q => g.kumonEncode(q));
  const key = lines.join('\n');
  if(used.has(key)) continue;
  used.add(key); sets.push(lines);
}
const data = 'const KUMON_SETS=[\n' + sets.map(s => JSON.stringify(s)).join(',\n') + '\n];';
const out = src.replace(/\/\*KUMON_SETS_BEGIN\*\/[\s\S]*?\/\*KUMON_SETS_END\*\//, `/*KUMON_SETS_BEGIN*/${data}/*KUMON_SETS_END*/`);
writeFileSync(file, out);
console.log(`KUMON_SETS: ${sets.length}세트 × ${sets[0].length}문제`);
