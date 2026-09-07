(() => {
  const NEW_STAGES = ['ЛІД','Опрацьований','Договір','1 ОПЛАТА','2 ОПЛАТА','Надіслано роботу','Правки','Фінальна оплата'];
  STAGES.splice(0, STAGES.length, ...NEW_STAGES);

  const ORDER_NO = '0709202681';
  const CURRENT_ORDER = {
    id:'ord-0709202681', orderNo:ORDER_NO, client:'OBJEDNÁVKA 0709202681', phone:'', email:'',
    workType:'Дипломна робота — теоретична частина', topic:'Syndrom vyhoření pracovníků v sociálních službách',
    pages:20, orderDate:'2026-09-07', deadline:'2026-09-30', status:'Очікує оплату', stage:3, editorId:'',
    clientPrice:8999.99, editorBudget:0, priority:'Звичайний', payments:[], editorPayouts:[], expenses:[],
    notes:[
      {date:'2026-09-07T19:30:00Z',type:'Замовлення',text:'OBJEDNÁVKA 0709202681. Теоретична частина дипломної роботи, 20 сторінок. Термін 30.09.2026.'},
      {date:'2026-09-07T19:30:00Z',type:'Оплата',text:'Ціна 8 999,99 Kč. 1 оплата: 4 499,99 Kč перед початком. 2 оплата: 4 499,99 Kč після передачі роботи.'},
      {date:'2026-09-07T19:30:00Z',type:'Терміни',text:'Базовий план — до 5 днів від авансу. Повна теоретична частина — до 20 днів від авансу.'}
    ]
  };

  let ordersMode = localStorage.getItem('dd_orders_mode') || 'list';
  const originalOrdersView = ordersView;
  const originalDetailView = detailView;
  const originalBind = bind;

  function noteOrderNo(o){ return o.orderNo ? `OBJ. ${esc(o.orderNo)}` : ''; }
  function stageStatus(stageIndex){
    if(stageIndex===3 || stageIndex===4 || stageIndex===7) return 'Очікує оплату';
    if(stageIndex===5) return 'На перевірці у клієнта';
    if(stageIndex===6) return 'Правки';
    return null;
  }
  function moveToStage(id, stageIndex){
    const o=state.orders.find(x=>x.id===id); if(!o) return;
    const prev=STAGES[o.stage]||'—'; o.stage=stageIndex;
    const s=stageStatus(stageIndex); if(s) o.status=s;
    o.notes=o.notes||[];
    o.notes.push({date:new Date().toISOString(),type:'Етап',text:`${prev} → ${STAGES[stageIndex]}`});
    save(); toast(`Етап: ${STAGES[stageIndex]}`); render();
  }

  function ensureCurrentOrder(){
    if(!state.orders.some(o=>o.orderNo===ORDER_NO || o.id===CURRENT_ORDER.id)){
      state.orders.unshift(structuredClone(CURRENT_ORDER));
      save();
    }
  }

  function kanbanCard(o){
    const c=calc(o);
    return `<article class="kbCard" draggable="true" data-kb-id="${esc(o.id)}">
      <div class="kbTop"><strong>${esc(o.client)}</strong><span>${noteOrderNo(o)}</span></div>
      <div class="kbTopic">${esc(o.topic)}</div>
      <div class="kbMeta"><span>📅 ${date(o.deadline)}</span><span>✎ ${esc(editor(o.editorId))}</span></div>
      <div class="kbMoney"><span>${money(c.paid)} / ${money(o.clientPrice)}</span><b>${c.debt>0?'Борг '+money(c.debt):'Оплачено'}</b></div>
      <select class="kbStageSelect" data-kb-select="${esc(o.id)}">${STAGES.map((s,i)=>`<option value="${i}" ${i===o.stage?'selected':''}>${esc(s)}</option>`).join('')}</select>
      <button class="kbOpen" data-open="${esc(o.id)}">Відкрити картку</button>
    </article>`;
  }

  function kanbanView(){
    const controls=`<button class="btn secondary small modeBtn" data-mode="list">☷ Список</button><button class="btn primary small modeBtn" data-mode="kanban">▦ Канбан</button><button class="btn primary" id="newOrder">＋ Нове замовлення</button>`;
    return `<div class="wrap">${header('Замовлення','Канбан за етапами роботи',controls)}
      <div class="kbBoard">${STAGES.map((s,i)=>{const items=state.orders.filter(o=>Number(o.stage||0)===i && o.status!=='Скасовано');return `<section class="kbCol" data-kb-col="${i}"><div class="kbHead"><strong>${esc(s)}</strong><span>${items.length}</span></div><div class="kbDrop" data-kb-drop="${i}">${items.map(kanbanCard).join('')||'<div class="kbEmpty">Перетягни сюди</div>'}</div></section>`}).join('')}</div>
    </div>`;
  }

  ordersView = function(){
    if(ordersMode==='kanban') return kanbanView();
    let html=originalOrdersView();
    const old=`<button class="btn primary" id="newOrder">＋ Нове замовлення</button>`;
    const controls=`<button class="btn primary small modeBtn" data-mode="list">☷ Список</button><button class="btn secondary small modeBtn" data-mode="kanban">▦ Канбан</button>${old}`;
    return html.replace(old,controls);
  };

  detailView = function(id){
    let html=originalDetailView(id);
    const o=state.orders.find(x=>x.id===id); if(!o) return html;
    const old=`<button class="btn secondary" id="backOrders">← Замовлення</button>`;
    const closeDisabled=o.status==='Завершено'?'disabled':'';
    const controls=`${o.orderNo?`<span class="orderNoTag">OBJ. ${esc(o.orderNo)}</span>`:''}<button class="btn primary" id="closeOrder" ${closeDisabled}>✓ Успішно закрити</button><button class="btn danger" id="deleteOrder">Видалити</button>${old}`;
    return html.replace(old,controls);
  };

  bind = function(){
    originalBind();
    document.querySelectorAll('.modeBtn').forEach(b=>b.onclick=()=>{ordersMode=b.dataset.mode;localStorage.setItem('dd_orders_mode',ordersMode);render()});

    if(current==='orders' && ordersMode==='kanban'){
      document.querySelectorAll('.kbCard').forEach(card=>{
        card.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',card.dataset.kbId);card.classList.add('dragging')});
        card.addEventListener('dragend',()=>card.classList.remove('dragging'));
      });
      document.querySelectorAll('[data-kb-drop]').forEach(drop=>{
        drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('over')});
        drop.addEventListener('dragleave',()=>drop.classList.remove('over'));
        drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('over');const id=e.dataTransfer.getData('text/plain');moveToStage(id,Number(drop.dataset.kbDrop))});
      });
      document.querySelectorAll('[data-kb-select]').forEach(sel=>sel.onchange=e=>moveToStage(sel.dataset.kbSelect,Number(e.target.value)));
      document.querySelectorAll('.kbOpen').forEach(btn=>btn.onclick=e=>{e.stopPropagation();go('detail',btn.dataset.open)});
    }

    if(current==='detail'){
      const o=state.orders.find(x=>x.id===selectedId);
      const closeBtn=document.getElementById('closeOrder');
      if(closeBtn&&!closeBtn.disabled) closeBtn.onclick=()=>{
        if(!confirm('Закрити замовлення як успішно завершене?')) return;
        o.status='Завершено'; o.stage=STAGES.length-1; o.closedAt=new Date().toISOString(); o.notes=o.notes||[];
        o.notes.push({date:o.closedAt,type:'Система',text:'Замовлення успішно закрито.'}); save(); toast('Замовлення успішно закрито'); render();
      };
      const del=document.getElementById('deleteOrder');
      if(del) del.onclick=()=>{
        if(!confirm('Видалити це замовлення? Для скасованих робіт краще використовувати статус «Скасовано».')) return;
        if(!confirm('Підтверди ще раз: видалити замовлення НАЗАВЖДИ разом з оплатами, витратами та примітками?')) return;
        state.orders=state.orders.filter(x=>x.id!==o.id); save(); toast('Замовлення видалено'); go('orders');
      };
    }
  };

  const style=document.createElement('style');
  style.textContent=`
    .orderNoTag{display:inline-flex;align-items:center;padding:0 10px;min-height:40px;border-radius:10px;background:#e9f4ee;color:#155b3a;font-size:11px;font-weight:900}
    .kbBoard{display:flex;gap:12px;overflow-x:auto;padding:2px 2px 18px;align-items:flex-start;scroll-snap-type:x proximity}
    .kbCol{min-width:290px;width:290px;background:#eef3f0;border:1px solid #dfe8e2;border-radius:16px;scroll-snap-align:start}
    .kbHead{display:flex;justify-content:space-between;align-items:center;padding:14px 14px 10px;font-size:12px;text-transform:uppercase;letter-spacing:.3px}
    .kbHead span{background:#fff;border:1px solid #dfe8e2;min-width:28px;height:28px;border-radius:999px;display:grid;place-items:center}
    .kbDrop{min-height:170px;padding:0 10px 10px;border-radius:0 0 16px 16px}.kbDrop.over{background:#dff0e6}
    .kbCard{background:#fff;border:1px solid #dfe8e2;border-radius:12px;padding:12px;margin-top:9px;box-shadow:0 7px 18px rgba(20,55,36,.06);cursor:grab}.kbCard.dragging{opacity:.5}
    .kbTop{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.kbTop strong{font-size:13px}.kbTop span{font-size:9px;color:#155b3a;font-weight:900;white-space:nowrap}
    .kbTopic{font-size:11px;color:#718077;line-height:1.4;margin:7px 0 10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .kbMeta,.kbMoney{display:flex;justify-content:space-between;gap:8px;font-size:10px;margin-top:7px}.kbMeta{color:#718077}.kbMoney b{color:#155b3a}
    .kbStageSelect{width:100%;margin-top:10px;border:1px solid #dfe8e2;border-radius:9px;padding:8px;background:#f8faf9;font-size:11px}.kbOpen{width:100%;margin-top:7px;border:0;background:#173f30;color:#fff;border-radius:9px;padding:8px;font-weight:800;font-size:11px;cursor:pointer}
    .kbEmpty{padding:28px 8px;text-align:center;color:#99a89f;font-size:11px;border:1px dashed #ccd9d1;border-radius:10px;margin-top:9px}
    @media(max-width:760px){.kbCol{min-width:82vw;width:82vw}.kbCard{cursor:pointer}.modeBtn{min-height:38px}}
  `;
  document.head.appendChild(style);

  ensureCurrentOrder();
  render();
})();