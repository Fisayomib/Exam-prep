function renderSubjectsPage(){
  const grid=document.getElementById('allSubjectGrid');
  if(!grid)return;
  grid.innerHTML=subjects.map(s=>`<article class="subject-card" role="button" tabindex="0" data-open="${esc(s.id)}"><div class="card-top"><span class="subject-badge">${esc(s.name.slice(0,1).toUpperCase())}</span><span class="dots">•••</span></div><h3>${esc(s.name)}</h3><p>${s.topics.length} ${s.topics.length===1?'topic':'topics'} · Exam ${esc(fmtDate(s.exam))}</p><div class="progress"><span style="width:${s.topics.length?Math.round(s.topics.filter(t=>t.done).length/s.topics.length*100):0}%"></span></div><div class="card-bottom"><span>${s.topics.filter(t=>t.done).length} of ${s.topics.length} topics complete</span><span>Open →</span></div></article>`).join('')||`<div class="empty" style="grid-column:1/-1"><h3>No subjects yet</h3><p>Create a subject to organize your notes and study plans.</p><button class="primary" id="addSubjectFromEmpty">＋ Add a subject</button></div>`;
  grid.querySelectorAll('[data-open]').forEach(card=>{
    const open=()=>openSubject(card.dataset.open);
    card.addEventListener('click',open);
    card.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();open();}
    });
  });
}

function renderCalendarPage(){
  subjects.forEach(syncSubjectTests);
  const events=subjects.flatMap(s=>[
    ...s.tests.map(t=>({...t,subject:s.name,subjectId:s.id,type:'Test'})),
    ...(s.exam?[{name:`${s.name} exam`,date:s.exam,subject:s.name,subjectId:s.id,type:'Exam'}]:[])
  ]).filter(a=>a.date).sort((a,b)=>a.date.localeCompare(b.date));
  document.getElementById('calendarCount').textContent=`${events.length} ${events.length===1?'assessment':'assessments'}`;
  document.getElementById('calendarItems').innerHTML=events.length?events.map(a=>{
    const date=new Date(a.date+'T12:00:00');
    return `<div class="assessment-row" data-calendar-open="${esc(a.subjectId)}"><div class="calendar-date"><b>${date.getDate()}</b><small>${date.toLocaleDateString(undefined,{month:'short'})}</small></div><div class="calendar-day">${date.toLocaleDateString(undefined,{weekday:'long'})}</div><div class="assessment-info"><strong>${esc(a.name)}</strong><small>${esc(a.subject)}</small></div><span class="tag ${a.type==='Test'?'soon':''}">${a.type}</span></div>`;
  }).join(''):`<div class="empty"><h3>No assessments yet</h3><p>Add a subject with an exam date or create a test inside one of your subjects.</p><button class="primary" id="calendarAddSubject">＋ Add a subject</button></div>`;
}

function showStudyPage(name){
  document.querySelectorAll('.screen').forEach(el=>el.classList.remove('active'));
  const screen=document.getElementById(`${name}Screen`);
  if(screen)screen.classList.add('active');
  const labels={dashboard:'Overview',subjects:'My subjects',calendar:'Study calendar',subject:'Subject',summary:'Topic summary',practice:'Practice'};
  document.getElementById('breadcrumb').textContent=`Workspace / ${labels[name]||'Overview'}`;
  document.querySelectorAll('.nav [data-screen],.mobile-nav [data-screen]').forEach(el=>el.classList.toggle('active',el.dataset.screen===name));
  if(name==='subjects')renderSubjectsPage();
  if(name==='calendar')renderCalendarPage();
  if(name==='dashboard'){subjects.forEach(syncSubjectTests);renderDashboard();}
  if(['dashboard','subjects','calendar','subject'].includes(name))persistStudyView(name);
  window.scrollTo(0,0);
}

async function renderPractice(topic,kinds,past){
  const subject=activeSubject();
  const title=past?'Past-question practice':topic?'Practise: '+topic.name:subject.name+' practice';
  const selectedTopics=topic?[topic]:subject.topics;
  const sourceNotes=past
    ?(subject.pastSources||[]).map(source=>'[Past question file: '+source.name+']\\n'+source.text).join('\\n\\n').slice(0,60000)
    :selectedTopics.map(item=>'[Topic: '+item.name+']\\n'+(item.sourceText||'')).filter(text=>text.trim()).join('\\n\\n').slice(0,60000);
  const summaryExtraContext=selectedTopics.map(item=>item.aiSummary?JSON.stringify(item.aiSummary):'').filter(Boolean).join('\\n\\n').slice(0,12000);
  const content=document.getElementById('practiceContent');
  showStudyPage('practice');
  if(!sourceNotes){
    content.innerHTML='<div class="eyebrow">'+(past?'Past questions':esc(subject.name))+'</div><h1>'+esc(title)+'</h1><p class="active-recall-error">'+(past?'Upload readable past-question files before starting AI past-question practice.':'Upload readable notes for this topic before creating practice questions.')+'</p><button class="secondary" id="backToTopics">Back to subject</button>';
    document.getElementById('backToTopics').onclick=()=>{showStudyPage('subject');renderSubject()};
    return;
  }
  content.innerHTML='<div class="eyebrow">'+(past?'Past questions':esc(subject.name))+'</div><h1>'+esc(title)+'</h1><p role="status" style="color:var(--muted)">Creating questions from your study materials…</p>';
  try{
    const result=await callStudyAI('practice',{
      subject:subject.name,
      topic:topic?topic.name:(past?'uploaded past questions for '+subject.name:subject.name+' topics'),
      sourceNotes:sourceNotes,
      summaryExtraContext:past?'Use these past questions as style examples. Create new questions and do not copy questions verbatim.':summaryExtraContext,
      kinds:kinds
    });
    const questions=Array.isArray(result.questions)?result.questions.filter(question=>question&&kinds.includes(question.kind)&&typeof question.question==='string'&&typeof question.answer==='string'):[];
    if(!questions.length)throw new Error('No usable questions were returned. Please try again.');
    const grouped=kinds.map(kind=>{
      const list=questions.filter(question=>question.kind===kind);
      if(!list.length)return '';
      const heading=kind==='objective'?'Objective questions':kind==='theory'?'Theory questions':'Flashcards';
      const cards=list.map((question,index)=>{
        const number=questions.indexOf(question);
        const prompt='<p><strong>'+ (index+1)+'. '+esc(question.question)+'</strong></p>';
        let interaction='';
        if(kind==='objective'){
          const options=Array.isArray(question.options)?question.options:[];
          interaction='<div class="ai-options">'+options.map((option,optionIndex)=>'<label class="choice"><input type="radio" name="ai-question-'+number+'" value="'+optionIndex+'"><span>'+esc(option)+'</span></label>').join('')+'</div><button class="quiet" type="button" data-check-question="'+number+'">Check answer</button><div class="answer" id="ai-answer-'+number+'"></div>';
        }else{
          interaction='<label for="ai-response-'+number+'" style="display:block;font-size:12px;font-weight:650;margin:8px 0 5px">Your response</label><textarea id="ai-response-'+number+'" class="active-recall-answer" placeholder="Write what you remember…"></textarea><button class="quiet" type="button" data-reveal-question="'+number+'">Show suggested answer</button><div class="answer" id="ai-answer-'+number+'"><strong>Suggested answer</strong><p>'+esc(question.answer)+'</p><p>'+esc(question.explanation||'')+'</p></div>';
        }
        return '<article class="question">'+prompt+interaction+'</article>';
      }).join('');
      return '<section><h2 style="font-size:18px;margin:18px 0 7px">'+heading+'</h2>'+cards+'</section>';
    }).join('');
    content.innerHTML='<div class="eyebrow">'+(past?'Past questions':esc(subject.name))+'</div><h1 style="font-size:28px;letter-spacing:-.04em;margin:4px 0">'+esc(title)+'</h1><p style="color:var(--muted);margin:0">Questions are based on your uploaded materials. Write your response before revealing a suggested answer.</p>'+grouped+'<button class="secondary" id="backToTopics">Back to subject</button>';
    content.querySelectorAll('[data-check-question]').forEach(button=>button.onclick=()=>{
      const number=Number(button.dataset.checkQuestion),question=questions[number];
      const selected=content.querySelector('input[name="ai-question-'+number+'"]:checked');
      const answer=document.getElementById('ai-answer-'+number);
      if(!selected){answer.innerHTML='<p>Choose an option first.</p>';answer.classList.add('show');return}
      const chosen=question.options[Number(selected.value)]||'';
      const correct=chosen.trim().toLowerCase()===question.answer.trim().toLowerCase();
      answer.innerHTML='<strong>'+(correct?'That’s right.':'Not quite; compare your choice with the answer.')+'</strong><p>Answer: '+esc(question.answer)+'</p><p>'+esc(question.explanation||'')+'</p>';
      answer.classList.add('show');
    });
    content.querySelectorAll('[data-reveal-question]').forEach(button=>button.onclick=()=>{
      const number=Number(button.dataset.revealQuestion),answer=document.getElementById('ai-answer-'+number),response=document.getElementById('ai-response-'+number);
      if(!response.value.trim()){response.focus();return}
      answer.classList.toggle('show');button.textContent=answer.classList.contains('show')?'Hide suggested answer':'Show suggested answer';
    });
    document.getElementById('backToTopics').onclick=()=>{showStudyPage('subject');renderSubject()};
  }catch(error){
    content.innerHTML='<div class="eyebrow">'+(past?'Past questions':esc(subject.name))+'</div><h1>'+esc(title)+'</h1><p class="active-recall-error">'+esc(error.message||'Questions could not be created. Please try again.')+'</p><button class="primary" id="retryPractice">Try again</button><button class="secondary" id="backToTopics">Back to subject</button>';
    document.getElementById('retryPractice').onclick=()=>renderPractice(topic,kinds,past);
    document.getElementById('backToTopics').onclick=()=>{showStudyPage('subject');renderSubject()};
  }
}

document.addEventListener('click',event=>{
  const pageButton=event.target.closest('[data-screen]');
  if(pageButton){showStudyPage(pageButton.dataset.screen);return;}
  const subjectCard=event.target.closest('[data-open]');
  if(subjectCard&&document.getElementById('subjectsScreen').classList.contains('active')){openSubject(subjectCard.dataset.open);return;}
  if(event.target.closest('#addSubjectFromPage')||event.target.closest('#addSubjectFromEmpty')||event.target.closest('#calendarAddSubject')){openSubjectModal();return;}
  if(event.target.closest('#addTestFromCalendar')){
    const candidate=subjects.find(subject=>subject.topics.length);
    if(!candidate){toast('Add notes and confirm topics before planning a test.');return;}
    openSubject(candidate.id);currentTab='tests';renderSubject();openTestModal();return;
  }
  const calendarAssessment=event.target.closest('[data-calendar-open]');
  if(calendarAssessment){openSubject(calendarAssessment.dataset.calendarOpen);return;}
  if(event.target.closest('#wholeSubjectPractice')){
    const subject=activeSubject();
    if(!subject?.topics.length||!subject.topics.every(item=>item.done)){toast('Complete each topic to unlock subject practice.');return;}
    openPractice(null);return;
  }
  if(event.target.closest('#pastQuestionPractice')){
    const subject=activeSubject();
    if(!subject?.past.length){toast('Add past questions to this subject first.');currentTab='past';renderSubject();return;}
    renderPractice(null,['objective','theory'],true);
  }
});

document.getElementById('addSubjectFromPage').addEventListener('click',openSubjectModal);

const studyPalettes=[
  {id:'dusk',name:'Dusk',mood:'Calm · Warm · Sophisticated',colors:['#1A1B2E','#42426F','#6D5BA6','#F08A8A','#FFD6C9']},
  {id:'sage',name:'Sage',mood:'Fresh · Natural · Balanced',colors:['#2E4D3D','#527F5B','#A3C9A8','#DCEAD9','#F7F7F2']},
  {id:'ocean',name:'Ocean',mood:'Cool · Clean · Refreshing',colors:['#0D1B2A','#1B4965','#29ADB2','#A8DADC','#E6F4F1']},
  {id:'sunset',name:'Sunset',mood:'Vibrant · Energetic · Friendly',colors:['#E94F37','#F9844A','#F9C74F','#FDD9B5','#FFF2E7']},
  {id:'lavender',name:'Lavender',mood:'Soft · Dreamy · Elegant',colors:['#5E4B8B','#7D6CC4','#B9A7E0','#E7D6F7','#F6F2FB']},
  {id:'mustard',name:'Mustard',mood:'Bold · Modern · Playful',colors:['#2B2B2B','#D4A017','#F0C94C','#F7E7B5','#FFFDF5']},
  {id:'teal-gray',name:'Teal / Gray',mood:'Minimal · Calm · Professional',colors:['#263238','#455A64','#80CBC4','#CFD8DC','#ECEFF1']},
  {id:'berry',name:'Berry',mood:'Rich · Bold · Luxurious',colors:['#6B0F3C','#9D174D','#E3356A','#F7A1B3','#FFE6EC']},
  {id:'arctic',name:'Arctic',mood:'Crisp · Cool · Modern',colors:['#102A43','#1E88E5','#64B5F6','#BBDEFB','#E3F2FD']},
  {id:'neutral',name:'Neutral',mood:'Timeless · Clean · Versatile',colors:['#333333','#757575','#BDBDBD','#EEEEEE','#FAFAFA']}
];

function applyStudyPalette(id,saveChoice=true){
  const palette=studyPalettes.find(item=>item.id===id)||studyPalettes.find(item=>item.id==='sage');
  document.documentElement.dataset.theme=palette.id;
  if(saveChoice)localStorage.setItem('studyspace-theme-v1',palette.id);
  document.querySelectorAll('[data-theme-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.themeChoice===palette.id)));
}

function applyColorMode(mode,saveChoice=true){
  const normalized=mode==='dark'?'dark':'light';
  document.documentElement.dataset.mode=normalized;
  if(saveChoice)localStorage.setItem('studyspace-mode-v1',normalized);
  document.querySelectorAll('[data-mode-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.modeChoice===normalized)));
}

function openAppearancePicker(){
  const cards=studyPalettes.map(palette=>`<button type="button" aria-pressed="${document.documentElement.dataset.theme===palette.id}" class="palette-option" data-theme-choice="${palette.id}"><span class="palette-name">${palette.name}<span class="palette-check">${document.documentElement.dataset.theme===palette.id?'✓ Selected':''}</span></span><span class="palette-swatches">${palette.colors.map(color=>`<i style="background:${color}" title="${color}"></i>`).join('')}</span><small style="display:block;margin-top:7px;color:var(--muted)">${palette.mood}</small></button>`).join('');
  const mode=document.documentElement.dataset.mode||'light';
  openModal('Choose an appearance','Preview a color palette and choose light or dark mode. Your choices are saved in this browser.',`<p class="appearance-description">Color mode</p><div class="mode-switch" role="group" aria-label="Color mode"><button type="button" data-mode-choice="light" aria-pressed="${mode==='light'}">Light</button><button type="button" data-mode-choice="dark" aria-pressed="${mode==='dark'}">Dark</button></div><p class="appearance-description">Color palette</p><div class="appearance-grid" aria-label="Color palettes">${cards}</div>`,`<button class="primary" data-cancel>Done</button>`);
  document.querySelector('#modalActions [data-cancel]').onclick=closeModal;
}

applyStudyPalette(localStorage.getItem('studyspace-theme-v1')||'sage',false);
applyColorMode(localStorage.getItem('studyspace-mode-v1')||'light',false);
document.getElementById('appearanceButton').addEventListener('click',openAppearancePicker);
document.addEventListener('click',event=>{
  const choice=event.target.closest('[data-theme-choice]');
  if(!choice)return;
  applyStudyPalette(choice.dataset.themeChoice);
  document.querySelectorAll('[data-theme-choice]').forEach(button=>{
    const selected=button.dataset.themeChoice===choice.dataset.themeChoice;
    button.setAttribute('aria-pressed',String(selected));
    button.querySelector('.palette-check').textContent=selected?'✓ Selected':'';
  });
});
document.addEventListener('click',event=>{
  const modeButton=event.target.closest('[data-mode-choice]');
  if(modeButton)applyColorMode(modeButton.dataset.modeChoice);
});

