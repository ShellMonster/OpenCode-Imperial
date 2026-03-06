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
    .stack { display:grid; gap:14px; margin-top:14px; }
    .grid2 { display:grid; grid-template-columns: repeat(2, 1fr); gap:14px; }
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
    .bar { height:10px; border-radius:999px; background:#ead9bd; overflow:hidden; }
    .bar > span { display:block; height:100%; background:linear-gradient(90deg, #a54e1d, #d6873a); }
    pre { white-space:pre-wrap; word-break:break-word; font-size:12px; margin:0; }
    @media (max-width: 1000px){ .layout{ grid-template-columns:1fr; } .grid4,.grid2{ grid-template-columns:repeat(1,1fr);} }
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

  <div class="stack">
    <section class="grid2">
      <div class="card">
        <h3 style="margin:0 0 8px;">Institution Overview</h3>
        <div id="institutions"></div>
      </div>
      <div class="card">
        <h3 style="margin:0 0 8px;">Workflow Funnel</h3>
        <div id="funnel"></div>
      </div>
    </section>
    <section class="grid2">
      <div class="card">
        <h3 style="margin:0 0 8px;">Bottlenecks</h3>
        <div id="bottlenecks"></div>
      </div>
      <div class="card">
        <h3 style="margin:0 0 8px;">Officials Load</h3>
        <div id="officials"></div>
      </div>
    </section>
    <section class="grid2">
      <div class="card">
        <h3 style="margin:0 0 8px;">Official Detail</h3>
        <div id="official-detail" class="muted">click an official to inspect</div>
      </div>
      <div class="card">
        <h3 style="margin:0 0 8px;">Session Monitor</h3>
        <div id="session-monitor" class="muted">click a task to inspect runtime health</div>
      </div>
    </section>
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
      institutions: document.getElementById('institutions'),
      funnel: document.getElementById('funnel'),
      bottlenecks: document.getElementById('bottlenecks'),
      officials: document.getElementById('officials'),
      officialDetail: document.getElementById('official-detail'),
      sessionMonitor: document.getElementById('session-monitor'),
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

    function renderInstitutions(data){
      const rows = (data.overview && data.overview.institutions) || []
      if (!rows.length) {
        dom.institutions.innerHTML = '<div class="muted">No institutional workload yet.</div>'
        return
      }
      dom.institutions.innerHTML = '<table><thead><tr><th>Institution</th><th>Total</th><th>Active</th><th>Stopped</th><th>Cancelled</th></tr></thead><tbody>' +
        rows.map(function(item){
          return '<tr><td><a class="a" href="#" data-official="' + esc(item.name) + '">' + esc(item.name) + '</a></td><td>' + esc(item.total) + '</td><td>' + esc(item.active) + '</td><td>' + esc(item.stopped) + '</td><td>' + esc(item.cancelled) + '</td></tr>'
        }).join('') +
        '</tbody></table>'
    }

    function renderFunnel(data){
      const items = data.funnel || []
      const max = items.reduce(function(cur, item){ return Math.max(cur, Number(item.count) || 0) }, 0) || 1
      dom.funnel.innerHTML = items.map(function(item){
        const width = Math.max(6, Math.round((Number(item.count || 0) / max) * 100))
        return '<div style="margin-bottom:10px;"><div class="row" style="justify-content:space-between;"><strong>' + esc(item.state) + '</strong><span class="muted">' + esc(item.count) + '</span></div><div class="bar"><span style="width:' + width + '%"></span></div></div>'
      }).join('')
    }

    function renderBottlenecks(data){
      const block = data.bottlenecks || {}
      const summary = '<div class="grid4">' + [
        ['Stalled', block.stalledTasks || 0],
        ['Stopped', block.stoppedTasks || 0],
        ['Review Pending', block.pendingReview || 0],
        ['Timed Out', block.timedOutTasks || 0]
      ].map(function(it){
        return '<div class="metric"><div class="k">' + esc(it[0]) + '</div><div class="v">' + esc(it[1]) + '</div></div>'
      }).join('') + '</div>'
      const items = Array.isArray(block.items) ? block.items : []
      const table = !items.length
        ? '<div class="muted" style="margin-top:10px;">No current bottlenecks.</div>'
        : '<table style="margin-top:10px;"><thead><tr><th>Task</th><th>Reason</th><th>Status</th></tr></thead><tbody>' +
          items.map(function(item){
            return '<tr><td><strong>' + esc(item.title) + '</strong><div class="muted">' + esc(item.sessionID) + ' · ' + esc(item.org) + '</div></td><td>' + esc(item.reason) + '</td><td>' + esc(item.state) + ' / ' + esc(item.control) + '</td></tr>'
          }).join('') +
          '</tbody></table>'
      dom.bottlenecks.innerHTML = summary + table
    }

    function renderOfficials(data){
      const rows = data.officials || []
      if (!rows.length) {
        dom.officials.innerHTML = '<div class="muted">No official workload yet.</div>'
        return
      }
      dom.officials.innerHTML = '<table><thead><tr><th>Role</th><th>Own</th><th>Assigned</th><th>Returned</th><th>Outstanding</th></tr></thead><tbody>' +
        rows.map(function(item){
          return '<tr><td><a class="a" href="#" data-official="' + esc(item.role) + '">' + esc(item.role) + '</a></td><td>' + esc(item.owningTasks) + '</td><td>' + esc(item.assignedTasks) + '</td><td>' + esc(item.returnedAssignments) + '</td><td>' + esc(item.outstandingAssignments) + '</td></tr>'
        }).join('') +
        '</tbody></table>'
    }

    function renderOfficialDetail(data){
      const summary = data.summary || {}
      const owned = Array.isArray(data.ownedTasks) ? data.ownedTasks : []
      const assignments = Array.isArray(data.assignments) ? data.assignments : []
      const activity = Array.isArray(data.recentActivity) ? data.recentActivity : []
      dom.officialDetail.innerHTML =
        '<div class="row">' +
          '<span class="chip">Role: ' + esc(data.role) + '</span>' +
          '<span class="chip">Owned: ' + esc(summary.owningTasks || 0) + '</span>' +
          '<span class="chip">Assigned: ' + esc(summary.assignedTasks || 0) + '</span>' +
          '<span class="chip">Outstanding: ' + esc(summary.outstandingAssignments || 0) + '</span>' +
        '</div>' +
        '<h4 style="margin:14px 0 6px;">Owned Tasks</h4>' +
        (owned.length ? '<table><thead><tr><th>Task</th><th>State</th><th>Control</th></tr></thead><tbody>' + owned.map(function(item){
          return '<tr><td><a class="a" href="#" data-open="' + esc(item.sessionID) + '">' + esc(item.title) + '</a><div class="muted">' + esc(item.sessionID) + '</div></td><td>' + esc(item.state) + '</td><td>' + esc(item.control) + '</td></tr>'
        }).join('') + '</tbody></table>' : '<div class="muted">No owned tasks.</div>') +
        '<h4 style="margin:14px 0 6px;">Assignments</h4>' +
        (assignments.length ? '<table><thead><tr><th>Task</th><th>Status</th><th>Note</th></tr></thead><tbody>' + assignments.map(function(item){
          return '<tr><td><a class="a" href="#" data-open="' + esc(item.sessionID) + '">' + esc(item.title) + '</a><div class="muted">' + esc(item.sessionID) + '</div></td><td>' + esc(item.status) + '</td><td>' + esc(item.returnNote || '-') + '</td></tr>'
        }).join('') + '</tbody></table>' : '<div class="muted">No assignment records.</div>') +
        '<h4 style="margin:14px 0 6px;">Recent Activity</h4>' +
        (activity.length ? '<table><thead><tr><th>At</th><th>Kind</th><th>Summary</th></tr></thead><tbody>' + activity.map(function(item){
          return '<tr><td>' + esc(item.at) + '</td><td>' + esc(item.kind) + '</td><td>' + esc(item.summary) + '</td></tr>'
        }).join('') + '</tbody></table>' : '<div class="muted">No recent activity.</div>')
    }

    function renderSessionMonitor(data){
      const health = data.health || {}
      const activity = Array.isArray(data.activity) ? data.activity : []
      const blockers = Array.isArray(health.blockers) ? health.blockers : []
      dom.sessionMonitor.innerHTML =
        '<div class="row">' +
          '<span class="chip">Health: ' + esc(health.status || 'unknown') + '</span>' +
          '<span class="chip">State: ' + esc(data.state) + '</span>' +
          '<span class="chip">Org: ' + esc(data.org) + '</span>' +
          '<span class="chip">Control: ' + esc(data.control && data.control.status) + '</span>' +
        '</div>' +
        '<div style="margin-top:10px;"><strong>' + esc(data.title) + '</strong><div class="muted">' + esc(data.sessionID) + '</div></div>' +
        '<table style="margin-top:10px;"><tbody>' +
          '<tr><td>Retry Count</td><td>' + esc(data.scheduler && data.scheduler.retryCount) + '</td></tr>' +
          '<tr><td>Escalation</td><td>' + esc(data.scheduler && data.scheduler.escalationLevel) + '</td></tr>' +
          '<tr><td>Last Dispatch</td><td>' + esc(data.scheduler && data.scheduler.lastDispatchStatus) + '</td></tr>' +
          '<tr><td>Stall Since</td><td>' + esc(data.scheduler && data.scheduler.stallSince || '-') + '</td></tr>' +
          '<tr><td>Outstanding Ministries</td><td>' + esc(((data.dispatch && data.dispatch.outstandingMinistries) || []).join(', ') || '-') + '</td></tr>' +
        '</tbody></table>' +
        '<h4 style="margin:14px 0 6px;">Blockers</h4>' +
        (blockers.length ? '<div class="row">' + blockers.map(function(item){ return '<span class="chip">' + esc(item) + '</span>' }).join('') + '</div>' : '<div class="muted">No blockers.</div>') +
        '<h4 style="margin:14px 0 6px;">Recent Activity</h4>' +
        (activity.length ? '<table><thead><tr><th>At</th><th>Kind</th><th>Payload</th></tr></thead><tbody>' + activity.slice(-8).reverse().map(function(item){
          return '<tr><td>' + esc(item.at) + '</td><td>' + esc(item.kind) + '</td><td><pre>' + esc(JSON.stringify(item.payload, null, 2)) + '</pre></td></tr>'
        }).join('') + '</tbody></table>' : '<div class="muted">No activity recorded.</div>')
    }

    function renderMemorial(data){
      const memorials = Array.isArray(data.memorials) ? data.memorials : []
      const metrics = [
        ['Tasks', data.totals && data.totals.tasks],
        ['Done', data.totals && data.totals.done],
        ['Avg Review', data.review && data.review.avgReviewRound],
        ['Returned', data.dispatch && data.dispatch.assignmentReturned]
      ]
      const metricHtml = '<div class="grid4">' + metrics.map(function(it){
        return '<div class="metric"><div class="k">' + esc(it[0]) + '</div><div class="v">' + esc(it[1] ?? 0) + '</div></div>'
      }).join('') + '</div>'

      const memorialHtml = memorials.length === 0
        ? '<div class="muted" style="margin-top:10px;">No completed memorials yet.</div>'
        : '<table style="margin-top:10px;"><thead><tr><th>Memorial</th><th>Completed</th><th>Summary</th></tr></thead><tbody>' +
          memorials.map(function(item){
            return '<tr>' +
              '<td><strong>' + esc(item.title) + '</strong><div class="muted">' + esc(item.sessionID) + '</div></td>' +
              '<td>' + esc(item.completedAt) + '<div class="muted">review ' + esc(item.reviewRound) + '</div></td>' +
              '<td>' + esc(item.summary) + '</td>' +
            '</tr>'
          }).join('') +
          '</tbody></table>'

      dom.memorial.innerHTML = metricHtml + memorialHtml
    }

    async function pullMemorial(){
      const res = await fetch('/imperial-dashboard/api/memorials/summary' + (token ? ('?token=' + encodeURIComponent(token)) : ''), {
        headers: token ? { 'x-imperial-token': token } : {}
      })
      if (!res.ok) return
      const data = await res.json()
      renderMemorial(data)
    }

    function renderTaskDetail(data){
      const task = data.task || {}
      const institutional = data.institutional || {}
      const review = institutional.review || {}
      const dispatch = institutional.dispatch || {}
      const receipts = Array.isArray(dispatch.receipts) ? dispatch.receipts : []
      const activity = Array.isArray(data.activity) ? data.activity : []

      const receiptHtml = receipts.length === 0
        ? '<div class="muted">No ministry receipts yet.</div>'
        : '<table><thead><tr><th>Ministry</th><th>Status</th><th>Returned By</th><th>Note</th></tr></thead><tbody>' +
          receipts.map(function(item){
            return '<tr>' +
              '<td>' + esc(item.ministryRole) + '</td>' +
              '<td>' + esc(item.status) + '</td>' +
              '<td>' + esc(item.returnedBy || '-') + '</td>' +
              '<td>' + esc(item.returnNote || '-') + '</td>' +
            '</tr>'
          }).join('') +
          '</tbody></table>'

      const activityHtml = activity.length === 0
        ? '<div class="muted">No activity recorded.</div>'
        : '<table><thead><tr><th>At</th><th>Kind</th><th>Payload</th></tr></thead><tbody>' +
          activity.map(function(item){
            return '<tr>' +
              '<td>' + esc(item.at) + '</td>' +
              '<td>' + esc(item.kind) + '</td>' +
              '<td><pre>' + esc(JSON.stringify(item.payload, null, 2)) + '</pre></td>' +
            '</tr>'
          }).join('') +
          '</tbody></table>'

      return '' +
        '<div class="row">' +
          '<span class="chip">State: ' + esc(task.state) + '</span>' +
          '<span class="chip">Org: ' + esc(task.org) + '</span>' +
          '<span class="chip">Review Round: ' + esc(task.reviewRound) + '</span>' +
        '</div>' +
        '<div style="margin-top:10px;"><strong>' + esc(task.title) + '</strong><div class="muted">' + esc(task.sessionID) + '</div></div>' +
        '<h4 style="margin:14px 0 6px;">门下省审议</h4>' +
        '<table><tbody>' +
          '<tr><td>Pending</td><td>' + esc(review.pending) + '</td></tr>' +
          '<tr><td>Requested By</td><td>' + esc(review.requestedBy || '-') + '</td></tr>' +
          '<tr><td>Approved By</td><td>' + esc(review.approvedBy || '-') + '</td></tr>' +
          '<tr><td>Note</td><td>' + esc(review.note || '-') + '</td></tr>' +
        '</tbody></table>' +
        '<h4 style="margin:14px 0 6px;">尚书省派发与回奏</h4>' +
        '<table><tbody>' +
          '<tr><td>Assigned Ministries</td><td>' + esc((dispatch.assignedMinistries || []).join(', ') || '-') + '</td></tr>' +
          '<tr><td>Returned Ministries</td><td>' + esc((dispatch.returnedMinistries || []).join(', ') || '-') + '</td></tr>' +
          '<tr><td>Outstanding Ministries</td><td>' + esc((dispatch.outstandingMinistries || []).join(', ') || '-') + '</td></tr>' +
          '<tr><td>Consolidated</td><td>' + esc(dispatch.consolidated) + '</td></tr>' +
          '<tr><td>Consolidated By</td><td>' + esc(dispatch.consolidatedBy || '-') + '</td></tr>' +
          '<tr><td>Consolidated Note</td><td>' + esc(dispatch.consolidatedNote || '-') + '</td></tr>' +
        '</tbody></table>' +
        '<h4 style="margin:14px 0 6px;">六部回执</h4>' +
        '<div class="scroll" style="max-height:180px;">' + receiptHtml + '</div>' +
        '<h4 style="margin:14px 0 6px;">流转活动</h4>' +
        '<div class="scroll" style="max-height:220px;">' + activityHtml + '</div>'
    }

    async function openDetail(sessionID){
      const url = '/imperial-dashboard/api/tasks/' + encodeURIComponent(sessionID) + (token ? ('?token=' + encodeURIComponent(token)) : '')
      const res = await fetch(url)
      if (!res.ok) return
      const data = await res.json()
      dom.detail.innerHTML = renderTaskDetail(data)
      openSessionMonitor(sessionID)
    }

    async function openOfficial(role){
      const url = '/imperial-dashboard/api/officials/' + encodeURIComponent(role) + (token ? ('?token=' + encodeURIComponent(token)) : '')
      const res = await fetch(url, { headers: token ? { 'x-imperial-token': token } : {} })
      if (!res.ok) return
      renderOfficialDetail(await res.json())
    }

    async function openSessionMonitor(sessionID){
      const url = '/imperial-dashboard/api/sessions/' + encodeURIComponent(sessionID) + '/monitor' + (token ? ('?token=' + encodeURIComponent(token)) : '')
      const res = await fetch(url, { headers: token ? { 'x-imperial-token': token } : {} })
      if (!res.ok) return
      renderSessionMonitor(await res.json())
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
      renderInstitutions(data)
      renderFunnel(data)
      renderBottlenecks(data)
      renderOfficials(data)
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
      dom.officials.addEventListener('click', function(e){
        const role = e.target && e.target.getAttribute && e.target.getAttribute('data-official')
        if (role) { e.preventDefault(); openOfficial(role); return }
      })
      dom.institutions.addEventListener('click', function(e){
        const role = e.target && e.target.getAttribute && e.target.getAttribute('data-official')
        if (role) { e.preventDefault(); openOfficial(role); return }
      })
      dom.officialDetail.addEventListener('click', function(e){
        const open = e.target && e.target.getAttribute && e.target.getAttribute('data-open')
        if (open) { e.preventDefault(); openDetail(open); return }
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
