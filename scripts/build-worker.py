import pathlib,json,base64,gzip,hashlib
R=pathlib.Path(__file__).resolve().parent.parent
page=(R/'page.html').read_text();client=(R/'client.js').read_text()
bank={'questions':json.loads((R/'data/questions.json').read_text()),'papers':json.loads((R/'data/papers.json').read_text())}
translations=json.loads((R/'data/english-translations.json').read_text())
for q in bank['questions']:
 if q['id'] in translations:q['translation']=translations[q['id']]
active=json.loads((R/'data/current-subjects.json').read_text())
bank['questions']=[q for q in bank['questions'] if q['subject'] in active]
bank['papers']=[p for p in bank['papers'] if any(p['subject']==k or p['subject'].startswith(k+'（') for k in active)]
original_size=len(json.dumps(bank,ensure_ascii=False,separators=(',',':')).encode())
original_gzip_size=len(gzip.compress(json.dumps(bank,ensure_ascii=False,separators=(',',':')).encode(),compresslevel=9,mtime=0))
contexts=[];sources=[];context_index={};source_index={}
def intern(value,items,index):
 if value not in index:index[value]=len(items);items.append(value)
 return index[value]
wire={'format':'adminDaily.bank.v2','questions':[],'papers':bank['papers'],'contexts':contexts,'sources':sources}
for question in bank['questions']:
 q=question.copy()
 for field in ['source','answerSource']:
  if q.get(field):q[field]=intern(q[field],sources,source_index)
 if q.get('context'):q['context']=intern(q['context'],contexts,context_index)
 if q.get('translation'):
  q['translation']=q['translation'].copy()
  if q['translation'].get('context'):q['translation']['context']=intern(q['translation']['context'],contexts,context_index)
 wire['questions'].append(q)
def compact(value):return json.dumps(value,ensure_ascii=False,separators=(',',':'))
def digest(value):return hashlib.sha256(value.encode()).hexdigest()[:16]
def resource(body,mime,immutable=False):
 raw=body.encode();return {'body':body,'mime':mime,'etag':'W/"'+hashlib.sha256(raw).hexdigest()+'"','cache':'private, max-age=31536000, immutable' if immutable else 'private, no-cache'}
bank_body=compact(wire);bank_url='/api/bank.'+digest(bank_body+'utf8-v3')+'.json'
client=client.replace('__BANK_URL__',bank_url);client_url='/app.'+digest(client)+'.js'
page=page.replace('src="/app.js"','src="'+client_url+'"')
# Start the shared bank request and script download while the page is still parsing.
page=page.replace('</head>','<link rel="preload" as="script" href="'+client_url+'"><script>globalThis.__BANK_REQUEST=fetch('+json.dumps(bank_url)+').catch(()=>null);</script></head>')
resources={bank_url:resource(bank_body,'application/json; charset=utf-8',True),client_url:resource(client,'application/javascript; charset=utf-8',True)}
resources['/']=resource(page,'text/html; charset=utf-8')
assets={}
for f in (R/'assets').iterdir():
 if f.name.startswith('planet-') or f.name=='site.webmanifest':
  route='/site.webmanifest' if f.name=='site.webmanifest' else '/icons/'+f.name
  mime='image/png' if f.suffix=='.png' else 'image/svg+xml' if f.suffix=='.svg' else 'application/manifest+json; charset=utf-8'
  assets[route]={'mime':mime,'data':base64.b64encode(f.read_bytes()).decode()}
code='const RESOURCES='+compact(resources)+';\nconst ASSETS='+compact(assets)+';\nconst BANK_URL='+json.dumps(bank_url)+';\nconst CLIENT_URL='+json.dumps(client_url)+';\n'
code+='''
const binary=data=>Uint8Array.from(atob(data),c=>c.charCodeAt(0));
function serve(request,r){
 const headers={'Content-Type':r.mime,'Cache-Control':r.cache,'ETag':r.etag,'Vary':'Accept-Encoding','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'};
 const match=request.headers.get('If-None-Match');if(match&&match.split(',').some(v=>v.trim()==='*'||v.trim().replace('W/','')===r.etag.replace('W/','')))return new Response(null,{status:304,headers});
 // Return UTF-8 text; let the hosting transport negotiate compression.
 return new Response(request.method==='HEAD'?null:r.body,{headers});
}
function legacyBank(){const d=JSON.parse(RESOURCES[BANK_URL].body);return {papers:d.papers,questions:d.questions.map(q=>{const n={...q};for(const k of ['source','answerSource'])if(typeof n[k]==='number')n[k]=d.sources[n[k]];if(typeof n.context==='number')n.context=d.contexts[n.context];if(n.translation&&typeof n.translation.context==='number')n.translation={...n.translation,context:d.contexts[n.translation.context]};return n})}}
export default {async fetch(request,env){
 const path=new URL(request.url).pathname;
 if(ASSETS[path]){const a=ASSETS[path];return new Response(request.method==='HEAD'?null:binary(a.data),{headers:{'Content-Type':a.mime,'Cache-Control':'private, max-age=86400'}})}
 if(path==='/app.js')return serve(request,{...RESOURCES[CLIENT_URL],cache:'private, no-cache'});
 if(path==='/api/bank')return new Response(JSON.stringify(legacyBank()),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-cache'}});
 const r=RESOURCES[path==='/index.html'?'/':path];if(r)return serve(request,r);
 return new Response('Not found',{status:404});
}};
'''
(R/'worker/index.js').write_text(code)
metrics={'questions':len(bank['questions']),'original_bank_bytes':original_size,'original_gzip_bytes':original_gzip_size,'packed_bank_bytes':len(bank_body.encode()),'gzip_bank_bytes':len(gzip.compress(bank_body.encode(),compresslevel=9,mtime=0)),'client_bytes':len(client.encode()),'gzip_client_bytes':len(gzip.compress(client.encode(),compresslevel=9,mtime=0)),'worker_bytes':len(code.encode()),'bank_url':bank_url,'client_url':client_url}
(R/'dist').mkdir(exist_ok=True)
# Metrics are reproducible local build output, not published application data.
pathlib.Path('/tmp/admin-build-metrics.json').write_text(json.dumps(metrics))
print(json.dumps(metrics,ensure_ascii=False))
