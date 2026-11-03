/* Tra cứu hoàn toàn trên thiết bị: kết quả trích từ dữ liệu đã nạp, không gọi API. */
(() => {
  'use strict';
  const database = window.VAN_BAN_DATA || {docs:[],sections:[]};
  const $ = id => document.getElementById(id);
  const norm = x => String(x||'').toLowerCase().replace(/đ/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  const ignore = new Set('tai la co nao duoc trong voi cho ve cua can theo mot cac va nhu the se nay do gi tu de khi hay bao nhieu xin hoi quy dinh tai dieu khoan van ban phap luat thong tu nghi dinh toi muon biet vui long giai thich hay cho toi biet the nao'.split(' '));
  const tokens = x => [...new Set(norm(x).split(' ').filter(x=>x.length>=2 && !ignore.has(x)))];
  const sections=database.sections.map((s,i) => ({...s, i, normalized:norm(s.search), terms:tokens(s.search), lines:s.text.split('\n')}));
  const docs=Object.fromEntries(database.docs.map(d=>[d.id,d]));
  const N=sections.length;
  const df={};
  sections.forEach(s=>{for(const t of s.terms)df[t]=(df[t]||0)+1;});
  const searchedQuestions=[];
  function expand(q){
    let x=norm(q);
    const equiv=[
      [/khong the chap|vay tin chap|khong tai san dam bao|khong tsbd/g,' khong co tai san bao dam '],
      [/the chap|tai san dam bao/g,' tai san bao dam '],
      [/han muc vay/g,' muc cho vay '],
      [/gia han no|gian no/g,' co cau lai thoi han tra no '],
      [/thien tai|bao lu|dich benh/g,' nguyen nhan khach quan bat kha khang '],
      [/bao cao hang quy/g,' bao cao dinh ky hang quy ']
    ];
    for(const [re, rep] of equiv)if(re.test(x))x+=' '+rep;
    return x;
  }
  const queryStop = new Set('can ho so thoi han bieu mau muc vay duoc phai bao gom nhung gi'.split(' '));
  const xToks=q=>tokens(expand(q));
  function scoreSection(s,q,ts){
    const dn=s.normalized; let score=0, hits=0;
    for(const t of ts){
      if(!dn.includes(t)) continue;
      hits++;
      const f=(dn.match(new RegExp('(?:^| )'+t+'(?: |$)','g'))||[]).length;
      const idf=Math.log(1+(N-(df[t]||0)+.5)/((df[t]||0)+.5));
      score += (1.1+idf)*Math.min(2.3,1+Math.log(1+f)*.45);
    }
    const coverage=hits/Math.max(1,ts.length);
    if(ts.length>=4 && coverage<.53) return 0;
    score=score*(.55+.8*coverage);
    const qn=norm(q);
    let wide=0;
    const significant=ts.filter(t=>!queryStop.has(t));
    for(let i=0;i<significant.length-1;i++){
      const phrase=significant.slice(i,i+2).join(' ');
      if(dn.includes(phrase))wide+=1.7;
    }
    if(ts.length>=4 && wide===0 && !/\b(?:55|116|156|29) 20\d\d\b/.test(qn)) return 0;
    score+=Math.min(10,wide);
    if(qn.includes('bao cao') && (qn.includes('thoi gian')||qn.includes('bao lau')) && /truoc ngay 15|thoi gian gui bao cao/.test(dn)) score+=22;
    if(/\b(?:156|156 2025)\b/.test(qn)&&s.code.startsWith('156/2025')) score+=12;
    if(/\b(?:116|116 2018)\b/.test(qn)&&s.code.startsWith('116/2018')) score+=12;
    if(/\b(?:55|55 2015)\b/.test(qn)&&s.code.startsWith('55/2015')) score+=12;
    if(/\b(?:29|29 2025)\b/.test(qn)&&s.code.startsWith('29/2025')) score+=12;
    if(qn.includes('khong co tai san bao dam') || qn.includes('khong the chap') || qn.includes('vay tin chap') || qn.includes('muc cho vay')){
      if(s.code.startsWith('156/') && s.text.includes('Tối đa 300 triệu đồng'))score+=22;
      else if(s.code.startsWith('55/')&&s.article==='Điều 9')score-=8;
      else if(s.code.startsWith('116/')&&s.target.some(x=>norm(x)==='dieu 9'))score-=7;
    }
    if(qn.includes('co cau')||qn.includes('gia han no')){
      if(s.code.startsWith('29/')&&s.article==='Điều 3')score+=8;
    }
    if(qn.includes('hieu luc')){
      if(/co hieu luc thi hanh (tu|ke tu) ngay/.test(dn) && (!qn.includes('29 2025')||s.code.startsWith('29/')))score+=38;
      if(norm(s.ref).includes('dieu 8')&&s.code.startsWith('29/')) score+=10;
      if(norm(s.title).includes('hieu luc'))score+=7;
    }
    // Các văn bản sửa đổi được ưu tiên nhẹ; không suy diễn chúng thay thế toàn bộ văn bản gốc.
    if(s.code.startsWith('156/'))score*=1.06;
    if(dn.length>2300)score*=.88;
    return hits===0?0:score;
  }
  function search(q,filter){
    const ts=xToks(q);
    const found=sections.filter(s=>filter==='all'||s.docId===filter).map(s=>({...s,rank:scoreSection(s,q,ts)}))
      .filter(s=>s.rank>3).sort((a,b)=>b.rank-a.rank);
    if(!found.length)return [];
    const best=found[0].rank;
    return found.filter(s=>s.rank>=Math.max(3.8,best*.22)).slice(0,6);
  }
  function bestLines(s,q,maxLines=3){
    const ts=xToks(q), rows=s.lines.filter(x=>x.length>7);
    const matched=rows.map((line,i)=>{
      const n=norm(line);let score=0;
      for(const t of ts)if(n.includes(t))score+=1;
      if(/\b(?:toi da|khong co tai san bao dam|12 thang|36 thang)\b/.test(n) && /toi da|thoi han|bao nhieu|thang|muc vay/.test(norm(q)))score+=2;
      if(/^\d+\.\s*(sua doi|bo sung|thay the)/i.test(n))score-=3;
      return {line,i,score};
    }).sort((a,b)=>b.score-a.score);
    return matched.filter(x=>x.score>0).slice(0,maxLines).sort((a,b)=>a.i-b.i).map(x=>x.line);
  }
  function composeAnswer(q, found, filter='all'){
    if(!found.length)return {answer:'Tôi chưa tìm được nội dung đủ gần với câu hỏi trong bộ văn bản đã tải lên. Anh hãy thử diễn đạt bằng thuật ngữ cụ thể hơn, chẳng hạn “khoản 2 Điều 9”, “hồ sơ khoanh nợ” hoặc tên văn bản. Tôi không tự tạo câu trả lời khi thiếu căn cứ.',sources:[]};
    const qn=norm(q);
    if(/nong thon/.test(qn) && /la gi|duoc hieu|dinh nghia|khai niem/.test(qn)){
      const def=sections.find(s=>(filter==='all'||s.docId===filter) && s.code.startsWith('156/') && s.text.includes('Nông thôn là địa giới đơn vị hành chính'));
      if(def){
        const quote=def.lines.find(x=>x.includes('Nông thôn là địa giới'));
        return {answer:'Theo nội dung sửa đổi tại '+def.ref+' của '+def.code+':\n\n• '+quote+'\n\nĐây là nội dung sửa đổi định nghĩa trong Nghị định 55/2015/NĐ-CP.',sources:[def]};
      }
    }
    // Hiển thị trọn danh mục hạn mức 2025 nếu câu hỏi mang tính tổng quát.
    if(/bao dam|the chap|tin chap|han muc vay/.test(qn) && /vay|tai san|bao dam/.test(qn)){
      const update=found.find(s=>s.code.startsWith('156/')&&s.text.includes('Tối đa 300 triệu đồng'));
      if(update){
        const lines=update.lines.filter(x=>/^[a-dđ]\)\s*Tối đa/i.test(x));
        if(lines.length>=3){
          const specified=(qn.includes('ho kinh doanh')?'ho kinh doanh':qn.includes('chu trang trai')?'chu trang trai':qn.includes('hop tac xa')?'hop tac xa':qn.includes('ca nhan')?'ca nhan':'');
          let chosen=lines;
          if(specified && !/(va |nhung |cac |doi tuong|tong hop)/.test(qn)){
            const qualified=lines.filter(x=>norm(x).includes(specified));
            if(qualified.length)chosen=qualified;
          }
          return {answer:'Theo nội dung sửa đổi tại '+update.ref+' của '+update.code+', quy định về mức cho vay không có tài sản bảo đảm như sau:\n\n'+chosen.map(x=>'• '+x).join('\n')+'\n\nLưu ý: Văn bản sử dụng cụm từ “được tổ chức tín dụng xem xét cho vay”; đây là mức tối đa theo quy định, không đồng nghĩa được duyệt vay tự động.',sources:[update]};
        }
      }
    }
    if(!qn.includes('bao cao') && /co cau|gia han no|tra no/.test(qn) && /(bao nhieu thang|toi da|thoi gian)/.test(qn)){
      const reg=found.find(s=>s.code.startsWith('29/')&&s.article==='Điều 3'&&s.text.includes('12 tháng'));
      if(reg){
        const limits=reg.lines.filter(x=>/12 tháng|36 tháng|không giới hạn về số lần/i.test(x));
        return {answer:'Theo '+reg.code+', '+reg.ref+', thời gian cơ cấu lại thời hạn trả nợ được nêu như sau:\n\n'+limits.map(x=>'• '+x).join('\n')+'\n\nCần đối chiếu toàn bộ điều kiện tại Điều 3 trước khi áp dụng.',sources:[reg]};
      }
    }
    if(qn.includes('bao cao') && /thoi gian|han gui|bao lau|khi nao/.test(qn)){
      const deadline=found.find(s=>s.code.startsWith('29/') && /trước ngày 15 của tháng tiếp theo của quý báo cáo/i.test(s.text));
      if(deadline){
        const lines=deadline.lines.filter(x=>/trước ngày 15 của tháng tiếp theo của quý báo cáo/i.test(x));
        if(lines.length)return {answer:'Theo '+deadline.code+', '+deadline.ref+', quy định về hạn gửi báo cáo:\n\n• '+lines[0]+'\n\nAnh có thể mở nguồn ở bên phải để đối chiếu kỳ báo cáo, biểu mẫu và đơn vị nhận.',sources:[deadline]};
      }
    }
    if(/ho so/.test(qn) && /khoanh no/.test(qn)){
      const base=found.find(s=>s.code.startsWith('116/')&&s.text.includes('Hồ sơ đề nghị khoanh nợ bao gồm'));
      if(base){
        const amend=sections.find(s=>(filter==='all'||s.docId===filter) && s.code.startsWith('156/') && s.text.includes('Biên bản xác định khách hàng bị thiệt hại') && s.text.includes('Sửa đổi'));
        const items=base.lines.filter(x=>/^\((i|ii|iii|iv|v)\)/i.test(x)).slice(0,5);
        if(items.length>=4){
          if(amend){const updated=amend.lines.find(x=>/^“?\(?iv\)/i.test(x));if(updated){const index=items.findIndex(x=>/^\(iv\)/.test(x));if(index>=0)items[index]=updated;}}
          return {answer:'Theo '+base.ref+' của '+base.code+', hồ sơ đề nghị khoanh nợ gồm các thành phần được nêu trong văn bản:\n\n'+items.map(x=>'• '+x).join('\n')+'\n\nMột số nội dung hồ sơ được cập nhật bởi Nghị định 156/2025/NĐ-CP; xem hai nguồn kèm theo và đối chiếu điều kiện, thẩm quyền, trình tự.',sources:amend?[base,amend]:[base]};
        }
      }
    }
    const first=found[0], extracts=bestLines(first,q,3);
    const picks=extracts.length?extracts:first.lines.slice(0,2);
    let answer='Tôi tìm thấy nội dung liên quan tại '+first.ref+' của '+first.code+':\n\n'+picks.map(x=>'• '+x).join('\n');
    if(answer.length>1480)answer=answer.slice(0,1470).replace(/\s+\S*$/,'')+'…';
    answer+='\n\nXem nguồn bên phải để đọc đầy đủ điều khoản và đối chiếu bối cảnh.';
    return {answer,sources:found.slice(0,3)};
  }
  function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
  function addMessage(kind,txt,sourceSections=[]){
    const outer=node('div','msg '+kind);outer.appendChild(node('div','role',kind==='user'?'Câu hỏi của anh':'Trả lời từ dữ liệu văn bản'));
    const bubble=node('div','bubble');bubble.appendChild(node('div','answerText',txt));
    if(sourceSections.length){
      const links=node('div','sourceMini');
      sourceSections.forEach((s,i)=>{const b=node('button','',`📄 ${s.code} · ${s.ref}`);b.addEventListener('click',()=>{
        const card=$('source-'+s.id);if(card){card.classList.add('open');card.scrollIntoView({behavior:'smooth',block:'nearest'});}
      });links.appendChild(b);});
      bubble.appendChild(links);
      bubble.appendChild(node('div','caution','Trích xuất tự động từ tài liệu đã tải lên. Hãy kiểm tra đầy đủ quy định, sửa đổi và hiệu lực trước khi sử dụng.'));
    }
    outer.appendChild(bubble);$('chat').appendChild(outer);$('chat').scrollTop=$('chat').scrollHeight;
  }
  function renderSources(found){
    const box=$('results');box.replaceChildren();$('resultCount').textContent=found.length+' kết quả';
    if(!found.length){box.appendChild(node('div','noResult','Không có đoạn đủ liên quan trong tập văn bản hiện tại.'));return;}
    found.forEach((s,i)=>{
      const d=docs[s.docId],card=node('article','result'+(i===0?' open':''));card.id='source-'+s.id;
      const head=node('div','resultHead');head.tabIndex=0;head.setAttribute('role','button');head.setAttribute('aria-label','Mở hoặc đóng đoạn văn bản');
      const details=node('div','');details.appendChild(node('h3','',s.code));details.appendChild(node('p','',s.ref+(s.title?' · '+s.title:'')));head.appendChild(details);head.appendChild(node('span','num',String(i+1).padStart(2,'0')));
      const body=node('div','resultBody');body.appendChild(node('div','quote',s.text));
      const footer=node('div','resultFooter');const a=node('a','download','⬇ Mở văn bản Word');a.href='./'+d.file;a.target='_blank';a.rel='noopener noreferrer';a.download=d.file.split('/').pop();footer.appendChild(a);
      const copy=node('button','copyRef','Sao chép căn cứ');copy.type='button';copy.onclick=()=>copyText(s.ref+' - '+s.code+'\n'+s.text);footer.appendChild(copy);body.appendChild(footer);
      const toggle=()=>card.classList.toggle('open');head.onclick=toggle;head.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}};
      card.appendChild(head);card.appendChild(body);box.appendChild(card);
    });
  }
  async function copyText(txt){
    try{await navigator.clipboard.writeText(txt);}catch(e){const ta=node('textarea');ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();}
  }
  function ask(q){
    q=(q||$('question').value||'').trim();if(!q)return;
    const filter=$('docFilter').value;
    $('question').value='';$('welcome')?.remove();$('suggestions')?.remove();
    addMessage('user',q);
    const found=search(q,filter);let resp=composeAnswer(q,found,filter);
    addMessage('bot',resp.answer,resp.sources);renderSources([...resp.sources,...found.filter(s=>!resp.sources.some(x=>x.id===s.id))].slice(0,6));
    searchedQuestions.push({q,found});
  }
  $('docCount').textContent=database.docs.length;
  $('sectionCount').textContent=database.sections.length;
  const filter=$('docFilter');const list=$('docList');
  database.docs.forEach(d=>{
    const opt=document.createElement('option');opt.value=d.id;opt.textContent=d.code;filter.appendChild(opt);
    list.appendChild(node('span','docPill',d.code+' · '+d.issued));
  });
  $('ask').onclick=()=>ask();
  $('question').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask();}});
  $('suggestions').querySelectorAll('[data-q]').forEach(btn=>btn.addEventListener('click',()=>ask(btn.dataset.q)));
  $('clear').onclick=()=>{const chat=$('chat');chat.replaceChildren();chat.appendChild(node('div','welcome','Nhập câu hỏi mới để bắt đầu tra cứu.'));$('results').replaceChildren(node('div','noResult','Chọn một câu hỏi để xem nguồn đối chiếu.'));$('resultCount').textContent='Chưa tìm kiếm';};
  if(!database.sections.length){addMessage('bot','Chưa đọc được dữ liệu. Hãy kiểm tra file data.js đã được đặt cùng thư mục với index.html.');}
  // Dành cho việc kiểm thử trình duyệt từ bản phát hành
  window.__VBQA={search,composeAnswer,docs:database.docs.length,sections:database.sections.length};
})();
