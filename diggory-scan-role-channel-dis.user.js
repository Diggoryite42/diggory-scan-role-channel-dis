// ==UserScript==
// @name         diggory-scan-role-channel-dis
// @namespace    https://github.com/Diggoryite42/diggory-scan-role-channel-dis
// @version      1.9.0
// @description  Xuất cấu trúc đang hiển thị trên Discord Web thành JSON.
// @match        https://discord.com/channels/*
// @grant        none
// @noframes
// ==/UserScript==
(() => {
  'use strict';
  if (window.top !== window.self || document.getElementById('diggory-scan-role-channel-dis-host')) return;
  // Events in a child document do not bubble through Discord's window/document
  // capture listeners. Shadow DOM and panel-level stopPropagation cannot provide this.
  const host = document.createElement('div');
  host.id = 'diggory-scan-role-channel-dis-host';
  const frame = document.createElement('iframe');
  frame.title = 'diggory-scan-role-channel-dis';
  frame.allow = 'clipboard-write';
  frame.style.cssText = 'position:fixed;right:12px;bottom:12px;width:240px;max-width:calc(100vw - 24px);height:52px;border:0;background:transparent;z-index:2147483647;color-scheme:light';
  frame.addEventListener('load', () => {
    const root = frame.contentDocument;
    // Constructed stylesheets keep the UI styled when the page blocks inline CSS.
    const styles = new frame.contentWindow.CSSStyleSheet();
    styles.replaceSync(`html{font-family:Arial,sans-serif;color:#202033;background:transparent} body{margin:0} *{box-sizing:border-box} button,input,select,textarea{font:inherit} button{cursor:pointer} button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid #8567df;outline-offset:2px}
      #open{position:fixed;right:0;bottom:0;z-index:2147483647;background:#5946a3;color:white;border:0;border-radius:24px;padding:12px 18px;box-shadow:0 4px 18px #0005;font-weight:bold}
      #panel{position:fixed;right:0;top:0;bottom:58px;z-index:2147483647;width:min(470px, 100%);overflow:auto;background:#faf8ff;border:1px solid #cfc7e2;border-radius:16px;padding:18px;box-shadow:0 10px 35px #0006;line-height:1.4;font-size:14px} [hidden]{display:none!important} h2{font-size:19px;margin:0 0 8px}.head{display:flex;justify-content:space-between;align-items:start} .close{border:0;background:transparent;font-size:22px} p{margin:8px 0;color:#454052} label{display:block;font-weight:bold;margin-top:12px} select,input[type=text],input[type=number],textarea{display:block;width:100%;margin-top:4px;padding:8px;border:1px solid #aaa4ba;border-radius:8px;background:white;color:#222}textarea{min-height:66px;resize:vertical} .check{display:flex;gap:7px;font-weight:normal;align-items:start} .check input{margin-top:3px} .buttons{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.buttons button{border:0;border-radius:8px;padding:9px 12px;background:#5946a3;color:white}.buttons button.secondary{background:#e8e2f5;color:#28203b} pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:210px;overflow:auto;background:#eeeaf5;padding:10px;border-radius:8px;font-size:12px}.note{background:#fff1d7;padding:10px;border-radius:8px} #status{min-height:1.4em}
      #previewPanel{position:fixed;left:0;right:480px;top:0;bottom:58px;overflow:auto;background:#f7f6fc;border:1px solid #cfc7e2;border-radius:16px;padding:18px;box-shadow:0 10px 35px #0006;line-height:1.5;font-size:14px}
      .preview-title{font-weight:700;font-size:19px;margin:0}.preview-sub{font-size:12px;color:#625b78}.preview-card{background:#fff;border:1px solid #e5dff0;border-radius:12px;padding:12px;margin:10px 0;overflow-wrap:anywhere}.preview-card h3{font-size:14px;color:#5946a3;margin:0 0 8px}.preview-channel{padding:5px 2px;border-bottom:1px solid #f1edf6}.preview-channel:last-child{border:0}.badge{color:#655b85;font-size:11px;background:#eeeafa;border-radius:6px;padding:2px 6px;margin-left:6px}.preview-warning{background:#fff1d7;border-radius:10px;padding:10px;font-size:12px}.preview-empty{color:#6d6679}.preview-nav{display:none}.drag-handle{cursor:move;touch-action:none;user-select:none;background:#eeeafa;border:1px solid #cfc7e2;border-radius:7px;padding:5px 9px;font-size:12px;color:#46357d}.preview-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}.preview-tabs button{border:1px solid #cbc2df;background:#fff;border-radius:8px;padding:7px;color:#48396f}.preview-tabs button[aria-selected="true"]{background:#5946a3;color:white}
      @media(max-width:720px){#panel{width:100%}#previewPanel{right:0}.preview-nav{display:inline-block}.preview-on-mobile #panel{display:none}}
    `);
    root.adoptedStyleSheets = [styles];
    const $ = s => root.querySelector(s);
    let result = null; const domKeys=new WeakMap(); let domSequence=0;
    const domKey=el=>{if(!domKeys.has(el))domKeys.set(el,`dom-${++domSequence}`);return domKeys.get(el)};
    let running = false, sessionGuild = null, scanTimer = null, lastPreviewSignature = '', memberScan = null, channelScan = null;
    let stores = null, storeUnsub = [], storeLastDiscovery = 0, cacheRoles = new Map(), cacheBots = new Map(), cacheChannels = new Map();
    const msg = s => { $('#status').textContent = s; };
    const clean = s => (s || '').replace(/\s+/g,' ').trim();
    const guild = () => { const m = location.pathname.match(/^\/channels\/(\d+)(?:\/|$)/); return m && m[1]; };
    const safe = s => clean(s).replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').replace(/[. ]+$/g,'').slice(0,80) || 'khong-ro';
    const stamp = () => {const d=new Date(), p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;};
    function locateSidebar() {
      // Discord's UI can change; require a channel-list marker before treating a navigation region as server channels.
      const marker = document.querySelector('[data-list-id="channels"], nav #channels');
      if (marker) return marker;
      const link = document.querySelector(`nav a[href^="/channels/${guild()}/"]`);
      return link ? link.closest('nav') : null;
    }
    function collect() {
      const id = guild();
      if (!id) throw Error('Hãy mở một server Discord, không phải trang tin nhắn riêng.');
      const sidebar = locateSidebar();
      if (!sidebar) throw Error('Không tìm thấy danh sách kênh. Hãy mở server và đợi Discord tải xong.');
      const headings = [...sidebar.querySelectorAll('h1,h2,h3,[role="heading"]')];
      const nav = sidebar.closest('nav') || sidebar;
      const serverName = clean($('#serverName').value || nav.querySelector('h1,h2')?.textContent || nav.querySelector('[data-list-id="channels"]')?.getAttribute('aria-label') || '') || 'server-khong-ro-ten';
      const categories = [], channels = [], seen = new Set();
      let current = null;
      const elements = sidebar.querySelectorAll('[data-list-item-id],a[href*="/channels/"]');
      for (const el of elements) {
        const key = el.getAttribute('data-list-item-id') || '';
        if (key.startsWith('channels___') && el.querySelector('a[href*="/channels/"]')) continue;
        if (key.startsWith('channels___') && !el.matches('a')) {
          const isCategory = el.getAttribute('role') === 'button' || el.hasAttribute('aria-expanded') || !!el.querySelector('[aria-expanded]');
          if (isCategory) {
            const text = clean(el.innerText || el.textContent);
            if (!text) continue;
            current = {ten:text, observation_key:key || domKey(el), trang_thai: ({'false':'thu_gon','true':'mo'})[el.getAttribute('aria-expanded') || el.querySelector('[aria-expanded]')?.getAttribute('aria-expanded')] || 'khong_xac_dinh', kenh:[]};
            categories.push(current);
          }
          continue;
        }
        if (!el.matches('a')) continue;
        const match = (el.getAttribute('href') || '').match(/^\/channels\/(\d+)\/(\d+)/);
        // Voice/stage entries can be anchors with no href, but retain the channel ID.
        const channelId=match && match[1]===id ? match[2] : (!el.getAttribute('href') ? key.match(/^channels___(\d+)$/)?.[1] : null);
        if (!channelId || seen.has(channelId)) continue;
        seen.add(channelId);
        const name = clean(el.querySelector('[class*="name"]')?.textContent || el.textContent || el.getAttribute('aria-label'));
        if (!name) continue;
        const label = clean(el.getAttribute('aria-label') || '');
        const item = {ten:name,loai:'khong_xac_dinh'};
        if (/voice|thoại|thoai/i.test(label)) item.loai='voice';
        else if (/forum|diễn đàn|dien dan/i.test(label)) item.loai='forum';
        else if (/stage|sân khấu|san khau/i.test(label)) item.loai='stage';
        else if (/text|văn bản|van ban/i.test(label)) item.loai='text';
        item.id = channelId;
        if (current) current.kenh.push(item); else channels.push(item);
      }
      const bots=[];
      if (true) {
        const members = document.querySelector('[data-list-id^="members-"], [data-list-id="members"]');
        if (members) for (const row of members.querySelectorAll('[data-list-item-id]')) {
          if (!row.querySelector('[aria-label*="Bot" i],[class*="botTag"],[class*="botText"]')) continue;
          const name=clean(row.querySelector('[class*="username"],[class*="name"]')?.textContent);
          if (name && !bots.includes(name)) bots.push(name);
        }
      }
      const out={phien_ban:'1.0',thoi_gian:new Date().toISOString(),server:{ten:serverName,phan_loai:$('#category').value,phan_loai_tu_nhap:clean($('#custom').value),mo_hinh:$('#model').value,ghi_chu:$('#notes').value.trim()},cau_truc:{danh_muc:categories,kenh_chua_xac_dinh_danh_muc:channels},role:{trang_thai:'khong_thu_thap_duoc_tu_danh_sach_kenh',danh_sach:[]},bot:{trang_thai:'chi_du_lieu_hien_thi_co_the_thieu',ten_hien_thi:bots},gioi_han:['Chỉ là ảnh chụp giao diện đang tải, không xác nhận đầy đủ.','Kênh ẩn, category thu gọn và danh sách ảo hóa có thể bị bỏ sót.','Phân nhóm và loại kênh có thể không xác định do giao diện Discord thay đổi.','Không thu thập nội dung tin nhắn; không lấy token hoặc gọi API.']};
      out.server.id=id;
      return out;
    }
    function resizeFrame() {
      const open = !$('#panel').hidden;
      const previewOpen = open && !$('#previewPanel').hidden;
      frame.style.width = open ? (previewOpen ? '950px' : '470px') : '240px';
      frame.style.height = open ? `${Math.max(120, Math.min(850, window.innerHeight - 24))}px` : '52px';
      const rect=frame.getBoundingClientRect(); frame.style.right=`${Math.max(0,Math.min(parseFloat(frame.style.right)||0,window.innerWidth-rect.width))}px`; frame.style.bottom=`${Math.max(0,Math.min(parseFloat(frame.style.bottom)||0,window.innerHeight-rect.height))}px`;
    }
    function setOpen(open) {
      $('#panel').hidden = !open;
      if (!open) { $('#previewPanel').hidden = true; root.body.classList.remove('preview-on-mobile'); }
      $('#open').setAttribute('aria-expanded', String(open));
      resizeFrame();
      $(open ? '#close' : '#open').focus();
    }
    $('#open').onclick=()=>setOpen($('#panel').hidden);
    $('#open').setAttribute('aria-controls', 'panel');
    $('#open').setAttribute('aria-expanded', 'false');
    $('#close').onclick=()=>setOpen(false);
    let drag=null;
    $('#dragHandle').addEventListener('pointerdown', e=>{if(e.button!==0)return; const rect=frame.getBoundingClientRect();drag={x:e.screenX,y:e.screenY,right:window.innerWidth-rect.right,bottom:window.innerHeight-rect.bottom};e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();});
    $('#dragHandle').addEventListener('pointermove', e=>{if(!drag)return;const rect=frame.getBoundingClientRect();frame.style.right=`${Math.max(0,Math.min(window.innerWidth-rect.width,drag.right-(e.screenX-drag.x)))}px`;frame.style.bottom=`${Math.max(0,Math.min(window.innerHeight-rect.height,drag.bottom-(e.screenY-drag.y)))}px`;});
    for(const type of ['pointerup','pointercancel','lostpointercapture']) $('#dragHandle').addEventListener(type,()=>{drag=null});
    $('#dragHandle').addEventListener('keydown',e=>{const v={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]}[e.key];if(!v)return;const rect=frame.getBoundingClientRect();frame.style.right=`${Math.max(0,Math.min(window.innerWidth-rect.width,window.innerWidth-rect.right-v[0]))}px`;frame.style.bottom=`${Math.max(0,Math.min(window.innerHeight-rect.height,window.innerHeight-rect.bottom-v[1]))}px`;e.preventDefault();});
    root.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !e.isComposing && !$('#panel').hidden) {
        e.preventDefault();
        setOpen(false);
      }
    });
    window.addEventListener('resize', resizeFrame);
    function renderPreview(data) {
      const box = $('#previewContent'); const scroll=$('#previewPanel').scrollTop; box.replaceChildren();
      const add = (parent, tag, text, cls) => {const e = root.createElement(tag); if (cls) e.className = cls; e.textContent = text; parent.append(e); return e;};
      const info = add(box, 'div', '', 'preview-card'); add(info,'h3',data.server.ten); add(info,'div',`Loại: ${data.server.phan_loai_tu_nhap || data.server.phan_loai} · Mô hình: ${data.server.mo_hinh}`);
      if(data.server.ghi_chu) add(info,'div',`Ghi chú: ${data.server.ghi_chu}`);
      const channelList = (name, list, state) => {const card=add(channelBox,'div','','preview-card');add(card,'h3',`${name} (${list.length})`); if(state === 'thu_gon') add(card,'div','Danh mục đang thu gọn, có thể thiếu kênh.','preview-sub'); if(!list.length) add(card,'div','Chưa thấy kênh nào.','preview-empty'); for(const channel of list){const row=add(card,'div','','preview-channel');add(row,'span',`# ${channel.ten}`);add(row,'span',channel.loai ? (channel.loai === 'khong_xac_dinh' ? 'Chưa rõ loại' : channel.loai) : `Loại ${channel.type ?? 'chưa rõ'}`,'badge'); if(channel.id) add(row,'div',`ID: ${channel.id}`,'preview-sub');}};
      const channelBox=add(box,'section','','live-section'); channelBox.id='liveChannels'; const mainBox=box;
      for(const category of data.cau_truc.danh_muc) channelList(category.ten, category.kenh, category.trang_thai);
      if(data.cau_truc.kenh_chua_xac_dinh_danh_muc.length) channelList('Kênh chưa xác định danh mục',data.cau_truc.kenh_chua_xac_dinh_danh_muc);
      if(data.cache_kenh?.danh_sach?.length) channelList('Kênh / danh mục từ cache (đã kiểm tra quyền)',data.cache_kenh.danh_sach);
      if(!data.cau_truc.danh_muc.length && !data.cau_truc.kenh_chua_xac_dinh_danh_muc.length && !data.cache_kenh?.danh_sach?.length) add(channelBox,'p','Chưa tìm thấy kênh trong giao diện đang tải.','preview-empty');
      const roles=add(box,'section','','preview-card live-section'); roles.id='liveRoles'; add(roles,'h3',`Role đã quan sát (${data.role.danh_sach.length})`); if(!data.role.danh_sach.length) add(roles,'div','Chưa quan sát được role nào.','preview-empty'); for(const r of data.role.danh_sach) {const row=add(roles,'div',`${r.ten} · ${r.nguon}`,'preview-channel'); if(r.mau) add(row,'div',`Màu quan sát: ${r.mau.gia_tri.join ? r.mau.gia_tri.join(' / ') : r.mau.gia_tri}`,'preview-sub');if(r.id) add(row,'div',`ID: ${r.id}`,'preview-sub');if(r.quyen_cap_server) add(row,'div',`Quyền cấp server (bitmask): ${r.quyen_cap_server}`,'preview-sub');if(r.position !== undefined) add(row,'div',`Vị trí: ${r.position}`,'preview-sub');add(row,'div',`Quan sát: ${r.thoi_gian}`,'preview-sub');} const bots=add(box,'section','','preview-card live-section'); bots.id='liveBots'; add(bots,'h3',`Bot/App đã quan sát (${data.bot.danh_sach.length})`); if(!data.bot.danh_sach.length) add(bots,'div','Chưa quan sát được bot/app nào.','preview-empty'); for(const b of data.bot.danh_sach) {const row=add(bots,'div',`${b.ten} · ${b.nguon}`,'preview-channel');if(b.id) add(row,'div',`${b.loai==='bot_thanh_vien_server'?'ID bot':'ID app'}: ${b.id}`,'preview-sub');if(b.tinh_nang_hien_thi?.length) add(row,'div',`Hiển thị: ${b.tinh_nang_hien_thi.join(', ')}`,'preview-sub');add(row,'div',`Quan sát: ${b.thoi_gian}`,'preview-sub');}
      const members=add(box,'section','','preview-card live-section'); members.id='liveMembers'; add(members,'h3','Thành viên theo nhóm đang hiển thị'); for(const g of data.thanh_vien?.nhom || []) { const card=add(members,'div','','preview-channel'); add(card,'strong',`${g.ten} · ${g.thanh_vien.length}/${g.gioi_han} mẫu · Discord hiển thị ${g.so_hien_thi ?? '?'} người`); for(const [type,label] of [['nguoi','👤 Người (ước đoán)'],['bot','🤖 Bot/App']]) { const entries=g.thanh_vien.filter(m=>m.loai===type); add(card,'div',`${label} (${entries.length})`,'preview-sub'); for(const m of entries) add(card,'div',`${m.ten} · Role: ${m.role.length ? m.role.map(r=>r.ten).join(', ') : m.trang_thai_role === 'da_doc' ? 'không thấy role' : 'chưa đọc được'}`,'preview-sub'); } } if(!data.thanh_vien?.nhom?.length) add(members,'div','Chưa quét nhóm thành viên.','preview-empty'); const sources=add(box,'div','','preview-card');add(sources,'h3','Nguồn khảo sát');const labels={danh_sach_thanh_vien:'Danh sách thành viên',cai_dat_roles:'Cài đặt role',ho_so_thanh_vien:'Hồ sơ thành viên',cai_dat_quyen_role:'Quyền chi tiết của role',tich_hop:'Ứng dụng tích hợp',app_launcher:'Bộ chọn ứng dụng / lệnh',cache_role:'Role từ cache',cache_bot:'Bot từ cache',cache_kenh:'Kênh từ cache'};const states={da_nhan_dien:'đã nhận diện, có thể chưa đầy đủ',chua_nhan_dien:'chưa nhận diện',chua_ho_tro:'chưa hỗ trợ',store_khong_kha_dung_hoac_chua_doc:'store chưa sẵn sàng',da_doc_cache_khong_bao_dam_day_du:'đã đọc cache, có thể thiếu',da_doc_cache_thanh_vien_co_the_thieu:'đã đọc cache thành viên, có thể thiếu',chi_cache_duoc_xac_nhan_quyen_xem:'đã đọc cache có quyền xem',khong_doc_duoc:'không đọc được'};for(const [key,value] of Object.entries(data.nguon_khao_sat||{})) add(sources,'div',`${labels[key]||key}: ${states[value.trang_thai]||value.trang_thai}`,'preview-sub');add(box,'p','Cache và dữ liệu hiển thị có thể thiếu. Mục DOM không ID có thể bị lặp khi tải lại. Quyền role từ cache là bitmask cấp server, không phải quyền hiệu lực trong kênh.','preview-warning');
      const totalChannels=data.cau_truc.danh_muc.reduce((n,c)=>n+c.kenh.length,0)+data.cau_truc.kenh_chua_xac_dinh_danh_muc.length+(data.cache_kenh?.danh_sach?.length||0); $('#tabChannels').textContent=`Kênh (${totalChannels})`; $('#tabRoles').textContent=`Role (${data.role.danh_sach.length})`; $('#tabBots').textContent=`Bot / App (${data.bot.danh_sach.length})`; $('#tabMembers').textContent=`Thành viên (${(data.thanh_vien?.nhom || []).reduce((n,g)=>n+g.thanh_vien.length,0)})`;
      for(const tab of root.querySelectorAll('[data-view]')) {const target=tab.getAttribute('data-view');tab.setAttribute('aria-selected',String(target===activeView));$('#'+target).hidden=target!==activeView;} $('#previewPanel').scrollTop=scroll;
    }
    let activeView='liveChannels';
    for(const tab of root.querySelectorAll('[data-view]')) tab.addEventListener('click',()=>{activeView=tab.getAttribute('data-view');if(result)renderPreview(result)});
    function showPreview() { if(!result) return; $('#previewPanel').hidden=false; root.body.classList.add('preview-on-mobile'); resizeFrame(); $('#previewClose').focus(); }
    function closePreview() { $('#previewPanel').hidden=true; root.body.classList.remove('preview-on-mobile'); resizeFrame(); $('#showPreview').focus(); }
    $('#previewClose').onclick=closePreview; $('#showPreview').onclick=showPreview;
    // Discovery examines only already-instantiated module exports. It never calls
    // authentication methods, loads modules, dispatches gateway events or requests data.
    function findCachedStores() {
      const chunks=window.webpackChunkdiscord_app;
      if (!chunks || typeof chunks.push !== 'function') return null;
      let req; const tag='summerai_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const payload=[[tag],{},r=>{req=r}];
      try { chunks.push(payload); if(chunks[chunks.length-1]===payload) chunks.pop(); } catch { return null; }
      if(!req || !req.c) return null;
      const signatures={roles:['getRolesSnapshot','getRole'],members:['getMemberIds','getMember'],users:['getCurrentUser','getUser'],channels:['getMutableGuildChannelsForGuild','getChannel'],permissions:['can','getChannelPermissions'],guilds:['getGuild','getGuilds']};
      const found={};
      function hasMethod(obj,name) { let p=obj; for(let n=0;p && n<5;n++,p=Object.getPrototypeOf(p)){const d=Object.getOwnPropertyDescriptor(p,name);if(d) return typeof d.value==='function';}return false; }
      function consider(obj) { if(!obj || (typeof obj!=='object' && typeof obj!=='function'))return;for(const [name,methods] of Object.entries(signatures)) if(!found[name] && methods.every(m=>hasMethod(obj,m))) found[name]=obj; if(!found.roles && hasMethod(obj,'getRole') && (hasMethod(obj,'getUnsafeMutableRoles') || hasMethod(obj,'getSortedRoles'))) found.roles=obj; }
      for(const mod of Object.values(req.c)) {
        try {const ex=mod?.exports;consider(ex); if(ex && (typeof ex==='object'||typeof ex==='function')) for(const d of Object.values(Object.getOwnPropertyDescriptors(ex))) if('value' in d && d.value && (typeof d.value==='object'||typeof d.value==='function')) consider(d.value); }catch{}
      }
      return found;
    }
    function stopStores(){for(const off of storeUnsub){try{off()}catch{}}storeUnsub=[];stores=null;}
    function subscribeStores(){
      stopStores(); storeLastDiscovery=Date.now(); try{stores=findCachedStores()}catch{stores=null}
      for(const store of Object.values(stores||{})) if(typeof store.addChangeListener==='function' && typeof store.removeChangeListener==='function') {
        const listener=()=>{if(running)scanTick()};try{store.addChangeListener(listener);storeUnsub.push(()=>store.removeChangeListener(listener))}catch{}
      }
    }
    function decimal(value){if(typeof value==='bigint')return value.toString();if(typeof value==='string' && /^\d+$/.test(value))return value;if(typeof value==='number' && Number.isSafeInteger(value) && value>=0)return String(value);return null;}
    function readCached() {
      if(!stores || !result || !sessionGuild) return;
      const now=new Date().toISOString(), includeId=true;
      const state=result.nguon_khao_sat;
      if(stores.guilds && !clean($('#serverName').value)) try{const g=stores.guilds.getGuild(sessionGuild);if(g && String(g.id)===sessionGuild && typeof g.name==='string' && g.name) result.server.ten=g.name;}catch{}
      if(stores.roles || stores.guilds) try {
        let roles, roleSource; if(stores.roles && typeof stores.roles.getRolesSnapshot==='function'){roles=stores.roles.getRolesSnapshot(sessionGuild);roleSource='cache GuildRoleStore.getRolesSnapshot'} else if(stores.roles && typeof stores.roles.getUnsafeMutableRoles==='function'){roles=stores.roles.getUnsafeMutableRoles(sessionGuild);roleSource='cache GuildRoleStore.getUnsafeMutableRoles'} else if(stores.roles && typeof stores.roles.getSortedRoles==='function'){roles=stores.roles.getSortedRoles(sessionGuild);roleSource='cache GuildRoleStore.getSortedRoles'} else if(stores.guilds){roles=stores.guilds.getGuild(sessionGuild)?.roles;roleSource='cache GuildStore.getGuild.roles'}
        if(roles && typeof roles==='object') {state.cache_role={trang_thai:'da_doc_cache_khong_bao_dam_day_du'};
          for(const role of Object.values(roles)) {
            if(!role || !/^\d+$/.test(String(role.id||'')) || typeof role.name!=='string')continue;
            const id=String(role.id);let item=cacheRoles.get(id);if(!item){item={ten:role.name,nguon:roleSource,thoi_gian:now};cacheRoles.set(id,item);result.role.danh_sach.push(item)}
            item.ten=role.name;if(includeId)item.id=id;else delete item.id;
            for(const k of ['color','position','hoist','mentionable','managed']) if(['string','number','boolean'].includes(typeof role[k])) item[k]=role[k];
            const perms=decimal(role.permissions);if(perms!==null)item.quyen_cap_server=perms;
            if(role.tags && typeof role.tags==='object') {const tags={};for(const key of ['bot_id','integration_id','premium_subscriber','subscription_listing_id','available_for_purchase','guild_connections']){const v=role.tags[key];if((typeof v==='boolean'||typeof v==='string'||v===null) && (includeId || !key.endsWith('_id'))) tags[key]=v}item.tags=tags;}
          }
        }
      } catch {state.cache_role={trang_thai:'khong_doc_duoc'};}
      if(stores.members && stores.users) try {
        const ids=stores.members.getMemberIds(sessionGuild);
        if(Array.isArray(ids)){state.cache_bot={trang_thai:'da_doc_cache_thanh_vien_co_the_thieu'};
          for(const uid of ids){if(!/^\d+$/.test(String(uid)))continue;const member=stores.members.getMember(sessionGuild,String(uid)); if(!member)continue;const user=stores.users.getUser(String(uid));if(!user || user.bot!==true)continue;
            const id=String(uid);let item=cacheBots.get(id);if(!item){item={ten:String(user.globalName||user.global_name||user.username||'Bot'),nguon:'cache thanh vien va UserStore',loai:'bot_thanh_vien_server',thoi_gian:now};cacheBots.set(id,item);result.bot.danh_sach.push(item)}
            if(includeId)item.id=id;else delete item.id;if(includeId && Array.isArray(member.roles))item.role_ids=member.roles.filter(x=>typeof x==='string' && /^\d+$/.test(x));else delete item.role_ids;
          }
        }
      } catch {state.cache_bot={trang_thai:'khong_doc_duoc'};}
      if(stores.channels && stores.permissions) try {
        const map=stores.channels.getMutableGuildChannelsForGuild(sessionGuild);
        if(map && typeof map==='object'){state.cache_kenh={trang_thai:'chi_cache_duoc_xac_nhan_quyen_xem'};
          for(const ch of Object.values(map)) {
            if(!ch || String(ch.guild_id ?? ch.guildId ?? '')!==sessionGuild || !/^\d+$/.test(String(ch.id||'')))continue;
            let can=false;try{can=stores.permissions.can(1024n,ch)===true}catch{}if(!can){const id=String(ch.id);const old=cacheChannels.get(id);if(old){cacheChannels.delete(id);result.cache_kenh.danh_sach=result.cache_kenh.danh_sach.filter(x=>x!==old)}for(const cat of result.cau_truc.danh_muc)cat.kenh=cat.kenh.filter(x=>x.id!==id);result.cau_truc.kenh_chua_xac_dinh_danh_muc=result.cau_truc.kenh_chua_xac_dinh_danh_muc.filter(x=>x.id!==id);continue;}
            const id=String(ch.id);let item=cacheChannels.get(id);if(!item){item={ten:String(ch.name||''),nguon:'cache ChannelStore + PermissionStore',thoi_gian:now};cacheChannels.set(id,item);result.cache_kenh.danh_sach.push(item)}
            item.ten=String(ch.name||'');if(includeId)item.id=id;else delete item.id;
            const parent=ch.parent_id ?? ch.parentId; if(includeId && parent) item.parent_id=String(parent);else delete item.parent_id;
            for(const k of ['type','position','topic','rateLimitPerUser','rate_limit_per_user']){let v=ch[k];if(['number','string'].includes(typeof v))item[k]=v;}
            // Overwrite targets are identifiers; include only when the user opts in.
            const overwrites=ch.permissionOverwrites ?? ch.permission_overwrites; if(includeId && overwrites && typeof overwrites==='object') {const arr=[];for(const x of Object.values(overwrites)){if(!x || !/^\d+$/.test(String(x.id||'')))continue;const allow=decimal(x.allow),deny=decimal(x.deny);if(allow!==null && deny!==null)arr.push({id:String(x.id),type:x.type,allow,deny})}item.overwrites=arr;}else delete item.overwrites;
          }
        }
      }catch{state.cache_kenh={trang_thai:'khong_doc_duoc'};}
    }
    function addObserved(list, item) {
      if (!item.ten) return;
      // Without a stable ID, only merge within the same source and visible occurrence.
      const existing = item.id ? list.find(x => x.id === item.id) : list.find(x => !x.id && x.observation_key && x.observation_key === item.observation_key && x.nguon === item.nguon);
      if (!existing) list.push(item);
      else if (item.mau && !existing.mau) existing.mau = item.mau;
    }
    function markSource(key) { if(result.nguon_khao_sat[key].trang_thai !== 'da_nhan_dien') result.nguon_khao_sat[key] = {trang_thai:'da_nhan_dien',lan_dau:new Date().toISOString()}; }
    function collectSettingsRoles() {
      const rows = [...document.querySelectorAll('[class*="roleRow"][data-dnd-name][role="button"]')].filter(visible);
      if (!rows.length) return;
      markSource('cai_dat_roles'); const seen = new Map();
      rows.forEach((row,index)=>{
        const name=clean(row.getAttribute('data-dnd-name')); if(!name) return;
        const occurrence=seen.get(name)||0; seen.set(name,occurrence+1);
        const item={ten:name,observation_key:domKey(row),nguon:'Server Settings > Roles',thoi_gian:new Date().toISOString(),thu_tu_doan_dang_tai:index+1,lan_trung_ten:occurrence};
        const stops=[...row.querySelectorAll('linearGradient stop')].map(e=>e.style.stopColor).filter(Boolean);
        const svg=row.querySelector('[class*="roleIcon"] path'); const fill=svg?.getAttribute('fill');
        if(stops.length) item.mau={loai:'gradient',gia_tri:stops}; else if(fill && !fill.startsWith('url(') && fill!=='currentColor') item.mau={loai:'svg_fill',gia_tri:fill};
        addObserved(result.role.danh_sach,item);
      });
    }

    function collectIntegrations() {
      const panel=document.querySelector('#integrations-tab'); if(!panel || !visible(panel)) return;
      const headings=[...panel.querySelectorAll('h2,h3')];
      if(!headings.some(h=>/^(bot và ứng dụng|bots and apps)$/i.test(clean(h.textContent)))) return;
      markSource('tich_hop');
      for(const row of panel.querySelectorAll('[role="button"]')) {
        if(!visible(row)) continue;
        const image=row.querySelector('img[src*="/app-icons/"]'); const heading=row.querySelector('h2,h3');
        if(!image || !heading) continue;
        const name=clean(heading.textContent); if(!name) continue;
        const app={ten:name,nguon:'Server Settings > Integrations > Bots and Apps',loai:'app_cai_trong_server',thoi_gian:new Date().toISOString()};
        const match=image.getAttribute('src')?.match(/\/app-icons\/(\d+)\//); if(match) app.id=match[1]; else app.observation_key=domKey(row);
        const features=[...row.querySelectorAll('[role="row"][aria-label]')].map(e=>clean(e.getAttribute('aria-label'))).filter(Boolean);
        if(features.length) app.tinh_nang_hien_thi=features;
        addObserved(result.bot.danh_sach,app);
      }
    }
    function visible(el) { return !!el.getClientRects().length; }
    function collectVisibleMembers() {
      const list = document.querySelector('[data-list-id^="members-"], [data-list-id="members"]');
      if (!list) return;
      markSource('danh_sach_thanh_vien');
      for (const heading of list.querySelectorAll('h3,[role="heading"]')) {
        if (!visible(heading)) continue;
        const raw = clean(heading.querySelector('[class*="membersGroupName"]')?.textContent || heading.getAttribute('aria-label') || heading.textContent);
        const name = raw.replace(/[,\s]+[\d.,]+\s*(thành viên|members?)\s*$/i,'').replace(/\s*[—-]\s*[\d.,]+\s*$/,'').trim();
        if (name && !/^(online|offline|trực tuyến|ngoại tuyến|thành viên|members)$/i.test(name)) addObserved(result.role.danh_sach,{ten:name,observation_key:domKey(heading),nguon:'nhóm hiển thị trong danh sách thành viên',thoi_gian:new Date().toISOString()});
      }
      for (const row of list.querySelectorAll('[data-list-item-id]')) {
        if (!visible(row) || !row.querySelector('[aria-label*="Bot" i],[aria-label*="Ứng dụng" i],[class*="botTag"],[class*="botText"]')) continue;
        const name=clean(row.querySelector('[class*="username"],[class*="name"]')?.textContent);
        if(name) addObserved(result.bot.danh_sach,{ten:name,observation_key:domKey(row),nguon:'nhãn Bot/App trong danh sách thành viên',thoi_gian:new Date().toISOString()});
      }
    }
    // This optional pass uses only the rendered list and opens the corresponding
    // profile. It never clicks a role, chat input, message or server setting.
    const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
    const memberList = () => document.querySelector('[data-list-id^="members-"], [data-list-id="members"]');
    function avatarId(el) {
      const src=el.querySelector('img[src*="/avatars/"]')?.getAttribute('src') || '';
      return src.match(/\/avatars\/(\d+)\//)?.[1] || null;
    }
    function memberDisplayName(row) {
      const el=row.querySelector('[class*="nameContainer__"] [class*="username__"]:not([aria-hidden="true"])') ||
        row.querySelector('[class*="username__"] [class*="username__"]:not([aria-hidden="true"])') ||
        row.querySelector('[class*="username__"]') || row.querySelector('[class*="name__"]');
      if(!el)return '';
      const copy=el.cloneNode(true);
      copy.querySelectorAll('[aria-hidden="true"],[class*="nameGlow"],[class*="clanTag"],[class*="hiddenVisually"]').forEach(x=>x.remove());
      return clean(copy.textContent);
    }
    function profileRoles(dialog) {
      // Discord sometimes puts this list directly in the profile, without a section heading.
      return [...dialog.querySelectorAll('[role="list"]')].find(el=>/^(vai trò|roles?)$/i.test(clean(el.getAttribute('aria-label'))) || (el.getAttribute('data-list-id')||'').startsWith('roles-')) ||
        [...dialog.querySelectorAll('section')].find(el=>/^(vai trò|roles?)$/i.test(clean(el.querySelector('h1,h2,h3')?.textContent))) || null;
    }
    // Seek within a virtualized list by row index, then require a group heading
    // at the destination before accepting the jump.
    async function seekNextGroup(list,target,active) {
      const original=list.scrollTop, max=Math.max(0,list.scrollHeight-list.clientHeight);
      let lo=original, hi=max;
      for(let attempt=0;attempt<20 && active() && hi>=lo;attempt++) {
        list.scrollTop=Math.round((lo+hi)/2); await sleep(180);
        if(!active())return false;
        const rows=[...list.querySelectorAll('[role="listitem"][index]')].map(e=>({el:e,index:Number(e.getAttribute('index'))})).filter(x=>Number.isInteger(x.index)).sort((a,b)=>a.index-b.index);
        if(!rows.length)break;
        const hit=rows.find(x=>x.index===target);
        if(hit){
          const nodes=[...list.querySelectorAll('h3,[role="heading"],[role="listitem"][index]')], at=nodes.indexOf(hit.el);
          const prev=nodes.slice(0,at).reverse().find(x=>x.matches('h3,[role="heading"],[role="listitem"][index]'));
          if(prev?.matches('h3,[role="heading"]')) {
            list.scrollTop=Math.max(0,Math.min(max,list.scrollTop+hit.el.getBoundingClientRect().top-list.getBoundingClientRect().top-100));
            await sleep(200); return active();
          }
          break;
        }
        if(list.scrollTop>=max-2 && rows[rows.length-1].index===target-1)return true;
        if(rows[rows.length-1].index<target)lo=list.scrollTop+1;
        else if(rows[0].index>target)hi=list.scrollTop-1;
        else break;
      }
      if(active()) {list.scrollTop=original;await sleep(180);}
      return false;
    }
    function channelScroller(sidebar) {
      let el=sidebar;
      for(let i=0;el && i<6;i++,el=el.parentElement) {
        const css=getComputedStyle(el);
        if(el.scrollHeight>el.clientHeight+2 && /(auto|scroll)/.test(css.overflowY))return el;
      }
      return sidebar;
    }
    async function scanChannelsFirst(job) {
      const active=()=>running && channelScan===job && !job.cancelled && guild()===sessionGuild && location.pathname===job.path;
      const sidebar=locateSidebar();if(!sidebar)return false;
      const scroll=channelScroller(sidebar), oldTop=scroll.scrollTop;
      try {
        scroll.scrollTop=0;await sleep(250);
        for(let steps=0;active() && steps<2000;steps++) {
          $('#memberStatus').textContent='Đang mở danh mục và quét cột kênh...';
          // A category toggle has a heading and collapsed state; never click a channel.
          const collapsed=[...sidebar.querySelectorAll('[aria-expanded="false"]')].filter(el=>
            el.matches('[role="button"],button') && (el.querySelector('h3,[role="heading"]') || (el.getAttribute('data-list-item-id')||'').startsWith('channels___')) && !el.querySelector('a[href*="/channels/"]'));
          for(const el of collapsed){if(!active())break;el.click();await sleep(120);}
          if(!active())break;
          try{mergeSnapshot(collect());}catch{}
          renderPreview(result);
          const max=Math.max(0,scroll.scrollHeight-scroll.clientHeight), before=scroll.scrollTop;
          if(before>=max-2)return true;
          scroll.scrollTop=Math.min(max,before+Math.max(100,Math.floor(scroll.clientHeight*0.7)));
          await sleep(220);
          if(scroll.scrollTop<=before+1)break;
        }
        return false;
      } finally {if(scroll.isConnected && guild()===sessionGuild && location.pathname===job.path)scroll.scrollTop=oldTop;}
    }
    async function runAutomaticScan() {
      const job={cancelled:false,path:location.pathname};channelScan=job;
      $('#scanMembers').disabled=true;
      let done=false;
      try{done=await scanChannelsFirst(job);}catch{}
      if(channelScan!==job)return;
      channelScan=null;
      if(!running || job.cancelled || guild()!==sessionGuild)return;
      if(location.pathname!==job.path){$('#scanMembers').disabled=false;$('#memberLimit').disabled=false;$('#memberStatus').textContent='Đã dừng quét kênh vì chuyển kênh. Bạn có thể quét lại thành viên.';return;}
      $('#scanMembers').disabled=false;
      $('#memberLimit').disabled=false;
      $('#memberStatus').textContent=done?'Đã quét cột kênh. Bắt đầu quét thành viên...':'Chưa quét hết cột kênh; tiếp tục quét thành viên, kết quả kênh có thể thiếu.';
      $('#scanMembers').click();
    }
    function readMemberLimit() {
      const value=$('#memberLimit').value.trim();
      const n=Number(value);
      if(!/^\d+$/.test(value) || !Number.isSafeInteger(n) || n<1) {
        $('#memberStatus').textContent='Hãy nhập số nguyên dương hợp lệ cho giới hạn mỗi nhóm.';
        $('#memberLimit').focus();return null;
      }
      return n;
    }
    function stopMemberScan() { if(memberScan) {memberScan.cancelled=true; if(memberScan.data) memberScan.data.trang_thai='da_dung'; $('#memberStatus').textContent='Đang dừng quét thành viên...';} }
    $('#stopMembers').onclick=stopMemberScan;
    $('#scanMembers').onclick=async()=>{
      const list=memberList();
      if(!running || !list || !visible(list)){ $('#memberStatus').textContent='Hãy mở danh sách thành viên của kênh trước.'; return; }
      if(memberScan)return;
      const limit=readMemberLimit();if(limit===null)return;
      $('#memberLimit').disabled=true;
      const job={cancelled:false, path:location.pathname}; memberScan=job;
      const scan=result.thanh_vien={trang_thai:'dang_quet',gioi_han_moi_nhom:limit,nhom:[]}; job.data=scan;
      $('#scanMembers').disabled=true; $('#stopMembers').disabled=false;
      $('#memberStatus').textContent=`Đang chuẩn bị quét tối đa ${limit} người mỗi nhóm...`;
      const oldTop=list.scrollTop, groupByStart=new Map(), seen=new Set(), attemptedJumps=new Set();
      const active=()=>!job.cancelled && running && memberScan===job && guild()===sessionGuild && location.pathname===job.path && list.isConnected && visible(list);
      const progress=s=>{if(memberScan===job)$('#memberStatus').textContent=s;};
      try {
        list.scrollTop=0; await sleep(450);
        let stalled=0;
        while(active()) {
          // Discord virtualizes rows; indices establish stable order across scroll windows.
          const nodes=[...list.querySelectorAll('h3,[role="heading"],[role="listitem"][index]')];
          for(let i=0;i<nodes.length;i++) {
            const h=nodes[i]; if(!h.matches('h3,[role="heading"]'))continue;
            const next=nodes.slice(i+1).find(x=>x.matches('[role="listitem"][index],h3,[role="heading"]'));
            if(!next || !next.matches('[role="listitem"][index]'))continue;
            const start=Number(next.getAttribute('index'));if(!Number.isInteger(start)||start<0)continue;
            const label=clean(h.querySelector('[class*="hiddenVisually"]')?.textContent || h.getAttribute('aria-label') || h.textContent);
            const number=label.match(/[,\s]+([\d.,]+)\s*(?:thành viên|members?)\s*$/i) || clean(h.textContent).match(/[—-]\s*([\d.,]+)\s*$/);
            const count=number?Number(number[1].replace(/[.,]/g,'')):null;
            const name=clean(h.querySelector('[class*="membersGroupName"]')?.textContent || label.replace(/[,\s]+[\d.,]+\s*(?:thành viên|members?)\s*$/i,''));
            if(!name)continue;
            if(!groupByStart.has(start)) {const g={ten:name,so_hien_thi:count,gioi_han:Math.min(count ?? limit,limit),thanh_vien:[],trang_thai:'co_the_chua_day_du'};groupByStart.set(start,g);scan.nhom.push(g);}
          }
          const ranges=[...groupByStart.entries()].sort((a,b)=>a[0]-b[0]);
          for(const row of nodes.filter(x=>x.matches('[role="listitem"][index]'))) {
            if(!active())break;
            const idx=Number(row.getAttribute('index')); if(!Number.isInteger(idx))continue;
            const match=ranges.filter(([start,g])=>start<=idx && (g.so_hien_thi===null || idx<start+g.so_hien_thi)).pop();
            if(!match || idx-match[0]>=match[1].gioi_han || seen.has(idx))continue;
            const group=match[1]; seen.add(idx);
            const id=avatarId(row), name=memberDisplayName(row);
            if(!name)continue;
            const bot=!!row.querySelector('[class*="botTag"],[class*="botText"],[aria-label*="Ứng dụng" i],[aria-label*="Bot" i]');
            const person={ten:name,loai:bot?'bot':'nguoi',phan_loai_nguon:bot?'nhan APP trong danh sach':'khong thay nhan APP, uoc doan',role:[],trang_thai_role:'chua_doc_duoc'};if(id)person.id=id;
            group.thanh_vien.push(person);
            progress(`Đang quét ${group.ten}: ${group.thanh_vien.length}/${group.gioi_han}. Đã lấy ${seen.size} thành viên.`);
            // Prevent associating a stale dialog with a different member.
            const previous=[...document.querySelectorAll('[role="dialog"]')].filter(x=>x.querySelector('.user-profile-popout'));
            row.click(); let dialog=null;
            for(let n=0;n<14 && active();n++){await sleep(100); const candidates=[...document.querySelectorAll('[role="dialog"]')].filter(x=>visible(x)&&x.querySelector('.user-profile-popout'));
              dialog=candidates.find(x=>id && avatarId(x)===id) || (!id ? candidates.find(x=>!previous.includes(x) && clean(x.querySelector('h1')?.textContent).endsWith(name)) : null);
              if(dialog)break;
            }
            if(dialog && active()) {
              let roleContainer=profileRoles(dialog);
              for(let n=0;!roleContainer && n<10 && active();n++){await sleep(100);if(!dialog.isConnected)break;roleContainer=profileRoles(dialog);}
              if(roleContainer && active() && dialog.isConnected){
                // Only expand the explicit show-more control inside this person's role list.
                const more=[...roleContainer.querySelectorAll('button,[role="button"]')].find(el=>/^(xem thêm|show more|view more)\b/i.test(clean(el.getAttribute('aria-label')||el.textContent)));
                if(more){more.click();await sleep(150);roleContainer=profileRoles(dialog)||roleContainer;}
                if(active() && dialog.isConnected){
                  markSource('ho_so_thanh_vien');person.trang_thai_role='da_doc';
                  person.role_co_the_thieu=!![...roleContainer.querySelectorAll('button,[role="button"]')].find(el=>/^(xem thêm|show more|view more)\b/i.test(clean(el.getAttribute('aria-label')||el.textContent)));
                  for(const r of roleContainer.querySelectorAll('[role="listitem"]')) {const roleName=clean(r.querySelector('[class*="roleName"]')?.textContent || r.getAttribute('aria-label'));if(!roleName)continue; const role={ten:roleName};const rid=r.getAttribute('data-list-item-id')?.match(/___(\d+)$/)?.[1];if(rid)role.id=rid;person.role.push(role);addObserved(result.role.danh_sach,{...role,observation_key:domKey(r),nguon:'hồ sơ thành viên',thoi_gian:new Date().toISOString()});}
                }
              }
            }
            // Keep UI and result responsive without allowing a late async result after stop.
            if(active()) {renderPreview(result);await sleep(120);}
          }
          if(!active())break;
          const max=Math.max(0,list.scrollHeight-list.clientHeight), before=list.scrollTop;
          const latest=ranges.filter(([start,g])=>g.so_hien_thi>g.gioi_han && g.thanh_vien.length>=g.gioi_han && !attemptedJumps.has(start)).pop();
          if(latest && latest[0]+latest[1].so_hien_thi > (Number(nodes.filter(x=>x.matches('[role="listitem"][index]')).at(-1)?.getAttribute('index'))||0)+30) {
            attemptedJumps.add(latest[0]);
            progress(`Đã lấy ${latest[1].gioi_han} mẫu ở ${latest[1].ten}, đang tìm nhóm tiếp theo...`);
            if(await seekNextGroup(list,latest[0]+latest[1].so_hien_thi,active))continue;
          }
          if(before>=max-2)break;
          list.scrollTop=Math.min(max,before+Math.max(120,Math.floor(list.clientHeight*0.65)));
          await sleep(350); stalled=list.scrollTop<=before+1?stalled+1:0;if(stalled>=2)break;
        }
        if(memberScan===job){scan.trang_thai=active()?'da_quet_phan_hien_thi':'da_dung';progress(`${scan.trang_thai==='da_dung'?'Đã dừng':'Đã quét xong danh sách đang tải'}: ${scan.nhom.length} nhóm, ${scan.nhom.reduce((n,g)=>n+g.thanh_vien.length,0)} thành viên. Có thể thiếu do giới hạn hiển thị.`);}
      } catch(e){scan.trang_thai='loi';progress('Không hoàn tất quét thành viên: '+e.message);}
      finally {if(list.isConnected && guild()===sessionGuild && location.pathname===job.path)list.scrollTop=oldTop;if(memberScan===job){memberScan=null;$('#stopMembers').disabled=true;$('#scanMembers').disabled=!running;$('#memberLimit').disabled=false;if(result)renderPreview(result);}}
    };
    function mergeSnapshot(next) {
      for (const cat of next.cau_truc.danh_muc) {
        let dest=result.cau_truc.danh_muc.find(c=>c.observation_key===cat.observation_key);
        if(!dest){dest={...cat,kenh:[]};result.cau_truc.danh_muc.push(dest)}
        dest.trang_thai=cat.trang_thai;
        for(const channel of cat.kenh) if(!dest.kenh.some(x=>x.id && x.id===channel.id)) dest.kenh.push(channel);
      }
      for(const channel of next.cau_truc.kenh_chua_xac_dinh_danh_muc) if(!result.cau_truc.kenh_chua_xac_dinh_danh_muc.some(x=>x.id && x.id===channel.id)) result.cau_truc.kenh_chua_xac_dinh_danh_muc.push(channel);
    }
    function scanTick() {
      if(!running || !result) return;
      const currentGuild=guild();
      if(currentGuild && currentGuild!==sessionGuild){finishScan('Đã dừng vì bạn chuyển server. Kết quả chỉ thuộc server ban đầu.');return;}
      if(!currentGuild){msg('Đang tạm chờ: không xác định được server hiện tại. Quay lại server ban đầu để tiếp tục.');return;}
      try{mergeSnapshot(collect())}catch(e) { /* settings may temporarily hide channel list */ }
      collectVisibleMembers(); collectSettingsRoles(); collectIntegrations(); if(Date.now()-storeLastDiscovery>15000 && ['roles','members','users','channels','permissions'].some(k=>!stores?.[k])) subscribeStores(); readCached();
      const n=result.cau_truc.danh_muc.reduce((a,c)=>a+c.kenh.length,0)+result.cau_truc.kenh_chua_xac_dinh_danh_muc.length;
      msg(`Đang quét: ${n} kênh giao diện, ${result.cache_kenh.danh_sach.length} mục kênh cache, ${result.role.danh_sach.length} role quan sát, ${result.bot.danh_sach.length} bot/app. Cuộn hoặc mở phần cần xem.`);
      const signature=JSON.stringify([result.server,result.cau_truc,result.role.danh_sach,result.bot.danh_sach,result.nguon_khao_sat,result.cache_kenh,result.thanh_vien]); if(signature!==lastPreviewSignature){lastPreviewSignature=signature;renderPreview(result);}
    }
    function finishScan(message) {
      if(!running) return; if(channelScan)channelScan.cancelled=true; stopMemberScan(); scanTickGuard(); running=false; clearInterval(scanTimer); scanTimer=null;stopStores();
      result.phien_quet.ket_thuc=new Date().toISOString(); result.server.phan_loai=$('#category').value; result.server.phan_loai_tu_nhap=clean($('#custom').value); result.server.mo_hinh=$('#model').value; result.server.ghi_chu=$('#notes').value.trim(); if(clean($('#serverName').value)) result.server.ten=clean($('#serverName').value);
      $('#scan').disabled=false;$('#finish').disabled=true;$('#scanMembers').disabled=true;$('#memberLimit').disabled=false;$('#save').disabled=$('#copy').disabled=$('#showPreview').disabled=false;
      renderPreview(result);msg(message || 'Đã kết thúc quét. Hãy xem trước và lưu JSON.');showPreview();
    }
    function scanTickGuard() { if (guild()===sessionGuild) { try{mergeSnapshot(collect())}catch(e){} collectVisibleMembers();collectSettingsRoles();collectIntegrations();readCached() } }
    $('#scan').onclick=()=>{try{
      if(readMemberLimit()===null)return;
      const initial=collect(); result=structuredClone(initial); result.cau_truc={danh_muc:[],kenh_chua_xac_dinh_danh_muc:[]};
      result.role={trang_thai:'chi_quan_sat_mot_phan',danh_sach:[]}; result.bot={trang_thai:'chi_quan_sat_mot_phan',danh_sach:[]};
      result.phien_ban='2.2'; result.thanh_vien={trang_thai:'chua_quet',nhom:[]}; result.cache_kenh={trang_thai:'khong_bao_dam_day_du',danh_sach:[]};cacheRoles=new Map();cacheBots=new Map();cacheChannels=new Map(); result.phien_quet={bat_dau:new Date().toISOString(),ket_thuc:null}; result.nguon_khao_sat={danh_sach_thanh_vien:{trang_thai:'chua_nhan_dien'},cai_dat_roles:{trang_thai:'chua_nhan_dien'},ho_so_thanh_vien:{trang_thai:'chua_nhan_dien'},cai_dat_quyen_role:{trang_thai:'chua_ho_tro'},tich_hop:{trang_thai:'chua_nhan_dien'},app_launcher:{trang_thai:'chua_ho_tro'}};
      result.gioi_han.push('Mẫu thành viên lấy theo giới hạn đã chọn ở mỗi nhóm đang hiển thị trong kênh; nhóm online/offline không nhất thiết là role, và nhóm ẩn hoặc chưa tải có thể thiếu. Không thấy nhãn APP chỉ là ước đoán người; hồ sơ hoặc role không đọc được được đánh dấu chưa rõ.','Role từ nhóm thành viên và trang Roles có thể thiếu; thứ tự chỉ trong đoạn đang tải, không suy ra phân quyền. Bảng quyền chi tiết chưa được hỗ trợ.','Cache Discord là nội bộ, có thể thiếu hoặc thay đổi. Dữ liệu kênh cache chỉ gồm mục được PermissionStore xác nhận ViewChannel. Script không tự gọi API; Discord có thể tải thêm khi cuộn hoặc mở hồ sơ.','Bot/App chỉ là các mục có nhãn nhận diện trong danh sách đang hiển thị; có thể thiếu, không đại diện mọi app; mục Integrations là ứng dụng cài vào server và không mặc định là bot thành viên.','Kênh và danh mục có thể trùng tên hoặc bị phân nhóm sai do danh sách tải theo vùng cuộn. Mục DOM không có ID có thể lặp khi Discord dựng lại giao diện.');
      sessionGuild=guild();running=true;mergeSnapshot(initial);subscribeStores(); for(const key of ['cache_role','cache_bot','cache_kenh']) result.nguon_khao_sat[key]={trang_thai:'store_khong_kha_dung_hoac_chua_doc'};scanTick();scanTimer=setInterval(scanTick,1500);
      $('#scan').disabled=true;$('#finish').disabled=false;$('#scanMembers').disabled=true;$('#memberLimit').disabled=true;$('#save').disabled=$('#copy').disabled=true;$('#showPreview').disabled=false;renderPreview(result);runAutomaticScan();
    }catch(e){result=null;msg(e.message)}};
    $('#finish').onclick=()=>finishScan();
    // Keep privileged APIs in the top-level page and call them directly from the
    // trusted click: srcdoc need not request its own picker/clipboard permissions.
    function exportJSON(){
      const copy=structuredClone(result);
      if(!$('#includeId').checked){
        const redact=value=>{if(!value||typeof value!=='object')return; if(Array.isArray(value)){value.forEach(redact);return;}for(const k of Object.keys(value)){if(k==='id'||k==='parent_id'||k==='role_ids'||k==='overwrites'||k.endsWith('_id'))delete value[k];else redact(value[k]);}};redact(copy);
      }
      return JSON.stringify(copy,null,2);
    }
    $('#save').onclick=async()=>{if(!result)return;const filename=`${safe(result.server.phan_loai_tu_nhap || result.server.phan_loai)}_${safe(result.server.ten)}_${stamp()}.json`;const data=exportJSON();try{if(window.showSaveFilePicker){const handle=await window.showSaveFilePicker({suggestedName:filename,types:[{description:'JSON',accept:{'application/json':['.json']}}]});const w=await handle.createWritable();await w.write(data);await w.close();msg('Đã lưu file JSON.');}else{const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=root.createElement('a');a.href=url;a.download=filename;root.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);msg('Đã yêu cầu tải xuống. Nếu không thấy hộp chọn nơi lưu, bật “Hỏi vị trí lưu từng tệp” trong Chrome.');}}catch(e){msg(e.name==='AbortError'?'Đã hủy lưu.':'Không thể lưu: '+e.message);}};
    $('#copy').onclick=async()=>{try{if (!result) return; await window.navigator.clipboard.writeText(exportJSON());msg('Đã sao chép JSON.');}catch{msg('Không thể sao chép. Hãy chọn và sao chép nội dung xem trước.');}};
    let last = location.pathname;setInterval(()=>{if(location.pathname!==last){last=location.pathname;const next=guild();if(running && next && next!==sessionGuild) finishScan('Đã dừng vì bạn chuyển server. Kết quả chỉ thuộc server ban đầu.');}},1000);
  }, {once:true});
  // The document contains only our static UI. No scripts, page data or user text
  // are interpolated into srcdoc; scan results are rendered with textContent.
  frame.srcdoc = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>
    <button id="open" type="button">Diggory · Khảo sát</button>
    <section id="panel" hidden aria-label="Khảo sát cấu trúc server">
      <div class="head"><div><h2>Khảo sát server Discord</h2><button id="dragHandle" class="drag-handle" type="button" title="Kéo để di chuyển, hoặc dùng phím mũi tên">↕ Kéo để di chuyển</button></div><button class="close" id="close" aria-label="Đóng">×</button></div>
      <p class="note">Đọc cache và giao diện Discord, có thể thiếu dữ liệu. Khi cuộn hoặc mở hồ sơ, chính Discord có thể tải thêm dữ liệu. Script không tự gọi API hoặc lấy token.</p>
      <label>Tên server nếu không tự nhận diện được<input id="serverName" type="text" maxlength="100" placeholder="Để trống để tự nhận diện"></label>
      <label>Loại cộng đồng<select id="category"><option>Game / Guild</option><option>Học tập / Sở thích</option><option>Creator / Fan</option><option>Cửa hàng / Dịch vụ</option><option>Dự án / Sản phẩm</option><option>Sự kiện / Workshop</option><option>Cộng đồng địa phương</option><option>Đa mục đích</option><option>Khác</option></select></label>
      <label>Loại khác hoặc kết hợp<input id="custom" type="text" maxlength="120" placeholder="Không bắt buộc"></label>
      <label>Mô hình hoạt động<select id="model"><option>Chưa xác định</option><option>Cộng đồng mở</option><option>Cộng đồng thành viên / VIP</option><option>Thương mại / Dịch vụ</option><option>Nhóm riêng / Nội bộ</option><option>Dự án / Tình nguyện</option><option>Sự kiện định kỳ</option><option>Kết hợp</option><option>Khác</option></select></label>
      <label>Ghi chú mô hình / phong cách<textarea id="notes" maxlength="2000"></textarea></label>
      <label>Số thành viên tối đa mỗi nhóm<input id="memberLimit" type="number" min="1" step="1" value="50" inputmode="numeric" aria-describedby="memberLimitHelp"></label><p id="memberLimitHelp" class="preview-sub">Áp dụng cùng một giới hạn cho từng nhóm. Nhóm nhỏ hơn sẽ lấy tối đa số đang hiển thị.</p>
      <label class="check"><input id="includeId" type="checkbox" checked> Xuất ID server, role, thành viên, bot và kênh (bỏ chọn để chia sẻ ẩn danh hơn)</label>
      <p class="note">Bắt đầu quét sẽ mở các danh mục, cuộn cột kênh rồi tự quét thành viên. Mỗi nhóm lấy tối đa số người bạn nhập và cố gắng bỏ qua phần còn lại. Mở danh sách thành viên trước khi bắt đầu. Không nhập tin nhắn trong lúc chạy.</p>
      <div class="buttons"><button id="scan" type="button">Bắt đầu quét</button><button id="finish" type="button" disabled>Kết thúc quét</button><button id="scanMembers" type="button" class="secondary" disabled>Quét lại thành viên</button><button id="stopMembers" type="button" class="secondary" disabled>Dừng quét thành viên</button><p id="memberStatus" role="status" aria-live="polite"></p><button id="showPreview" type="button" class="secondary" disabled>Mở xem trước</button><button id="save" type="button" disabled>Lưu JSON...</button><button id="copy" type="button" class="secondary" disabled>Sao chép JSON</button></div>
      <p id="status" role="status" aria-live="polite"></p>
    </section><section id="previewPanel" hidden aria-label="Xem trước kết quả"><div class="head"><div><h2 class="preview-title">Xem trước kết quả</h2><p class="preview-sub">Cấu trúc server đang hiển thị</p></div><button class="close" id="previewClose" aria-label="Đóng xem trước">×</button></div><div class="preview-tabs" role="tablist" aria-label="Thông tin đang quét"><button type="button" role="tab" id="tabChannels" data-view="liveChannels" aria-selected="true">Kênh</button><button type="button" role="tab" id="tabRoles" data-view="liveRoles" aria-selected="false">Role</button><button type="button" role="tab" id="tabBots" data-view="liveBots" aria-selected="false">Bot / App</button><button type="button" role="tab" id="tabMembers" data-view="liveMembers" aria-selected="false">Thành viên</button></div><div id="previewContent"></div></section></body></html>`;
  host.append(frame);
  document.documentElement.append(host);
})();
