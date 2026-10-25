/* ============================================================
   KaisX AI — Client-side AI Agent Company
   7 files, deploy GitHub Pages, không backend.
   Providers: Pollinations (default), Puter, BYOK
   Features: 6 agents, ReAct tool-use, streaming, PWA
   ============================================================ */

/* ============================================================
   1. CẤU HÌNH AGENT
   ============================================================ */
const AGENTS = {
  ceo: {
    id: 'ceo',
    name: 'Alex Morgan',
    role: 'Giám đốc điều hành',
    emoji: '👔',
    color: '#ff9f0a',
    reportsTo: null,
    system: 'You are the CEO of KaisX AI. Think strategically, delegate to departments, and summarize results for the user. Be concise, decisive, and professional. Use markdown.'
  },
  cto: {
    id: 'cto',
    name: 'Dr. Lin Wei',
    role: 'Giám đốc công nghệ',
    emoji: '🧠',
    color: '#3b82f6',
    reportsTo: 'ceo',
    system: 'You are the CTO. Translate business goals into technical architecture, specs, and engineering plans. Be precise and structured. Use markdown.'
  },
  dev: {
    id: 'dev',
    name: 'Kai Nakamura',
    role: 'Trưởng nhóm Dev',
    emoji: '💻',
    color: '#30d158',
    reportsTo: 'cto',
    system: 'You are the Lead Developer. Produce implementation details, code structure, and concrete steps. Include code snippets when useful. Use markdown.'
  },
  qa: {
    id: 'qa',
    name: 'Mira Patel',
    role: 'Kỹ sư QA',
    emoji: '🔍',
    color: '#8b5cf6',
    reportsTo: 'cto',
    system: 'You are the QA Engineer. Review work critically. List bugs, risks, and approval status. If issues exist, send back with fixes. Use markdown.'
  },
  cmo: {
    id: 'cmo',
    name: 'Sofia Rossi',
    role: 'Giám đốc Marketing',
    emoji: '📣',
    color: '#ec4899',
    reportsTo: 'ceo',
    system: 'You are the CMO. Create marketing strategy, launch plans, content ideas, and growth tactics. Be creative and data-driven. Use markdown.'
  },
  research: {
    id: 'research',
    name: 'Noah Kim',
    role: 'Chuyên viên nghiên cứu',
    emoji: '🔬',
    color: '#06b6d4',
    reportsTo: 'ceo',
    system: 'You are a Research Analyst. Gather insights, analyze trends, and produce structured research reports with recommendations. Use markdown.'
  }
};

/* ============================================================
   2. KỸ NĂNG & GITHUB SKILLS
   ============================================================ */
const SKILLS = [
  { id: 'web',       name: 'Web Search',       icon: '🔍', enabled: true },
  { id: 'code',      name: 'Code Sandbox',     icon: '💻', enabled: true },
  { id: 'data',      name: 'Data Analysis',    icon: '📊', enabled: true },
  { id: 'image',     name: 'Image Generation', icon: '🎨', enabled: true },
  { id: 'doc',       name: 'Document Writer',  icon: '📝', enabled: true },
  { id: 'research',  name: 'Deep Research',    icon: '🔬', enabled: true },
  { id: 'memory',    name: 'Long-term Memory', icon: '🧠', enabled: true },
  { id: 'translate', name: 'Translate',        icon: '🌐', enabled: true }
];

const GITHUB_SKILLS = [
  { name: 'Pollinations.AI', desc: 'API text & ảnh miễn phí', url: 'https://github.com/pollinations/pollinations' },
  { name: 'Agentic Awesome Skills', desc: 'Bộ kỹ năng multi-agent', url: 'https://github.com/sickn33/agentic-awesome-skills' },
  { name: 'Harness²', desc: 'Framework kỹ năng thích ứng', url: 'https://github.com/google-research/harness2' },
  { name: 'gpt4free', desc: 'Client JS đa provider', url: 'https://github.com/gpt4free/g4f.dev' }
];

/* ============================================================
   3. TOOLS (ReAct)
   ============================================================ */
function getArg(args, key, fb = '') {
  if (typeof args === 'string') return args || fb;
  if (!args) return fb;
  return args[key] ?? args.q ?? args.query ?? args.prompt ?? args.expression ?? args.text ?? fb;
}

const TOOLS = {
  web_search: {
    desc: 'Tìm kiếm web. Args: {"query": "..."}',
    fn: async (args) => {
      const q = getArg(args, 'query');
      if (!q) return 'Không có query';
      try {
        const r = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`);
        const d = await r.json();
        return d.AbstractText || d.Answer || d.RelatedTopics?.[0]?.Text || `(Không có kết quả tức thì cho "${q}")`;
      } catch (e) {
        return `Search lỗi: ${e.message}`;
      }
    }
  },
  translate: {
    desc: 'Dịch văn bản. Args: {"text": "...", "to": "vi"}',
    fn: async (args) => {
      const text = getArg(args, 'text');
      const to = (typeof args === 'object' && (args.to || args.lang)) || 'vi';
      if (!text) return 'Không có text';
      try {
        const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${to}`);
        const d = await r.json();
        return d.responseData?.translatedText || text;
      } catch (e) {
        return `Translate lỗi: ${e.message}`;
      }
    }
  },
  calculate: {
    desc: 'Tính toán. Args: {"expression": "2+2*3"}',
    fn: async (args) => {
      const expr = getArg(args, 'expression');
      const safe = String(expr).replace(/[^0-9+\-*/().\s%]/g, '');
      if (!safe) return 'Biểu thức không hợp lệ';
      try {
        return String(Function(`return (${safe})`)());
      } catch {
        return 'Biểu thức không hợp lệ';
      }
    }
  },
  get_time: {
    desc: 'Thời gian hiện tại. Không cần args.',
    fn: async () => new Date().toISOString()
  },
  generate_image: {
    desc: 'Tạo ảnh. Args: {"prompt": "..."}',
    fn: async (args) => {
      const prompt = getArg(args, 'prompt');
      if (!prompt) return 'Không có prompt';
      return { url: imageUrl(prompt), note: 'Ảnh đã được tạo và hiển thị.' };
    }
  }
};

/* ============================================================
   4. STATE
   ============================================================ */
const state = {
  provider: localStorage.getItem('kaisx_provider') || 'pollinations',
  model: localStorage.getItem('kaisx_model') || 'openai',
  baseUrl: localStorage.getItem('kaisx_baseUrl') || '',
  apiKey: localStorage.getItem('kaisx_apiKey') || '',
  useTools: localStorage.getItem('kaisx_useTools') === 'true',
  skills: JSON.parse(localStorage.getItem('kaisx_skills') || 'null') || SKILLS.map(s => ({ ...s })),
  history: [],
  busy: false,
  tasks: 0,
  startTime: Date.now(),
  agentStatus: {}
};

/* ============================================================
   5. HELPERS
   ============================================================ */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function md(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, l, c) => `<pre><code>${esc(c)}</code></pre>`)
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '• $1')
    .replace(/\n/g, '<br>');
}

function imageUrl(prompt) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=640&height=400&nologo=true&seed=${Date.now() % 99999}`;
}

/* ============================================================
   6. PROVIDERS (API call)
   ============================================================ */
async function callAI(messages, onToken) {
  if (state.provider === 'pollinations') return pollinationsCall(messages, onToken);
  if (state.provider === 'puter') return puterCall(messages, onToken);
  if (state.provider === 'custom') return customCall(messages, onToken);
  throw new Error('Provider không hợp lệ');
}

async function pollinationsCall(messages, onToken) {
  const body = {
    model: state.model || 'openai',
    messages,
    stream: !!onToken,
    referrer: 'kaisx-ai'
  };
  let res;
  try {
    res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (e) {
    throw new Error('Mạng/CORS: ' + e.message);
  }
  if (!res.ok) {
    if (onToken) return pollinationsCall(messages, null);
    throw new Error('Pollinations HTTP ' + res.status);
  }
  if (!onToken) {
    const d = await res.json();
    return d.choices?.[0]?.message?.content || d.text || '';
  }
  return readStream(res, onToken);
}

async function puterCall(messages, onToken) {
  if (typeof puter === 'undefined') throw new Error('Puter.js chưa load');
  const prompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
  const resp = await puter.ai.chat(prompt, { model: state.model || 'gpt-4o' });
  const text = resp?.message?.content || resp?.text || (typeof resp === 'string' ? resp : JSON.stringify(resp));
  if (onToken) onToken(text);
  return text;
}

async function customCall(messages, onToken) {
  const base = state.baseUrl.replace(/\/$/, '');
  const url = base.endsWith('/chat/completions') ? base : base + '/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + state.apiKey
    },
    body: JSON.stringify({ model: state.model, messages, stream: !!onToken })
  });
  if (!res.ok) throw new Error('API HTTP ' + res.status);
  if (!onToken) {
    const d = await res.json();
    return d.choices?.[0]?.message?.content || '';
  }
  return readStream(res, onToken);
}

async function readStream(res, onToken) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '', buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const data = t.slice(5).trim();
      if (data === '[DONE]') continue;
      try {
        const j = JSON.parse(data);
        const tok = j.choices?.[0]?.delta?.content || '';
        if (tok) {
          full += tok;
          onToken(tok);
        }
      } catch {}
    }
  }
  return full;
}

/* ============================================================
   7. UI RENDER
   ============================================================ */
function renderOrg() {
  const order = ['ceo', 'cto', 'dev', 'qa', 'cmo', 'research'];
  $('#orgChart').innerHTML = order.map(id => {
    const a = AGENTS[id];
    const indent = a.reportsTo ? 'indent' : '';
    const st = state.agentStatus[id] || 'idle';
    return `<div class="agent-card ${indent}" data-agent="${id}" style="border-left:3px solid ${a.color}">
      <div class="agent-avatar" style="color:${a.color}">${a.emoji}</div>
      <div class="agent-info">
        <div class="agent-name">${a.name}</div>
        <div class="agent-role">${a.role}</div>
      </div>
      <div class="status-dot ${st}" data-dot="${id}"></div>
    </div>`;
  }).join('');
}

function setAgentStatus(id, status) {
  state.agentStatus[id] = status;
  const dot = $(`[data-dot="${id}"]`);
  if (dot) dot.className = 'status-dot ' + status;
}

function renderSkills() {
  $('#skillsList').innerHTML = state.skills.map(s => `
    <div class="skill ${s.enabled ? 'on' : 'off'}" data-skill="${s.id}">
      <span class="skill-icon">${s.icon}</span>
      <span class="skill-name">${s.name}</span>
      <span class="skill-toggle"></span>
    </div>
  `).join('');
  $$('#skillsList .skill').forEach(el => {
    el.addEventListener('click', () => {
      const sk = state.skills.find(x => x.id === el.dataset.skill);
      sk.enabled = !sk.enabled;
      localStorage.setItem('kaisx_skills', JSON.stringify(state.skills));
      renderSkills();
      updateMetrics();
    });
  });
}

function renderTools() {
  const active = Object.keys(TOOLS);
  $('#toolsList').innerHTML = active.map(t => `
    <div class="skill ${state.useTools ? 'on' : 'off'}">
      <span class="skill-icon">🔧</span>
      <span class="skill-name">${t}</span>
      <span class="skill-toggle"></span>
    </div>
  `).join('');
}

function renderGithubSkills() {
  $('#githubSkills').innerHTML = GITHUB_SKILLS.map(g => `
    <a class="gh-skill" href="${g.url}" target="_blank" rel="noopener">
      <b>${g.name} ↗</b><span>${g.desc}</span>
    </a>
  `).join('');
}

function updateMetrics() {
  const active = Object.values(state.agentStatus).filter(s => s === 'thinking').length;
  const enabled = state.skills.filter(s => s.enabled).length;
  const uptime = Math.floor((Date.now() - state.startTime) / 60000);
  $('#metrics').innerHTML = `
    <div class="metric"><b>${state.tasks}</b><span>Task</span></div>
    <div class="metric"><b>${active}</b><span>Đang chạy</span></div>
    <div class="metric"><b>${enabled}/${state.skills.length}</b><span>Kỹ năng</span></div>
    <div class="metric"><b>${uptime}m</b><span>Uptime</span></div>
  `;
  $('#headerStats').innerHTML = `
    <span><b>${state.tasks}</b> task</span>
    <span><b>${active}</b> active</span>
    <span><b>${state.useTools ? 'ReAct' : 'Simple'}</b></span>
  `;
}

function updateStatus(s) {
  const b = $('#statusBadge');
  b.className = 'badge ' + (s === 'working' ? 'working' : 'idle');
  b.textContent = s === 'working' ? '● Đang chạy…' : '● Chờ';
}

function addActivity(type, name, text, opts = {}) {
  const feed = $('#feed');
  $('#emptyState')?.remove();
  const item = document.createElement('div');
  item.className = 'activity-item ' + (type === 'user' ? 'user' : '');
  const avatar = opts.agent ? opts.agent.emoji : (type === 'user' ? '🧑' : '🤖');
  const color = opts.agent ? opts.agent.color : '#3b82f6';
  item.innerHTML = `
    <div class="activity-avatar" style="color:${color}">${avatar}</div>
    <div class="activity-body">
      <div class="activity-meta"><b>${name}</b>${opts.agent ? ` · ${opts.agent.role}` : ''}</div>
      <div class="activity-content">${md(text)}</div>
    </div>
  `;
  feed.appendChild(item);
  feed.scrollTop = feed.scrollHeight;
  $('#feedCount').textContent = $$('.activity-item').length + ' tin nhắn';
  return item;
}

function addImage(url, caption) {
  const feed = $('#feed');
  const div = document.createElement('div');
  div.className = 'activity-item';
  div.innerHTML = `
    <div class="activity-avatar">🎨</div>
    <div class="activity-body">
      <div class="activity-meta"><b>Design</b> · Pollinations</div>
      <div class="activity-content"><img src="${url}" alt="${esc(caption)}" loading="lazy"><br><small>${esc(caption)}</small></div>
    </div>
  `;
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
}

/* ============================================================
   8. AGENT THINKING
   ============================================================ */
const REACT_INSTRUCTIONS = `

## Tool Use
Có các tool sau:
${Object.entries(TOOLS).map(([k, v]) => `- ${k}: ${v.desc}`).join('\n')}

Nếu tool giúp ích, trả lời CHÍNH XÁC:
THOUGHT: <1-2 câu>
ACTION: tool_name({"key": "value"})

Khi sẵn sàng trả lời, dùng CHÍNH XÁC:
THOUGHT: <lý do>
FINAL: <câu trả lời hoàn chỉnh>

Nếu không cần tool, trả lời trực tiếp: FINAL: <câu trả lời>. KHÔNG BAO GIỜ bỏ FINAL.
Trả lời cùng ngôn ngữ với người dùng.`;

function buildSystemPrompt(agent) {
  const active = state.skills.filter(s => s.enabled).map(s => `- ${s.name}`).join('\n');
  return `${agent.system}

Bạn là thành viên KaisX AI. Kỹ năng đang bật:
${active || '- Không'}

Trả lời ngắn gọn, chuyên nghiệp.`;
}

function parseActionArgs(argStr) {
  argStr = argStr.trim();
  if (argStr.startsWith('{')) {
    try { return JSON.parse(argStr); } catch {}
  }
  return argStr.replace(/^["']|["']$/g, '');
}

async function think(agentId, userPrompt) {
  const agent = AGENTS[agentId];
  setAgentStatus(agentId, 'thinking');
  const messages = [
    { role: 'system', content: buildSystemPrompt(agent) },
    ...state.history.slice(-4),
    { role: 'user', content: userPrompt }
  ];
  const card = addActivity('agent', agent.name, '', { agent });
  const el = card.querySelector('.activity-content');
  let full = '';
  const onToken = (tok) => {
    full += tok;
    el.innerHTML = md(full);
    $('#feed').scrollTop = $('#feed').scrollHeight;
  };
  try {
    const result = await callAI(messages, onToken);
    if (!full) {
      full = result;
      el.innerHTML = md(full);
    }
    state.history.push({ role: 'assistant', content: `[${agent.name}]: ${full}` });
    setAgentStatus(agentId, 'done');
    setTimeout(() => setAgentStatus(agentId, 'idle'), 1800);
    return full;
  } catch (err) {
    setAgentStatus(agentId, 'error');
    const demo = demoResponse(agentId);
    el.innerHTML = md(`⚠️ **Lỗi API:** ${err.message}\n\n_Phản hồi demo:_\n\n${demo}`);
    setTimeout(() => setAgentStatus(agentId, 'idle'), 2500);
    return demo;
  }
}

async function thinkWithTools(agentId, userPrompt) {
  const agent = AGENTS[agentId];
  setAgentStatus(agentId, 'thinking');
  const card = addActivity('agent', agent.name, '', { agent });
  const contentEl = card.querySelector('.activity-content');
  const steps = [];
  contentEl.innerHTML = '<div class="step"><i>Khởi tạo…</i></div>';

  const render = () => {
    contentEl.innerHTML = steps.map(s => {
      if (s.type === 'thought') return `<div class="step"><details><summary>💭 Suy nghĩ</summary><div>${md(s.content)}</div></details></div>`;
      if (s.type === 'action') return `<div class="step action">🔧 ${s.tool}(${esc(s.arg)})</div>`;
      if (s.type === 'observation') return `<div class="step"><details><summary>👁 Kết quả · ${s.tool}</summary><div>${md(String(s.result).slice(0, 800))}</div></details></div>`;
      if (s.type === 'final') return `<div class="step final">${md(s.content)}</div>`;
      return '';
    }).join('');
    $('#feed').scrollTop = $('#feed').scrollHeight;
  };

  const messages = [
    { role: 'system', content: buildSystemPrompt(agent) + REACT_INSTRUCTIONS },
    ...state.history.slice(-4),
    { role: 'user', content: userPrompt }
  ];

  const maxSteps = 4;
  let finalAnswer = null;

  for (let i = 0; i < maxSteps; i++) {
    let raw;
    try {
      raw = await callAI(messages, null);
    } catch (err) {
      steps.push({ type: 'final', content: `⚠️ **Lỗi API:** ${err.message}\n\n${demoResponse(agentId)}` });
      setAgentStatus(agentId, 'error');
      render();
      return '(error)';
    }
    messages.push({ role: 'assistant', content: raw });

    const finalMatch = raw.match(/FINAL:\s*([\s\S]+)/i);
    if (finalMatch) {
      const th = raw.match(/THOUGHT:\s*([\s\S]+?)(?=FINAL:|$)/i);
      if (th) steps.push({ type: 'thought', content: th[1].trim() });
      steps.push({ type: 'final', content: finalMatch[1].trim() });
      finalAnswer = finalMatch[1].trim();
      render();
      break;
    }

    const actionMatch = raw.match(/ACTION:\s*(\w+)\s*\(\s*([\s\S]*?)\s*\)/);
    const thoughtMatch = raw.match(/THOUGHT:\s*([\s\S]+?)(?=ACTION:|$)/i);
    if (thoughtMatch) steps.push({ type: 'thought', content: thoughtMatch[1].trim() });

    if (actionMatch) {
      const [, tool, argStr] = actionMatch;
      steps.push({ type: 'action', tool, arg: argStr.slice(0, 200) });
      render();
      let result;
      try {
        if (!TOOLS[tool]) throw new Error('Tool không tồn tại: ' + tool);
        result = await TOOLS[tool].fn(parseActionArgs(argStr));
        if (result && result.url) {
          addImage(result.url, 'Tạo bởi ' + tool);
          result = result.note || 'Ảnh đã tạo';
        }
      } catch (err) {
        result = { error: err.message };
      }
      const resStr = typeof result === 'string' ? result : JSON.stringify(result);
      steps.push({ type: 'observation', tool, result: resStr });
      render();
      messages.push({ role: 'user', content: `OBSERVATION: ${resStr.slice(0, 1500)}` });
    } else {
      finalAnswer = raw;
      steps.push({ type: 'final', content: raw });
      render();
      break;
    }
  }

  if (!finalAnswer) {
    finalAnswer = '(hết bước)';
    steps.push({ type: 'final', content: finalAnswer });
    render();
  }

  state.history.push({ role: 'assistant', content: `[${agent.name}]: ${finalAnswer}` });
  setAgentStatus(agentId, 'done');
  setTimeout(() => setAgentStatus(agentId, 'idle'), 1800);
  return finalAnswer;
}

async function thinkAuto(agentId, prompt) {
  return state.useTools ? thinkWithTools(agentId, prompt) : think(agentId, prompt);
}

function demoResponse(agentId) {
  const demo = {
    ceo: '**Tổng kết**\n\nTiến hành 3 giai đoạn: Khám phá → Xây dựng → Ra mắt.',
    cto: '**Spec kỹ thuật**\n\n- Kiến trúc: frontend static module\n- Stack: Vanilla JS\n- Rủi ro: rate limit, giảm thiểu bằng fallback',
    dev: '**Kế hoạch triển khai**\n\n```js\nconst app = { init(), render(), run() };\n```\nShip trong 1 sprint.',
    qa: '**QA Review**\n\n✅ Duyệt. Thêm error boundary, test mobile.',
    cmo: '**Kế hoạch ra mắt**\n\n- Định vị: "Công ty AI trong tab trình duyệt"\n- Kênh: GitHub, X, LinkedIn\n- KPI: 500 stars / tuần',
    research: '**Brief**\n\n1. Agent trình duyệt đang lên.\n2. API miễn phí hạ rào cản.\n3. BYOK bền vững.\n\nKhuyến nghị: ship demo static trước.'
  };
  return demo[agentId] || 'Đã ghi nhận.';
}

/* ============================================================
   9. WORKFLOW
   ============================================================ */
function detectNeeds(text) {
  const t = text.toLowerCase();
  return {
    tech: /code|app|website|software|bug|api|develop|build|dashboard|landing|frontend|backend|deploy/.test(t),
    marketing: /market|launch|brand|content|social|ads|seo|campaign|growth|promotion/.test(t),
    research: /research|trend|analy|report|insight|market study|competitor/.test(t),
    image: /image|visual|design|poster|banner|logo|art/.test(t),
    translate: /translate|dịch|chuyển ngữ|multilingual/.test(t)
  };
}

async function runTask(task) {
  if (state.busy) return;
  state.busy = true;
  state.tasks++;
  updateStatus('working');
  $('#runBtn').disabled = true;
  $('#taskInput').value = '';
  addActivity('user', 'Bạn', task);
  if (state.useTools) {
    addActivity('agent', 'Hệ thống', '⚙️ **Đã bật tool use** — agent có thể search, dịch, tạo ảnh.');
  }
  updateMetrics();

  try {
    const plan = await thinkAuto(
      'ceo',
      `Người dùng giao: "${task}". Là CEO, viết kế hoạch ngắn (3-5 gạch đầu dòng). Quyết định phòng ban nào cần làm: Kỹ thuật, QA, Marketing, Research, Design. Chưa làm việc cụ thể — chỉ lập kế hoạch và phân công.`
    );

    const needs = detectNeeds(task + ' ' + plan);

    if (needs.research) {
      await thinkAuto(
        'research',
        `Task: "${task}". Kế hoạch CEO: ${plan}. ${state.useTools ? 'Dùng web_search để tìm dữ liệu thật. ' : ''}Viết brief nghiên cứu với insight và khuyến nghị.`
      );
    }

    if (needs.tech) {
      const spec = await thinkAuto('cto', `Task: "${task}". Kế hoạch CEO: ${plan}. Viết spec kỹ thuật: kiến trúc, thành phần, rủi ro.`);
      const dev = await thinkAuto('dev', `Task: "${task}". Spec: ${spec}. Viết kế hoạch triển khai và code snippet.`);
      const qa = await thinkAuto('qa', `Review implementation: ${dev}. Liệt kê bug/rủi ro. Nếu ổn, ghi APPROVED.`);
      if (/bug|issue|fail|reject|critical/i.test(qa) && !/approved|pass/i.test(qa)) {
        await thinkAuto('dev', `QA phát hiện lỗi: ${qa}. Đưa ra kế hoạch sửa.`);
      }
    }

    if (needs.marketing) {
      await thinkAuto('cmo', `Task: "${task}". Kế hoạch CEO: ${plan}. Tạo kế hoạch marketing: định vị, kênh, nội dung, KPI.`);
    }

    if (needs.translate) {
      await thinkAuto('cmo', `Task: "${task}". ${state.useTools ? 'Dùng tool translate. ' : ''}Cung cấp bản dịch và ghi chú văn hóa.`);
    }

    if (needs.image) {
      await thinkAuto('dev', `Task: "${task}". ${state.useTools ? 'Dùng generate_image để tạo ảnh. ' : ''}Mô tả tài nguyên hình ảnh cần có.`);
      if (!state.useTools) {
        addImage(imageUrl(task), 'Tạo bởi Pollinations — ' + task);
      }
    }

    if (!needs.tech && !needs.marketing && !needs.research && !needs.translate && !needs.image) {
      await thinkAuto('cto', `Task: "${task}". Kế hoạch CEO: ${plan}. Đánh giá khả thi kỹ thuật và đề xuất hướng.`);
      await thinkAuto('cmo', `Task: "${task}". Kế hoạch CEO: ${plan}. Đề xuất cách marketing hỗ trợ.`);
    }

    await thinkAuto(
      'ceo',
      `Task: "${task}". Tất cả phòng ban đã báo cáo. Viết tổng kết cho người dùng: quyết định, kết quả, bước tiếp theo.`
    );
  } catch (err) {
    addActivity('agent', 'Hệ thống', `⚠️ Lỗi workflow: ${err.message}`);
  } finally {
    state.busy = false;
    updateStatus('idle');
    $('#runBtn').disabled = false;
    updateMetrics();
  }
}

/* ============================================================
   10. SETTINGS
   ============================================================ */
function loadSettingsUI() {
  $('#providerSelect').value = state.provider;
  $('#pollinationsModel').value = state.model;
  $('#baseUrlInput').value = state.baseUrl;
  $('#apiKeyInput').value = state.apiKey;
  $('#modelInput').value = state.model;
  $('#useToolsToggle').checked = state.useTools;
  toggleCustomFields();
}

function toggleCustomFields() {
  const p = $('#providerSelect').value;
  $('#customFields').classList.toggle('hidden', p !== 'custom');
  $('#pollinationsModelField').classList.toggle('hidden', p !== 'pollinations');
}

function saveSettings() {
  state.provider = $('#providerSelect').value;
  state.useTools = $('#useToolsToggle').checked;
  if (state.provider === 'custom') {
    state.baseUrl = $('#baseUrlInput').value.trim();
    state.apiKey = $('#apiKeyInput').value.trim();
    state.model = $('#modelInput').value.trim() || 'gpt-4o-mini';
  } else if (state.provider === 'pollinations') {
    state.model = $('#pollinationsModel').value;
  } else {
    state.model = 'gpt-4o';
  }
  localStorage.setItem('kaisx_provider', state.provider);
  localStorage.setItem('kaisx_model', state.model);
  localStorage.setItem('kaisx_baseUrl', state.baseUrl);
  localStorage.setItem('kaisx_apiKey', state.apiKey);
  localStorage.setItem('kaisx_useTools', state.useTools);
  $('#settingsModal').classList.add('hidden');
  renderTools();
  updateMetrics();
}

/* ============================================================
   11. PWA INSTALL
   ============================================================ */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  $('#installBtn').classList.remove('hidden');
});

function handleInstall() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(() => {
    deferredPrompt = null;
    $('#installBtn').classList.add('hidden');
  });
}

/* ============================================================
   12. EVENTS
   ============================================================ */
function bindEvents() {
  $('#runBtn').addEventListener('click', () => {
    const task = $('#taskInput').value.trim();
    if (task) runTask(task);
  });

  $('#taskInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      $('#runBtn').click();
    }
  });

  $$('.chip').forEach(c => c.addEventListener('click', () => {
    $('#taskInput').value = c.dataset.task;
    $('#taskInput').focus();
  }));

  $('#settingsBtn').addEventListener('click', () => {
    loadSettingsUI();
    $('#settingsModal').classList.remove('hidden');
  });
  $('#closeSettings').addEventListener('click', () => $('#settingsModal').classList.add('hidden'));
  $('#saveSettings').addEventListener('click', saveSettings);
  $('#providerSelect').addEventListener('change', toggleCustomFields);
  $('#installBtn').addEventListener('click', handleInstall);

  $('#themeBtn').addEventListener('click', () => {
    const html = document.documentElement;
    const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
    html.dataset.theme = next;
    $('#themeBtn').textContent = next === 'dark' ? '🌙' : '☀️';
  });

  $('#resetBtn').addEventListener('click', () => {
    if (confirm('Reset hoạt động công ty?')) {
      state.history = [];
      state.tasks = 0;
      state.startTime = Date.now();
      state.agentStatus = {};
      $('#feed').innerHTML = `<div class="empty-state" id="emptyState"><div class="empty-icon">🏢</div><h3>Công ty AI KaisX đã sẵn sàng</h3><p>Giao việc ở trên.</p></div>`;
      $('#feedCount').textContent = '0 tin nhắn';
      renderOrg();
      updateMetrics();
      updateStatus('idle');
    }
  });

  $('#settingsModal').addEventListener('click', e => {
    if (e.target.id === 'settingsModal') $('#settingsModal').classList.add('hidden');
  });
}

/* ============================================================
   13. INIT
   ============================================================ */
function init() {
  renderOrg();
  renderSkills();
  renderTools();
  renderGithubSkills();
  updateMetrics();
  updateStatus('idle');
  bindEvents();
  setInterval(updateMetrics, 30000);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW:', err));
    });
  }

  console.log('%cKaisX AI ready 🚀', 'color:#3b82f6;font-weight:bold;font-size:14px');
}

document.addEventListener('DOMContentLoaded', init);