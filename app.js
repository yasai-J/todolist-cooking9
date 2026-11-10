(()=>{
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const KEY='myLittleDays.v3';
// 初期搭載のお弁当。各8枚の完成イラストを達成日数に応じて切り替えます。
const BENTO_TYPES={
 onigiri:{name:'おにぎり弁当',prefix:'onigiri'},
 sandwich:{name:'サンドイッチ弁当',prefix:'sandwich'}
};
const weekdays=['月','火','水','木','金','土','日'];
const todayKey=()=>new Date().toLocaleDateString('sv-SE');
const parseDate=k=>{const [y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d)};
const mondayOf=d=>{const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-(x.getDay()+6)%7);return x};
const dateKey=d=>d.toLocaleDateString('sv-SE');
const weekStart=mondayOf(new Date()), weekId=dateKey(weekStart);
const weekDates=Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(d.getDate()+i);return d});
const defaultState=()=>({tasks:[],dailyDone:{},weeklyDone:{},memos:[],bentoHistory:[],bentoWeeks:{},selectedBento:'onigiri',created:todayKey()});
let state=load();
function load(){try{const x=JSON.parse(localStorage.getItem(KEY));return x&&typeof x==='object'?{...defaultState(),...x}:defaultState()}catch{return defaultState()}}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function id(){return 't'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function toast(s){const e=$('#toast');e.textContent=s;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),1700)}
function weekKey(d=new Date()){return dateKey(mondayOf(d))}
function visibleToday(t){if(t.hiddenFromList)return false;if(t.category==='daily')return !t.days?.length||t.days.includes(new Date().getDay());return true}
function isDone(t,day=todayKey()){if(t.category==='daily')return !!state.dailyDone[day]?.[t.id];if(t.category==='weekly')return !!state.weeklyDone[weekKey(parseDate(day))]?.[t.id];return !!t.completed}
function setDone(t,v){if(t.category==='daily'){state.dailyDone[todayKey()]??={};state.dailyDone[todayKey()][t.id]=v}else if(t.category==='weekly'){state.weeklyDone[weekId]??={};state.weeklyDone[weekId][t.id]=v}else{t.completed=v;t.completedAt=v?todayKey():null}save();render()}
function dailyStats(day=todayKey()){
 const d=parseDate(day),ts=state.tasks.filter(t=>!t.hiddenFromList&&t.category==='daily'&&(!t.days?.length||t.days.includes(d.getDay())));
 const done=ts.filter(t=>isDone(t,day)).length;return {done,total:ts.length,pct:ts.length?Math.round(done/ts.length*100):0};
}
function monthRate(){const now=new Date(),y=now.getFullYear(),m=now.getMonth(),n=new Date(y,m+1,0).getDate();let total=0,done=0;for(const t of state.tasks){if(t.hiddenFromList)continue;if(t.category==='daily'){for(let d=1;d<=n;d++){const x=new Date(y,m,d);if(!t.days?.length||t.days.includes(x.getDay())){total++;if(isDone(t,dateKey(x)))done++}}}else if(t.category==='weekly'){let seen=new Set();for(let d=1;d<=n;d++){const k=weekKey(new Date(y,m,d));if(!seen.has(k)){seen.add(k);total++;if(state.weeklyDone[k]?.[t.id])done++}}}else if(t.category==='deadline'&&t.due?.startsWith(`${y}-${String(m+1).padStart(2,'0')}`)){total++;if(t.completed)done++}}return total?Math.round(done/total*100):0}
function bentoPct(i){return dailyStats(dateKey(weekDates[i])).pct}
// 週の開始時にお弁当をランダム決定し、その週は固定する。
function ensureWeeklyBento(){
 const saved=state.bentoWeeks?.[weekId];
 if(saved && BENTO_TYPES[typeof saved==='string'?saved:saved.type]){
  state.selectedBento=typeof saved==='string'?saved:saved.type;
 }else{
  const choices=Object.keys(BENTO_TYPES);
  state.selectedBento=choices[Math.floor(Math.random()*choices.length)];
  state.bentoWeeks??={};
  state.bentoWeeks[weekId]={type:state.selectedBento};
  save();
 }
}

function renderBento(){
 ensureWeeklyBento();
 const now=new Date(),todayIndex=(now.getDay()+6)%7;
 $('#weekRange').textContent=`${weekStart.getMonth()+1}/${weekStart.getDate()} – ${weekDates[6].getMonth()+1}/${weekDates[6].getDate()}`;
 // 週間の水位グラフは従来どおりDAILY ROUTINEのみで計算。
 $('#weekCircles').innerHTML=weekdays.map((d,i)=>{const p=bentoPct(i),date=weekDates[i].getDate();return `<div class="day-progress"><span>${d}</span><div class="day-circle ${i===todayIndex?'today':''}" style="--fill:${p}%" aria-label="${weekDates[i].getMonth()+1}月${date}日、DAILY ROUTINE達成率${p}%"><div class="day-water"></div><span class="day-date">${date}</span></div></div>`}).join('');
 const completedDays=weekDates.filter(d=>dailyStats(dateKey(d)).pct>=100).length;
 const selected=BENTO_TYPES[state.selectedBento] ? state.selectedBento : 'onigiri';
 state.selectedBento=selected;
 const type=BENTO_TYPES[selected],stage=completedDays+1;
 const image=`${type.prefix}_stage_${String(stage).padStart(2,'0')}.png`;
 $('#bentoBox').innerHTML=`<img class="bento-stage-image" src="./${image}" alt="${type.name}、${completedDays}日達成の${stage}段階目" loading="eager">`;
 $('#bentoBox').setAttribute('aria-label',`${type.name} ${completedDays}/7日達成`);
 $('#bentoBox').setAttribute('data-bento-type',selected);
 $$('.bento-choice').forEach(button=>{const active=button.dataset.bento===selected;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));button.disabled=true;button.title='お弁当は週の初めにランダムで決まり、週の途中では変更できません'});
 const note=$('#bentoNote');if(note)note.textContent=`今週のお弁当は週の初めにランダムで決まります（週の途中では変更できません）。DAILY ROUTINE達成日数：${completedDays}/7日`;
}

function groupLabel(c){return ({daily:'DAILY ROUTINE',weekly:'WEEKLY ROUTINE',deadline:'DEADLINE',wish:'WISH LIST'})[c]}
function taskRow(t){const done=isDone(t);return `<div class="task-row" data-id="${t.id}" data-category="${t.category}"><button class="drag-handle" aria-label="並べ替え">⠿</button><input class="task-check" type="checkbox" ${done?'checked':''}><span class="task-name ${done?'done':''}">${esc(t.name)}</span><small class="task-meta">${t.category==='deadline'&&t.due?'期限 '+esc(t.due):''}</small><button class="task-edit">···</button></div>`}
function todayTasks(){return state.tasks.filter(visibleToday).sort((a,b)=>(a.order??0)-(b.order??0))}
let selectedTaskId=null,dragState=null,dragTimer=null,pendingDrag=null;
const actionDialog=$('#taskActionDialog'),archiveConfirm=$('#archiveConfirm'),taskDialog=$('#taskDialog');
function openTaskActions(t){selectedTaskId=t.id;$('#taskActionTitle').textContent=t.name;actionDialog.showModal()}
function openArchiveConfirm(){actionDialog.close();archiveConfirm.showModal()}
function renderTasks(){const list=todayTasks();$('#homeTasks').innerHTML=['daily','weekly','deadline','wish'].map(c=>{const a=list.filter(t=>t.category===c);return a.length?`<div class="task-group"><div class="task-group-title">${groupLabel(c)}</div>${a.map(taskRow).join('')}</div>`:''}).join('')||'<div class="empty-state">今日のタスクはまだありません。＋追加から登録できます。</div>';
 $$('#homeTasks .task-row').forEach(row=>{const t=state.tasks.find(x=>x.id===row.dataset.id);row.querySelector('.task-check').onchange=e=>setDone(t,e.target.checked);row.querySelector('.task-edit').onclick=()=>openTaskActions(t);attachDrag(row,t)})}
function renderMemos(){$('#memoGrid').innerHTML=state.memos.length?state.memos.map(m=>`<button class="memo-card" data-id="${m.id}">${esc(m.text)}</button>`).join(''):'<div class="memo-empty">＋からメモを追加できます</div>';$$('.memo-card').forEach(b=>b.onclick=()=>openMemo(state.memos.find(m=>m.id===b.dataset.id)))}
function renderHome(){const s=dailyStats();$('#todayPct').textContent=s.pct+'%';$('#todayCount').textContent=`${s.done} / ${s.total} 完了`;renderBento();renderTasks();renderMemos()}
function renderRecords(){const now=new Date(),y=now.getFullYear(),m=now.getMonth(),days=new Date(y,m+1,0).getDate(),first=new Date(y,m,1),offset=(first.getDay()+6)%7;$('#waterCalendarTitle').textContent=`${y}年${m+1}月の水位カレンダー`;const cells=Array(offset).fill('<span class="water-calendar-empty"></span>');for(let day=1;day<=days;day++){const d=new Date(y,m,day),key=dateKey(d),p=dailyStats(key).pct,isToday=key===todayKey(),future=d>new Date(new Date().setHours(23,59,59,999));cells.push(`<div class="water-calendar-day ${isToday?'today':''} ${future?'future':''}" title="${m+1}月${day}日：達成率${p}%"><div class="water-calendar-circle" style="--fill:${future?0:p}%"><span>${day}</span></div><small>${future?'':p+'%'}</small></div>`)}$('#monthWaterCalendar').innerHTML=cells.join('');const p=monthRate();$('#monthPct').textContent=p+'%';$('#monthBar').style.width=p+'%';const count=p>=100?13:p>=90?10:p>=80?7:p>=60?4:3;$('#unlockText').textContent=`月間達成率に応じてレシピが解放される既存ルール：現在 ${count} 種類分`;const entries=Object.entries(state.bentoWeeks||{}).sort((a,b)=>b[0].localeCompare(a[0]));$('#bentoHistory').innerHTML=entries.map(([wk,rec])=>`<div class="history-row"><span>${wk} のお弁当</span><b>${weekdays.filter((_,i)=>{const d=new Date(parseDate(wk));d.setDate(d.getDate()+i);return dailyStats(dateKey(d)).pct===100}).length}/7 品</b></div>`).join('')||'<p class="hint">お弁当の記録はまだありません。</p>';const archived=state.tasks.filter(t=>t.hiddenFromList);$('#completedTasks').innerHTML=archived.map(t=>`<div class="archive-row"><span>${isDone(t)?'✓':'○'} ${esc(t.name)}</span><div class="archive-actions"><button data-act="restore" data-id="${t.id}">戻す</button><button data-act="delete" data-id="${t.id}">削除</button></div></div>`).join('')||'<p class="hint">アーカイブはありません。</p>';$$('#completedTasks button').forEach(b=>b.onclick=()=>{const t=state.tasks.find(x=>x.id===b.dataset.id);if(!t)return;if(b.dataset.act==='restore')t.hiddenFromList=false;else if(confirm('完全に削除しますか？'))state.tasks=state.tasks.filter(x=>x.id!==t.id);save();render()})}
function render(){renderHome();renderRecords()}
function showPage(p){$$('.page').forEach(x=>x.classList.toggle('active',x.id==='page-'+p));$$('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.page===p));window.scrollTo(0,0)}
// お弁当選択ボタンは週単位で固定するため、ユーザー操作による変更は受け付けない。
$$('.nav-item').forEach(b=>b.onclick=()=>showPage(b.dataset.page));$('#homeTop').onclick=()=>showPage('home');$('#recordsTop').onclick=()=>showPage('records');
$('#addTask').onclick=()=>openTask();$('#closeDialog').onclick=()=>taskDialog.close();
$('#taskCategory').onchange=updateFields;
function updateFields(){const c=$('#taskCategory').value;$('#dailyFields').hidden=c!=='daily';$('#deadlineFields').hidden=c!=='deadline'}
$('#weekdayPicks').innerHTML=['日','月','火','水','木','金','土'].map((d,i)=>`<label><input type="checkbox" value="${i}" ${[1,2,3,4,5].includes(i)?'checked':''}><span>${d}</span></label>`).join('');
function openTask(t=null){$('#taskForm').dataset.id=t?.id||'';$('#dialogTitle').textContent=t?'タスクを編集':'タスクを追加';$('#taskName').value=t?.name||'';$('#taskCategory').value=t?.category||'daily';$('#taskDue').value=t?.due||'';$$('#weekdayPicks input').forEach(x=>x.checked=t?.days?t.days.includes(+x.value):[1,2,3,4,5].includes(+x.value));$('#deleteTask').hidden=!t;updateFields();taskDialog.showModal()}
function updateFields(){const c=$('#taskCategory').value;$('#dailyFields').hidden=c!=='daily';$('#deadlineFields').hidden=c!=='deadline'}
$('#taskForm').onsubmit=e=>{e.preventDefault();const name=$('#taskName').value.trim();if(!name)return;const c=$('#taskCategory').value,t=state.tasks.find(x=>x.id===$('#taskForm').dataset.id),data={id:t?.id||id(),name,category:c,days:c==='daily'?$$('#weekdayPicks input:checked').map(x=>+x.value):[],due:c==='deadline'?$('#taskDue').value:'',order:t?.order??state.tasks.length};if(t)Object.assign(t,data);else state.tasks.push(data);save();taskDialog.close();render();toast('タスクを保存しました')};
$('#deleteTask').onclick=()=>{const t=state.tasks.find(x=>x.id===$('#taskForm').dataset.id);if(t&&confirm('このタスクを削除しますか？')){state.tasks=state.tasks.filter(x=>x.id!==t.id);save();taskDialog.close();render()}};
$('#closeTaskAction').onclick=()=>actionDialog.close();$('#actionEdit').onclick=()=>{const t=state.tasks.find(x=>x.id===selectedTaskId);actionDialog.close();if(t)openTask(t)};$('#actionDelete').onclick=()=>{const t=state.tasks.find(x=>x.id===selectedTaskId);if(t&&confirm('このタスクを削除しますか？')){state.tasks=state.tasks.filter(x=>x.id!==t.id);save();actionDialog.close();render();toast('タスクを削除しました')}};$('#cancelArchive').onclick=()=>archiveConfirm.close();$('#confirmArchive').onclick=()=>{const t=state.tasks.find(x=>x.id===selectedTaskId);if(t){t.hiddenFromList=true;t.hiddenAt=todayKey();save();render();toast('アーカイブしました')}archiveConfirm.close()};
function attachDrag(row,t){
 const zones=[row.querySelector('.drag-handle'),row.querySelector('.task-name')];
 const begin=e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  if(e.target.closest('button,input'))return;
  e.preventDefault();
  clearTimeout(dragTimer);
  pendingDrag={row,x:e.clientX,y:e.clientY};
  dragTimer=setTimeout(()=>{
   dragState={row,category:t.category,moved:false};
   row.classList.add('dragging');
   pendingDrag=null;
  },420);
 };
 zones.forEach(zone=>{zone.onpointerdown=begin;zone.onpointerup=()=>clearTimeout(dragTimer);zone.onpointercancel=()=>clearTimeout(dragTimer)});
}
document.addEventListener('pointermove',e=>{
 if(!dragState){
  if(pendingDrag&&Math.hypot(e.clientX-pendingDrag.x,e.clientY-pendingDrag.y)>8){clearTimeout(dragTimer);pendingDrag=null;}
  return;
 }
 const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.task-row');
 if(!target||target===dragState.row||target.dataset.category!==dragState.category)return;
 const r=target.getBoundingClientRect();
 target.parentNode.insertBefore(dragState.row,e.clientY>r.top+r.height/2?target.nextSibling:target);
 dragState.moved=true;
});
document.addEventListener('pointerup',()=>{
 clearTimeout(dragTimer);pendingDrag=null;
 if(!dragState)return;
 $$(`#homeTasks .task-row[data-category="${dragState.category}"]`).forEach((r,i)=>{const t=state.tasks.find(x=>x.id===r.dataset.id);if(t)t.order=i});
 save();dragState.row.classList.remove('dragging');
 if(dragState.moved)toast('順番を変更しました');
 dragState=null;
});
let editingMemo=null;$('#addMemo').onclick=()=>openMemo();$('#closeMemo').onclick=()=>$('#memoDialog').close();function openMemo(m=null){editingMemo=m?.id||null;$('#memoTitle').textContent=m?'メモを編集':'メモを追加';$('#memoText').value=m?.text||'';$('#deleteMemo').hidden=!m;$('#memoDialog').showModal()}$('#memoForm').onsubmit=e=>{e.preventDefault();const text=$('#memoText').value.trim();if(!text)return;if(editingMemo){const m=state.memos.find(x=>x.id===editingMemo);if(m)m.text=text}else state.memos.push({id:id(),text});save();$('#memoDialog').close();render();toast('メモを保存しました')};$('#deleteMemo').onclick=()=>{if(editingMemo&&confirm('このメモを削除しますか？')){state.memos=state.memos.filter(m=>m.id!==editingMemo);save();$('#memoDialog').close();render()}};
$('#exportData').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`my-little-days-${todayKey()}.json`;a.click();URL.revokeObjectURL(a.href)};$('#importData').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const x=JSON.parse(await f.text());if(!x||!Array.isArray(x.tasks))throw Error();if(confirm('現在のデータを読み込んだ内容で上書きしますか？')){state={...defaultState(),...x};save();render()}}catch{alert('JSONを読み込めませんでした')}e.target.value=''};
render();
})();