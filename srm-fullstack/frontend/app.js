'use strict';

const form = document.getElementById('apiForm');
const edgeInput = document.getElementById('edgeInput');
const urlInput = document.getElementById('baseUrl');
const submitBtn = document.getElementById('submitBtn');
const resultsPanel = document.getElementById('resultsPanel');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const raw = edgeInput.value.trim();
  const baseUrl = urlInput.value.trim().replace(/\/$/, '');

  const data = raw
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(Boolean);

  setLoading(true);
  clearResults();

  try {
    const res = await fetch(`${baseUrl}/bfhl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });

    const json = await res.json();

    if (!res.ok) {
      showError(`Server returned ${res.status}: ${JSON.stringify(json)}`);
      return;
    }

    renderResults(json);
  } catch (err) {
    showError(`Network error: ${err.message}`);
  } finally {
    setLoading(false);
  }
});

function setLoading(on) {
  submitBtn.disabled = on;
  submitBtn.classList.toggle('loading', on);
}

function clearResults() {
  resultsPanel.innerHTML = '';
}

function showError(msg) {
  resultsPanel.innerHTML = `
    <div class="error-banner">
      <span>✖</span>
      <span>${escHtml(msg)}</span>
    </div>`;
}

function renderResults(data) {
  const frag = document.createDocumentFragment();

  // Summary
  frag.appendChild(renderSummary(data.summary));

  // Hierarchies
  if (data.hierarchies && data.hierarchies.length > 0) {
    const section = el('div');
    section.innerHTML = `<div class="section-title">Hierarchies (${data.hierarchies.length})</div>`;
    const grid = el('div', 'hierarchies-grid');
    data.hierarchies.forEach(h => grid.appendChild(renderHierarchyCard(h)));
    section.appendChild(grid);
    frag.appendChild(section);
  }

  // Invalid entries
  if (data.invalid_entries && data.invalid_entries.length > 0) {
    frag.appendChild(renderTagList('Invalid Entries', data.invalid_entries, 'invalid'));
  }

  // Duplicate edges
  if (data.duplicate_edges && data.duplicate_edges.length > 0) {
    frag.appendChild(renderTagList('Duplicate Edges', data.duplicate_edges, 'duplicate'));
  }

  // Raw JSON
  frag.appendChild(renderRawJson(data));

  resultsPanel.appendChild(frag);
}

function renderSummary(summary) {
  const card = el('div', 'summary-card');
  card.innerHTML = `
    <h3>Summary</h3>
    <div class="summary-grid">
      <div class="stat">
        <div class="stat-value">${summary.total_trees}</div>
        <div class="stat-label">Trees</div>
      </div>
      <div class="stat">
        <div class="stat-value">${summary.total_cycles}</div>
        <div class="stat-label">Cycles</div>
      </div>
      <div class="stat highlight">
        <div class="stat-value">${escHtml(summary.largest_tree_root || '—')}</div>
        <div class="stat-label">Largest Root</div>
      </div>
    </div>`;
  return card;
}

function renderHierarchyCard(h) {
  const card = el('div', `hierarchy-card${h.has_cycle ? ' cyclic' : ''}`);

  const header = el('div', 'card-header');
  header.innerHTML = `<span class="root-badge">${escHtml(h.root)}</span>`;

  if (h.has_cycle) {
    header.innerHTML += `<span class="cycle-badge">⚠ Cycle Detected</span>`;
  } else {
    header.innerHTML += `<span class="depth-badge">depth ${h.depth}</span>`;
  }

  card.appendChild(header);

  const treeDiv = el('div', 'tree-view');
  if (h.has_cycle || !h.tree || Object.keys(h.tree).length === 0) {
    treeDiv.classList.add('empty');
    treeDiv.textContent = h.has_cycle ? '(cycle — no tree representation)' : '(empty)';
  } else {
    treeDiv.textContent = renderAsciiTree(h.root, h.tree, '', true);
  }

  card.appendChild(treeDiv);
  return card;
}

function renderAsciiTree(node, treeObj, prefix, isLast) {
  const subtree = treeObj[node] || {};
  const children = Object.keys(subtree);

  let lines = prefix + (prefix ? (isLast ? '└── ' : '├── ') : '') + node + '\n';

  const childPrefix = prefix + (prefix ? (isLast ? '    ' : '│   ') : '');

  children.forEach((child, i) => {
    const last = i === children.length - 1;
    lines += renderAsciiTree(child, subtree, childPrefix, last);
  });

  return lines;
}

function renderTagList(title, items, type) {
  const card = el('div', 'list-card');
  const h3 = el('h3');
  h3.textContent = `${title} (${items.length})`;
  card.appendChild(h3);

  const list = el('div', 'tag-list');
  items.forEach(item => {
    const tag = el('span', `tag ${type}`);
    tag.textContent = item;
    list.appendChild(tag);
  });

  card.appendChild(list);
  return card;
}

function renderRawJson(data) {
  const section = el('div', 'raw-json-section');
  const header = el('div', 'collapsible-header');
  header.innerHTML = `<span>Raw JSON Response</span><span class="chevron">▾</span>`;

  const body = el('div', 'raw-json-body');
  const pre = el('pre', 'json-block');
  pre.textContent = JSON.stringify(data, null, 2);
  body.appendChild(pre);

  header.addEventListener('click', () => {
    header.classList.toggle('open');
    body.classList.toggle('open');
  });

  section.appendChild(header);
  section.appendChild(body);
  return section;
}

function el(tag, className) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
