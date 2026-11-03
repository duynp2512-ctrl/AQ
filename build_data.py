#!/usr/bin/env python3
"""Xuất dữ liệu tìm kiếm từ toàn bộ *.docx trong van-ban-goc/.
Chỉ dùng thư viện python-docx, giữ nguyên các đoạn gốc; không suy diễn nội dung.
"""
from pathlib import Path
import json, re, unicodedata, hashlib
from docx import Document

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'van-ban-goc'
FILES = [p for p in sorted(SRC.glob('*.docx')) if not p.name.startswith('~$')]
KNOWN = {
  '55_2015': ('55/2015/NĐ-CP', 'Nghị định', '09/06/2015', 'Văn bản gốc về tín dụng phục vụ phát triển nông nghiệp, nông thôn', 2015),
  '116_2018': ('116/2018/NĐ-CP', 'Nghị định sửa đổi', '07/09/2018', 'Sửa đổi, bổ sung Nghị định 55/2015/NĐ-CP', 2018),
  '156_2025': ('156/2025/NĐ-CP', 'Nghị định sửa đổi', '16/06/2025', 'Tiếp tục sửa đổi, bổ sung Nghị định 55/2015/NĐ-CP', 2025),
  '29_2025': ('29/2025/TT-NHNN', 'Thông tư hướng dẫn', '30/09/2025', 'Hướng dẫn cho vay lĩnh vực nông nghiệp, nông thôn', 2025),
}

def norm(s):
  s = unicodedata.normalize('NFD', str(s).lower().replace('đ','d'))
  return ''.join(c for c in s if unicodedata.category(c) != 'Mn')

def meta(path):
  k = next((k for k in KNOWN if path.stem.startswith(k)), None)
  if k:
    code, typ, date, title, year=KNOWN[k]
  else:
    m=re.search(r'\b\d{1,5}[_-]20\d\d\b', path.stem)
    code=(m.group(0).replace('_','/') if m else path.stem)
    typ='Văn bản bổ sung';date='Chưa xác định';title=path.stem.replace('_',' ')
    y=re.search(r'20\d\d',path.stem); year=int(y.group(0)) if y else 0
  return dict(id=path.stem, code=code, type=typ, issued=date, title=title, year=year,
              file='van-ban-goc/'+path.name, isAmendment=k in ('116_2018','156_2025'))

ART=re.compile(r'^Điều\s+(\d+[a-z]?)\.\s*(.*)', re.I)
CHAPTER=re.compile(r'^Chương\s+[IVX]+\s*$',re.I)
APPENDIX=re.compile(r'^(?:Phụ lục|Mẫu biểu số\s+\d+|HƯỚNG DẪN LẬP BÁO CÁO:?)$',re.I)
CHG=re.compile(r'^\d{1,2}\.\s*(?:Sửa đổi|Bổ sung|Thay thế|Bãi bỏ|Hủy bỏ|Điều chỉnh)\b',re.I)
CLAUSE=re.compile(r'^\d{1,2}(?:a)?\.\s')

all_docs=[]; all_chunks=[]
for p in FILES:
  md=meta(p); doc=Document(p)
  all_docs.append(md)
  paras=[' '.join(x.text.replace('\xa0',' ').split()) for x in doc.paragraphs]
  paras=[x for x in paras if x]
  article=''; article_title=''; chapter=''; label=''; lines=[]; order=0
  def flush():
    global order
    if not lines:return
    body='\n'.join(lines).strip()
    if len(body) < 14:return
    loc=label or article or chapter or 'Phần mở đầu'
    target=re.findall(r'Điều\s+\d+[a-z]?', (label+' '+body[:440]), flags=re.I)
    target=list(dict.fromkeys(target))
    all_chunks.append(dict(id=f'{md["id"]}-{order}',docId=md['id'],code=md['code'],year=md['year'],
      ref=loc,article=article,target=target,title=article_title,
      text=body,search=body+' '+loc+' '+article_title+' '+md['code']))
    order+=1
  for line in paras:
    art=ART.match(line)
    if APPENDIX.match(line):
      flush();lines=[];chapter='Phụ lục';label=line;article='Phụ lục';article_title=line;continue
    if CHAPTER.match(line):
      flush(); lines=[];chapter=line;label=line;article='';article_title='';continue
    if art:
      flush();lines=[];article='Điều '+art.group(1);article_title=art.group(2);label=article;continue
    if md['isAmendment'] and CHG.match(line):
      flush();lines=[line]; m=re.match(r'^(\d+)\.',line)
      label=(article+', khoản '+m.group(1)) if m else article
      continue
    if (not md['isAmendment']) and CLAUSE.match(line) and article and lines:
      # Chia theo khoản nếu đủ dài; điểm a,b... luôn nằm trong khoản chủ quản.
      flush();lines=[line];m=re.match(r'^([0-9]+[a-z]?)\.',line)
      label=(article+', mục ' if article=='Phụ lục' else article+', khoản ')+m.group(1) if m else article
      continue
    if not lines and article and not md['isAmendment'] and CLAUSE.match(line):
      m=re.match(r'^([0-9]+[a-z]?)\.',line)
      label=(article+', mục ' if article=='Phụ lục' else article+', khoản ')+m.group(1) if m else article
    lines.append(line)
  flush()
  # Bảng biểu ở phụ lục: xuất thành đoạn độc lập; loại header/footer hành chính
  for i,table in enumerate(doc.tables):
    if i <= 1:continue
    rows=[]
    for row in table.rows:
      vals=[]
      for c in row.cells:
        v=' '.join(c.text.replace('\xa0',' ').split())
        if v and (not vals or v != vals[-1]):vals.append(v)
      if vals:rows.append(' | '.join(vals))
    if rows:
      txt='\n'.join(rows)
      all_chunks.append(dict(id=f'{md["id"]}-table-{i}',docId=md['id'],code=md['code'],year=md['year'],
        ref='Phụ lục / bảng biểu '+str(i-1),article='Phụ lục',target=[],title='Biểu mẫu',
        text=txt,search=txt+' '+md['code']+' phụ lục mẫu biểu khoanh nợ báo cáo'))
print('Documents:', len(all_docs), '| Chunks:',len(all_chunks),'| chars:',sum(len(x['text']) for x in all_chunks))
data=dict(generated='2026-11-03',docs=all_docs,sections=all_chunks)
(ROOT/'data.js').write_text('/* Tự động tạo bằng build_data.py. Không sửa file này thủ công. */\nwindow.VAN_BAN_DATA = '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
(ROOT/'data.json').write_text(json.dumps(data,ensure_ascii=False,indent=1),encoding='utf-8')
print('Saved data.js / data.json')

# Cấu hình PWA được tạo lại theo dữ liệu mới: truy cập offline cả tài liệu Word.
version='van-ban-tra-cuu-'+hashlib.sha256((ROOT/'data.js').read_bytes()).hexdigest()[:12]
files=['./','./index.html','./app.js','./data.js','./manifest.webmanifest','./icon.svg'] + ['./'+m['file'] for m in all_docs]
worker=f"""/* Tự động tạo bởi build_data.py */
const VERSION={json.dumps(version)};
const CORE={json.dumps(files,ensure_ascii=False)};
self.addEventListener('install',event=>{{event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));}});
self.addEventListener('activate',event=>{{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('van-ban-tra-cuu-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));}});
self.addEventListener('fetch',event=>{{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(fetch(event.request).then(resp=>{{if(resp.ok){{const copy=resp.clone();caches.open(VERSION).then(cache=>cache.put(event.request,copy));}}return resp;}}).catch(()=>caches.match(event.request)));
}});
"""
(ROOT/'sw.js').write_text(worker,encoding='utf-8')
print('PWA cache version:',version)
