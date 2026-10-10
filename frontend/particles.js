class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.particles = [];
        this.connections = [];
        this.mode = "idle"; // idle, active, dreaming
        this.dreamOrbs = [];
        this.dreamConnections = [];
        this.hue = 260; // purple base
        this.animId = null;
        this.resize();
        window.addEventListener("resize", () => this.resize());
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = this.width + "px";
        this.canvas.style.height = this.height + "px";
        this.ctx.scale(dpr, dpr);
        if (this.particles.length === 0) this.initParticles();
    }

    initParticles() {
        this.particles = [];
        const count = Math.min(80, Math.floor((this.width * this.height) / 12000));
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 2 + 1,
                opacity: Math.random() * 0.5 + 0.1,
                pulse: Math.random() * Math.PI * 2,
            });
        }
    }

    setMode(mode) {
        this.mode = mode;
    }

    addDreamOrb(text, x, y) {
        this.dreamOrbs.push({
            x: x || Math.random() * this.width * 0.6 + this.width * 0.2,
            y: y || Math.random() * this.height * 0.6 + this.height * 0.2,
            targetX: Math.random() * this.width * 0.6 + this.width * 0.2,
            targetY: Math.random() * this.height * 0.6 + this.height * 0.2,
            radius: 6 + Math.random() * 12,
            text: text.substring(0, 30),
            opacity: 0,
            hue: 260 + Math.random() * 60,
            born: Date.now(),
        });
    }

    connectDreamOrbs(i, j) {
        if (i < this.dreamOrbs.length && j < this.dreamOrbs.length) {
            this.dreamConnections.push({
                from: i,
                to: j,
                opacity: 0,
                born: Date.now(),
            });
        }
    }

    clearDreamOrbs() {
        this.dreamOrbs = [];
        this.dreamConnections = [];
    }

    update() {
        const speed = this.mode === "dreaming" ? 2.5 : this.mode === "active" ? 1.5 : 1;
        const time = Date.now() * 0.001;

        for (const p of this.particles) {
            p.pulse += 0.02;
            p.x += p.vx * speed;
            p.y += p.vy * speed;

            if (this.mode === "dreaming") {
                const cx = this.width / 2;
                const cy = this.height / 2;
                p.vx += (cx - p.x) * 0.00005;
                p.vy += (cy - p.y) * 0.00005;
            }

            if (p.x < 0) { p.x = 0; p.vx *= -1; }
            if (p.x > this.width) { p.x = this.width; p.vx *= -1; }
            if (p.y < 0) { p.y = 0; p.vy *= -1; }
            if (p.y > this.height) { p.y = this.height; p.vy *= -1; }
        }

        for (const orb of this.dreamOrbs) {
            orb.opacity = Math.min(1, orb.opacity + 0.02);
            orb.x += (orb.targetX - orb.x) * 0.02;
            orb.y += (orb.targetY - orb.y) * 0.02;
        }

        for (const conn of this.dreamConnections) {
            conn.opacity = Math.min(0.6, conn.opacity + 0.01);
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        const time = Date.now() * 0.001;
        const connectDist = this.mode === "dreaming" ? 180 : 120;

        // Draw connections between nearby particles
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const a = this.particles[i];
                const b = this.particles[j];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < connectDist) {
                    const alpha = (1 - dist / connectDist) * 0.15;
                    const hue = this.mode === "dreaming" ? 270 : 220;
                    this.ctx.beginPath();
                    this.ctx.moveTo(a.x, a.y);
                    this.ctx.lineTo(b.x, b.y);
                    this.ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${alpha})`;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.stroke();
                }
            }
        }

        // Draw particles
        for (const p of this.particles) {
            const pulseSize = p.size + Math.sin(p.pulse) * 0.5;
            const hue = this.mode === "dreaming" ? 280 : this.mode === "active" ? 250 : 220;
            const glow = this.mode === "dreaming" ? 0.6 : 0.3;

            // Glow
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, pulseSize * 3, 0, Math.PI * 2);
            this.ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${p.opacity * glow * 0.3})`;
            this.ctx.fill();

            // Core
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, pulseSize, 0, Math.PI * 2);
            this.ctx.fillStyle = `hsla(${hue}, 80%, 80%, ${p.opacity * 0.8})`;
            this.ctx.fill();
        }

        // Draw dream orbs
        for (const orb of this.dreamOrbs) {
            if (orb.opacity <= 0) continue;

            // Outer glow
            const gradient = this.ctx.createRadialGradient(
                orb.x, orb.y, 0, orb.x, orb.y, orb.radius * 3
            );
            gradient.addColorStop(0, `hsla(${orb.hue}, 80%, 70%, ${orb.opacity * 0.3})`);
            gradient.addColorStop(1, `hsla(${orb.hue}, 80%, 70%, 0)`);
            this.ctx.beginPath();
            this.ctx.arc(orb.x, orb.y, orb.radius * 3, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();

            // Inner orb
            const pulse = Math.sin(Date.now() * 0.003 + orb.born) * 2;
            this.ctx.beginPath();
            this.ctx.arc(orb.x, orb.y, orb.radius + pulse, 0, Math.PI * 2);
            this.ctx.fillStyle = `hsla(${orb.hue}, 70%, 60%, ${orb.opacity * 0.6})`;
            this.ctx.fill();
            this.ctx.strokeStyle = `hsla(${orb.hue}, 80%, 80%, ${orb.opacity * 0.8})`;
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();

            // Label
            this.ctx.font = "10px -apple-system, sans-serif";
            this.ctx.fillStyle = `hsla(0, 0%, 90%, ${orb.opacity * 0.7})`;
            this.ctx.textAlign = "center";
            this.ctx.fillText(orb.text, orb.x, orb.y + orb.radius + 16);
        }

        // Draw dream connections
        for (const conn of this.dreamConnections) {
            const a = this.dreamOrbs[conn.from];
            const b = this.dreamOrbs[conn.to];
            if (!a || !b) continue;

            this.ctx.beginPath();
            this.ctx.moveTo(a.x, a.y);
            // Curved line
            const mx = (a.x + b.x) / 2 + (Math.random() - 0.5) * 20;
            const my = (a.y + b.y) / 2 + (Math.random() - 0.5) * 20;
            this.ctx.quadraticCurveTo(mx, my, b.x, b.y);
            this.ctx.strokeStyle = `hsla(280, 70%, 70%, ${conn.opacity})`;
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
        }
    }

    animate() {
        this.update();
        this.draw();
        this.animId = requestAnimationFrame(() => this.animate());
    }

    start() {
        if (!this.animId) this.animate();
    }

    stop() {
        if (this.animId) {
            cancelAnimationFrame(this.animId);
            this.animId = null;
        }
    }
}
