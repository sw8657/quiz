// 문제 생성기 퍼즈 체크 — 세 게임의 실제 class Component를 그대로 불러와 모든 주제·단계를 반복 생성한다.
// 실행: node src/generators.test.mjs   (프레임워크 없음)
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

function load(file){
  const src = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8');
  const body = src.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
  globalThis.localStorage = { _:{}, getItem(k){ return this._[k] ?? null; }, setItem(k,v){ this._[k]=String(v); } };
  globalThis.window = { location:{ search:'' }, matchMedia:()=>({ matches:false }) };
  globalThis.window.confirm = () => true;
  globalThis.React = { createElement:(t,p,...c)=>({t,p,c}), Fragment:'frag' };
  // setState는 즉시 합친다(함수형 업데이트 포함) — 화면 흐름을 동기적으로 따라가기 위해.
  const C = new Function('DCLogic', body + ';return Component;')(class { constructor(p){ this.props=p||{}; }
    setState(u){ this.state = Object.assign({}, this.state, typeof u==='function' ? u(this.state) : u); } });
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

// ⚡ 구몬 연습: 보기 5개·정답 포함·정답이 실제 계산과 일치
for(let i=0;i<5000;i++){
  for(const sec of ['add','sub','mul','div']){
    const q = t.genKumon(sec);
    assert.strictEqual(q.options.length, 5, `보기 5개 아님 ${JSON.stringify(q)}`);
    assert.strictEqual(new Set(q.options).size, 5, `보기 중복 ${JSON.stringify(q)}`);
    assert.ok(q.options.includes(q.answer), `보기에 정답 없음 ${JSON.stringify(q)}`);
    const a=+q.top, b=+q.bottom;
    const want = sec==='add'?String(a+b) : sec==='sub'?String(a-b) : sec==='mul'?String(a*b) : (a%b?`${Math.floor(a/b)} … ${a%b}`:String(a/b));
    assert.strictEqual(q.answer, want, `정답 계산 틀림 ${JSON.stringify(q)}`);
    assert.ok(sec!=='sub' || a-b>0, `뺄셈 답이 0 이하 ${JSON.stringify(q)}`);
    q.options.forEach(o=>assert.ok(!/^-|^0$|NaN/.test(o), `이상한 보기 ${o}`));
  }
}
// 시험 흐름: 시작 → 일부 풀기 → 제출 → 결과 저장·화면 값 계산까지 예외 없이
{
  const g = load('treasure-map-math.dc.html');
  g.state.userName = '지한';
  for(const mode of ['full','mini','muldiv']){
    g.startTest(mode); g.renderVals();
    const n = g.state.test.qs.length;
    for(let i=0;i<Math.min(n,25);i++){ const q=g.state.test.qs[g.state.test.idx]; g.pickTest(i%7===0 ? q.options.find(o=>o!==q.answer) : q.answer); g.renderVals(); }
    if(g.state.screen==='test') g.submitTest();
    assert.strictEqual(g.state.screen, 'testResult');
    const v = g.renderVals();
    assert.ok(v.trSections.length>0 && v.trAnswered===Math.min(n,25), `결과 값 이상 ${mode}`);
  }
  const saved = JSON.parse(localStorage.getItem('mathmap_users'))['지한'].tests;
  assert.strictEqual(saved.length, 3, '연습 기록 저장 안 됨');
  g.state.screen='testIntro'; assert.strictEqual(g.renderVals().testRecs.length, 3);
}

console.log('OK: generators fuzz passed');
