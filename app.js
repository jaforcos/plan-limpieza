(() => {
  const LS_KEY='planLimpieza2026_infantil_v1';
  const data=window.PLAN_DATA;
  const PLAN_START_ISO = data.rules?.planStartDate || '2026-02-07';

  const toISO = (d) => {
    const y=d.getFullYear();
    const m=String(d.getMonth()+1).padStart(2,'0');
    const day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  };
  const parseISO = (s) => {
    const [y,m,dd]=s.split('-').map(Number);
    const x=new Date(y,m-1,dd);
    x.setHours(0,0,0,0);
    return x;
  };
  const pad=n=>String(n).padStart(2,'0');
  const toDMY=d=>`${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
  const parseDMY=s=>{
    const m=(s||'').match(/^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/);
    if(!m) return null;
    const dd=+m[1], mm=+m[2], yy=+m[3];
    const x=new Date(yy,mm-1,dd);
    x.setHours(0,0,0,0);
    if(x.getFullYear()!==yy||x.getMonth()!==mm-1||x.getDate()!==dd) return null;
    return x;
  };
  const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);x.setHours(0,0,0,0);return x;};
  const dayNameES=d=>['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][d.getDay()];

  const PLAN_START=parseISO(PLAN_START_ISO);

  const defaultState=()=>{
    const today=new Date(); today.setHours(0,0,0,0);
    const start=(today<PLAN_START)?PLAN_START:today;
    return { selectedDate: toISO(start), rotationOverride:'AUTO', done:{} };
  };
  const loadState=()=>{try{const raw=localStorage.getItem(LS_KEY);const s=raw?JSON.parse(raw):{};const merged={...defaultState(),...s};if(parseISO(merged.selectedDate)<PLAN_START) merged.selectedDate=toISO(PLAN_START);return merged;}catch{return defaultState();}};
  let state=loadState();
  const saveState=()=>localStorage.setItem(LS_KEY, JSON.stringify(state));

  const ensureBucket=(obj,key)=>(obj[key]??={});
  const isDone=(dateISO,id)=>!!(state.done[dateISO]&&state.done[dateISO][id]);
  const setDone=(dateISO,id,val)=>{ensureBucket(state.done,dateISO)[id]=!!val;saveState();};

  const computeRotation=(dateObj)=>{
    const weekStartMonday=(()=>{const x=new Date(dateObj);const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);x.setHours(0,0,0,0);return x;})();
    const rotStartSat=parseISO(data.rules.rotationStartSaturday);
    const sat=addDays(weekStartMonday,5);
    const diffDays=Math.floor((sat-rotStartSat)/(1000*60*60*24));
    const weeks=Math.floor(diffDays/7);
    return ['A','B','C','D'][((weeks%4)+4)%4];
  };

  const taskId=(scope,dayKey,person,index,rot)=>`${scope}_${dayKey}_${person}_${index}${rot?('_'+rot):''}`;

  const scheduledTasksForDate=(dateObj)=>{
    if(dateObj<PLAN_START) return [];
    const iso=toISO(dateObj);
    const dow=dateObj.getDay();
    if(dow===0){
      return (data.sunday||[]).map((it,i)=>({iso,originalISO:iso,person:it.person,task:it.task,minutes:it.minutes,id:taskId('SUN','Domingo',it.person,i)}));
    }
    if(dow===6){
      const autoRot=computeRotation(dateObj);
      const rot=(state.rotationOverride==='AUTO')?autoRot:state.rotationOverride;
      const block=data.saturday[rot];
      return (block.items||[]).map((it,i)=>({iso,originalISO:iso,person:it.person,task:it.task,minutes:it.minutes,id:taskId('SAT','Sábado',it.person,i,rot),rot,title:block.title}));
    }
    const name=dayNameES(dateObj);
    const arr=(data.daily&&data.daily[name])?data.daily[name]:[];
    return arr.map((it,i)=>({iso,originalISO:iso,person:it.person,task:it.task,minutes:it.minutes,id:taskId('LV',name,it.person,i)}));
  };

  const pendingTasksUpTo=(dateObj)=>{
    const end=addDays(dateObj,-1);
    if(end<PLAN_START) return [];
    let cur=new Date(PLAN_START);
    const out=[];
    while(cur<=end){
      const curISO=toISO(cur);
      const tasks=scheduledTasksForDate(cur);
      for(const t of tasks){
        if(!isDone(curISO,t.id)) out.push({...t,pendingFrom:curISO,iso:toISO(dateObj),originalISO:curISO});
      }
      cur=addDays(cur,1);
    }
    return out;
  };

  const personEmoji=(name)=>({
    'Papá':'🧔‍♂️','Mamá':'👩‍🦰','Miguel':'🧑‍💻','Ruth':'👧','Lidia':'👧‍🦱','Sara':'👧','Jesús':'🧒'
  }[name]||'🙂');

  const sumMinutes=(tasks)=>{let total=0;for(const t of tasks){const m=String(t.minutes||'').match(/\d+/);if(m) total+=Number(m[0]);}return total;};
  const groupByPerson=(tasks)=>{
    const m=new Map();
    for(const t of tasks){
      const k=t.person||'—';
      if(!m.has(k)) m.set(k,[]);
      m.get(k).push(t);
    }
    return Array.from(m.entries()).map(([person,items])=>({person,items}));
  };

  const startText=document.getElementById('startDateText');
  const rotationEl=document.getElementById('rotation');
  const rotationHint=document.getElementById('rotationHint');
  const dayContent=document.getElementById('dayContent');
  const extrasContent=document.getElementById('extrasContent');

  const mkHeader=(title,dateISO)=>{
    const div=document.createElement('div');
    div.className='day-title';
    div.innerHTML=`<h3>${title}</h3><span class="badge">${dateISO.split('-').reverse().join('/')}</span>`;
    return div;
  };

  const mkTask=(t,pending)=>{
    const card=document.createElement('div'); card.className='task-card';
    const top=document.createElement('div'); top.className='task-top';
    const left=document.createElement('div');
    left.innerHTML=`<div class="task-person">${t.person}</div>`;
    const meta=document.createElement('div'); meta.className='task-meta';
    meta.innerHTML=`<span class="badge">${t.minutes} min</span>`;
    if(pending) meta.innerHTML += `<span class="badge pending">de ${t.pendingFrom.split('-').reverse().join('/')}</span>`;
    left.appendChild(meta);
    const right=document.createElement('div');
    const cb=document.createElement('input'); cb.type='checkbox'; cb.className='checkbox';
    cb.checked=isDone(t.originalISO,t.id);
    cb.addEventListener('change',()=>{setDone(t.originalISO,t.id,cb.checked); render();});
    right.appendChild(cb);
    top.appendChild(left); top.appendChild(right);
    const txt=document.createElement('div'); txt.className='task-text'; txt.textContent=t.task;
    card.appendChild(top); card.appendChild(txt);
    return card;
  };

  const mkPersonGroup=(person,items,pending)=>{
    const box=document.createElement('div'); box.className='person-group';
    const head=document.createElement('button'); head.type='button'; head.className='person-head';
    const left=document.createElement('div'); left.className='person-left';
    const emo=document.createElement('div'); emo.className='person-emoji'; emo.textContent=personEmoji(person);
    const nm=document.createElement('div'); nm.className='person-name'; nm.textContent=person;
    left.appendChild(emo); left.appendChild(nm);

    const badges=document.createElement('div'); badges.className='person-badges';
    const c1=document.createElement('span'); c1.className='chip'; c1.textContent=`🧩 ${items.length}`;
    const c2=document.createElement('span'); c2.className='chip'; c2.textContent=`⏱️ ~${sumMinutes(items)}`;
    badges.appendChild(c1); badges.appendChild(c2);

    head.appendChild(left); head.appendChild(badges);
    const body=document.createElement('div'); body.className='person-body';
    const list=document.createElement('div'); list.className='task-cards';
    items.forEach(t=>list.appendChild(mkTask(t,pending)));
    body.appendChild(list);

    head.addEventListener('click',()=>box.classList.toggle('open'));
    box.appendChild(head); box.appendChild(body);
    return box;
  };

  const renderDay=()=>{
    dayContent.innerHTML='';
    const d=parseISO(state.selectedDate);
    const pending=pendingTasksUpTo(d);
    const scheduled=scheduledTasksForDate(d);

    dayContent.appendChild(mkHeader(`${dayNameES(d)} · ${state.selectedDate.split('-').reverse().join('/')}`, state.selectedDate));

    const pTitle=document.createElement('div'); pTitle.className='day-title'; pTitle.innerHTML='<h3>⏳ Pendientes</h3>';
    dayContent.appendChild(pTitle);
    if(pending.length){
      const groups=groupByPerson(pending);
      groups.forEach(g=>dayContent.appendChild(mkPersonGroup(g.person,g.items,true)));
      if(groups.length<=2) dayContent.querySelectorAll('.person-group').forEach(el=>el.classList.add('open'));
    } else {
      const ok=document.createElement('div'); ok.className='task-card'; ok.innerHTML='<div class="task-text">🎉 ¡No hay pendientes!</div>';
      dayContent.appendChild(ok);
    }

    const tTitle=document.createElement('div'); tTitle.className='day-title'; tTitle.innerHTML='<h3>✅ Tareas de hoy</h3>';
    dayContent.appendChild(tTitle);
    if(scheduled.length){
      const groups=groupByPerson(scheduled);
      groups.forEach(g=>dayContent.appendChild(mkPersonGroup(g.person,g.items,false)));
      const all=dayContent.querySelectorAll('.person-group');
      if(groups.length<=2) all.forEach(el=>el.classList.add('open'));
      else if(all[0]) all[0].classList.add('open');
    } else {
      const none=document.createElement('div'); none.className='task-card'; none.innerHTML='<div class="task-text">Hoy no hay tareas.</div>';
      dayContent.appendChild(none);
    }

    if(d.getDay()===6){
      const autoRot=computeRotation(d);
      const rot=(state.rotationOverride==='AUTO')?autoRot:state.rotationOverride;
      rotationHint.textContent = (state.rotationOverride==='AUTO') ? `🌀 Sábado: ${autoRot}` : `🌀 Sábado: ${rot} (auto: ${autoRot})`;
    } else {
      rotationHint.textContent='🌀 Rotación: solo sábado';
    }
  };

  const renderExtras=()=>{
    extrasContent.innerHTML='';
    const wrap=document.createElement('div'); wrap.className='task-cards';
    (data.monthlyExtras||[]).forEach(x=>{
      const c=document.createElement('div'); c.className='task-card';
      c.innerHTML=`<div class="task-top"><div><div class="task-person">${x.month}</div><div class="task-meta"><span class="badge">⭐</span></div></div></div><div class="task-text">${x.task}${x.notes?(' — '+x.notes):''}</div>`;
      wrap.appendChild(c);
    });
    extrasContent.appendChild(wrap);
  };

  const render=()=>{ startText.value=toDMY(parseISO(state.selectedDate)); rotationEl.value=state.rotationOverride; renderDay(); renderExtras(); };

  const commitDate=()=>{
    const d=parseDMY(startText.value);
    if(!d) return;
    const chosen=(d<PLAN_START)?PLAN_START:d;
    state.selectedDate=toISO(chosen);
    startText.value=toDMY(chosen);
    saveState();
    render();
  };

  startText.addEventListener('blur',commitDate);
  startText.addEventListener('keydown',(e)=>{if(e.key==='Enter'){e.preventDefault();commitDate();startText.blur();}});
  rotationEl.addEventListener('change',()=>{state.rotationOverride=rotationEl.value;saveState();render();});

  // HOY: siempre hoy local
  document.getElementById('btnToday').addEventListener('click',()=>{
    const t=new Date(); t.setHours(0,0,0,0);
    const chosen=(t<PLAN_START)?PLAN_START:t;
    state.selectedDate=toISO(chosen);
    saveState();
    render();
  });

  // nav
  document.querySelectorAll('.nav-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      const tab=btn.dataset.tab;
      if(tab==='day'){
        document.querySelector('.panel').classList.add('active');
        document.getElementById('panel-extras').classList.remove('active');
        document.getElementById('panel-ajustes').classList.remove('active');
      } else {
        document.querySelector('.panel').classList.remove('active');
        document.getElementById('panel-'+tab).classList.add('active');
      }
      window.scrollTo({top:0,behavior:'smooth'});
    });
  });

  // export/import/reset
  const download=(filename,text)=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:'application/json'})); a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000); };
  document.getElementById('btnExport').addEventListener('click',()=>download(`progreso_${state.selectedDate}.json`, JSON.stringify({exportedAt:new Date().toISOString(), state},null,2)));
  document.getElementById('importFile').addEventListener('change',async(e)=>{const f=e.target.files&&e.target.files[0]; if(!f) return; const t=await f.text(); try{const p=JSON.parse(t); if(!p.state) throw 0; state={...defaultState(),...p.state}; if(parseISO(state.selectedDate)<PLAN_START) state.selectedDate=toISO(PLAN_START); saveState(); render(); alert('Importado.');}catch{alert('Archivo no válido.');}});
  document.getElementById('btnReset').addEventListener('click',()=>{if(!confirm('¿Borrar todas las marcas?')) return; state=defaultState(); saveState(); render();});

  if('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(()=>{});

  render();
})();
