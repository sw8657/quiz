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

console.log('OK: difficulty + shape-pattern logic checks passed');
