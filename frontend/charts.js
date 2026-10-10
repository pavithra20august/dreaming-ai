const CHART_COLORS = {
    purple: { r: 124, g: 58, b: 237 },
    teal: { r: 6, g: 182, b: 212 },
    pink: { r: 236, g: 72, b: 153 },
    dream: { r: 167, g: 139, b: 250 },
    amber: { r: 245, g: 158, b: 11 },
    emerald: { r: 16, g: 185, b: 129 },
};

function setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    return { ctx, w: rect.width, h: rect.height };
}

// === 1. WORD HEAT MAP ===
function drawHeatMap(canvas, words) {
    const { ctx, w, h } = setupCanvas(canvas);
    if (!words.length) { drawEmptyState(ctx, w, h, "Dream to generate word data"); return; }

    const maxCount = Math.max(...words.map(w => w.count));
    const padding = 20;
    const cols = Math.ceil(Math.sqrt(words.length * (w / h)));
    const rows = Math.ceil(words.length / cols);
    const cellW = (w - padding * 2) / cols;
    const cellH = (h - padding * 2) / rows;
    const cellSize = Math.min(cellW, cellH);

    const startX = (w - cols * cellSize) / 2;
    const startY = (h - rows * cellSize) / 2;

    words.forEach((word, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = startX + col * cellSize;
        const y = startY + row * cellSize;
        const intensity = word.count / maxCount;

        // Interpolate from deep blue to purple to teal based on intensity
        const r = Math.floor(6 + intensity * 118);
        const g = Math.floor(6 + intensity * 52);
        const b = Math.floor(60 + intensity * 177);

        // Cell background
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.15 + intensity * 0.7})`;
        ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

        // Border glow for high-intensity words
        if (intensity > 0.5) {
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${intensity * 0.5})`;
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        }

        // Word text
        const fontSize = Math.max(8, Math.min(cellSize * 0.25, 13));
        ctx.font = `${intensity > 0.6 ? "600" : "400"} ${fontSize}px -apple-system, sans-serif`;
        ctx.fillStyle = `rgba(226, 232, 240, ${0.4 + intensity * 0.6})`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const label = word.word.length > 8 ? word.word.substring(0, 7) + "…" : word.word;
        ctx.fillText(label, x + cellSize / 2, y + cellSize / 2);
    });
}

// === 2. RADAR / SPIDER CHART ===
function drawRadarChart(canvas, data) {
    const { ctx, w, h } = setupCanvas(canvas);
    if (!data.labels?.length) { drawEmptyState(ctx, w, h, "Dream to see dimensions"); return; }

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.35;
    const labels = data.labels;
    const values = data.values;
    const n = labels.length;
    const angleStep = (Math.PI * 2) / n;

    // Grid rings
    for (let ring = 1; ring <= 5; ring++) {
        const r = (radius / 5) * ring;
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
            const angle = i * angleStep - Math.PI / 2;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(167, 139, 250, ${0.05 + ring * 0.03})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Axis lines
    for (let i = 0; i < n; i++) {
        const angle = i * angleStep - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        ctx.strokeStyle = "rgba(167, 139, 250, 0.1)";
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Data polygon
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
        const idx = i % n;
        const angle = idx * angleStep - Math.PI / 2;
        const r = values[idx] * radius;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();

    // Gradient fill
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, "rgba(124, 58, 237, 0.3)");
    gradient.addColorStop(1, "rgba(6, 182, 212, 0.1)");
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = "rgba(167, 139, 250, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Data points
    for (let i = 0; i < n; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const r = values[i] * radius;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;

        // Glow
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(167, 139, 250, 0.2)";
        ctx.fill();

        // Point
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(167, 139, 250, 0.9)";
        ctx.fill();

        // Label
        const labelR = radius + 20;
        const lx = cx + Math.cos(angle) * labelR;
        const ly = cy + Math.sin(angle) * labelR;
        ctx.font = "11px -apple-system, sans-serif";
        ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(labels[i], lx, ly);

        // Value
        ctx.font = "bold 10px -apple-system, sans-serif";
        ctx.fillStyle = "rgba(167, 139, 250, 0.9)";
        ctx.fillText((values[i] * 100).toFixed(0) + "%", lx, ly + 14);
    }
}

// === 3. SANKEY DIAGRAM ===
function drawSankey(canvas, data) {
    const { ctx, w, h } = setupCanvas(canvas);
    if (!data.nodes?.length) { drawEmptyState(ctx, w, h, "Dream to see knowledge flow"); return; }

    const topPadding = 30;
    const padding = 20;
    const labelSpace = 100;
    const nodeWidth = 12;

    // Distinct color palettes per column
    const memoryColors = [
        { r: 6, g: 182, b: 212 },
        { r: 34, g: 197, b: 94 },
        { r: 59, g: 130, b: 246 },
        { r: 16, g: 185, b: 129 },
        { r: 45, g: 212, b: 191 },
        { r: 99, g: 179, b: 237 },
        { r: 72, g: 199, b: 142 },
        { r: 20, g: 158, b: 202 },
        { r: 56, g: 189, b: 248 },
        { r: 74, g: 222, b: 128 },
        { r: 14, g: 165, b: 233 },
        { r: 52, g: 211, b: 153 },
        { r: 96, g: 165, b: 250 },
    ];
    const dreamColors = [
        { r: 124, g: 58, b: 237 },
        { r: 236, g: 72, b: 153 },
        { r: 168, g: 85, b: 247 },
        { r: 217, g: 70, b: 239 },
        { r: 139, g: 92, b: 246 },
        { r: 244, g: 114, b: 182 },
    ];
    const insightColors = [
        { r: 245, g: 158, b: 11 },
        { r: 250, g: 204, b: 21 },
        { r: 251, g: 146, b: 60 },
        { r: 234, g: 179, b: 8 },
        { r: 249, g: 115, b: 22 },
        { r: 253, g: 186, b: 116 },
    ];

    // Arrange nodes in 3 columns
    const columns = { memory: [], dream: [], insight: [] };
    data.nodes.forEach(n => columns[n.type]?.push(n));

    const colX = {
        memory: padding + labelSpace,
        dream: w / 2 - nodeWidth / 2,
        insight: w - padding - labelSpace - nodeWidth,
    };

    // Column titles above chart
    ctx.font = "bold 11px -apple-system, sans-serif";
    ctx.textBaseline = "top";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(6, 182, 212, 0.7)";
    ctx.fillText("Memories", colX.memory + nodeWidth / 2, 4);
    ctx.fillStyle = "rgba(124, 58, 237, 0.7)";
    ctx.fillText("Dreams", w / 2, 4);
    ctx.fillStyle = "rgba(245, 158, 11, 0.7)";
    ctx.fillText("Insights", colX.insight + nodeWidth / 2, 4);

    // Position nodes vertically
    const nodePositions = {};
    Object.entries(columns).forEach(([type, nodes]) => {
        const colorPalette = type === "memory" ? memoryColors : type === "dream" ? dreamColors : insightColors;
        const totalH = h - topPadding - padding;
        const nodeH = Math.min(totalH / Math.max(nodes.length, 1) - 4, 40);
        const startY = topPadding + (totalH - nodes.length * (nodeH + 4)) / 2;
        nodes.forEach((node, i) => {
            nodePositions[node.id] = {
                x: colX[type],
                y: startY + i * (nodeH + 4),
                h: nodeH,
                color: colorPalette[i % colorPalette.length],
                label: node.label,
                type: type,
            };
        });
    });

    // Draw links with source color
    data.links.forEach(link => {
        const src = nodePositions[link.source];
        const tgt = nodePositions[link.target];
        if (!src || !tgt) return;

        const srcX = src.x + nodeWidth;
        const srcY = src.y + src.h / 2;
        const tgtX = tgt.x;
        const tgtY = tgt.y + tgt.h / 2;
        const cpx = (srcX + tgtX) / 2;

        ctx.beginPath();
        ctx.moveTo(srcX, srcY);
        ctx.bezierCurveTo(cpx, srcY, cpx, tgtY, tgtX, tgtY);

        const gradient = ctx.createLinearGradient(srcX, 0, tgtX, 0);
        gradient.addColorStop(0, `rgba(${src.color.r}, ${src.color.g}, ${src.color.b}, 0.35)`);
        gradient.addColorStop(1, `rgba(${tgt.color.r}, ${tgt.color.g}, ${tgt.color.b}, 0.35)`);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = Math.max(2, src.h * 0.4);
        ctx.stroke();
    });

    // Draw nodes
    Object.values(nodePositions).forEach(node => {
        const c = node.color;

        // Glow
        ctx.shadowColor = `rgba(${c.r}, ${c.g}, ${c.b}, 0.5)`;
        ctx.shadowBlur = 10;
        ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.75)`;
        ctx.fillRect(node.x, node.y, nodeWidth, node.h);
        ctx.shadowBlur = 0;

        // Border
        ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.9)`;
        ctx.lineWidth = 1;
        ctx.strokeRect(node.x, node.y, nodeWidth, node.h);

        // One-word label — skip articles/stopwords, pick first meaningful word
        const skipWords = new Set(["the","a","an","is","are","was","in","of","and","to","for","on","it","we","how","both","every","no","that","this","from","but","or","not","what","with","if","by","all"]);
        const words = node.label.split(/[\s,\-—]+/).filter(w => w.length > 0);
        const oneWord = words.find(w => !skipWords.has(w.toLowerCase())) || words[0] || "";
        ctx.font = "9px -apple-system, sans-serif";
        ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.9)`;
        ctx.textBaseline = "middle";
        if (node.x < w / 3) {
            ctx.textAlign = "right";
            ctx.fillText(oneWord, node.x - 6, node.y + node.h / 2);
        } else if (node.x > w * 2 / 3) {
            ctx.textAlign = "left";
            ctx.fillText(oneWord, node.x + nodeWidth + 6, node.y + node.h / 2);
        } else {
            ctx.textAlign = "center";
            ctx.fillText(oneWord, node.x + nodeWidth / 2, node.y + node.h / 2);
        }
    });
}

// === 4. NEURON NETWORK ===
function drawNeuronNetwork(canvas, data) {
    const { ctx, w, h } = setupCanvas(canvas);
    if (!data.nodes?.length) { drawEmptyState(ctx, w, h, "Dream to build neural network"); return; }

    const nodes = data.nodes.map((n, i) => {
        const angle = (2 * Math.PI * i) / data.nodes.length;
        const radius = Math.min(w, h) * 0.32;
        return {
            ...n,
            x: w / 2 + Math.cos(angle) * radius,
            y: h / 2 + Math.sin(angle) * radius,
            r: 8 + n.weight * 3,
        };
    });

    // Simple force layout
    const nodeMap = {};
    nodes.forEach(n => nodeMap[n.id] = n);

    for (let iter = 0; iter < 100; iter++) {
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i], b = nodes[j];
                let dx = b.x - a.x, dy = b.y - a.y;
                let dist = Math.sqrt(dx * dx + dy * dy) || 1;
                let force = 600 / (dist * dist);
                a.x -= (dx / dist) * force;
                a.y -= (dy / dist) * force;
                b.x += (dx / dist) * force;
                b.y += (dy / dist) * force;
            }
        }
        data.edges.forEach(e => {
            const a = nodeMap[e.source], b = nodeMap[e.target];
            if (!a || !b) return;
            let dx = b.x - a.x, dy = b.y - a.y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;
            let force = (dist - 80) * 0.03;
            a.x += (dx / dist) * force;
            a.y += (dy / dist) * force;
            b.x -= (dx / dist) * force;
            b.y -= (dy / dist) * force;
        });
        nodes.forEach(n => {
            n.x += (w / 2 - n.x) * 0.01;
            n.y += (h / 2 - n.y) * 0.01;
            n.x = Math.max(50, Math.min(w - 50, n.x));
            n.y = Math.max(50, Math.min(h - 50, n.y));
        });
    }

    // Draw dendrite-like connections
    data.edges.forEach(e => {
        const a = nodeMap[e.source], b = nodeMap[e.target];
        if (!a || !b) return;

        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const offset = 15;
        const cx1 = mx + (Math.random() - 0.5) * offset;
        const cy1 = my + (Math.random() - 0.5) * offset;

        // Main axon
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(cx1, cy1, b.x, b.y);
        ctx.strokeStyle = `rgba(167, 139, 250, ${0.15 + e.weight * 0.1})`;
        ctx.lineWidth = 1 + e.weight * 0.5;
        ctx.stroke();

        // Synapse glow at midpoint
        ctx.beginPath();
        ctx.arc(cx1, cy1, 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(167, 139, 250, 0.3)";
        ctx.fill();
    });

    // Draw neurons
    nodes.forEach(n => {
        // Dendrite branches
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 * i) / 4 + Math.random() * 0.5;
            const len = n.r * 1.5 + Math.random() * 10;
            const ex = n.x + Math.cos(angle) * len;
            const ey = n.y + Math.sin(angle) * len;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(ex, ey);
            ctx.strokeStyle = "rgba(124, 58, 237, 0.15)";
            ctx.lineWidth = 1;
            ctx.stroke();
            // Tiny end bulb
            ctx.beginPath();
            ctx.arc(ex, ey, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(124, 58, 237, 0.3)";
            ctx.fill();
        }

        // Outer glow
        const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 2.5);
        gradient.addColorStop(0, `rgba(124, 58, 237, 0.2)`);
        gradient.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Cell body
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(124, 58, 237, 0.5)`;
        ctx.fill();
        ctx.strokeStyle = "rgba(167, 139, 250, 0.8)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Nucleus
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(226, 232, 240, 0.6)";
        ctx.fill();

        // Label
        ctx.font = "10px -apple-system, sans-serif";
        ctx.fillStyle = "rgba(226, 232, 240, 0.7)";
        ctx.textAlign = "center";
        ctx.fillText(n.label, n.x, n.y + n.r + 14);
    });
}

// === 5. THEME CYCLE / RADIAL CHART ===
function drawCycleChart(canvas, timeline) {
    const { ctx, w, h } = setupCanvas(canvas);
    if (!timeline?.length) { drawEmptyState(ctx, w, h, "Dream to see theme cycles"); return; }

    const cx = w / 2;
    const cy = h / 2;
    const maxRadius = Math.min(w, h) * 0.38;
    const innerRadius = maxRadius * 0.25;

    // Collect all unique themes
    const allThemes = new Set();
    timeline.forEach(t => t.themes.forEach(th => allThemes.add(th.toLowerCase().trim())));
    const themes = [...allThemes].slice(0, 12);
    const themeAngle = {};
    themes.forEach((t, i) => {
        themeAngle[t] = (2 * Math.PI * i) / themes.length - Math.PI / 2;
    });

    const colors = [CHART_COLORS.purple, CHART_COLORS.teal, CHART_COLORS.pink, CHART_COLORS.amber, CHART_COLORS.emerald, CHART_COLORS.dream];

    // Draw axis lines and theme labels
    themes.forEach((theme, i) => {
        const angle = themeAngle[theme];
        const ex = cx + Math.cos(angle) * maxRadius;
        const ey = cy + Math.sin(angle) * maxRadius;

        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * innerRadius, cy + Math.sin(angle) * innerRadius);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = "rgba(167, 139, 250, 0.1)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label
        const labelR = maxRadius + 18;
        const lx = cx + Math.cos(angle) * labelR;
        const ly = cy + Math.sin(angle) * labelR;
        ctx.font = "10px -apple-system, sans-serif";
        ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(theme, lx, ly);
    });

    // Concentric rings
    for (let r = 1; r <= 4; r++) {
        const ringR = innerRadius + (maxRadius - innerRadius) * (r / 4);
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(167, 139, 250, 0.05)";
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Draw dream cycles — each dream is a polygon connecting its themes
    timeline.forEach((dream, dreamIdx) => {
        const dreamThemes = dream.themes
            .map(t => t.toLowerCase().trim())
            .filter(t => t in themeAngle);
        if (dreamThemes.length < 2) return;

        const color = colors[dreamIdx % colors.length];
        const ringR = innerRadius + (maxRadius - innerRadius) * (0.3 + dreamIdx * 0.15);

        ctx.beginPath();
        dreamThemes.forEach((theme, i) => {
            const angle = themeAngle[theme];
            const r = Math.min(ringR, maxRadius * 0.9);
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.08)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Dots at vertices
        dreamThemes.forEach(theme => {
            const angle = themeAngle[theme];
            const r = Math.min(ringR, maxRadius * 0.9);
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;

            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`;
            ctx.fill();

            // Glow
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.15)`;
            ctx.fill();
        });
    });

    // Center label
    ctx.font = "bold 11px -apple-system, sans-serif";
    ctx.fillStyle = "rgba(167, 139, 250, 0.6)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Theme", cx, cy - 6);
    ctx.fillText("Cycles", cx, cy + 8);
}

// === 6. EMOTION WAVEFORM ===
function drawEmotionWaveform(canvas, emotionData) {
    const { ctx, w, h } = setupCanvas(canvas);
    if (!emotionData?.length) { drawEmptyState(ctx, w, h, "Dream to see emotional arcs"); return; }

    const padding = { top: 30, right: 30, bottom: 50, left: 50 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const EMOTION_COLORS = {
        curiosity: { r: 6, g: 182, b: 212 },
        wonder: { r: 167, g: 139, b: 250 },
        tension: { r: 236, g: 72, b: 153 },
        surprise: { r: 245, g: 158, b: 11 },
        melancholy: { r: 100, g: 116, b: 139 },
        joy: { r: 16, g: 185, b: 129 },
        awe: { r: 124, g: 58, b: 237 },
        contemplation: { r: 59, g: 130, b: 246 },
        excitement: { r: 249, g: 115, b: 22 },
        peace: { r: 34, g: 197, b: 94 },
        confusion: { r: 239, g: 68, b: 68 },
        revelation: { r: 250, g: 204, b: 21 },
    };

    // Draw grid
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartH / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(w - padding.right, y);
        ctx.strokeStyle = "rgba(167, 139, 250, 0.06)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = "9px -apple-system, sans-serif";
        ctx.fillStyle = "rgba(148, 163, 184, 0.4)";
        ctx.textAlign = "right";
        ctx.fillText(((5 - i) * 20) + "%", padding.left - 8, y + 3);
    }

    // Draw each dream's emotional arc as a layered waveform
    const dreamColors = [CHART_COLORS.purple, CHART_COLORS.teal, CHART_COLORS.pink, CHART_COLORS.dream, CHART_COLORS.amber];

    emotionData.forEach((dream, dreamIdx) => {
        const emotions = dream.emotions;
        if (!emotions?.length) return;

        const color = dreamColors[dreamIdx % dreamColors.length];
        const stepX = chartW / Math.max(emotions.length - 1, 1);

        // Filled area
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + chartH);
        emotions.forEach((em, i) => {
            const x = padding.left + i * stepX;
            const y = padding.top + chartH - em.intensity * chartH;
            if (i === 0) ctx.lineTo(x, y);
            else {
                const prevX = padding.left + (i - 1) * stepX;
                const cpx = (prevX + x) / 2;
                ctx.bezierCurveTo(cpx, ctx._lastY || y, cpx, y, x, y);
            }
            ctx._lastY = y;
        });
        ctx.lineTo(padding.left + (emotions.length - 1) * stepX, padding.top + chartH);
        ctx.closePath();
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.08)`;
        ctx.fill();
        delete ctx._lastY;

        // Line
        ctx.beginPath();
        emotions.forEach((em, i) => {
            const x = padding.left + i * stepX;
            const y = padding.top + chartH - em.intensity * chartH;
            if (i === 0) ctx.moveTo(x, y);
            else {
                const prevX = padding.left + (i - 1) * stepX;
                const cpx = (prevX + x) / 2;
                const prevY = padding.top + chartH - emotions[i - 1].intensity * chartH;
                ctx.bezierCurveTo(cpx, prevY, cpx, y, x, y);
            }
        });
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.7)`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Points and labels
        emotions.forEach((em, i) => {
            const x = padding.left + i * stepX;
            const y = padding.top + chartH - em.intensity * chartH;
            const ec = EMOTION_COLORS[em.emotion] || color;

            // Glow
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${ec.r}, ${ec.g}, ${ec.b}, 0.2)`;
            ctx.fill();

            // Point
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${ec.r}, ${ec.g}, ${ec.b}, 0.8)`;
            ctx.fill();

            // Label
            ctx.font = "8px -apple-system, sans-serif";
            ctx.fillStyle = `rgba(${ec.r}, ${ec.g}, ${ec.b}, 0.7)`;
            ctx.textAlign = "center";
            ctx.save();
            ctx.translate(x, padding.top + chartH + 12);
            ctx.rotate(-0.4);
            ctx.fillText(em.emotion, 0, dreamIdx * 10);
            ctx.restore();
        });
    });

    // Axis labels
    ctx.font = "10px -apple-system, sans-serif";
    ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
    ctx.textAlign = "center";
    ctx.fillText("Emotional Journey →", w / 2, h - 5);
}

// === 7. EMOTION DISTRIBUTION (DONUT) ===
function drawEmotionDonut(canvas, emotionCounts) {
    const { ctx, w, h } = setupCanvas(canvas);
    if (!emotionCounts?.length) { drawEmptyState(ctx, w, h, "Dream to see emotion distribution"); return; }

    const cx = w / 2;
    const cy = h / 2;
    const outerR = Math.min(w, h) * 0.35;
    const innerR = outerR * 0.55;
    const total = emotionCounts.reduce((sum, e) => sum + e.count, 0);

    const palette = [
        { r: 6, g: 182, b: 212 },
        { r: 124, g: 58, b: 237 },
        { r: 236, g: 72, b: 153 },
        { r: 245, g: 158, b: 11 },
        { r: 16, g: 185, b: 129 },
        { r: 167, g: 139, b: 250 },
        { r: 249, g: 115, b: 22 },
        { r: 59, g: 130, b: 246 },
        { r: 250, g: 204, b: 21 },
        { r: 239, g: 68, b: 68 },
        { r: 34, g: 197, b: 94 },
        { r: 100, g: 116, b: 139 },
    ];

    let startAngle = -Math.PI / 2;

    emotionCounts.forEach((em, i) => {
        const sliceAngle = (em.count / total) * Math.PI * 2;
        const c = palette[i % palette.length];

        // Slice
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, startAngle, startAngle + sliceAngle);
        ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.6)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.8)`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label line
        const midAngle = startAngle + sliceAngle / 2;
        const labelR = outerR + 12;
        const lx = cx + Math.cos(midAngle) * labelR;
        const ly = cy + Math.sin(midAngle) * labelR;

        if (sliceAngle > 0.2) {
            const endX = cx + Math.cos(midAngle) * (labelR + 20);
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(midAngle) * outerR, cy + Math.sin(midAngle) * outerR);
            ctx.lineTo(lx, ly);
            ctx.lineTo(endX, ly);
            ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.3)`;
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.font = "9px -apple-system, sans-serif";
            ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.8)`;
            ctx.textAlign = midAngle > Math.PI / 2 && midAngle < Math.PI * 1.5 ? "right" : "left";
            ctx.fillText(`${em.emotion} (${em.count})`, endX + (ctx.textAlign === "left" ? 4 : -4), ly + 3);
        }

        startAngle += sliceAngle;
    });

    // Center text
    ctx.font = "bold 18px -apple-system, sans-serif";
    ctx.fillStyle = "rgba(167, 139, 250, 0.8)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(total, cx, cy - 6);
    ctx.font = "9px -apple-system, sans-serif";
    ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
    ctx.fillText("emotions felt", cx, cy + 12);
}

// === HELPERS ===
function drawEmptyState(ctx, w, h, message) {
    ctx.fillStyle = "rgba(74, 85, 104, 0.5)";
    ctx.font = "13px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, w / 2, h / 2);

    // Subtle decorative circle
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 40, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(124, 58, 237, 0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();
}
