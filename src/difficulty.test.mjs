// 난이도 로직 셀프체크 — treasure-map-math.dc.html의 topicDiff/adjRange를 그대로 반영.
// 실행: node src/difficulty.test.mjs   (프레임워크 없음)
import assert from 'node:assert';

const stages = [{topic:'add'},{topic:'sub'},{topic:'mul'},{topic:'three'},{topic:'time'},{topic:'length'}];

function topicDiff(topic, history){
  const recs = (history||[]).filter(r => stages[r.island] && stages[r.island].topic===topic && r.total>0);
  if(!recs.length) return 0;
  const last = recs.slice(-5); let ws=0, acc=0;
  last.forEach((r,i)=>{ const w=i+1; ws+=w; acc+=w*(r.correct/r.total); });
  return Math.max(-1, Math.min(1, (acc/ws-0.7)/0.2));
}
function adjRange(lo,hi,d,min,max){
  const k=Math.round((hi-lo)*0.4*d);
  let nlo=lo+Math.max(0,k), nhi=hi+k;
  if(min!=null){ nlo=Math.max(min,nlo); nhi=Math.max(min+1,nhi); }
  if(max!=null){ nhi=Math.min(max,nhi); nlo=Math.min(nlo,nhi-1); }
  return [nlo,nhi];
}

// 기록 없으면 중립
assert.strictEqual(topicDiff('add', []), 0);
// 정답률 70%(통과선) → ~0
assert.ok(Math.abs(topicDiff('add', [{island:0,correct:7,total:10}])) < 1e-9);
// 만점 계속 → +1(어렵게), 다 틀림 → -1(쉽게)
assert.strictEqual(topicDiff('add', [{island:0,correct:10,total:10}]), 1);
assert.strictEqual(topicDiff('add', [{island:0,correct:0,total:10}]), -1);
// 다른 주제 기록은 섞이지 않음
assert.strictEqual(topicDiff('mul', [{island:0,correct:10,total:10}]), 0);

// 덧셈 L1 a창 [11,39]: 어려우면 위로, 쉬우면 위쪽을 깎음
assert.deepStrictEqual(adjRange(11,39, 1,10,99), [22,50]);
assert.deepStrictEqual(adjRange(11,39,-1,10,99), [11,28]);
assert.deepStrictEqual(adjRange(11,39, 0,10,99), [11,39]);
// 항상 lo<hi, 클램프 준수 (treasure mul + fairy add/sub/count/compare 창)
const windows=[[2,9,2,9],[1,5,1,13],[2,9,2,25],[1,20,3,30],[2,50,5,60]];
for(const [lo0,hi0,mn,mx] of windows){
  for(const d of [-1,-0.5,0,0.5,1]){
    const [lo,hi]=adjRange(lo0,hi0,d,mn,mx);
    assert.ok(lo>=mn && hi<=mx && lo<hi, `range invalid [${lo0},${hi0}] d=${d}: ${lo}~${hi}`);
  }
}

// ── genShape L3 패턴 로직 (fairy-land) 불변식 ──
// mirror of src/fairy-land-math.dc.html genShape(l===3)
const SHAPES=[{e:'🔺'},{e:'🟦'},{e:'⭕'},{e:'⭐'},{e:'💗'},{e:'🌙'}];
const pick=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{const r=a.slice();for(let i=r.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[r[i],r[j]]=[r[j],r[i]];}return r;};
function shapePattern(){
  const tmpl=pick([['A','B','A','B','A'],['A','A','B','A','A','B'],['A','B','B','A','B','B'],['A','B','C','A','B','C']]);
  const keys=[...new Set(tmpl)];
  const chosen=shuffle(SHAPES).slice(0,keys.length);
  const map={}; keys.forEach((k,i)=>map[k]=chosen[i]);
  const full=tmpl.map(k=>map[k]);
  const seq=full.slice(0,4), ans=full[4];
  const distract=shuffle(SHAPES.filter(s=>!chosen.some(c=>c.e===s.e))).slice(0,Math.max(0,4-chosen.length));
  let opts=shuffle([...chosen,...distract]).slice(0,4);
  if(!opts.some(o=>o.e===ans.e)) opts[0]=ans;
  return {seq,ans,opts};
}
for(let i=0;i<500;i++){
  const {seq,ans,opts}=shapePattern();
  assert.strictEqual(seq.length,4,'패턴 시퀀스는 4개');
  assert.ok(opts.length>=2 && opts.length<=4,'보기 2~4개');
  assert.ok(opts.some(o=>o.e===ans.e),'정답이 보기에 포함');
  assert.strictEqual(new Set(opts.map(o=>o.e)).size, opts.length,'보기 중복 없음');
}

// ── 스테이지 소요 시간 최고기록 (양쪽 .dc.html의 bestSecs 미러) ──
function bestSecs(history, island, level){
  return (history||[]).filter(r=>r.island===island && r.level===level && r.passed && !r.isRetry && r.secs)
    .reduce((m,r)=>Math.min(m,r.secs), Infinity);
}
const H=[
  {island:0,level:1,passed:true,isRetry:false,secs:90},
  {island:0,level:1,passed:true,isRetry:false,secs:60},
  {island:0,level:1,passed:false,isRetry:false,secs:20}, // 실패는 제외
  {island:0,level:1,passed:true,isRetry:true, secs:10},  // 복습(틀린 것만)은 제외
  {island:0,level:2,passed:true,isRetry:false,secs:30},  // 다른 단계는 제외
  {island:1,level:1,passed:true,isRetry:false,secs:15},  // 다른 섬은 제외
];
assert.strictEqual(bestSecs(H,0,1), 60);
assert.strictEqual(bestSecs([],0,1), Infinity);      // 첫 판은 항상 최고 기록
assert.ok(1 < bestSecs([],0,1));
assert.strictEqual(bestSecs([{island:0,level:1,passed:true,isRetry:false}],0,1), Infinity); // secs 없는 구버전 기록

const fmtSecs=n=> n>=60 ? `${Math.floor(n/60)}분 ${n%60}초` : `${n}초`;
assert.strictEqual(fmtSecs(59),'59초');
assert.strictEqual(fmtSecs(60),'1분 0초');
assert.strictEqual(fmtSecs(125),'2분 5초');

// ── treasure Lv.4·5 신규 유형 (세 수 / 빈칸 / 두자리×한자리) 불변식 ──
// mirror of src/treasure-map-math.dc.html genAdd·genSub·genMul (l===4, l===5)
const rand=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
function genAdd(l,d=0){
  if(l===4){ const A=adjRange(11,39,d,10,60),B=adjRange(5,29,d,3,40),C=adjRange(3,19,d,2,30);
    const a=rand(A[0],A[1]),b=rand(B[0],B[1]),c=rand(C[0],C[1]);
    return {answer:a+b+c, expr:[String(a),'+',String(b),'+',String(c),'=','?']}; }
  const A=adjRange(12,49,d,10,79),B=adjRange(6,39,d,3,49);
  const a=rand(A[0],A[1]),b=rand(B[0],B[1]);
  return {answer:b, expr:[String(a),'+','?','=',String(a+b)]};
}
function genSub(l,d=0){
  if(l===4){ const B=adjRange(6,24,d,2,39),C=adjRange(4,19,d,2,29);
    const b=rand(B[0],B[1]),c=rand(C[0],C[1]),a=rand(b+c+1,Math.min(99,b+c+40));
    return {answer:a-b-c, expr:[String(a),'−',String(b),'−',String(c),'=','?']}; }
  const A=adjRange(21,69,d,15,99),B=adjRange(6,39,d,3,59);
  const a=rand(A[0],A[1]),b=rand(B[0],Math.min(B[1],a-1));
  return {answer:b, expr:[String(a),'−','?','=',String(a-b)]};
}
function genMul(l,d=0){
  if(l===4){ const X=adjRange(3,9,d,2,9),Y=adjRange(3,9,d,2,9);
    const x=rand(X[0],X[1]),y=rand(Y[0],Y[1]);
    return {answer:x, expr:['?','×',String(y),'=',String(x*y)]}; }
  const X=adjRange(11,29,d,10,49),Y=adjRange(2,7,d,2,9);
  const x=rand(X[0],X[1]),y=rand(Y[0],Y[1]);
  return {answer:x*y, expr:[String(x),'×',String(y),'=','?']};
}
// 빈칸 위치의 답을 도로 끼워 넣으면 등식이 성립해야 한다 — 이게 깨지면 아이가 푼 답이 오답 처리된다.
const evalExpr=(expr,answer)=>{
  const t=expr.map(x=>x==='?'?String(answer):x).join(' ').replace(/−/g,'-').replace(/×/g,'*');
  const [lhs,rhs]=t.split('=');
  return Math.round(eval(lhs)) === Math.round(eval(rhs));
};
for(let i=0;i<800;i++){
  for(const d of [-1,0,1]){
    for(const [gen,l] of [[genAdd,4],[genAdd,5],[genSub,4],[genSub,5],[genMul,4],[genMul,5]]){
      const q=gen(l,d);
      assert.ok(evalExpr(q.expr,q.answer), `등식 불성립 ${gen.name} Lv.${l} d=${d}: ${q.expr.join(' ')} (answer=${q.answer})`);
      assert.ok(Number.isInteger(q.answer) && q.answer>0, `답은 양의 정수여야 함: ${gen.name} Lv.${l} → ${q.answer}`);
      assert.strictEqual(q.expr.filter(t=>t==='?').length, 1, '입력칸은 정확히 1개');
    }
  }
}
// 초1~2 범위 상한: 답과 피연산자가 세 자리를 넘지 않아야 함
for(let i=0;i<500;i++){
  for(const [gen,l] of [[genAdd,4],[genAdd,5],[genSub,4],[genSub,5],[genMul,5]]){
    const q=gen(l,1);
    for(const t of q.expr) if(/^\d+$/.test(t)) assert.ok(+t<1000, `${gen.name} Lv.${l}: ${t} 은 초1~2에 과함`);
  }
}

console.log('OK: difficulty + shape-pattern + stage-time + Lv4-5 checks passed');
