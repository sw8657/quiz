// 문제 생성기 퍼즈 체크 — 세 게임의 실제 class Component를 그대로 불러와 모든 주제·단계를 반복 생성한다.
// 실행: node src/generators.test.mjs   (프레임워크 없음)
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

function load(file){
  const src = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8');
  const body = src.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
  globalThis.localStorage = { _:{}, getItem(k){ return this._[k] ?? null; }, setItem(k,v){ this._[k]=String(v); } };
  globalThis.window = { location:{ search:'' }, matchMedia:()=>({ matches:false }) };
  const C = new Function('DCLogic', body + ';return Component;')(class { constructor(p){ this.props=p||{}; } setState(){} });
  return new C({});
}

// 수식 토큰에 답을 끼워 넣어 등식이 성립하는지. 숫자·사칙연산만 있는 수식만 검사.
function exprHolds(expr, answer){
  const t = expr.map(x => x==='?' ? String(answer) : x).join(' ');
  if(!/^[\d\s+\-−×÷=]+$/.test(t)) return true;
  const [l, r] = t.replace(/−/g,'-').replace(/×/g,'*').replace(/÷/g,'/').split('=');
  return Math.abs(eval(l) - eval(r)) < 1e-9;
}

function check(game, g, topic, level, q){
  const where = `${game} ${topic} Lv.${level}: ${JSON.stringify(q)}`;
  assert.ok(q && q.answer !== undefined && q.answerLabel, `답 없음 ${where}`);
  if(q.input === 'choice'){
    const vals = q.options.map(o => String(o.value));
    assert.ok(vals.includes(String(q.answer)), `보기에 정답 없음 ${where}`);
    assert.strictEqual(new Set(vals).size, vals.length, `보기 중복 ${where}`);
    assert.strictEqual(new Set(q.options.map(o=>o.label)).size, vals.length, `보기 글자 중복 ${where}`);
    assert.ok(vals.length >= 2, `보기 부족 ${where}`);
  } else {
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && String(q.answer).length <= 4, `숫자 답 이상 ${where}`);
    if(q.expr) assert.ok(exprHolds(q.expr, q.answer), `등식 불성립 ${where}`);
    if(q.a !== undefined && q.op) assert.ok(exprHolds([String(q.a), q.op, String(q.b), '=', '?'], q.answer), `등식 불성립 ${where}`);
  }
}

const GAMES = [
  ['treasure-map-math.dc.html', 5],
  ['fairy-land-math.dc.html', 3],
  ['hangul-fairy-land.dc.html', 3],
];
for(const [file, levels] of GAMES){
  const g = load(file);
  for(const st of g.stages){
    for(let level=1; level<=levels; level++){
      for(let i=0; i<3000; i++) check(file, g, st.topic, level, g.generateQuestion(st.topic, level));
    }
  }
}

// 지한 3학년 대비 섬: 나눗셈은 나머지 없이 곱셈구구 범위, 분수 정답은 진분수
const t = load('treasure-map-math.dc.html');
for(let i=0;i<3000;i++){
  for(let l=1;l<=5;l++){
    const q = t.genDiv(l, [-1,0,1][i%3]);
    const nums = q.expr.filter(x=>/^\d+$/.test(x)).map(Number);
    assert.ok(nums.every(n=>n<=81), `나눗셈 범위 초과: ${q.expr.join(' ')}`);
    const f = t.genFrac(l);
    if(typeof f.answer==='string'){ const [k,n]=f.answer.split('/').map(Number); assert.ok(k>=1 && k<n, `분수 정답이 진분수 아님: ${f.answer}`); }
  }
}

console.log('OK: generators fuzz passed');
