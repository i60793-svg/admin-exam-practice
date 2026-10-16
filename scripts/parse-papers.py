import json,re,pathlib,collections,unicodedata,fitz
ROOT=pathlib.Path(__file__).resolve().parent.parent;C=ROOT/'.cache/moex'
papers=json.loads((ROOT/'data/papers.json').read_text());bank=[];errors=[]
def clean(s):
 return re.sub(r'[ \t]+',' ',s).strip()
def text(p,kind):
 sid=re.search(r'&s=([^&]+)',p['links']['試題'])[1];f=C/f"{p['year']}-{sid}-{kind}.txt";return f.read_text() if f.exists() else ''
def answers(s):
 s=unicodedata.normalize('NFKC',s);out={};lines=s.splitlines()
 for i,l in enumerate(lines):
  if l.strip().startswith('題號'):
   nums=re.findall(r'第\s*(\d+)\s*題',l);a=lines[i+1] if i+1<len(lines) else '';vals=re.findall(r'(?<![A-Z])[A-D](?![A-Z])|一律給分|#',a)
   for n,v in zip(nums,vals):out[int(n)]=v
 for n,note in re.findall(r'第\s*(\d+)\s*題([^。，,\n]+)',s):
  if '給分' in note:
   letters=re.findall('[ABCD]',note);out[int(n)]=''.join(letters) if letters else '一律給分'
 return {n:v for n,v in out.items() if v!='#'}
for p in papers:
 s=text(p,'Q');ans=answers(text(p,'S'));corr=answers(text(p,'M'));ans.update(corr)
 # Reconstruct missing printed numeric labels in the 112 Chinese PDF by text geometry.
 if p['year']==112 and p['subject'].startswith('國文'):
  sid=re.search(r'&s=([^&]+)',p['links']['試題'])[1];doc=fitz.open(C/f"112-{sid}-Q.pdf");out=[];started=False;newq=True;n=0
  for pg in doc:
   for b in pg.get_text('dict')['blocks']:
    for line in b.get('lines',[]):
     t=''.join(sp['text'] for sp in line['spans']);x,y=line['bbox'][:2]
     if '乙、' in t:started=True
     if started and y>115 and 50<x<65 and not any(c in t for c in '') and newq:
      n+=1;t=f'{n} '+t;newq=False
     if started and '' in t:newq=True
     out.append(t)
  s='\n'.join(out)
 # Drop repeated page headers and unify private-font option characters.
 s='\n'.join(l for l in s.replace('\f','\n').splitlines() if not re.search(r'(年公務人員普通考試試題|全一張|（正面）|（背面）|請接背面|代號[：:]|頁次[：:]|^\s*(類\s*科|科\s*目)[：:]|^\s*\d{5}\s*$|^\s*\|\s*$)',l))
 s=re.sub(r'^\s*\d+\.\s*(?=[])','',s,flags=re.M)
 for idx,c in enumerate('',1):s=s.replace(c,str(idx)+' ')
 for c,a in zip('','ABCD'):s=s.replace(c,f'[{a}]')
 candidates=list(re.finditer(r'^\s*(\d{1,3})\s+([^\n]+)',s,re.M));matches=[];expect=1
 for m in candidates:
  if int(m[1])==expect and expect in ans:matches.append(m);expect+=1
 mc=[];contexts={}
 for cm in re.finditer(r'請依下文回答第\s*(\d+)\s*題至第\s*(\d+)\s*題[^\n]*',s):
  first=next((m for m in matches if int(m[1])==int(cm[1])),None)
  if first:
   context=clean(s[cm.start():first.start()]);contexts.update({n:context for n in range(int(cm[1]),int(cm[2])+1)})
 for i,m in enumerate(matches):
  n=int(m[1]);chunk=s[m.start():matches[i+1].start() if i+1<len(matches) else len(s)];chunk=re.split(r'請依下文回答',chunk)[0];parts=re.split(r'\[([ABCD])\]',chunk)
  if len(parts)!=9 or [parts[j] for j in [1,3,5,7]]!=list('ABCD'):
   errors.append([p['year'],p['subject'],n,'options']);continue
  if n not in ans:errors.append([p['year'],p['subject'],n,'answer']);continue
  q=clean(re.sub(r'^\s*\d+\s+','',parts[0]));opts=[clean(parts[j]) for j in [2,4,6,8]]
  if not q and contexts.get(n):q=f'請選出文章中第 {n} 格最適當的答案。'
  # Clean residual end-of-paper empty space.
  mc.append({'id':f"{p['year']}-{re.search(r'&s=([^&]+)',p['links']['試題'])[1]}-mc-{n}",'year':p['year'],'subject': '國文' if p['subject'].startswith('國文') else '法學知識與英文' if p['subject'].startswith('法學知識') else p['subject'],'type':'mc','number':n,'text':q,'context':contexts.get(n,''),'options':opts,'answers':list(dict.fromkeys(ans[n])) if ans[n]!='一律給分' else list('ABCD'),'source':p['links']['試題'],'answerSource':p['links'].get('更正答案',p['links'].get('答案')),'corrected':bool(corr)})
 bank.extend(mc)
 # Essay and composition sections precede the first MC question.
 front=s[:matches[0].start()] if matches else s
 if '乙、' in front:front=front.split('乙、')[0]
 elif '二、測驗' in front:front=front.split('二、測驗')[0]
 em=list(re.finditer(r'^\s*([一二三四五六七八九十]+)、',front,re.M))
 if not em and '作文' in p['subject']:
  start=front.find('甲、');q=clean(front[start:] if start>=0 else front)
  bank.append({'id':f"{p['year']}-composition",'year':p['year'],'subject':'國文','type':'essay','number':'作文','text':q,'source':p['links']['試題']})
 for i,m in enumerate(em):
  q=clean(front[m.end():em[i+1].start() if i+1<len(em) else len(front)])
  if len(q)<10:continue
  bank.append({'id':f"{p['year']}-{re.search(r'&s=([^&]+)',p['links']['試題'])[1]}-essay-{m[1]}",'year':p['year'],'subject':'國文' if p['subject'].startswith('國文') else p['subject'],'type':'essay','number':m[1],'text':q,'source':p['links']['試題']})
 p['mcCount']=len(mc);p['essayCount']=sum(q['year']==p['year'] and q['source']==p['links']['試題'] and q['type']=='essay' for q in bank);p['expectedMc']=max(ans,default=0)
 if len(mc)!=len(ans):errors.append([p['year'],p['subject'],'count',len(mc),len(ans)])
(ROOT/'data/questions.json').write_text(json.dumps(bank,ensure_ascii=False))
(ROOT/'data/papers.json').write_text(json.dumps(papers,ensure_ascii=False,indent=2))
(ROOT/'data/import-report.json').write_text(json.dumps(errors,ensure_ascii=False,indent=2))
print('Questions',len(bank),'MC',sum(q['type']=='mc' for q in bank),'essay',sum(q['type']=='essay' for q in bank));print('Issues',errors)
