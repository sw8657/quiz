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
  for(const mode of ['full','mini','divfocus']){
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

// 구몬 연습: 실제 C등급 시험 130문제 — 덧셈·뺄셈 15씩 그대로, 곱셈·나눗셈은 모의테스트 비율로 줄임. 유형 순서·문항 수·문제 틀·모양
{
  const g = load('treasure-map-math.dc.html');
  g.startTest('full');
  const qs = g.state.test.qs;
  assert.strictEqual(qs.length, 130);
  const count = sec => qs.filter(q=>q.sec===sec).length;
  assert.deepStrictEqual(['add','sub','mul','div'].map(count), [15,15,36,64], '유형별 문항 수');
  assert.deepStrictEqual([...new Set(qs.map(q=>q.sec))], ['add','sub','mul','div'], '유형 순서');
  const at = n => qs[n-1]; // 시험지 번호로
  assert.ok(at(1).form==='a22n' && at(13).form==='a33' && at(16).form==='s22' && at(26).form==='s32b');
  assert.ok(at(31).form==='m11' && at(31).layout==='h' && at(42).form==='m21' && at(57).form==='m31' && at(65).form==='m41');
  assert.ok(at(67).form==='d_ex' && at(77).form==='d_rem' && at(87).form==='d_mix' && at(102).layout==='long' && at(114).form==='d_long3' && at(130).form==='d_long3');
  // 덧셈·뺄셈은 160문제와 똑같이, 곱셈·나눗셈은 구간별 비율 유지(100/130배, 구간마다 ±1문제 안)
  const ORIG={a22n:2,a22h:3,a22c:2,a32:5,a33:3,s22:7,s32:3,s32b:2,s33:3,m11:15,m21:20,m31:10,m41:2,d_ex:13,d_rem:13,d_mix:20,d_long2:15,d_long3:22};
  for(const [form,n] of Object.entries(ORIG)){ const got=qs.filter(q=>q.form===form).length, want=/^[as]/.test(form)?n:n*100/130; assert.ok(form[0]==='a'||form[0]==='s' ? got===n : Math.abs(got-want)<=1, `${form} ${got} vs ${want}`); }
  // 시간 목표: 문제별 budget 합이 제한시간, 덧셈·뺄셈 약 5분·곱셈 약 8분·나눗셈 약 17분
  const sum = sec => qs.filter(q=>!sec||q.sec===sec).reduce((t,q)=>t+q.budget,0);
  assert.ok(Math.abs(sum()-1800)<1e-6);
  // 유형별 시간 = 문항 수 × 유형 속도 비율, 합 30분 → 덧셈·뺄셈 약 6분, 곱셈 약 8분, 나눗셈 약 16분
  assert.ok(Math.abs(sum('add')+sum('sub')-371)<5 && Math.abs(sum('mul')-454)<5 && Math.abs(sum('div')-974)<5, `유형별 시간 배분 ${sum('add')+sum('sub')} ${sum('mul')} ${sum('div')}`);
  // 결과의 쉬운/어려운 구분: 유형 안 앞쪽 tier 0, 뒤쪽 tier 3
  for(const sec of ['add','sub','mul','div']){ const l=qs.filter(q=>q.sec===sec); assert.ok(l[0].tier===0 && l[l.length-1].tier===3); }
  // 미니·나눗셈 집중
  g.startTest('mini'); assert.deepStrictEqual(['add','sub','mul','div'].map(sec=>g.state.test.qs.filter(q=>q.sec===sec).length), [4,4,12,20]);
  g.startTest('divfocus'); assert.ok(g.state.test.qs.length===40 && g.state.test.qs.every(q=>q.sec==='div'));
  assert.strictEqual(g.state.test.qs.filter(q=>q.form==='d_long3').length, 18);
}
// 문제 틀별 범위: 실제 시험지와 같은 자릿수·받아올림/받아내림 조건
{
  const g = load('treasure-map-math.dc.html');
  const dig = n => String(n).length, carry = (a,b,p) => Math.floor(a/p)%10 + Math.floor(b/p)%10 >= 10;
  let zeroQ=0, twoDigitQ=0;
  for(let i=0;i<3000;i++){
    let q=g.genKumon('add','a22n'); assert.ok(!carry(+q.top,+q.bottom,1) && !carry(+q.top,+q.bottom,10) && dig(q.top)===2, `a22n ${q.top}+${q.bottom}`);
    q=g.genKumon('add','a22h'); assert.ok(!carry(+q.top,+q.bottom,1) && +q.answer>=100, `a22h ${q.top}+${q.bottom}`);
    q=g.genKumon('add','a22c'); assert.ok(carry(+q.top,+q.bottom,1) && +q.answer>=100, `a22c ${q.top}+${q.bottom}`);
    q=g.genKumon('sub','s32b'); assert.ok(dig(q.top)===3 && dig(q.bottom)===2 && (+q.top%10)<(+q.bottom%10) && Math.floor(+q.top/10)%10<Math.floor(+q.bottom/10)%10, `s32b ${q.top}-${q.bottom}`);
    q=g.genKumon('mul','m41'); assert.ok(dig(q.top)===4 && q.layout==='v');
    q=g.genKumon('mul','m11'); assert.ok(dig(q.top)===1 && q.layout==='h');
    q=g.genKumon('div','d_long3'); assert.ok(dig(q.top)===3 && q.layout==='long', `d_long3 ${q.top}÷${q.bottom}`);
    const quo=q.answer.split(' … ')[0]; if(quo.length>1 && quo.includes('0')){ zeroQ++; assert.ok(q.options.includes(quo.replace(/0/g,'')) || q.options.some(o=>o.startsWith(quo.replace(/0/g,'')+' ')), `몫 0 빼먹은 오답 없음: ${q.top}÷${q.bottom}=${q.answer} ${q.options}`); }
    q=g.genKumon('div','d_rem'); assert.ok(+q.top<100 && q.layout==='h'); if(q.answer.split(' … ')[0].length===2) twoDigitQ++;
    q=g.genKumon('div','d_ex'); assert.ok(!q.answer.includes('…') && +q.top<=81);
  }
  assert.ok(zeroQ>600, `몫에 0이 끼는 세 자리 나눗셈이 너무 적음: ${zeroQ}`);
  assert.ok(twoDigitQ>50, `몫이 두 자리인 나머지 나눗셈이 너무 적음: ${twoDigitQ}`);
}
// 진행 중 목표 페이스·유형 시간 목표 표시
{
  const g = load('treasure-map-math.dc.html');
  g.startTest('full'); g.state.test.startedAt -= 60000; g.state.testNow = Date.now();
  let v = g.renderVals();
  assert.ok(v.testPace.includes('🐢 -') && v.testSection==='덧셈 0:00 / 3:06' && v.testPos==='1번 · 0/130', `${v.testPace} / ${v.testSection} / ${v.testPos}`);
  for(let i=0;i<10;i++) g.pickTest(g.state.test.qs[g.state.test.idx].answer);
  v = g.renderVals(); assert.ok(v.testPace.includes('🚀 +'), v.testPace);
  g.state.test.lastAt -= 200000; g.state.testNow = Date.now(); v = g.renderVals();
  assert.ok(v.testSectionStyle.includes('#d1462f'), '유형 목표 시간을 넘으면 빨강');
  assert.ok(v.planLine.includes('덧셈·뺄셈 6분') && v.planLine.includes('곱셈 8분') && v.planLine.includes('나눗셈 16분'), v.planLine);
}
// 🔥 암산 스프린트: 정답 계산·자연수, 흐름(맞힘→다음, 틀림→지우기, 시간 끝→기록 저장)
{
  const g = load('treasure-map-math.dc.html');
  for(let i=0;i<5000;i++) for(const lv of [1,2,3,4]){
    const q = g.genSprint(lv);
    const v = eval(q.text.replace('−','-').replace('×','*').replace('÷','/'));
    assert.ok(v===q.answer && Number.isInteger(v) && v>0 && v<1000, `스프린트 답 이상 Lv.${lv}: ${q.text} = ${q.answer}`);
  }
  g.state.userName = '지한';
  g.openSprint(); assert.strictEqual(g.state.screen, 'sprintIntro');
  g.startSprint(3);
  for(let i=0;i<5;i++){ for(const d of String(g.state.sprint.q.answer)) g.sprintPress(d); }
  assert.strictEqual(g.state.sprint.n, 5);
  g.sprintPress(String(g.state.sprint.q.answer)[0]==='1' ? '2' : '1'); // 첫 자리부터 틀린 숫자
  assert.strictEqual(g.state.sprint.wrong, 1); assert.strictEqual(g.state.sprint.input, '');
  g.renderVals();
  g.state.sprint.startedAt -= 61000; g.sprintTick();
  assert.strictEqual(g.state.screen, 'sprintResult');
  const v = g.renderVals();
  assert.ok(v.srCount===5 && v.srTitle.includes('새 기록'), '스프린트 결과 이상');
  assert.strictEqual(g.sprintBest(3), 5);
  g.state.screen='testIntro'; assert.ok(g.renderVals().sprintLevels[2].best.includes('5'));
}

// 📝 채점표: 문제별 기록 저장, 필터(전체·틀린·느린), 지난 연습에서 다시 열기
{
  const g = load('treasure-map-math.dc.html');
  g.state.userName = '지한';
  g.startTest('mini');
  for(let i=0;i<12;i++){ const q=g.state.test.qs[g.state.test.idx]; g.state.test.lastAt -= (i===3?30000:2000); g.pickTest(i===5 ? q.options.find(o=>o!==q.answer) : q.answer); }
  g.submitTest();
  const rec = g.state.testResult;
  assert.strictEqual(rec.items.length, 40);
  assert.ok(rec.items[3].s >= 30 && rec.items[0].s < 11 && rec.items[20].p === null, '문제별 시간·안 푼 문제 기록 이상');
  g.openSheet();
  let v = g.renderVals();
  assert.strictEqual(v.shRows.filter(r=>r.isRow).length, 40);
  assert.strictEqual(v.shRows.filter(r=>r.isHead).length, 4, '유형 머리줄 4개');
  g.setSheetFilter('wrong'); v = g.renderVals();
  assert.ok(v.shRows.filter(r=>r.isRow).length===1 && v.shRows.find(r=>r.isRow).showAns, '틀린 문제 필터');
  g.setSheetFilter('slow'); v = g.renderVals();
  assert.deepStrictEqual(v.shRows.filter(r=>r.isRow).map(r=>r.no), [4], '느린 문제 필터');
  g.closeSheet(); assert.strictEqual(g.state.screen, 'testResult');
  g.state.screen='testIntro'; v = g.renderVals();
  v.testRecs[0].onClick(); assert.strictEqual(g.state.screen, 'testSheet');
  assert.strictEqual(g.renderVals().shRows.filter(r=>r.isRow).length, 40);
  g.closeSheet(); assert.strictEqual(g.state.screen, 'testIntro');
  // 예전(문제별 기록 없는) 기록이 있어도 화면이 깨지지 않음
  const users=g.loadUsers(); users['지한'].tests.unshift({date:1, mode:'mini', total:40, limit:480, answered:10, correct:10, used:200, secs:{}}); g.saveUsers(users);
  v = g.renderVals(); v.testRecs[v.testRecs.length-1].onClick(); assert.strictEqual(g.state.screen, 'testIntro');
}

// 중간 그만두기·기록 지우기
{
  const g = load('treasure-map-math.dc.html');
  g.state.userName = '지한';
  const tests = () => (g.loadUsers()['지한']||{}).tests || [];
  g.startTest('mini'); g.pickTest(g.state.test.qs[0].answer);
  g.cancelTest();
  assert.strictEqual(g.state.screen, 'testIntro'); assert.strictEqual(tests().length, 0, '그만두면 기록되지 않아야 함');
  for(let k=0;k<3;k++){ g.startTest('mini'); g.pickTest(g.state.test.qs[0].answer); g.state.test.startedAt -= 1000*(k+1); g.submitTest(); }
  assert.strictEqual(tests().length, 3);
  // 같은 밀리초에 끝나 date가 겹치지 않게 보정
  { const u=g.loadUsers(); u['지한'].tests.forEach((r,i)=>r.date=1000+i); g.saveUsers(u); }
  g.state.screen='testIntro'; let v=g.renderVals();
  v.testRecs[0].onDelete();
  assert.deepStrictEqual(tests().map(r=>r.date), [1000,1001], '최근 기록 하나만 지워져야 함');
  window.confirm = () => false; g.renderVals().testRecs[0].onDelete(); window.confirm = () => true;
  assert.strictEqual(tests().length, 2, '확인 취소하면 안 지워짐');
  g.clearTests(); assert.strictEqual(tests().length, 0);
  g.startSprint(1); g.state.sprint.startedAt -= 61000; g.sprintTick();
  g.state.screen='testIntro'; assert.ok(g.renderVals().hasSprintRecs);
  g.clearSprints(); v=g.renderVals();
  assert.ok(!v.hasSprintRecs && v.sprintLevels[0].best==='아직 기록 없음');
  assert.ok(Array.isArray(g.loadUsers()['지한'].history), '모험 기록은 그대로');
}

// 시현(예비 초1): 덧셈·뺄셈 범위가 1학년 1학기(9까지)에 맞는지 — 자동 조절 없는 기본(d=0) 기준
{
  const g = load('fairy-land-math.dc.html');
  for(let i=0;i<4000;i++){
    const a1=g.genAdd(1,0), a2=g.genAdd(2,0), a3=g.genAdd(3,0);
    assert.ok(a1.answer<=5, `더하기 Lv.1 합 5 초과: ${a1.a}+${a1.b}`);
    if(a2.kind==='add') assert.ok(a2.answer<=9, `더하기 Lv.2 합 9 초과: ${a2.a}+${a2.b}`);
    if(a3.kind==='add') assert.ok(a3.answer>=10 && a3.answer<=15 && a3.a<=9 && a3.b<=9, `더하기 Lv.3 받아올림 범위 밖: ${a3.a}+${a3.b}`);
    const s1=g.genSub(1,0), s2=g.genSub(2,0), s3=g.genSub(3,0);
    assert.ok(s1.a<=5 && s2.a<=9 && s1.answer>=0 && s2.answer>=0, `빼기 Lv.1~2 범위 밖: ${s1.a}-${s1.b}, ${s2.a}-${s2.b}`);
    assert.ok(s3.a>=10 && s3.answer<=9 && s3.b<=9, `빼기 Lv.3 범위 밖: ${s3.a}-${s3.b}`);
  }
}
// 시현: 한글 Lv.1에 받침 없는 글자·낱말이 나오는지
{
  const g = load('hangul-fairy-land.dc.html');
  const jong = ch => (ch.charCodeAt(0)-0xAC00)%28 !== 0;
  let nojongCombine=0, easyWord=0;
  for(let i=0;i<2000;i++){
    const c=g.genCombine(1,0); if(c.cA && /^[ㄱ-ㅎ]$/.test(c.cA)){ nojongCombine++; assert.ok(!jong(c.answer), `받침 없는 글자 만들기인데 받침: ${c.answer}`); }
    const w=g.genWord(1,0); if(g.EASY.some(x=>x.w===w.answer)){ easyWord++; assert.ok([...w.answer].every(ch=>!jong(ch)), `받침 없는 낱말에 받침: ${w.answer}`); }
  }
  assert.ok(nojongCombine>500 && easyWord>500, `Lv.1 받침 없는 문제가 너무 적음 ${nojongCombine}/${easyWord}`);
  g.EASY.forEach(x=>assert.ok([...x.w].every(ch=>!jong(ch)), `EASY에 받침 있는 낱말: ${x.w}`));
  // 문제 문장의 조사: 받침에 맞게
  assert.strictEqual(g.josa('아','은','는'),'는'); assert.strictEqual(g.josa('기역','은','는'),'은');
  assert.strictEqual(g.josaRo('물'),'로'); assert.strictEqual(g.josaRo('방'),'으로'); assert.strictEqual(g.josaRo('비'),'로');
  for(let i=0;i<500;i++){ const q=g.genJamo(1); if(q.prompt.includes('어느 글자')) assert.ok(!/[ㅏ-ㅣ가-히]’은/.test(q.prompt) || g.hasJong(q.prompt.match(/‘(.+)’/)[1]), `조사 틀림: ${q.prompt}`); }
}
// 🔊 읽어 주기: 모든 문제의 읽을 문장에 이모지·따옴표가 없고, 문장 읽기 문제는 문장을 읽어 주지 않음, 새 문제·정답에 말함
for(const file of ['fairy-land-math.dc.html','hangul-fairy-land.dc.html']){
  const g = load(file);
  const said=[]; globalThis.SpeechSynthesisUtterance=function(t){ this.text=t; };
  window.speechSynthesis={ cancel(){}, getVoices(){ return []; }, speak(u){ said.push(u.text); } };
  for(const st of g.stages) for(let l=1;l<=3;l++) for(let i=0;i<300;i++){
    const q=g.generateQuestion(st.topic,l), t=g.speechText(g.sayFor(q));
    assert.ok(t.length>0, `${file} ${st.topic} Lv.${l}: 읽을 문장 없음`);
    assert.ok(!/[\u{1F000}-\u{1FAFF}‘’"]/u.test(t), `${file}: 읽을 문장에 이모지/따옴표: ${t}`);
    if(q.sentence && q.prompt.includes('그림')) assert.ok(!t.includes(q.sentence.slice(0,4)), '문장 읽기 문제의 문장을 읽어 주면 안 됨');
  }
  g.state.userName='시현'; g.begin(0,1); g.componentDidUpdate();
  assert.strictEqual(said.length, 1, `${file}: 새 문제를 읽어 주지 않음`);
  g.componentDidUpdate(); assert.strictEqual(said.length, 1, '같은 문제를 또 읽음');
  g.check(g.state.current.answer); g.componentDidUpdate(); assert.strictEqual(said.length, 2, '정답 피드백을 읽지 않음');
  g.toggleVoice(); const n=said.length; g.next(); g.componentDidUpdate(); assert.strictEqual(said.length, n, '끄면 읽지 않아야 함');
  g.replay(); assert.strictEqual(said.length, n+1, '🔊 버튼은 꺼져 있어도 읽음');
  g.toggleVoice(); assert.ok(g.voiceOn());
  delete window.speechSynthesis;
}

// 📋 OMR 답안지 + 문제 목록(1번부터 이어서 스크롤): 번호로 이동·답 바꾸기, 문제별 시간 = 앞 답부터 이 답까지
{
  const g = load('treasure-map-math.dc.html');
  g.state.userName = '지한';
  g.startTest('mini');
  const T = () => g.state.test, wrongOf = q => q.options.find(o=>o!==q.answer);
  // 1~3번 풀기(2번은 틀리게), 각 5초
  for(let i=0;i<3;i++){ const q=T().qs[T().idx]; T().lastAt-=5000; g.pickTest(i===1?wrongOf(q):q.answer); }
  assert.strictEqual(T().idx, 3);
  // 4번은 안 풀고 답안지에서 5번으로
  T().lastAt-=2000; g.jumpTest(g.state.test.idx+1); assert.strictEqual(T().idx, 4); assert.strictEqual(T().picks[3], null);
  // 답안지에서 2번으로 돌아가 답 고치기(3초 더) → 답을 고칠 때는 그 자리에 둔다
  g.jumpTest(1); assert.strictEqual(T().idx, 1);
  let v = g.renderVals();
  const flat = n => n==null ? [] : typeof n!=='object' ? [String(n)] : Array.isArray(n) ? n.flatMap(flat) : [n, ...flat(n.c)];
  const qBlock = (vals,i) => flat(vals.testListEl).find(x=>x && x.p && x.p.key==='q'+i);
  const btns = (vals,i) => flat(qBlock(vals,i)).filter(x=>x && x.t==='button');
  assert.strictEqual(btns(v,1).length, 5);
  assert.deepStrictEqual(btns(v,1).map((b,k)=>b.p.style.background==='#2f6bb0'?k:-1).filter(k=>k>=0), [T().qs[1].options.indexOf(T().picks[1].v)], '이미 고른 답이 파랗게');
  T().lastAt-=3000; btns(v,1).find((b,k)=>T().qs[1].options[k]===T().qs[1].answer).p.onClick(); // 목록의 보기 버튼으로 답 고치기
  assert.strictEqual(T().idx, 1, '답을 고치면 그 자리');
  assert.strictEqual(T().picks[1].v, T().qs[1].answer);
  assert.ok(T().spent[1]>=10 && T().spent[3]===0, `시간은 답을 고른 문제에 쌓임: ${T().spent[1]}, ${T().spent[3]}`);
  // 문제 목록: 1~40번이 순서대로 모두, 유형 머리글은 유형이 바뀌는 곳마다
  { const qk=flat(v.testListEl).filter(x=>x && x.p && /^q\d+$/.test(String(x.p.key))).map(x=>x.p.key);
    assert.deepStrictEqual(qk, Array.from({length:40},(_,i)=>'q'+i), '문제 1~40번이 이어서'); }
  // OMR: 1번부터 40번까지 한 줄씩 이어짐(묶음 없음), 2번 줄에 고른 답 하나만 칠해짐
  v = g.renderVals();
  const nodes = flat(v.testOmrEl).filter(x=>typeof x==='object');
  const texts = flat(v.testOmrEl).filter(x=>typeof x==='string');
  assert.ok(texts.includes('Q') && texts.includes('정답') && !texts.some(t=>/~\d+ \(/.test(t)), 'Q·정답 머리, 묶음 없이 이어짐');
  const rows = nodes.filter(x=>x.p && String(x.p.key||'').startsWith('r'));
  assert.deepStrictEqual(rows.map(x=>x.p.key), Array.from({length:40},(_,i)=>'r'+i), '1~40번 줄이 순서대로 모두');
  const marks2 = flat(rows[1]).filter(x=>typeof x==='object' && x.p && x.p.key!=null && typeof x.p.key==='number');
  assert.strictEqual(marks2.length, 5, '①~⑤ 다섯 칸');
  const filledIdx = marks2.map((x,k)=>x.p.style.background==='#123a66'?k:-1).filter(k=>k>=0);
  assert.deepStrictEqual(filledIdx, [T().qs[1].options.indexOf(T().picks[1].v)], '고른 번호 하나만 칠해짐');
  assert.ok(rows[T().idx].p.ref && !rows[0].p.ref, '지금 문제 줄에만 스크롤 ref');
  // 지금 문제 줄 ref: 문제가 바뀔 때만 스크롤
  let scrolled=0; const el={ scrollIntoView(){ scrolled++; } };
  rows[T().idx].p.ref(el); rows[T().idx].p.ref(el); assert.strictEqual(scrolled, 1, '같은 문제에서 다시 그려도 스크롤 한 번');
  // 문제 목록의 유형 머리글(실제 화면처럼 '[ 1 ~ 15 ] 덧셈을 연습합니다.')과 문제 번호
  { const g2=load('treasure-map-math.dc.html'); g2.startTest('full');
    const t2=flat(g2.renderVals().testListEl).filter(x=>typeof x==='string');
    const heads=t2.filter(x=>/^\[ \d+ ~ \d+ \]$/.test(x));
    assert.deepStrictEqual(heads, ['[ 1 ~ 15 ]','[ 16 ~ 30 ]','[ 31 ~ 66 ]','[ 67 ~ 130 ]'], heads.join(','));
    assert.ok(t2.includes('덧셈을 연습합니다.') && t2.includes('곱셈을 연습합니다.') && t2.some(x=>x.startsWith('나눗셈을 연습합니다. (나누어')));
    assert.ok(t2.includes('1') && t2.includes('130'), '문제 번호'); }
  // 답을 골라도 목록은 스크롤하지 않음(아이가 직접 스크롤). 답안지 번호를 누를 때만 그 문제로 스크롤
  { const g3=load('treasure-map-math.dc.html'); g3.startTest('mini');
    let to=null; const box={ scrollHeight:5000, clientHeight:500, scrollTop:0, parentElement:null, getBoundingClientRect:()=>({top:100}), scrollTo(o){ to=o.top; } };
    globalThis.getComputedStyle = () => ({ overflowY:'auto' });
    const els=Array.from({length:40},(_,i)=>({ parentElement:box, getBoundingClientRect:()=>({top:100+i*250}) }));
    flat(g3.renderVals().testListEl).filter(x=>x && x.p && /^q\d+$/.test(String(x.p.key))).forEach((x,i)=>x.p.ref(els[i]));
    g3.pickTest(g3.state.test.qs[0].answer, 0); g3.componentDidUpdate();
    assert.strictEqual(to, null, '답을 골라도 스크롤 안 함');
    assert.strictEqual(g3.state.test.idx, 1, '지금 문제 표시는 다음 문제로');
    g3.pickTest(g3.state.test.qs[0].options.find(o=>o!==g3.state.test.qs[0].answer), 0); g3.componentDidUpdate();
    assert.strictEqual(to, null, '답을 고칠 때는 스크롤 안 함');
    g3.jumpTest(30); g3.componentDidUpdate(); assert.strictEqual(to, 30*250-6, '답안지 번호 → 그 문제로 스크롤');
    delete globalThis.getComputedStyle; }
  // 줄을 누르면 그 문제로
  rows[25].p.onClick(); assert.strictEqual(T().idx, 25);
  // 스크롤 칸이 있으면: 지금 줄이 칸 위에서 1/3 지점에 오게 scrollTo
  { let to=null; const box={ scrollHeight:2000, clientHeight:600, scrollTop:100, parentElement:null,
      getBoundingClientRect:()=>({top:50}), scrollTo(o){ to=o.top; } };
    globalThis.getComputedStyle = () => ({ overflowY:'auto' });
    const row={ parentElement:{ scrollHeight:10, clientHeight:10, parentElement:box }, getBoundingClientRect:()=>({top:850}), scrollIntoView(){ throw new Error('칸이 있으면 쓰지 않음'); } };
    g.omrScrollTo(row);
    assert.strictEqual(to, 100+(850-50)-200, '줄 위치가 칸 높이의 1/3 지점');
    delete globalThis.getComputedStyle; }
  flat(g.renderVals().testOmrEl).find(x=>x && x.p && x.p.key==='r25').p.ref(el); assert.strictEqual(scrolled, 2, '문제가 바뀌면 스크롤');
  // 좁은 화면: 📋 → 답안지 창, 번호 누르면 닫힘
  g.state.narrow = true; g.renderVals().openOmr(); assert.ok(g.renderVals().showOmrOverlay);
  g.jumpTest(0); assert.ok(!g.renderVals().showOmrOverlay);
  // 끝: 나머지 다 풀면 자동 제출
  while(g.state.screen==='test'){ const i=T().picks.findIndex(p=>!p); T().lastAt-=1000; g.pickTest(T().qs[i].answer, i); }
  const R = g.state.testResult;
  assert.strictEqual(R.answered, 40); assert.strictEqual(R.correct, 40, '고친 답으로 채점');
  assert.ok(R.items[1].s>=8, `2번 시간 ${R.items[1].s}`);
  g.renderVals(); // 결과 화면 값 계산(쉬운/어려운 평균 등) 예외 없이
}
// 시간 끝·제출 시 안 푼 문제가 섞여 있어도 결과가 깨지지 않음
{
  const g = load('treasure-map-math.dc.html');
  g.state.userName='지한'; g.startTest('mini');
  g.pickTest(g.state.test.qs[0].answer); g.jumpTest(g.state.test.idx+1); g.pickTest(g.state.test.qs[2].answer);
  g.submitTest();
  const v = g.renderVals();
  assert.ok(v.trAnswered===2 && g.state.testResult.items[1].p===null && v.trTierLine.includes('쉬운 문제'));
}

// 문제 글자 크기: 세로셈·가로식·세로 나눗셈 모두 넘겨준 크기를 쓴다(세로셈만 고정 크기였던 버그)
{
  const g = load('treasure-map-math.dc.html');
  for(const [sec,form] of [['add','a33'],['mul','m11'],['div','d_long3']]){
    const el = g.kumonEl(g.genKumon(sec,form), '30px');
    assert.strictEqual(el.p.style.fontSize, '30px', `${form} 글자 크기`);
  }
}

// 한 시험 안에 같은 문제가 두 번 나오지 않음
{
  const g = load('treasure-map-math.dc.html');
  for(let k=0;k<200;k++) for(const mode of ['full','mini','divfocus']){
    g.startTest(mode); const keys=g.state.test.qs.map(q=>q.top+q.op+q.bottom);
    assert.strictEqual(new Set(keys).size, keys.length, `${mode}: 같은 문제 중복 ${keys.filter((x,i)=>keys.indexOf(x)!==i)}`);
  }
}

console.log('OK: generators fuzz passed');
