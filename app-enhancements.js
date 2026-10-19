function renderSubjectsPage(){
  const grid=document.getElementById('allSubjectGrid');
  if(!grid)return;
  grid.innerHTML=subjects.map(s=>`<article class="subject-card" data-open="${esc(s.id)}"><div class="card-top"><span class="subject-badge">${esc(s.name.slice(0,1).toUpperCase())}</span><span class="dots">•••</span></div><h3>${esc(s.name)}</h3><p>${s.topics.length} ${s.topics.length===1?'topic':'topics'} · Exam ${esc(fmtDate(s.exam))}</p><div class="progress"><span style="width:${s.topics.length?Math.round(s.topics.filter(t=>t.done).length/s.topics.length*100):0}%"></span></div><div class="card-bottom"><span>${s.topics.filter(t=>t.done).length} of ${s.topics.length} topics complete</span><span>Open →</span></div></article>`).join('')||`<div class="empty" style="grid-column:1/-1"><h3>No subjects yet</h3><p>Create a subject to organize your notes and study plans.</p><button class="primary" id="addSubjectFromEmpty">＋ Add a subject</button></div>`;
}

function renderCalendarPage(){
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
  window.scrollTo(0,0);
}

function renderPractice(topic,kinds,past){
  const s=activeSubject();
  const topicName=topic?.name||s.name;
  const title=past?'Past-question practice':topic?`Practise: ${topic.name}`:`${s.name} practice`;
  const sections=kinds.map(kind=>{
    const heading=kind==='objective'?'Objective questions':kind==='theory'?'Theory questions':'Flashcards';
    if(kind==='flashcards'){
      const cards=[
        {prompt:`What is one important idea from ${topicName}?`,answer:'A concise answer generated from the confirmed notes for this topic will appear here.'},
        {prompt:`How would you explain ${topicName} in your own words?`,answer:'A second note-based answer will appear here, with key terms that help you check your recall.'}
      ];
      return `<section><h2 style="font-size:18px;margin:18px 0 7px">${heading}</h2><p style="color:var(--muted);font-size:13px">Type your answer before flipping each card to see the suggested answer.</p>${cards.map((card,i)=>`<div class="flashcard-wrap" data-flashcard="${i}"><div class="flashcard-rotator"><div class="flashcard-face"><span class="flashcard-label">Front · ${i+1} of ${cards.length}</span><h3 class="flashcard-prompt">${esc(card.prompt)}</h3><label for="flashAnswer${i}" style="display:block;font-size:12px;font-weight:650;margin-bottom:6px">Your answer</label><textarea id="flashAnswer${i}" class="flashcard-answer-input" placeholder="Type what you remember..."></textarea><div class="flashcard-controls"><span class="flashcard-index">Answer first, then reveal</span><button class="primary" data-flip="${i}" disabled>Check answer & flip</button></div></div><div class="flashcard-back"><span class="flashcard-label">Back · Suggested answer</span><h3 class="flashcard-prompt">${esc(card.prompt)}</h3><div class="flashcard-submitted" id="submitted${i}"></div><p style="font-size:14px;color:#435047">${esc(card.answer)}</p><div class="flashcard-controls"><span class="flashcard-index">Compare your recall with the answer.</span><button class="secondary" data-unflip="${i}">Flip back</button></div></div></div></div>`).join('')}</section>`;
    }
    const prompts=kind==='objective'?[`Which statement best describes ${topicName}?`,`Which idea is most important to remember?`]:[`Explain the main ideas in ${topicName} in your own words.`,`Give an example that demonstrates ${topicName}.`];
    return `<section><h2 style="font-size:18px;margin:18px 0 7px">${heading}</h2>${prompts.map((q,i)=>`<div class="question"><p><strong>${i+1}. ${esc(q)}</strong></p>${kind==='objective'?'<label><input type="radio" name="q'+kind+i+'"> Option A</label> &nbsp; <label><input type="radio" name="q'+kind+i+'"> Option B</label> &nbsp; <label><input type="radio" name="q'+kind+i+'"> Option C</label>':''}<button class="quiet" data-answer="${kind+i}">Show answer</button><div class="answer" id="answer-${kind+i}">A note-based sample answer and explanation will be generated here.</div></div>`).join('')}</section>`;
  }).join('');
  document.getElementById('practiceContent').innerHTML=`<div class="eyebrow">${past?'Past questions':esc(s.name)}</div><h1 style="font-size:28px;letter-spacing:-.04em;margin:4px 0">${esc(title)}</h1><p style="color:var(--muted);margin:0">${past?'New questions will follow the style of the past questions uploaded to this subject.':'A sample practice screen. Real question generation will connect to the uploaded materials.'}</p>${sections}<button class="secondary" id="backToTopics">Back to topics</button>`;
  document.querySelectorAll('[data-answer]').forEach(button=>button.onclick=()=>{const answer=document.getElementById(`answer-${button.dataset.answer}`);answer.classList.toggle('show');button.textContent=answer.classList.contains('show')?'Hide answer':'Show answer'});
  document.querySelectorAll('[data-flashcard]').forEach(card=>{
    const input=card.querySelector('.flashcard-answer-input');
    const flip=card.querySelector('[data-flip]');
    input.addEventListener('input',()=>{flip.disabled=!input.value.trim()});
    flip.addEventListener('click',()=>{
      if(!input.value.trim())return;
      card.querySelector(`#submitted${flip.dataset.flip}`).textContent=`Your answer: ${input.value.trim()}`;
      card.classList.add('is-flipped');
    });
    card.querySelector('[data-unflip]').addEventListener('click',()=>card.classList.remove('is-flipped'));
  });
  document.getElementById('backToTopics').onclick=()=>{showStudyPage('subject');renderSubject()};
  showStudyPage('practice');
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

