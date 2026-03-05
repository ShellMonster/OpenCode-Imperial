export function renderImperialDashboardPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Imperial Workflow Dashboard</title>
  <style>
    :root { --bg:#efe7d6; --fg:#1d1a14; --card:#fff9ec; --line:#d5c4a6; --accent:#8a3b12; --muted:#6a5d4a; }
    * { box-sizing: border-box; }
    body { margin:0; padding:18px; background: radial-gradient(circle at top right, #f8f1e5, #e9ddc5); color:var(--fg); font-family: ui-serif, Georgia, serif; }
    h1 { margin:0; font-size:28px; }
    .sub { color:var(--muted); font-size:13px; margin:4px 0 16px; }
    .layout { display:grid; grid-template-columns: 1.8fr 1.2fr; gap:14px; }
    .card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:12px; }
    .row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
    .chip { border:1px solid var(--line); border-radius:999px; padding:5px 9px; font-size:12px; background:#f8edd9; }
    .grid4 { display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; }
    .metric { border:1px solid var(--line); border-radius:10px; padding:8px; background:#fffdf7; }
    .metric .k { font-size:11px; color:var(--muted); }
    .metric .v { font-size:20px; font-weight:700; }
    input,select,button { border:1px solid var(--line); border-radius:8px; padding:6px 8px; background:#fffdf7; }
    button { cursor:pointer; }
    table { width:100%; border-collapse:collapse; margin-top:8px; }
    th,td { padding:8px; border-bottom:1px solid var(--line); font-size:12px; text-align:left; }
    th { background:#f4e8d1; position:sticky; top:0; }
    .scroll { max-height:420px; overflow:auto; }
    .muted { color:var(--muted); font-size:12px; }
    .a { color:var(--accent); text-decoration:none; }
    .actions { display:flex; gap:4px; flex-wrap:wrap; }
    pre { white-space:pre-wrap; word-break:break-word; font-size:12px; margin:0; }
    @media (max-width: 1000px){ .layout{ grid-template-columns:1fr; } .grid4{ grid-template-columns:repeat(2,1fr);} }
  </style>
</head>
<body>
  <h1>Imperial Workflow Dashboard</h1>
  <div id="meta" class="sub">loading...</div>

  <div class="layout">
    <section class="card">
      <div class="grid4" id="metrics"></div>
      <div class="row" style="margin-top:10px;">
        <input id="q" placeholder="search title/session/org" />
        <select id="state"><option value="">all state</option><option>Pending</option><option>Zhongshu</option><option>Menxia</option><option>Assigned</option><option>Doing</option><option>Review</option><option>Done</option></select>
        <select id="control"><option value="">all control</option><option>active</option><option>stopped</option><option>cancelled</option></select>
        <select id="sort"><option value="updatedAt">updatedAt</option><option value="createdAt">createdAt</option><option value="title">title</option><option value="state">state</option></select>
        <select id="order"><option value="desc">desc</option><option value="asc">asc</option></select>
        <button id="apply">apply</button>
      </div>
      <div class="scroll">
        <table>
          <thead><tr><th>Task</th><th>State</th><th>Control</th><th>Org</th><th>Review</th><th>Actions</th></tr></thead>
          <tbody id="rows"></tbody>
        </table>
      </div>
    </section>

    <aside class="card">
      <h3 style="margin:0 0 8px;">Task Detail</h3>
      <div id="detail" class="muted">click a task to inspect</div>
      <h3 style="margin:14px 0 8px;">Memorial Summary</h3>
      <div id="memorial" class="scroll"></div>
      <h3 style="margin:14px 0 8px;">Recent Audit</h3>
      <div id="audit" class="scroll"></div>
    </aside>
  </div>

  <script>
    const qs = new URLSearchParams(location.search)
    const token = qs.get('token') || ''
    let snapshot = null

    const dom = {
      meta: document.getElementById('meta'),
      rows: document.getElementById('rows'),
      metrics: document.getElementById('metrics'),
      detail: document.getElementById('detail'),
      memorial: document.getElementById('memorial'),
      audit: document.getElementById('audit'),
      q: document.getElementById('q'),
      state: document.getElementById('state'),
      control: document.getElementById('control'),
      sort: document.getElementById('sort'),
      order: document.getElementById('order'),
      apply: document.getElementById('apply')
    }

    function esc(v){ return String(v ?? '').replace(/[&<>"']/g, function(m){ return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[m] }) }

    function queryString(){
      const q = new URLSearchParams()
      if (dom.q.value) q.set('q', dom.q.value)
      if (dom.state.value) q.set('state', dom.state.value)
      if (dom.control.value) q.set('control', dom.control.value)
      if (dom.sort.value) q.set('sort', dom.sort.value)
      if (dom.order.value) q.set('order', dom.order.value)
      if (token) q.set('token', token)
      return q.toString()
    }

    function renderMetrics(data){
      const active = data.byControl.active || 0
      const stopped = data.byControl.stopped || 0
      const cancelled = data.byControl.cancelled || 0
      dom.metrics.innerHTML = [
        ['Visible Tasks', data.total],
        ['All Tasks', data.totalAll],
        ['Active/Stopped', active + '/' + stopped],
        ['Cancelled', cancelled]
      ].map(function(it){ return '<div class="metric"><div class="k">'+esc(it[0])+'</div><div class="v">'+esc(it[1])+'</div></div>' }).join('')
    }

    function actionButton(sessionID, action, label){
      return '<button data-action="'+action+'" data-session="'+esc(sessionID)+'">'+label+'</button>'
    }

    function renderRows(data){
      dom.rows.innerHTML = data.tasks.map(function(t){
        const control = t.control && t.control.status ? t.control.status : 'active'
        return '<tr>' +
          '<td><a class="a" href="#" data-open="'+esc(t.sessionID)+'">'+esc(t.title)+'</a><div class="muted">'+esc(t.sessionID)+'</div></td>' +
          '<td>'+esc(t.state)+'</td>' +
          '<td>'+esc(control)+'</td>' +
          '<td>'+esc(t.org)+'</td>' +
          '<td>'+esc(t.reviewRound)+'</td>' +
          '<td class="actions">'+
            actionButton(t.sessionID, 'stop', 'stop')+
            actionButton(t.sessionID, 'resume', 'resume')+
            actionButton(t.sessionID, 'cancel', 'cancel')+
          '</td>' +
        '</tr>'
      }).join('')
    }

    function renderAudit(data){
      dom.audit.innerHTML = '<pre>' + esc(JSON.stringify(data.recentAudit.slice(0, 16), null, 2)) + '</pre>'
    }

    async function pullMemorial(){
      const res = await fetch('/imperial-dashboard/api/memorials/summary' + (token ? ('?token=' + encodeURIComponent(token)) : ''), {
        headers: token ? { 'x-imperial-token': token } : {}
      })
      if (!res.ok) return
      const data = await res.json()
      dom.memorial.innerHTML = '<pre>' + esc(JSON.stringify(data, null, 2)) + '</pre>'
    }

    async function openDetail(sessionID){
      const url = '/imperial-dashboard/api/tasks/' + encodeURIComponent(sessionID) + (token ? ('?token=' + encodeURIComponent(token)) : '')
      const res = await fetch(url)
      if (!res.ok) return
      const data = await res.json()
      dom.detail.innerHTML = '<pre>' + esc(JSON.stringify(data, null, 2)) + '</pre>'
    }

    async function act(sessionID, action){
      const reason = prompt('reason (optional)') || ''
      const url = '/imperial-dashboard/api/tasks/' + encodeURIComponent(sessionID) + '/actions' + (token ? ('?token=' + encodeURIComponent(token)) : '')
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(token ? { 'x-imperial-token': token } : {}) },
        body: JSON.stringify({ action, reason })
      })
      const body = await res.json().catch(function(){ return {} })
      if (!res.ok) alert(body.error || body.message || 'action failed')
      await pullOnce()
      if (sessionID) await openDetail(sessionID)
    }

    function render(data){
      snapshot = data
      dom.meta.textContent = 'generated=' + data.generatedAt + ' visible=' + data.total + ' all=' + data.totalAll
      renderMetrics(data)
      renderRows(data)
      renderAudit(data)
    }

    async function pullOnce(){
      const res = await fetch('/imperial-dashboard/api/snapshot?' + queryString(), { headers: token ? { 'x-imperial-token': token } : {} })
      if (!res.ok) return
      render(await res.json())
      pullMemorial()
    }

    function bind(){
      dom.apply.addEventListener('click', function(){ pullOnce() })
      dom.rows.addEventListener('click', function(e){
        const open = e.target && e.target.getAttribute && e.target.getAttribute('data-open')
        const action = e.target && e.target.getAttribute && e.target.getAttribute('data-action')
        const session = e.target && e.target.getAttribute && e.target.getAttribute('data-session')
        if (open) { e.preventDefault(); openDetail(open); return }
        if (action && session) { e.preventDefault(); act(session, action); return }
      })
    }

    function stream(){
      const es = new EventSource('/imperial-dashboard/events?' + queryString())
      es.addEventListener('snapshot', function(e){ try { render(JSON.parse(e.data)) } catch {} })
      es.onerror = function(){ dom.meta.textContent = 'stream reconnecting...' }
    }

    bind()
    pullOnce()
    stream()
  </script>
</body>
</html>`
}
