// === STATE ===
const state = {
    currentView: "chat",
    currentConversationId: null,
    isStreaming: false,
    isDreaming: false,
};

// === PARTICLE SYSTEMS ===
const bgCanvas = document.getElementById("bg-particles");
const bgParticles = new ParticleSystem(bgCanvas);
bgParticles.start();

let dreamParticles = null;

// Logo pulse animation
const logoCanvas = document.getElementById("logo-pulse");
const logoCtx = logoCanvas.getContext("2d");
function animateLogo() {
    const t = Date.now() * 0.003;
    logoCtx.clearRect(0, 0, 36, 36);
    const r = 12 + Math.sin(t) * 2;
    const gradient = logoCtx.createRadialGradient(18, 18, 0, 18, 18, r);
    gradient.addColorStop(0, "rgba(124, 58, 237, 0.8)");
    gradient.addColorStop(0.5, "rgba(6, 182, 212, 0.3)");
    gradient.addColorStop(1, "transparent");
    logoCtx.beginPath();
    logoCtx.arc(18, 18, r, 0, Math.PI * 2);
    logoCtx.fillStyle = gradient;
    logoCtx.fill();
    logoCtx.beginPath();
    logoCtx.arc(18, 18, 5, 0, Math.PI * 2);
    logoCtx.fillStyle = "rgba(167, 139, 250, 0.9)";
    logoCtx.fill();
    requestAnimationFrame(animateLogo);
}
animateLogo();

// === NEURAL ACTIVITY BAR ===
const neuralBar = document.getElementById("neural-activity");
function setNeuralActivity(percent) {
    neuralBar.style.width = percent + "%";
}

// === VIEW ROUTER ===
function showView(viewName) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.getElementById(`${viewName}-view`).classList.add("active");
    document.querySelector(`[data-view="${viewName}"]`).classList.add("active");
    state.currentView = viewName;
    if (viewName === "journal") loadDreamJournal();
    if (viewName === "mindmap") loadMindMap();
    if (viewName === "analytics") loadAnalytics();
}

document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => showView(btn.dataset.view));
});

// === CHAT ===
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

chatInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + "px";
});

sendBtn.addEventListener("click", sendMessage);

// Topic chips
document.querySelectorAll(".topic-chip").forEach(chip => {
    chip.addEventListener("click", () => {
        chatInput.value = chip.dataset.topic;
        sendMessage();
    });
});

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || state.isStreaming) return;

    const welcome = chatMessages.querySelector(".welcome-message");
    if (welcome) welcome.remove();

    appendMessage("user", text);
    chatInput.value = "";
    chatInput.style.height = "auto";
    state.isStreaming = true;
    sendBtn.disabled = true;
    bgParticles.setMode("active");
    setNeuralActivity(60);

    // Typing indicator
    const typingEl = document.createElement("div");
    typingEl.className = "typing-indicator";
    typingEl.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    chatMessages.appendChild(typingEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: text,
                conversation_id: state.currentConversationId,
            }),
        });

        typingEl.remove();
        const assistantEl = appendMessage("assistant", "");
        const contentSpan = assistantEl.querySelector(".msg-content");
        setNeuralActivity(90);

        await readSSE(response, {
            start(data) {
                state.currentConversationId = data.conversation_id;
            },
            token(data) {
                contentSpan.textContent += data.text;
                chatMessages.scrollTop = chatMessages.scrollHeight;
            },
            done(data) {
                if (data.dream_references && data.dream_references.length > 0) {
                    assistantEl.classList.add("has-dream-ref");
                    const tag = document.createElement("div");
                    tag.className = "dream-tag";
                    tag.textContent = "✨ Inspired by a dream";
                    assistantEl.appendChild(tag);
                }
                state.currentConversationId = data.conversation_id;
                loadConversationsList();
            },
        });
    } catch (err) {
        typingEl.remove();
        appendMessage("assistant", "Something went wrong. Please try again.");
        console.error(err);
    }

    state.isStreaming = false;
    sendBtn.disabled = false;
    bgParticles.setMode("idle");
    setNeuralActivity(20);
    chatInput.focus();
}

function appendMessage(role, content) {
    const div = document.createElement("div");
    div.className = `message ${role}`;
    const span = document.createElement("span");
    span.className = "msg-content";
    span.textContent = content;
    div.appendChild(span);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}

async function loadConversation(conversationId) {
    state.currentConversationId = conversationId;
    chatMessages.innerHTML = "";
    document.querySelectorAll(".conv-item").forEach(el => {
        el.classList.toggle("active", el.dataset.id === conversationId);
    });
    try {
        const response = await fetch(`/api/conversations/${conversationId}`);
        const messages = await response.json();
        messages.forEach(msg => appendMessage(msg.role, msg.content));
    } catch (err) { console.error(err); }
}

async function loadConversationsList() {
    try {
        const response = await fetch("/api/conversations");
        const convos = await response.json();
        const list = document.getElementById("conversations-list");
        list.innerHTML = "";
        convos.forEach(conv => {
            const div = document.createElement("div");
            div.className = `conv-item${conv.conversation_id === state.currentConversationId ? " active" : ""}`;
            div.dataset.id = conv.conversation_id;
            div.textContent = conv.title;
            div.addEventListener("click", () => {
                showView("chat");
                loadConversation(conv.conversation_id);
            });
            list.appendChild(div);
        });

        // Update memory count
        const total = convos.reduce((sum, c) => sum + c.message_count, 0);
        const mc = document.getElementById("memory-count");
        mc.textContent = `${total} memories stored`;
    } catch (err) { console.error(err); }
}

document.getElementById("new-chat-btn").addEventListener("click", () => {
    state.currentConversationId = null;
    chatMessages.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-orb"></div>
            <h2>I am DreamAI</h2>
            <p>I carry 50 fragments of knowledge — from quantum physics to ancient philosophy, from mycelium networks to music theory.</p>
            <p class="welcome-sub">Talk to me about anything. Then click <strong>Dream Now</strong> to watch me find connections you never expected.</p>
            <div class="welcome-topics">
                <span class="topic-chip" data-topic="Tell me about quantum entanglement and how it connects to human consciousness">Quantum & Consciousness</span>
                <span class="topic-chip" data-topic="How are mycelium networks similar to the internet?">Mycelium & Internet</span>
                <span class="topic-chip" data-topic="What's the relationship between music and mathematics?">Music & Math</span>
                <span class="topic-chip" data-topic="Tell me about emergence - how complexity arises from simplicity">Emergence</span>
            </div>
        </div>`;
    // Re-bind topic chips
    document.querySelectorAll(".topic-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            chatInput.value = chip.dataset.topic;
            sendMessage();
        });
    });
    document.querySelectorAll(".conv-item").forEach(el => el.classList.remove("active"));
    showView("chat");
    chatInput.focus();
});

// === DREAM ===
const dreamOverlay = document.getElementById("dream-overlay");
const dreamStream = document.getElementById("dream-stream");
const dreamStatus = document.getElementById("dream-status");
const dreamTitle = document.getElementById("dream-title");
const dreamCloseBtn = document.getElementById("dream-close-btn");
const dreamCanvas = document.getElementById("dream-canvas");

document.getElementById("dream-btn").addEventListener("click", triggerDream);
dreamCloseBtn.addEventListener("click", closeDreamOverlay);

async function triggerDream() {
    if (state.isDreaming) return;
    state.isDreaming = true;

    dreamStream.textContent = "";
    dreamTitle.textContent = "Dreaming...";
    dreamStatus.textContent = "Gathering memory fragments...";
    dreamCloseBtn.style.display = "none";
    dreamOverlay.classList.add("active");

    // Start dream particle system
    dreamParticles = new ParticleSystem(dreamCanvas);
    dreamParticles.setMode("dreaming");
    dreamParticles.start();

    bgParticles.setMode("dreaming");
    setNeuralActivity(100);

    let fragmentIndex = 0;

    try {
        const response = await fetch("/api/dream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        });

        await readSSE(response, {
            status(data) {
                dreamStatus.textContent = data.message;
                if (data.phase === "gathering") {
                    dreamTitle.textContent = "Gathering Memories...";
                }
                if (data.phase === "dreaming") {
                    dreamTitle.textContent = "Dreaming...";
                }
            },
            dream_text(data) {
                dreamStream.textContent += data.text;
                dreamStream.parentElement.scrollTop = dreamStream.parentElement.scrollHeight;

                // Add dream orbs for interesting words
                if (Math.random() < 0.03 && dreamParticles) {
                    const words = data.text.split(/\s+/).filter(w => w.length > 4);
                    if (words.length > 0) {
                        const word = words[Math.floor(Math.random() * words.length)];
                        dreamParticles.addDreamOrb(word);
                        fragmentIndex++;
                        if (fragmentIndex > 1 && Math.random() < 0.5) {
                            const from = Math.floor(Math.random() * fragmentIndex);
                            dreamParticles.connectDreamOrbs(from, fragmentIndex - 1);
                        }
                    }
                }
            },
            error(data) {
                dreamStream.textContent = data.message;
                dreamTitle.textContent = "Dream Interrupted";
                dreamStatus.textContent = "";
            },
            complete(data) {
                const score = (data.creativity_score * 100).toFixed(0);
                dreamTitle.textContent = "Dream Complete";
                dreamStatus.textContent = `Creativity: ${score}% · ${data.themes?.join(", ") || ""}`;
                if (data.image_url) {
                    const img = document.createElement("img");
                    img.src = data.image_url;
                    img.className = "dream-generated-image";
                    img.alt = "Dream painting";
                    dreamStream.parentElement.insertBefore(img, dreamStream);
                }
                dreamCloseBtn.style.display = "inline-block";
            },
        });
    } catch (err) {
        dreamStream.textContent = "Dream interrupted. Please try again.";
        dreamTitle.textContent = "Error";
        console.error(err);
    }

    dreamCloseBtn.style.display = "inline-block";
    state.isDreaming = false;
}

function closeDreamOverlay() {
    dreamOverlay.classList.remove("active");
    if (dreamParticles) {
        dreamParticles.stop();
        dreamParticles.clearDreamOrbs();
        dreamParticles = null;
    }
    bgParticles.setMode("idle");
    setNeuralActivity(20);
    if (state.currentView === "journal") loadDreamJournal();
}

// === DREAM JOURNAL ===
async function loadDreamJournal() {
    const container = document.getElementById("dream-cards");
    try {
        const response = await fetch("/api/dreams");
        const dreams = await response.json();
        if (dreams.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-orb"></div>
                    <h3>No dreams yet</h3>
                    <p>Click "Dream Now" — I already have 50 knowledge fragments to dream about.</p>
                </div>`;
            return;
        }
        container.innerHTML = '<svg style="position:absolute;width:0;height:0"><defs><linearGradient id="creativity-gradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient></defs></svg>';
        dreams.forEach(dream => container.appendChild(renderDreamCard(dream)));
    } catch (err) { console.error(err); }
}

function renderDreamCard(dream) {
    const card = document.createElement("div");
    card.className = "dream-card";
    const ts = new Date(dream.timestamp).toLocaleString();
    const score = (dream.creativity_score * 100).toFixed(0);
    const circumference = 2 * Math.PI * 18;
    const offset = circumference - (dream.creativity_score * circumference);

    let html = `
        <div class="dream-card-header">
            <span class="dream-timestamp">${ts}</span>
            <div class="creativity-ring">
                <svg width="48" height="48" viewBox="0 0 48 48">
                    <circle class="creativity-track" cx="24" cy="24" r="18" />
                    <circle class="creativity-value" cx="24" cy="24" r="18"
                        stroke-dasharray="${circumference}"
                        stroke-dashoffset="${offset}" />
                </svg>
                <span class="creativity-label">${score}%</span>
            </div>
        </div>`;

    if (dream.image_url) {
        html += `<div class="dream-image"><img src="${dream.image_url}" alt="Dream visualization" loading="lazy" /></div>`;
    }

    if (dream.narrative) {
        const narrative = dream.narrative.length > 300 ? dream.narrative.substring(0, 300) + "..." : dream.narrative;
        html += `<div class="dream-narrative">${escapeHtml(narrative)}</div>`;
    }

    if (dream.emotions?.length > 0) {
        html += `<div class="dream-emotion-bar">`;
        dream.emotions.forEach(em => {
            const width = (em.intensity * 100).toFixed(0);
            html += `<div class="emotion-segment" style="flex:${width}" title="${em.emotion}: ${width}%"><span>${em.emotion}</span></div>`;
        });
        html += `</div>`;
    }

    if (dream.insights?.length > 0) {
        html += `<div class="dream-section-title">Insights</div><ul class="dream-insights-list">`;
        dream.insights.forEach(i => { html += `<li>${escapeHtml(i.content)}</li>`; });
        html += `</ul>`;
    }

    if (dream.questions_raised?.length > 0) {
        html += `<div class="dream-section-title">Questions Raised</div><ul class="dream-questions-list">`;
        dream.questions_raised.forEach(q => { html += `<li>→ ${escapeHtml(q)}</li>`; });
        html += `</ul>`;
    }

    if (dream.themes?.length > 0) {
        html += `<div class="dream-themes">`;
        dream.themes.forEach(t => { html += `<span class="theme-tag">${escapeHtml(t)}</span>`; });
        html += `</div>`;
    }

    if (dream.memory_fragments_used?.length > 0) {
        html += `<div class="dream-sources"><div class="dream-section-title">Memory Fragments Used (${dream.memory_fragments_used.length})</div>`;
        dream.memory_fragments_used.slice(0, 5).forEach(frag => {
            const preview = frag.content.length > 80 ? frag.content.substring(0, 80) + "..." : frag.content;
            html += `<div class="source-fragment">${escapeHtml(preview)}</div>`;
        });
        if (dream.memory_fragments_used.length > 5) {
            html += `<div class="source-fragment" style="color:var(--accent-dream)">+ ${dream.memory_fragments_used.length - 5} more fragments</div>`;
        }
        html += `</div>`;
    }

    card.innerHTML = html;
    return card;
}

// === MIND MAP ===
const mindmapCanvas = document.getElementById("mindmap-canvas");
const mindmapCtx = mindmapCanvas.getContext("2d");
const mindmapTooltip = document.getElementById("mindmap-tooltip");
let mapNodes = [];
let mapEdges = [];
let hoveredNode = null;
let mapAnimFrame = null;

const NODE_COLORS = {
    conversation: { r: 6, g: 182, b: 212 },
    dream: { r: 124, g: 58, b: 237 },
    insight: { r: 167, g: 139, b: 250 },
};

function getNodeRadius(node) {
    const base = node.type === "dream" ? 14 : node.type === "insight" ? 8 : 11;
    const connections = mapEdges.filter(e => e.source === node.id || e.target === node.id).length;
    return base + Math.min(connections * 2, 8);
}

async function loadMindMap() {
    try {
        const response = await fetch("/api/mind-map");
        const data = await response.json();
        resizeMindMap();

        if (data.nodes.length === 0) {
            mindmapCtx.fillStyle = "#4a5568";
            mindmapCtx.font = "14px -apple-system, sans-serif";
            mindmapCtx.textAlign = "center";
            mindmapCtx.fillText("Have conversations and dream to build your mind map.",
                mindmapCanvas.clientWidth / 2, mindmapCanvas.clientHeight / 2);
            return;
        }

        mapNodes = data.nodes.map(n => ({
            ...n, x: 0, y: 0, vx: 0, vy: 0, pulse: Math.random() * Math.PI * 2,
        }));
        mapEdges = data.edges;
        runForceLayout();
        animateMap();
    } catch (err) { console.error(err); }
}

function resizeMindMap() {
    const container = document.getElementById("mindmap-container");
    const dpr = window.devicePixelRatio || 1;
    mindmapCanvas.width = container.clientWidth * dpr;
    mindmapCanvas.height = container.clientHeight * dpr;
    mindmapCanvas.style.width = container.clientWidth + "px";
    mindmapCanvas.style.height = container.clientHeight + "px";
    mindmapCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function runForceLayout() {
    const w = mindmapCanvas.clientWidth;
    const h = mindmapCanvas.clientHeight;
    const nodeMap = {};

    mapNodes.forEach((n, i) => {
        const angle = (2 * Math.PI * i) / mapNodes.length;
        const radius = Math.min(w, h) * 0.3;
        n.x = w / 2 + Math.cos(angle) * radius;
        n.y = h / 2 + Math.sin(angle) * radius;
        nodeMap[n.id] = n;
    });

    for (let iter = 0; iter < 200; iter++) {
        for (let i = 0; i < mapNodes.length; i++) {
            for (let j = i + 1; j < mapNodes.length; j++) {
                const a = mapNodes[i], b = mapNodes[j];
                let dx = b.x - a.x, dy = b.y - a.y;
                let dist = Math.sqrt(dx * dx + dy * dy) || 1;
                let force = 1000 / (dist * dist);
                let fx = (dx / dist) * force, fy = (dy / dist) * force;
                a.vx -= fx; a.vy -= fy;
                b.vx += fx; b.vy += fy;
            }
        }
        mapEdges.forEach(e => {
            const a = nodeMap[e.source], b = nodeMap[e.target];
            if (!a || !b) return;
            let dx = b.x - a.x, dy = b.y - a.y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;
            let force = (dist - 100) * 0.04;
            let fx = (dx / dist) * force, fy = (dy / dist) * force;
            a.vx += fx; a.vy += fy;
            b.vx -= fx; b.vy -= fy;
        });
        mapNodes.forEach(n => {
            n.vx += (w / 2 - n.x) * 0.004;
            n.vy += (h / 2 - n.y) * 0.004;
            n.vx *= 0.85; n.vy *= 0.85;
            n.x += n.vx; n.y += n.vy;
            n.x = Math.max(40, Math.min(w - 40, n.x));
            n.y = Math.max(40, Math.min(h - 40, n.y));
        });
    }
}

function animateMap() {
    if (mapAnimFrame) cancelAnimationFrame(mapAnimFrame);
    function frame() {
        renderMap();
        mapNodes.forEach(n => n.pulse += 0.02);
        if (state.currentView === "mindmap") mapAnimFrame = requestAnimationFrame(frame);
    }
    frame();
}

function renderMap() {
    const w = mindmapCanvas.clientWidth;
    const h = mindmapCanvas.clientHeight;
    mindmapCtx.clearRect(0, 0, w, h);
    const nodeMap = {};
    mapNodes.forEach(n => nodeMap[n.id] = n);

    // Edges with glow
    mapEdges.forEach(e => {
        const a = nodeMap[e.source], b = nodeMap[e.target];
        if (!a || !b) return;
        const shimmer = 0.15 + Math.sin(Date.now() * 0.002 + a.pulse) * 0.05;
        mindmapCtx.beginPath();
        mindmapCtx.moveTo(a.x, a.y);
        mindmapCtx.lineTo(b.x, b.y);
        mindmapCtx.strokeStyle = `rgba(167, 139, 250, ${shimmer})`;
        mindmapCtx.lineWidth = 1;
        mindmapCtx.stroke();
    });

    // Nodes with halos
    mapNodes.forEach(n => {
        const r = getNodeRadius(n);
        const c = NODE_COLORS[n.type] || NODE_COLORS.conversation;
        const pulse = Math.sin(n.pulse) * 0.15 + 0.85;

        // Halo
        const haloR = r + 8 + Math.sin(n.pulse) * 3;
        mindmapCtx.beginPath();
        mindmapCtx.arc(n.x, n.y, haloR, 0, Math.PI * 2);
        mindmapCtx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.08)`;
        mindmapCtx.fill();

        // Hover glow
        if (hoveredNode === n) {
            mindmapCtx.beginPath();
            mindmapCtx.arc(n.x, n.y, r + 12, 0, Math.PI * 2);
            mindmapCtx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.15)`;
            mindmapCtx.fill();
        }

        // Node
        mindmapCtx.beginPath();
        mindmapCtx.arc(n.x, n.y, r * pulse, 0, Math.PI * 2);
        mindmapCtx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.7)`;
        mindmapCtx.fill();
        mindmapCtx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.9)`;
        mindmapCtx.lineWidth = 1.5;
        mindmapCtx.stroke();

        // Label
        mindmapCtx.font = "10px -apple-system, sans-serif";
        mindmapCtx.fillStyle = `rgba(148, 163, 184, ${hoveredNode === n ? 1 : 0.6})`;
        mindmapCtx.textAlign = "center";
        const label = n.label.length > 22 ? n.label.substring(0, 22) + "..." : n.label;
        mindmapCtx.fillText(label, n.x, n.y + r + 16);
    });
}

mindmapCanvas.addEventListener("mousemove", e => {
    const rect = mindmapCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    hoveredNode = null;
    for (const n of mapNodes) {
        const r = getNodeRadius(n) + 5;
        const dx = mx - n.x, dy = my - n.y;
        if (dx * dx + dy * dy < r * r) { hoveredNode = n; break; }
    }
    if (hoveredNode) {
        mindmapTooltip.style.display = "block";
        mindmapTooltip.style.left = (e.clientX - rect.left + 15) + "px";
        mindmapTooltip.style.top = (e.clientY - rect.top - 10) + "px";
        mindmapTooltip.textContent = hoveredNode.label;
        mindmapCanvas.style.cursor = "pointer";
    } else {
        mindmapTooltip.style.display = "none";
        mindmapCanvas.style.cursor = "default";
    }
});

mindmapCanvas.addEventListener("click", () => {
    if (hoveredNode?.type === "conversation") {
        showView("chat");
        loadConversation(hoveredNode.id);
    }
});

// === SSE READER ===
async function readSSE(response, handlers) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let currentEvent = "message";
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
            if (line.startsWith("event:")) currentEvent = line.slice(6).trim();
            else if (line.startsWith("data:")) {
                const raw = line.slice(5).trim();
                if (!raw) continue;
                try {
                    const data = JSON.parse(raw);
                    if (handlers[currentEvent]) handlers[currentEvent](data);
                } catch (e) { console.warn("SSE parse error:", e); }
            }
        }
    }
}

// === UTILS ===
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// === NEURAL ANALYTICS ===
async function loadAnalytics() {
    try {
        const response = await fetch("/api/analytics");
        const data = await response.json();

        // Stats row
        const statsRow = document.getElementById("stats-row");
        const stats = data.stats;
        statsRow.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${stats.total_memories}</div>
                <div class="stat-label">Memories</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.total_dreams}</div>
                <div class="stat-label">Dreams</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.total_insights}</div>
                <div class="stat-label">Insights</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.total_conversations}</div>
                <div class="stat-label">Conversations</div>
            </div>`;

        // Render all charts
        requestAnimationFrame(() => {
            drawHeatMap(document.getElementById("chart-heatmap"), data.heat_map);
            drawRadarChart(document.getElementById("chart-radar"), data.radar);
            drawSankey(document.getElementById("chart-sankey"), data.sankey);
            drawNeuronNetwork(document.getElementById("chart-neuron"), data.neuron);
            drawCycleChart(document.getElementById("chart-cycle"), data.theme_cycle);
            drawEmotionWaveform(document.getElementById("chart-emotion-wave"), data.emotion_waveform);
            drawEmotionDonut(document.getElementById("chart-emotion-donut"), data.emotion_distribution);
        });
    } catch (err) {
        console.error("Analytics error:", err);
    }
}

// === INIT ===
window.addEventListener("resize", () => {
    if (state.currentView === "mindmap") {
        resizeMindMap();
        runForceLayout();
        animateMap();
    }
    if (state.currentView === "analytics") loadAnalytics();
});

loadConversationsList();
setNeuralActivity(15);
chatInput.focus();
