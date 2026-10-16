import vm from 'node:vm';import fs from 'node:fs';import assert from 'node:assert/strict';
const questions=JSON.parse(fs.readFileSync('data/questions.json')),papers=JSON.parse(fs.readFileSync('data/papers.json'));
const translations=JSON.parse(fs.readFileSync('data/english-translations.json'));
const english=questions.filter(q=>q.subject==='法學知識與英文'&&q.type==='mc'&&Number(q.number)>=31);
assert.equal(Object.keys(translations).length,200);assert.equal(english.length,200);
for(const q of english){const tr=translations[q.id];assert.ok(tr.text.length>5);assert.equal(tr.options.length,4);assert.ok(tr.options.every(o=>o.length));if(q.context)assert.ok(tr.context.length>100);q.translation=tr;}
assert.equal(papers.length,57);assert.equal(questions.filter(q=>q.type==='mc').length,2025);assert.equal(questions.filter(q=>q.type==='essay').length,50);assert.equal(new Set(questions.map(q=>q.id)).size,questions.length);
for(const p of papers)assert.equal(p.mcCount,p.expectedMc,`${p.year} ${p.subject}`);
for(const q of questions){assert.ok(q.text.length>5);if(q.type==='mc'){assert.equal(q.options.length,4);assert.ok(q.options.every(o=>o.length>0));assert.ok(q.answers.length>=1);assert.ok(q.answers.every(a=>'ABCD'.includes(a)));if(q.subject==='法學知識與英文'&&q.number>=46)assert.ok(q.context.length>100)}}
const find=(year,subject,number)=>questions.find(q=>q.year===year&&q.subject===subject&&q.number===number);
assert.deepEqual(find(113,'法學知識與英文',3).answers,['A','B','D']);assert.deepEqual(find(113,'法學知識與英文',26).answers,['A','C']);assert.deepEqual(find(106,'行政學概要',18).answers,['A','B','C','D']);assert.deepEqual(find(115,'行政法概要',32).answers,['A','B']);
let elements={};const doc={querySelector:s=>elements[s]??={innerHTML:'',textContent:'',hidden:false},addEventListener(){}};let storage={};const localStorage={getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v};
const ctx=vm.createContext({console,document:doc,localStorage,Math,Date,JSON,Map,Set,Number,String,Object,Array,Error,Promise,setTimeout(){},window:{scrollTo(){}},fetch:async()=>({ok:true,json:async()=>({questions,papers})})});
const code=fs.readFileSync('client.js','utf8').replace(/init\(\);\s*$/,'');vm.runInContext(code,ctx);vm.runInContext('load(); BANK='+JSON.stringify(questions)+'; PAPERS='+JSON.stringify(papers)+';',ctx);
function run(s){return vm.runInContext(s,ctx)}
run('config.weights["公共管理概要"]=30; session={ids:["106-public-mc-1"],index:0,answers:{}}; applyCurrentSyllabus();');
assert.equal(run('subjs.length'),5);
assert.equal(run('BANK.filter(q=>q.subject==="公共管理概要").length'),0);
assert.equal(run('PAPERS.length'),50);
assert.equal(run('BANK.length'),1886);
assert.equal(run('Object.hasOwn(config.weights,"公共管理概要")'),false);
assert.equal(run('session'),null);
for(let view of ['home','bank','wrong','settings'])assert.ok(!run(view+'()').includes('公共管理概要'));

for(let i=0;i<100;i++){let result=run("weightedSample(pool(),20,config.weights)");assert.equal(result.length,20);assert.equal(new Set(result.map(q=>q.id)).size,20);assert.equal(result.filter(q=>q.subject==='行政法概要').length,6);assert.equal(result.filter(q=>q.subject==='行政學概要').length,6)}
assert.equal(run("weightedSample(pool(),200,{國文:1}).length"),100);
assert.equal(run("weightedSample(pool(),20,{}).length"),0);
run("config.from=113;config.to=115;config.count=20;start();");assert.ok(run('session.ids.every(id=>BANK.find(q=>q.id===id).year>=113)'));
run("let q=BANK.find(q=>q.id===session.ids[0]);choose('ABCD'.split('').find(a=>!q.answers.includes(a))||'A');");assert.equal(run('DATA.records[session.ids[0]].attempts'),1);run("choose('A')");assert.equal(run('DATA.records[session.ids[0]].attempts'),1);assert.ok(storage['adminDaily.v1']);
for(let t of ['home','wrong','bank','records','settings']){run('tab='+JSON.stringify(t)+';render()');assert.ok(elements['#app'].innerHTML.length>100)}
assert.throws(()=>run("validateBank([{id:'bad'}])"));
const quotes=JSON.parse(fs.readFileSync('data/quotes.json'));
assert.equal(quotes.length,300);
assert.equal(new Set(quotes.map(q=>q.zh.replace(/[\s\p{P}]/gu,''))).size,300);
assert.ok(quotes.every(q=>q.zh&&q.author&&q.work&&/^https:\/\//.test(q.source)));
assert.ok(quotes.filter(q=>q.en).every(q=>q.zh&&q.en.length>3));
assert.equal(JSON.stringify(run('DAILY_QUOTES')),JSON.stringify(quotes));
const daily=(iso)=>run('dailyQuote(new Date('+JSON.stringify(iso)+'))');
assert.equal(daily('2026-10-10T16:00:00Z').zh,daily('2026-10-11T15:59:59Z').zh);
assert.notEqual(daily('2026-10-11T15:59:59Z').zh,daily('2026-10-11T16:00:00Z').zh);
const cycle=[];for(let i=0;i<300;i++)cycle.push(daily(new Date(Date.UTC(2026,9,10,16)+i*86400000).toISOString()).zh);
assert.equal(new Set(cycle).size,300);
assert.equal(daily(new Date(Date.UTC(2026,9,10,16)+300*86400000).toISOString()).zh,cycle[0]);

run('session={ids:["115-0211-mc-31"],index:0,type:"mc",answers:{}};');
// Use actual source IDs, independent of official subject-code changes.
const englishId=english.find(q=>q.year===115&&q.number===31).id;
run('session={ids:['+JSON.stringify(englishId)+'],index:0,type:"mc",answers:{}};');
assert.ok(!run('question()').includes('aria-label="中文翻譯"'));
run('choose("A")');assert.ok(run('question()').includes('aria-label="中文翻譯"'));
assert.ok(run('question()').includes(translations[englishId].options[0]));
const readingId=english.find(q=>q.year===115&&q.number===46).id;
run('session={ids:['+JSON.stringify(readingId)+'],index:0,type:"mc",answers:{}};choose("A");');
assert.ok(run('question()').includes('共用文章中文翻譯'));
const legalId=questions.find(q=>q.subject==='行政法概要'&&q.type==='mc').id;
run('session={ids:['+JSON.stringify(legalId)+'],index:0,type:"mc",answers:{}};choose("A");');
assert.ok(!run('question()').includes('aria-label="中文翻譯"'));

assert.equal(run('formatExamText("草案全文或其主要內容等\\n 事項？")'),'草案全文或其主要內容等事項？');
assert.equal(run('formatExamText("international\\n volunteer programs")'),'international volunteer programs');
assert.equal(run('formatExamText("long-\\n term")'),'long-term');
assert.equal(run('formatExamText("第一段。\\n\\n第二段。")'),'第一段。\n\n第二段。');
assert.equal(run('formatExamText("題目說明。\\n（一）第一項\\n（二）第二項")'),'題目說明。\n\n（一）第一項\n\n（二）第二項');
for(const q of questions){for(const text of [q.text,...(q.options||[]),q.context||'']){const normalized=run('formatExamText('+JSON.stringify(text)+')');assert.equal(normalized.replace(/\s/g,''),text.replace(/\s/g,''),'Content retained: '+q.id)}}
const wrapId=questions.find(q=>q.text.includes('載明草案全文或其主要內容等')).id;
run('session={ids:['+JSON.stringify(wrapId)+'],index:0,type:"mc",answers:{}};');
assert.ok(run('question()').includes('草案全文或其主要內容等事項？'));
assert.ok(run('question()').includes('class="options"'));

run('DATA.notes={};DATA.noteUpdated={};notesSearch="";notesSubject="all";');
const noteMC=questions.find(q=>q.year===106&&q.subject==='行政法概要'),noteEssay=questions.find(q=>q.year===115&&q.type==='essay'&&q.subject==='國文');
run('saveNote('+JSON.stringify(noteMC.id)+',"訴願與行政處分 <script>alert(1)</script>");saveNote('+JSON.stringify(noteEssay.id)+',"作文段落架構");DATA.notes["missing-question"]="orphan";');
assert.equal(run('noteEntries().length'),2);
assert.equal(JSON.parse(storage['adminDaily.v1']).notes[noteMC.id],'訴願與行政處分 <script>alert(1)</script>');
assert.ok(run('notes()').includes('&lt;script&gt;'));
assert.ok(!run('notes()').includes('<script>'));
run('notesSubject="國文";');assert.equal(run('filteredNotes().length'),1);
run('notesSubject="all";notesSearch="訴願";');assert.equal(run('filteredNotes().length'),1);
run('notesSearch="";DATA.notes['+JSON.stringify(noteMC.id)+']="   ";');assert.equal(run('noteEntries().length'),1);
run('notesSubject="all";notesSearch="";tab="notes";render();');assert.ok(elements['#nav'].innerHTML.includes('我的筆記'));assert.ok(elements['#app'].innerHTML.includes('作文段落架構'));
elements['#modal']={innerHTML:'',showModal(){}};const activeSession=run('JSON.stringify(session)');
run('showNoteQuestion('+JSON.stringify(noteEssay.id)+')');assert.equal(run('JSON.stringify(session)'),activeSession);assert.ok(elements['#modal'].innerHTML.includes('官方原卷'));

const tagQ1=questions.find(q=>q.year===106&&q.subject==='行政法概要'&&q.type==='mc'),tagQ2=questions.find(q=>q.year===115&&q.subject==='行政法概要'&&q.type==='mc');
run('DATA.records={};DATA.errorMeta={};config.from=106;config.to=115;mode="mc";wrongReason="all";wrongTag="all";');
run('DATA.records['+JSON.stringify(tagQ1.id)+']={wrong:true,wrongCount:2};DATA.records['+JSON.stringify(tagQ2.id)+']={wrong:true,wrongCount:1};');
run('updateErrorMeta('+JSON.stringify(tagQ1.id)+',{reason:"相似概念混淆",tags:"行政處分、行政命令,行政處分; BSC、bsc"});');
assert.equal(run('getErrorMeta('+JSON.stringify(tagQ1.id)+').tags.length'),3);
run('updateErrorMeta('+JSON.stringify(tagQ2.id)+',{reason:"漏看題目",tags:"行政處分"});');
assert.equal(run('errorCounts(reviewQuestions()).tags["行政處分"]'),2);
assert.equal(run('errorCounts(reviewQuestions()).reasons["相似概念混淆"]'),1);
run('wrongReason="相似概念混淆";');assert.equal(run('filteredWrong().length'),1);
run('wrongReason="all";wrongTag="行政命令";');assert.equal(run('filteredWrong().length'),1);
run('start(true)');assert.equal(run('session.ids.length'),1);assert.equal(run('session.ids[0]'),tagQ1.id);
assert.ok(run('question()').includes('錯誤原因與觀念標籤'));
assert.ok(run('prompt(BANK.find(q=>q.id==='+JSON.stringify(tagQ1.id)+'))').includes('我的錯誤原因：相似概念混淆'));
run('updateErrorMeta('+JSON.stringify(tagQ1.id)+',{tags:"<script>、行政命令"});');assert.ok(run('wrong()').includes('&lt;script&gt;'));assert.ok(!run('wrong()').includes('<script>'));
assert.equal(JSON.parse(storage['adminDaily.v1']).errorMeta[tagQ1.id].reason,'相似概念混淆');
await run('importFile({text:async()=>'+JSON.stringify(JSON.stringify({format:'adminDaily.backup.v1',data:{records:{},errorMeta:{[tagQ2.id]:{reason:'記憶不熟',tags:['BSC']}}}}))+'},true)');
assert.equal(run('getErrorMeta('+JSON.stringify(tagQ2.id)+').reason'),'記憶不熟');
assert.equal(run('getErrorMeta('+JSON.stringify(tagQ1.id)+').reason'),'相似概念混淆');

run('DATA.records={};DATA.errorMeta={};mode="mc";config.from=106;config.to=115;wrongReason="all";wrongTag="all";page=0;');
const exportIds=run('pool().slice(0,25).map(q=>q.id)');
for(const id of exportIds)run('DATA.records['+JSON.stringify(id)+']={wrong:true,wrongCount:2,lastAnswer:"A"};');
const fullExport=run('buildWrongExport()');assert.ok(fullExport.includes('本次匯出：25 題'));assert.ok(fullExport.includes('題目 25'));assert.ok(fullExport.includes(exportIds[24]));
run('updateErrorMeta('+JSON.stringify(exportIds[0])+',{reason:"觀念不清",tags:"行政命令"});wrongTag="行政命令";');
const filteredExport=run('buildWrongExport()');assert.ok(filteredExport.includes('本次匯出：1 題'));assert.ok(!filteredExport.includes(exportIds[1]));
const readingExportQ=english.find(q=>q.year===115&&q.number===46),essayExportQ=questions.find(q=>q.year===115&&q.type==='essay'&&q.subject==='國文');
assert.ok(run('buildWrongExport([BANK.find(q=>q.id==='+JSON.stringify(readingExportQ.id)+')])').includes('共用文章全文'));
assert.ok(run('buildWrongExport([BANK.find(q=>q.id==='+JSON.stringify(readingExportQ.id)+')])').includes('A. '));
run('DATA.drafts['+JSON.stringify(essayExportQ.id)+']="我的申論架構";');assert.ok(run('buildWrongExport([BANK.find(q=>q.id==='+JSON.stringify(essayExportQ.id)+')])').includes('我的申論架構'));
const retryQ=questions.find(q=>q.subject==='行政法概要'&&q.type==='mc'&&q.answers.length===1),bad='ABCD'.split('').find(a=>!retryQ.answers.includes(a));
run('session={ids:['+JSON.stringify(retryQ.id)+'],index:0,type:"mc",answers:{}};choose('+JSON.stringify(bad)+');');
run('session.answers={};choose('+JSON.stringify(retryQ.answers[0])+');');
assert.equal(run('DATA.records['+JSON.stringify(retryQ.id)+'].lastWrongAnswer'),bad);
assert.ok(run('buildWrongExport([BANK.find(q=>q.id==='+JSON.stringify(retryQ.id)+')])').includes('最後一次錯誤答案：'+bad));

run('DATA.notes['+JSON.stringify(noteMC.id)+']="要刪除的筆記";DATA.noteUpdated['+JSON.stringify(noteMC.id)+']=123;tab="notes";notesSearch="";notesSubject="all";');
const beforeRecord=run('JSON.stringify(DATA.records['+JSON.stringify(noteMC.id)+'])'),beforeMeta=run('JSON.stringify(DATA.errorMeta['+JSON.stringify(noteMC.id)+'])'),beforeSession=run('JSON.stringify(session)');
assert.ok(run('notes()').includes('data-delete-note'));
assert.equal(run('deleteNote('+JSON.stringify(noteMC.id)+')'),true);
assert.equal(run('Object.hasOwn(DATA.notes,'+JSON.stringify(noteMC.id)+')'),false);
assert.ok(run('notes()').includes('undo-delete-note'));
assert.equal(run('JSON.stringify(DATA.records['+JSON.stringify(noteMC.id)+'])'),beforeRecord);
assert.equal(run('JSON.stringify(DATA.errorMeta['+JSON.stringify(noteMC.id)+'])'),beforeMeta);
assert.equal(run('JSON.stringify(session)'),beforeSession);
assert.ok(!Object.hasOwn(JSON.parse(storage['adminDaily.v1']).notes,noteMC.id));
run('restoreDeletedNote()');assert.equal(run('DATA.notes['+JSON.stringify(noteMC.id)+']'),'要刪除的筆記');assert.equal(run('DATA.noteUpdated['+JSON.stringify(noteMC.id)+']'),123);
run('deleteNote('+JSON.stringify(noteMC.id)+');saveNote('+JSON.stringify(noteMC.id)+',"新筆記");restoreDeletedNote();');assert.equal(run('DATA.notes['+JSON.stringify(noteMC.id)+']'),'新筆記');

assert.ok(run('home()').includes('PERSONAL STUDY SPACE'));
for(const view of ['wrong','bank','notes','records','settings'])assert.ok(!run(view+'()').includes('class="intro"'),view+' header removed');
assert.ok(!run('question()').includes('class="intro"'));assert.ok(run('question()').includes('practice-position'));
console.log('PASS: 57 papers, all answer counts, correction variants, reading context, weighted selection, no duplicates, year filters, answer recording, rendering, import validation, 300 unique quotes and Taipei daily rollover, post-answer translations for 200 English questions, soft-wrap normalization without content loss, note search/filter/save/escaping and original-question view, error labels/counts/filtered practice/backup, full filtered export and last wrong answer preservation, isolated note deletion and undo.');
