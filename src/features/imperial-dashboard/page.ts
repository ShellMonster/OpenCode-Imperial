export function renderImperialDashboardPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Imperial Workflow Dashboard</title>
  <style>
    :root { --bg:#f6f2e9; --fg:#1f1a14; --card:#fffdf7; --line:#d9cdb8; --accent:#8a3b12; }
    body { margin:0; padding:24px; background:var(--bg); color:var(--fg); font-family: ui-serif, Georgia, serif; }
    h1 { margin:0 0 16px; font-size:28px; }
    .meta { margin-bottom:16px; color:#6a5d4a; font-size:14px; }
    .stats { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px; }
    .chip { border:1px solid var(--line); background:var(--card); padding:6px 10px; border-radius:999px; font-size:12px; }
    table { width:100%; border-collapse:collapse; background:var(--card); border:1px solid var(--line); }
    th,td { padding:10px; text-align:left; border-bottom:1px solid var(--line); font-size:13px; }
    th { background:#f1e9da; }
    a { color:var(--accent); text-decoration:none; }
  </style>
</head>
<body>
  <h1>Imperial Workflow Dashboard</h1>
  <div id="meta" class="meta">loading...</div>
  <div id="stats" class="stats"></div>
  <table>
    <thead><tr><th>Task</th><th>State</th><th>Org</th><th>Review</th><th>Updated</th></tr></thead>
    <tbody id="rows"></tbody>
  </table>
  <script>
    const statsEl = document.getElementById('stats')
    const rowsEl = document.getElementById('rows')
    const metaEl = document.getElementById('meta')

    function esc(v){return String(v ?? '').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]))}

    function render(data){
      metaEl.textContent = 'tasks=' + data.total + ' generated=' + data.generatedAt
      statsEl.innerHTML = Object.entries(data.byState).map(function(entry){
        return '<span class="chip">' + esc(entry[0]) + ': ' + esc(entry[1]) + '</span>'
      }).join('')
      rowsEl.innerHTML = data.tasks.map(function(t){
        return '<tr><td><a href="/imperial-dashboard/api/tasks/' + encodeURIComponent(t.sessionID) + '" target="_blank">' + esc(t.title) + '</a></td><td>' + esc(t.state) + '</td><td>' + esc(t.org) + '</td><td>' + esc(t.reviewRound) + '</td><td>' + esc(t.updatedAt) + '</td></tr>'
      }).join('')
    }

    const es = new EventSource('/imperial-dashboard/events')
    es.addEventListener('snapshot', (e) => {
      try { render(JSON.parse(e.data)) } catch {}
    })
    es.onerror = () => {
      metaEl.textContent = 'stream disconnected, waiting reconnect...'
    }
  </script>
</body>
</html>`
}
