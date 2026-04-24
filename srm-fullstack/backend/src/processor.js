'use strict';

// TODO: Replace with your actual details
const USER_ID = 'akulasidharthnaidu_24052006';
const EMAIL_ID = 'sa0858@srmist.edu.in';
const COLLEGE_ROLL_NUMBER = 'RA2311003010088';

const EDGE_REGEX = /^([A-Z])->([A-Z])$/;

function processData(data) {
  const invalidEntries = [];
  const duplicateEdgesSet = new Set();
  const seenPairs = new Set();
  const childrenMap = {};   // parent -> [child, ...]
  const parentMap = {};     // child -> first assigned parent
  const isChild = new Set();
  const allNodes = new Set();

  for (const entry of data) {
    const trimmed = typeof entry === 'string' ? entry.trim() : String(entry).trim();
    const match = trimmed.match(EDGE_REGEX);

    if (!match) {
      invalidEntries.push(trimmed.length > 0 ? trimmed : entry);
      continue;
    }

    const [, src, dst] = match;

    if (src === dst) {
      invalidEntries.push(trimmed);
      continue;
    }

    const key = `${src}->${dst}`;

    if (seenPairs.has(key)) {
      duplicateEdgesSet.add(key);
      continue;
    }

    seenPairs.add(key);
    allNodes.add(src);
    allNodes.add(dst);
    isChild.add(dst);

    if (parentMap[dst] === undefined) {
      parentMap[dst] = src;
      if (!childrenMap[src]) childrenMap[src] = [];
      childrenMap[src].push(dst);
    }
    // Multi-parent: silently discard — not invalid, not duplicate
  }

  // Find roots: nodes that never appear as a child
  const roots = new Set([...allNodes].filter(n => !isChild.has(n)));

  // Build connected components via undirected BFS
  // Build undirected adjacency for component discovery
  const undirected = {};
  for (const [parent, children] of Object.entries(childrenMap)) {
    if (!undirected[parent]) undirected[parent] = new Set();
    for (const child of children) {
      undirected[parent].add(child);
      if (!undirected[child]) undirected[child] = new Set();
      undirected[child].add(parent);
    }
  }

  const visited = new Set();
  const components = [];

  // Use insertion order of allNodes so hierarchies appear in input-encounter order
  const traversalOrder = [...allNodes];

  for (const start of traversalOrder) {
    if (visited.has(start)) continue;
    const component = new Set();
    const queue = [start];
    while (queue.length) {
      const node = queue.shift();
      if (visited.has(node)) continue;
      visited.add(node);
      component.add(node);
      for (const neighbour of (undirected[node] || [])) {
        if (!visited.has(neighbour)) queue.push(neighbour);
      }
    }
    components.push(component);
  }

  // Build hierarchies
  const hierarchies = [];

  for (const component of components) {
    const componentRoots = [...component].filter(n => roots.has(n));
    const cyclic = hasCycle(component, childrenMap);

    if (cyclic) {
      const root = [...component].sort()[0];
      hierarchies.push({ root, tree: {}, has_cycle: true });
    } else {
      // Non-cyclic: use the root from this component (there should be exactly one)
      const root = componentRoots.length > 0
        ? componentRoots.sort()[0]
        : [...component].sort()[0];
      const tree = buildTree(root, childrenMap);
      const depth = computeDepth(root, childrenMap);
      hierarchies.push({ root, tree, depth });
    }
  }

  // Summary
  const treesOnly = hierarchies.filter(h => !h.has_cycle);
  const total_trees = treesOnly.length;
  const total_cycles = hierarchies.length - total_trees;

  let largest_tree_root = '';
  if (treesOnly.length > 0) {
    treesOnly.sort((a, b) => {
      if (b.depth !== a.depth) return b.depth - a.depth;
      return a.root < b.root ? -1 : 1;
    });
    largest_tree_root = treesOnly[0].root;
  }

  return {
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: COLLEGE_ROLL_NUMBER,
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: [...duplicateEdgesSet],
    summary: {
      total_trees,
      total_cycles,
      largest_tree_root,
    },
  };
}

function buildTree(node, childrenMap) {
  const subtree = {};
  const children = childrenMap[node] || [];
  for (const child of children) {
    subtree[child] = buildTree(child, childrenMap)[child] || {};
  }
  return { [node]: subtree };
}

function computeDepth(node, childrenMap) {
  const children = childrenMap[node] || [];
  if (children.length === 0) return 1;
  return 1 + Math.max(...children.map(c => computeDepth(c, childrenMap)));
}

function hasCycle(componentNodes, childrenMap) {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = {};
  for (const n of componentNodes) color[n] = WHITE;

  function dfs(node) {
    color[node] = GRAY;
    for (const child of (childrenMap[node] || [])) {
      if (!componentNodes.has(child)) continue;
      if (color[child] === GRAY) return true;
      if (color[child] === WHITE && dfs(child)) return true;
    }
    color[node] = BLACK;
    return false;
  }

  for (const node of componentNodes) {
    if (color[node] === WHITE && dfs(node)) return true;
  }
  return false;
}

module.exports = { processData };
