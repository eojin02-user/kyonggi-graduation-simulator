const RULES={totalTarget:130,requiredTarget:5,dualTarget:42,electiveTarget:8,currentCredits:121};
const state={
  selected:new Set(JSON.parse(localStorage.getItem("kgsSelected")||"[]")),
  dualBase:Number(localStorage.getItem("kgsDualBase")||36),
  dark:localStorage.getItem("kgsDark")==="1"
};
if(state.dark)document.body.classList.add("dark");

const $=s=>document.querySelector(s);
const offerings=KGS_COURSES.filter(c=>c.offered&&!c.completed);
const required=KGS_COURSES.filter(c=>c.misRequired);
const selectedCourses=()=>offerings.filter(c=>state.selected.has(c.id));

function planned(c){return state.selected.has(c.id)}
function effectiveCompleted(c){return c.completed||planned(c)}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function percent(v,t){return clamp(Math.round(v/t*100),0,100)}
function progress(label,current,target){
  return `<article class="metric"><div class="metric-top"><span>${label}</span><strong>${current} / ${target}</strong></div><div class="bar"><i style="width:${percent(current,target)}%"></i></div></article>`;
}
function totals(){
  const selected=selectedCourses();
  const total=RULES.currentCredits+selected.reduce((s,c)=>s+c.credits,0);
  const req=required.filter(effectiveCompleted).length;
  const dual=state.dualBase+selected.filter(c=>c.dual).reduce((s,c)=>s+c.credits,0);
  const elec=KGS_COURSES.filter(c=>c.elective8&&effectiveCompleted(c)).length;
  return {total,req,dual,elec};
}
function renderMetrics(){
  const t=totals();
  $("#metrics").innerHTML=[
    progress("총 취득학점",t.total,RULES.totalTarget),
    progress("경영정보 전필",t.req,RULES.requiredTarget),
    progress("복수전공 인정학점",t.dual,RULES.dualTarget),
    progress("전선 8과목",t.elec,RULES.electiveTarget)
  ].join("");
  const reasons=[];
  if(t.total<RULES.totalTarget)reasons.push(`총학점 ${RULES.totalTarget-t.total}학점 부족`);
  if(t.req<RULES.requiredTarget)reasons.push(`경영정보 전필 ${RULES.requiredTarget-t.req}과목 부족`);
  if(t.dual<RULES.dualTarget)reasons.push(`복수전공 ${RULES.dualTarget-t.dual}학점 부족`);
  if(t.elec<RULES.electiveTarget)reasons.push(`전선 인정 ${RULES.electiveTarget-t.elec}과목 부족`);
  const ok=reasons.length===0;
  $("#graduateStatus").innerHTML=`<div class="eyebrow">현재 판정</div><div class="status-title">${ok?"졸업요건 충족":"아직 졸업 불가"}</div><div class="muted">${ok?"선택한 수강계획을 모두 이수하면 조건을 충족합니다.":"부족한 조건을 확인하세요."}</div>${ok?"":`<ul class="status-reasons">${reasons.map(r=>`<li>${r}</li>`).join("")}</ul>`}`;
}
function renderOfferings(){
  $("#offeringList").innerHTML=offerings.map(c=>`
    <article class="course-card ${planned(c)?"selected":""}" data-id="${c.id}">
      <div class="course-card-head"><div><h3>${c.name}</h3><div class="muted tiny">${c.credits}학점 · ${(c.times||[]).join(" / ")}</div></div><div class="select-mark">${planned(c)?"✓":""}</div></div>
      <div class="chips">
        ${c.misRequired?'<span class="chip strong">경정 전필</span>':""}
        ${c.dual?'<span class="chip">복수전공</span>':""}
        ${c.elective8?'<span class="chip">전선8 인정</span>':""}
      </div>
    </article>`).join("");
  document.querySelectorAll(".course-card").forEach(el=>el.onclick=()=>{
    const id=el.dataset.id;
    state.selected.has(id)?state.selected.delete(id):state.selected.add(id);
    persist();renderAll();
  });
}
function renderRequired(){
  $("#requiredList").innerHTML=required.map(c=>{
    const st=c.completed?"done":planned(c)?"plan":"miss";
    const text=c.completed?"이수":planned(c)?"수강 예정":"미이수";
    return `<div class="check-row"><span>${c.name}</span><span class="check-dot ${st}">${text}</span></div>`;
  }).join("");
}
function courseState(c){return c.completed?["이수","done"]:planned(c)?["수강 예정","plan"]:["미이수","miss"]}
function renderTable(){
  const q=$("#searchInput").value.trim().toLowerCase();
  const f=$("#filterSelect").value;
  let rows=KGS_COURSES.filter(c=>c.name.toLowerCase().includes(q));
  rows=rows.filter(c=>({
    all:true,completed:c.completed,missing:!c.completed,required:c.misRequired,
    dual:c.dual,elective8:c.elective8,offered:c.offered
  }[f]));
  $("#courseTableBody").innerHTML=rows.map(c=>{
    const [txt,cls]=courseState(c);
    return `<tr><td><strong>${c.name}</strong>${c.note?`<div class="tiny muted">${c.note}</div>`:""}</td><td><span class="state ${cls}">${txt}</span></td><td>${c.category||"-"}</td><td>${c.dual?"○":"-"}</td><td>${c.elective8?"○":"-"}</td><td>${(c.times||[]).join(" / ")||"-"}</td></tr>`;
  }).join("");
}
function parseTime(str){
  const m=str.match(/^([월화수목금])\s*(\d+)~(\d+)$/);
  return m?{day:m[1],start:+m[2],end:+m[3],raw:str}:null;
}
function conflicts(){
  const slots=[];
  selectedCourses().forEach(c=>(c.times||[]).forEach(t=>{const p=parseTime(t);if(p)slots.push({...p,name:c.name})}));
  const out=[];
  for(let i=0;i<slots.length;i++)for(let j=i+1;j<slots.length;j++){
    const a=slots[i],b=slots[j];
    if(a.day===b.day&&Math.max(a.start,b.start)<=Math.min(a.end,b.end))out.push(`${a.name} ↔ ${b.name} (${a.day})`);
  }
  return [...new Set(out)];
}
function renderSchedule(){
  const list=selectedCourses();
  $("#scheduleList").innerHTML=list.length?list.map(c=>`<div class="schedule-item"><span>${c.name}</span><strong>${(c.times||[]).join(" / ")}</strong></div>`).join(""):`<p class="muted tiny">선택한 과목이 없습니다.</p>`;
  const con=conflicts();
  $("#conflictBox").innerHTML=con.length?`<div class="conflict"><strong>시간 충돌</strong><br>${con.join("<br>")}</div>`:(list.length?`<div class="okbox">선택한 과목 사이에 확인된 충돌이 없습니다.</div>`:"");
}
function persist(){
  localStorage.setItem("kgsSelected",JSON.stringify([...state.selected]));
  localStorage.setItem("kgsDualBase",String(state.dualBase));
}
function renderAll(){renderMetrics();renderOfferings();renderRequired();renderTable();renderSchedule()}
$("#searchInput").addEventListener("input",renderTable);
$("#filterSelect").addEventListener("change",renderTable);
$("#resetBtn").onclick=()=>{state.selected.clear();persist();renderAll()};
$("#dualBaseInput").value=state.dualBase;
$("#dualBaseInput").onchange=e=>{state.dualBase=Number(e.target.value||0);persist();renderAll()};
$("#themeBtn").onclick=()=>{document.body.classList.toggle("dark");state.dark=document.body.classList.contains("dark");localStorage.setItem("kgsDark",state.dark?"1":"0")};
renderAll();
