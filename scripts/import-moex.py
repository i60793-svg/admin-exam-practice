import urllib.request,html,re,json,concurrent.futures,subprocess,pathlib,time
ROOT=pathlib.Path(__file__).resolve().parent.parent;CACHE=ROOT/'.cache/moex';CACHE.mkdir(exist_ok=True)
BASE='https://wwwq.moex.gov.tw/exam/'
def fetch(u,p):
 if p.exists():return p.read_bytes()
 for attempt in range(3):
  try:
   d=urllib.request.urlopen(u,timeout=40).read();p.write_bytes(d);return d
  except Exception:
   if attempt==2:raise

def year(y):
 code=f'{y}080';p=CACHE/f'{y}.html';s=fetch(BASE+f'wFrmExamQandASearch.aspx?e={code}&y={y+1911}',p).decode('utf-8-sig');
 opts=re.findall(r'<option[^>]*value="([^"]+)"[^>]*>(.*?)</option>',s)
 actual=next((v for v,t in opts if '公務人員高等考試三級考試暨普通考試' in t),code)
 if actual!=code:s=fetch(BASE+f'wFrmExamQandASearch.aspx?e={actual}&y={y+1911}',CACHE/f'{y}-correct.html').decode('utf-8-sig')
 i=s.find('普通考試_一般行政')
 if i<0:return y,[]
 end=s.find('class="level2"',i);part=s[i:end];papers=[]
 for m in re.finditer(r'<label[^>]+class="exam-title">(.*?)</label>(.*?)(?=<label|$)',part,re.S):
  name=html.unescape(m[1]);links={}
  for href,txt in re.findall(r'href="([^"]+)"[^>]*>([^<]+)</a>',m[2]):
   if txt in ['試題','答案','更正答案']:links[txt]=BASE+html.unescape(href)
  papers.append({'year':y,'subject':name,'links':links})
 return y,papers
papers=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
 for y,pp in ex.map(year,range(106,116)):
  print(y,len(pp),flush=True);papers.extend(pp)
(ROOT/'data').mkdir(exist_ok=True);(ROOT/'data/papers.json').write_text(json.dumps(papers,ensure_ascii=False,indent=2))
def download(p):
 for typ,u in p['links'].items():
  sid=re.search(r'&s=([^&]+)',u)[1];kind={'試題':'Q','答案':'S','更正答案':'M'}[typ];path=CACHE/f"{p['year']}-{sid}-{kind}.pdf"
  try:
   d=fetch(u,path)
   if not d.startswith(b'%PDF'):raise ValueError('not PDF')
   subprocess.run(['pdftotext','-layout',str(path),str(path.with_suffix('.txt'))],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  except Exception as e:print('FAIL',p['year'],p['subject'],typ,str(e),flush=True)
 return p['year'],p['subject']
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
 for y,n in ex.map(download,papers):print('PDF',y,n,flush=True)
