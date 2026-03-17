/* ============================================
   BRIGHTSHIFT - NIGHT TO SUNRISE ENGINE
   ============================================ */

// ---- Color interpolation helpers ----
function lerp(a, b, t) {
    return a + (b - a) * t;
}

function lerpColor(c1, c2, t) {
    return [
        Math.round(lerp(c1[0], c2[0], t)),
        Math.round(lerp(c1[1], c2[1], t)),
        Math.round(lerp(c1[2], c2[2], t))
    ];
}

function rgbStr(c) {
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

// Color stops for the journey
const PALETTE = {
    // Backgrounds
    bgNight:     [6, 6, 11],
    bgDawn:      [15, 10, 25],
    bgSunrise:   [30, 15, 20],
    bgDay:       [25, 20, 15],

    // Accents
    accentNight: [0, 240, 255],     // cyan
    accentDawn:  [200, 120, 255],   // purple-pink
    accentRise:  [255, 150, 50],    // orange
    accentDay:   [255, 190, 60],    // gold

    // Secondary
    secNight:    [123, 97, 255],    // purple
    secDawn:     [255, 100, 150],   // pink
    secRise:     [255, 120, 50],    // deep orange
    secDay:      [255, 160, 30],    // amber

    // Sky gradient colors
    skyTop:      [6, 6, 30],
    skyMid:      [40, 10, 60],
    skyHorizon:  [255, 100, 50],
    skyDayTop:   [40, 60, 100],
    skyDayBot:   [180, 140, 80],

    // Grid dots
    gridNight:   [0, 180, 220],
    gridDay:     [255, 180, 60],
};

// ---- Scroll Progress Engine ----
let scrollProgress = 0;

function updateScrollProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress = Math.min(1, Math.max(0, scrollTop / docHeight));
    document.documentElement.style.setProperty('--scroll-progress', scrollProgress);
}

window.addEventListener('scroll', updateScrollProgress, { passive: true });
window.addEventListener('resize', updateScrollProgress);
updateScrollProgress();

// Multi-stop color interpolation
function multiLerp(stops, t) {
    // stops = [[color, position], ...]
    if (t <= stops[0][1]) return stops[0][0];
    if (t >= stops[stops.length - 1][1]) return stops[stops.length - 1][0];

    for (let i = 0; i < stops.length - 1; i++) {
        if (t >= stops[i][1] && t <= stops[i + 1][1]) {
            const localT = (t - stops[i][1]) / (stops[i + 1][1] - stops[i][1]);
            return lerpColor(stops[i][0], stops[i + 1][0], localT);
        }
    }
    return stops[stops.length - 1][0];
}

// ---- Starfield ----
(function initStarfield() {
    const canvas = document.getElementById('starfield');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h;
    const stars = [];
    const STAR_COUNT = 200;

    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Generate stars
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * 2000,
            y: Math.random() * 2000,
            size: Math.random() * 2 + 0.5,
            twinkleSpeed: 0.5 + Math.random() * 2,
            twinkleOffset: Math.random() * Math.PI * 2,
            brightness: 0.3 + Math.random() * 0.7
        });
    }

    function draw(time) {
        ctx.clearRect(0, 0, w, h);

        // Fade stars out across full scroll (0->0.3 = full stars, 0.3->0.6 = fade out)
        const starOpacity = scrollProgress < 0.3
            ? 1
            : scrollProgress < 0.6
                ? 1 - (scrollProgress - 0.3) / 0.3
                : 0;

        if (starOpacity <= 0) {
            requestAnimationFrame(draw);
            return;
        }

        for (const star of stars) {
            const twinkle = 0.5 + 0.5 * Math.sin(time * 0.001 * star.twinkleSpeed + star.twinkleOffset);
            const alpha = star.brightness * twinkle * starOpacity;

            ctx.beginPath();
            ctx.arc(star.x % w, star.y % h, star.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(220, 230, 255, ${alpha})`;
            ctx.fill();
        }

        requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
})();

// ---- Sky Gradient & Sun ----
(function initSky() {
    const skyGrad = document.getElementById('sky-gradient');
    const sun = document.getElementById('sun');
    const sunCore = sun ? sun.querySelector('.sun-core') : null;
    const sunGlow = sun ? sun.querySelector('.sun-glow') : null;
    const sunRays = sun ? sun.querySelector('.sun-rays') : null;
    const horizon = document.getElementById('horizon');
    if (!skyGrad || !sun) return;

    function update() {
        const p = scrollProgress;

        // Sky gradient: invisible at night, reaches full day at p=1.0
        if (p < 0.15) {
            skyGrad.style.opacity = 0;
        } else {
            const skyP = (p - 0.15) / 0.85; // 0.15 -> 1.0 mapped to 0 -> 1
            skyGrad.style.opacity = Math.min(1, skyP * 1.3); // fade in faster than color shift

            const topColor = multiLerp([
                [PALETTE.skyTop, 0],
                [PALETTE.skyMid, 0.35],
                [PALETTE.skyDayTop, 1]
            ], skyP);

            const bottomColor = multiLerp([
                [PALETTE.skyMid, 0],
                [PALETTE.skyHorizon, 0.35],
                [PALETTE.skyDayBot, 1]
            ], skyP);

            skyGrad.style.background = `linear-gradient(to bottom, ${rgbStr(topColor)}, ${rgbStr(bottomColor)})`;
        }

        // Sun position: rises from below horizon across full scroll
        // Starts at p=0.2, fully risen at p=1.0
        if (p < 0.2) {
            sun.style.bottom = '-400px';
            if (sunCore) sunCore.style.opacity = 0;
            if (sunGlow) sunGlow.style.opacity = 0;
            if (sunRays) sunRays.style.opacity = 0;
        } else {
            const sunP = Math.min(1, (p - 0.2) / 0.8); // 0.2 -> 1.0
            const eased = 1 - Math.pow(1 - sunP, 3);
            const bottomPos = -400 + eased * 650;
            sun.style.bottom = bottomPos + 'px';

            const coreOpacity = Math.min(1, sunP * 1.5);
            if (sunCore) sunCore.style.opacity = coreOpacity;
            if (sunGlow) sunGlow.style.opacity = coreOpacity * 0.8;
            if (sunRays) sunRays.style.opacity = Math.max(0, (sunP - 0.4) / 0.6) * 0.6;
        }

        // Horizon glow — appears mid-scroll, fades at the very end
        if (horizon) {
            const hP = Math.max(0, Math.min(1, (p - 0.15) / 0.35));
            const hFade = p > 0.8 ? Math.max(0, 1 - (p - 0.8) / 0.2) : 1;
            horizon.style.background = `linear-gradient(to right, transparent, rgba(255, 140, 50, ${0.5 * hP * hFade}), rgba(255, 200, 100, ${0.8 * hP * hFade}), rgba(255, 140, 50, ${0.5 * hP * hFade}), transparent)`;
            horizon.style.height = (2 + hP * 3) + 'px';
            horizon.style.boxShadow = `0 0 ${40 * hP * hFade}px ${20 * hP * hFade}px rgba(255, 150, 50, ${0.3 * hP * hFade})`;
        }

        requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
})();

// ---- Dynamic Accent Colors ----
(function initDynamicColors() {
    const root = document.documentElement;
    const nav = document.querySelector('.nav');

    function update() {
        const p = scrollProgress;

        // Accent color transition — spans full scroll
        const accent = multiLerp([
            [PALETTE.accentNight, 0],
            [PALETTE.accentDawn, 0.35],
            [PALETTE.accentRise, 0.65],
            [PALETTE.accentDay, 1.0]
        ], p);

        const secondary = multiLerp([
            [PALETTE.secNight, 0],
            [PALETTE.secDawn, 0.35],
            [PALETTE.secRise, 0.65],
            [PALETTE.secDay, 1.0]
        ], p);

        root.style.setProperty('--accent', rgbStr(accent));
        root.style.setProperty('--accent-secondary', rgbStr(secondary));
        root.style.setProperty('--border-glow', `rgba(${accent[0]}, ${accent[1]}, ${accent[2]}, 0.15)`);

        // Nav background adapts
        if (nav) {
            const bg = multiLerp([
                [PALETTE.bgNight, 0],
                [PALETTE.bgDawn, 0.35],
                [PALETTE.bgSunrise, 0.65],
                [PALETTE.bgDay, 1.0]
            ], p);
            nav.style.background = `rgba(${bg[0]}, ${bg[1]}, ${bg[2]}, 0.85)`;
        }

        // Card backgrounds adapt subtly
        const cardBg = multiLerp([
            [[15, 15, 26], 0],
            [[20, 15, 25], 0.4],
            [[25, 18, 18], 0.7],
            [[30, 25, 18], 1.0]
        ], p);

        root.style.setProperty('--bg-card', rgbStr(cardBg));

        const elevBg = multiLerp([
            [[12, 12, 20], 0],
            [[18, 14, 22], 0.5],
            [[25, 20, 16], 1.0]
        ], p);
        root.style.setProperty('--bg-elevated', rgbStr(elevBg));

        requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
})();

// ---- Grid Canvas (color shifts with scroll) ----
(function initGrid() {
    const canvas = document.getElementById('grid-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, mouseX = -1000, mouseY = -1000;

    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function draw() {
        ctx.clearRect(0, 0, w, h);
        const spacing = 60;
        const cols = Math.ceil(w / spacing) + 1;
        const rows = Math.ceil(h / spacing) + 1;

        const dotColor = multiLerp([
            [PALETTE.gridNight, 0],
            [PALETTE.accentDawn, 0.45],
            [PALETTE.gridDay, 1.0]
        ], scrollProgress);

        // Fade grid out during sunrise drama, fade back in
        const gridOpacity = scrollProgress < 0.4
            ? 0.4
            : scrollProgress < 0.6
                ? 0.4 - (scrollProgress - 0.4) * 1.5
                : scrollProgress < 0.8
                    ? 0.1 + (scrollProgress - 0.6) * 1.25
                    : 0.35;

        canvas.style.opacity = gridOpacity;

        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const x = i * spacing;
                const y = j * spacing;
                const dx = mouseX - x;
                const dy = mouseY - y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = 200;
                const intensity = Math.max(0, 1 - dist / maxDist);

                ctx.beginPath();
                ctx.arc(x, y, 1 + intensity * 2, 0, Math.PI * 2);
                const alpha = 0.06 + intensity * 0.3;
                ctx.fillStyle = `rgba(${dotColor[0]}, ${dotColor[1]}, ${dotColor[2]}, ${alpha})`;
                ctx.fill();
            }
        }
        requestAnimationFrame(draw);
    }
    draw();
})();

// ---- Transition Text Reveal ----
(function initFadeLines() {
    const lines = document.querySelectorAll('.fade-line');
    if (!lines.length) return;

    function getProgress() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        return Math.min(1, Math.max(0, scrollTop / docHeight));
    }

    function update() {
        const p = getProgress();
        lines.forEach(line => {
            const revealAt = parseFloat(line.dataset.reveal);
            const fadeRange = 0.03;
            let op;
            if (p < revealAt) {
                op = 0.12;
            } else if (p < revealAt + fadeRange) {
                op = 0.12 + 0.88 * ((p - revealAt) / fadeRange);
            } else {
                op = 1;
            }
            line.style.opacity = op;
            line.style.color = '#ffffff';
        });
        requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
})();

// ---- Examples Carousel ----
(function initCarousel() {
    const track = document.querySelector('.carousel-track');
    const dots = document.querySelectorAll('.carousel-dot');
    const prevBtn = document.querySelector('.carousel-prev');
    const nextBtn = document.querySelector('.carousel-next');
    if (!track || !dots.length) return;

    const slideCount = dots.length;
    let current = 0;
    let autoTimer = null;

    function goTo(idx) {
        current = Math.max(0, Math.min(idx, slideCount - 1));
        track.style.transform = `translateX(-${current * 100}%)`;
        dots.forEach((d, i) => d.classList.toggle('active', i === current));
        if (prevBtn) prevBtn.disabled = current === 0;
        if (nextBtn) nextBtn.disabled = current === slideCount - 1;

        // Trigger/stop slide-specific animations
        if (window._webappBuild) {
            if (current === 1) window._webappBuild.start();
            else window._webappBuild.stop();
        }

        // Reset auto-advance timer (per-slide durations)
        const slideDurations = [4000, 7000, 8000]; // report, webapp, KB
        clearTimeout(autoTimer);
        autoTimer = setTimeout(() => {
            goTo((current + 1) % slideCount);
        }, slideDurations[current] || 6000);
    }

    dots.forEach(dot => {
        dot.addEventListener('click', () => goTo(parseInt(dot.dataset.slide)));
    });

    if (prevBtn) prevBtn.addEventListener('click', () => goTo(current - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goTo(current + 1));

    // Set initial arrow state
    goTo(0);

    // Swipe support
    let startX = 0, diff = 0;
    track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchmove', e => { diff = e.touches[0].clientX - startX; }, { passive: true });
    track.addEventListener('touchend', () => {
        if (Math.abs(diff) > 50) {
            if (diff < 0 && current < dots.length - 1) goTo(current + 1);
            else if (diff > 0 && current > 0) goTo(current - 1);
        }
        diff = 0;
    });

    // Mouse drag support
    let mouseDown = false, mouseStartX = 0, mouseDiff = 0;
    track.addEventListener('mousedown', e => { mouseDown = true; mouseStartX = e.clientX; track.style.cursor = 'grabbing'; });
    window.addEventListener('mousemove', e => { if (mouseDown) mouseDiff = e.clientX - mouseStartX; });
    window.addEventListener('mouseup', () => {
        if (mouseDown && Math.abs(mouseDiff) > 50) {
            if (mouseDiff < 0 && current < dots.length - 1) goTo(current + 1);
            else if (mouseDiff > 0 && current > 0) goTo(current - 1);
        }
        mouseDown = false; mouseDiff = 0; track.style.cursor = '';
    });
})();

// ---- Knowledge Base Chat Animation (cycling Q&A) ----
(function initKBChat() {
    const chatBody = document.getElementById('kb-chat-body');
    if (!chatBody) return;

    const qaPairs = [
        { q: "What's our leave policy?", a: "Employees get 20 days annual leave. Unused days carry over up to 5. Request via HR portal 2 weeks ahead." },
        { q: "What was the main TODO from last week's meeting?", a: "Finalise the Q3 budget proposal and send it to Sarah by Friday. Jake is handling the vendor comparison." },
        { q: "How do I request new equipment?", a: "Fill out the Equipment Request form on the intranet. Needs manager approval for items over R5,000. Typical turnaround is 3-5 days." },
        { q: "What's the process for onboarding a new client?", a: "1) Signed SOW in shared drive. 2) Create project in Monday.com. 3) Intro call within 48hrs. 4) Kick-off doc from the template." },
    ];

    let currentIdx = 0;
    let generation = 0; // prevents stale loops from continuing

    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    async function showQA(idx, gen) {
        const pair = qaPairs[idx];

        // Clear previous
        chatBody.innerHTML = '';

        // Type out user question
        const userMsg = document.createElement('div');
        userMsg.className = 'chat-msg user';
        userMsg.innerHTML = '<span></span>';
        chatBody.appendChild(userMsg);
        const userSpan = userMsg.querySelector('span');
        for (let i = 0; i < pair.q.length; i++) {
            if (gen !== generation) return; // stale loop, bail out
            userSpan.textContent += pair.q[i];
            await sleep(25);
        }

        if (gen !== generation) return;
        await sleep(400);

        // Show AI typing
        if (gen !== generation) return;
        const aiMsg = document.createElement('div');
        aiMsg.className = 'chat-msg ai';
        aiMsg.innerHTML = '<div class="chat-typing"><span></span><span></span><span></span></div><span class="chat-answer-text"></span>';
        chatBody.appendChild(aiMsg);
        chatBody.scrollTop = chatBody.scrollHeight;

        await sleep(1500);
        if (gen !== generation) return;

        // Replace typing with answer
        const typingEl = aiMsg.querySelector('.chat-typing');
        const answerEl = aiMsg.querySelector('.chat-answer-text');
        typingEl.style.display = 'none';
        answerEl.textContent = pair.a;
        answerEl.style.display = 'inline';
        chatBody.scrollTop = chatBody.scrollHeight;

        await sleep(3500);
        if (gen !== generation) return;

        // Next question
        currentIdx = (currentIdx + 1) % qaPairs.length;
        showQA(currentIdx, gen);
    }

    // Start when visible, kill old loop when hidden
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            generation++; // kill any old loop
            showQA(currentIdx, generation);
        } else {
            generation++; // kill current loop
        }
    }, { threshold: 0.2 });

    const kbDemo = document.querySelector('.kb-demo');
    if (kbDemo) observer.observe(kbDemo);
})();

// ---- Webapp Build Animation ----
// Exposed globally so the carousel can trigger it
window._webappBuild = {
    generation: 0,
    start: function() {
        const demo = document.querySelector('.webapp-demo');
        if (!demo) return;
        const reqs = demo.querySelectorAll('.req-card');
        const parts = demo.querySelectorAll('.build-part');
        const self = this;
        self.generation++;
        const gen = self.generation;

        function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

        async function runBuild() {
            reqs.forEach(r => r.classList.remove('active-build'));
            parts.forEach(p => p.classList.remove('built'));

            await sleep(400);

            for (let i = 0; i < reqs.length; i++) {
                if (gen !== self.generation) return;
                reqs[i].classList.add('active-build');
                await sleep(250);
                if (gen !== self.generation) return;
                parts.forEach(p => {
                    if (parseInt(p.dataset.step) === i) p.classList.add('built');
                });
                await sleep(500);
                if (gen !== self.generation) return;
                reqs[i].classList.remove('active-build');
            }

            await sleep(2000);
            if (gen !== self.generation) return;
            runBuild();
        }

        runBuild();
    },
    stop: function() {
        this.generation++;
    }
};

// ---- Knowledge Base Connecting Lines ----
(function initKBLines() {
    const canvas = document.getElementById('kb-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const docs = document.querySelectorAll('.kb-doc');
    const brain = document.querySelector('.brain-core');
    const chat = document.querySelector('.chat-window');
    if (!docs.length || !brain || !chat) return;

    let particles = [];
    let w, h, running = false;

    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        w = canvas.width = rect.width;
        h = canvas.height = rect.height;
    }

    function getCenter(el) {
        const canvasRect = canvas.getBoundingClientRect();
        const rect = el.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2 - canvasRect.left,
            y: rect.top + rect.height / 2 - canvasRect.top
        };
    }

    function spawnParticle() {
        const docIdx = Math.floor(Math.random() * docs.length);
        const from = getCenter(docs[docIdx]);
        const brainPos = getCenter(brain);
        const chatPos = getCenter(chat);

        particles.push({
            x: from.x, y: from.y,
            phase: 0,
            fromX: from.x, fromY: from.y,
            brainX: brainPos.x, brainY: brainPos.y,
            chatX: chatPos.x, chatY: chatPos.y,
            progress: 0,
            speed: 0.007 + Math.random() * 0.005,
            size: 1.5 + Math.random() * 1.5,
        });
    }

    function draw() {
        if (!running) return;
        ctx.clearRect(0, 0, w, h);
        resize();

        const brainPos = getCenter(brain);
        const chatPos = getCenter(chat);

        // Draw faint lines from docs to brain
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        docs.forEach(doc => {
            const from = getCenter(doc);
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(brainPos.x, brainPos.y);
            ctx.stroke();
        });

        // Brain to chat
        ctx.beginPath();
        ctx.moveTo(brainPos.x, brainPos.y);
        ctx.lineTo(chatPos.x, chatPos.y);
        ctx.stroke();

        // Spawn particles
        if (Math.random() < 0.06) spawnParticle();

        // Update & draw particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.progress += p.speed;

            if (p.phase === 0) {
                const t = Math.min(1, p.progress);
                const e = t * t * (3 - 2 * t);
                p.x = p.fromX + (p.brainX - p.fromX) * e;
                p.y = p.fromY + (p.brainY - p.fromY) * e;

                if (t >= 1) { p.phase = 1; p.progress = 0; }

                const alpha = 0.3 + 0.4 * Math.sin(e * Math.PI);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(123, 97, 255, ${alpha})`;
                ctx.fill();
            } else {
                const t = Math.min(1, p.progress);
                const e = t * t * (3 - 2 * t);
                p.x = p.brainX + (p.chatX - p.brainX) * e;
                p.y = p.brainY + (p.chatY - p.brainY) * e;

                if (t >= 1) { particles.splice(i, 1); continue; }

                const alpha = 0.4 + 0.3 * Math.sin(e * Math.PI);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 240, 255, ${alpha})`;
                ctx.fill();
            }
        }

        if (particles.length > 25) particles.splice(0, particles.length - 25);
        requestAnimationFrame(draw);
    }

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !running) {
            running = true; resize(); requestAnimationFrame(draw);
        } else if (!entries[0].isIntersecting) {
            running = false;
        }
    }, { threshold: 0.2 });

    observer.observe(canvas.parentElement);
    window.addEventListener('resize', resize);
})();

// ---- Flow Demo (Report Generation Animation) ----
(function initFlowDemo() {
    const canvas = document.getElementById('flow-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const sources = document.querySelectorAll('.flow-source');
    const hub = document.querySelector('.hub-core');
    const report = document.querySelector('.report-card');
    if (!sources.length || !hub || !report) return;

    let particles = [];
    let w, h;
    let running = false;

    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        w = canvas.width = rect.width;
        h = canvas.height = rect.height;
    }

    function getCenter(el) {
        const canvasRect = canvas.getBoundingClientRect();
        const rect = el.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2 - canvasRect.left,
            y: rect.top + rect.height / 2 - canvasRect.top
        };
    }

    function spawnParticle() {
        const sourceIdx = Math.floor(Math.random() * sources.length);
        const from = getCenter(sources[sourceIdx]);
        const hubPos = getCenter(hub);
        const reportPos = getCenter(report);

        // Source colors
        const colors = ['#00f0ff', '#7b61ff', '#4d7cff', '#ff6b9d'];
        const color = colors[sourceIdx % colors.length];

        particles.push({
            x: from.x, y: from.y,
            phase: 0, // 0 = to hub, 1 = to report
            fromX: from.x, fromY: from.y,
            hubX: hubPos.x, hubY: hubPos.y,
            reportX: reportPos.x, reportY: reportPos.y,
            progress: 0,
            speed: 0.008 + Math.random() * 0.006,
            size: 2 + Math.random() * 2,
            color: color,
            outputColor: '#ffbe3c'
        });
    }

    function draw() {
        if (!running) return;
        ctx.clearRect(0, 0, w, h);
        resize();

        // Draw faint connection lines
        const hubPos = getCenter(hub);
        const reportPos = getCenter(report);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;

        sources.forEach(src => {
            const from = getCenter(src);
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            // Curved line to hub
            const cpx = (from.x + hubPos.x) / 2;
            const cpy = from.y + (hubPos.y - from.y) * 0.1;
            ctx.quadraticCurveTo(cpx, cpy, hubPos.x, hubPos.y);
            ctx.stroke();
        });

        // Hub to report line
        ctx.beginPath();
        ctx.moveTo(hubPos.x, hubPos.y);
        ctx.lineTo(reportPos.x, reportPos.y);
        ctx.stroke();

        // Spawn new particles
        if (Math.random() < 0.08) spawnParticle();

        // Update & draw particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.progress += p.speed;

            if (p.phase === 0) {
                // Moving to hub
                const t = Math.min(1, p.progress);
                const eased = t * t * (3 - 2 * t); // smoothstep
                p.x = p.fromX + (p.hubX - p.fromX) * eased;
                p.y = p.fromY + (p.hubY - p.fromY) * eased;
                // Add slight curve
                const curve = Math.sin(eased * Math.PI) * 15;
                p.x += curve * (p.fromY > p.hubY ? -1 : 1) * 0.3;

                if (t >= 1) {
                    p.phase = 1;
                    p.progress = 0;
                    p.fromX = p.hubX;
                    p.fromY = p.hubY;
                }

                // Draw with source color
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                const alpha = 0.4 + 0.4 * Math.sin(eased * Math.PI);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = alpha;
                ctx.fill();
                // Glow
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = alpha * 0.15;
                ctx.fill();
                ctx.globalAlpha = 1;

            } else {
                // Moving to report (golden color)
                const t = Math.min(1, p.progress);
                const eased = t * t * (3 - 2 * t);
                p.x = p.fromX + (p.reportX - p.fromX) * eased;
                p.y = p.fromY + (p.reportY - p.fromY) * eased;

                if (t >= 1) {
                    particles.splice(i, 1);
                    continue;
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
                const alpha = 0.5 + 0.3 * Math.sin(eased * Math.PI);
                ctx.fillStyle = p.outputColor;
                ctx.globalAlpha = alpha;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = p.outputColor;
                ctx.globalAlpha = alpha * 0.12;
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        // Cap particles
        if (particles.length > 30) particles.splice(0, particles.length - 30);

        requestAnimationFrame(draw);
    }

    // Start when visible
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !running) {
            running = true;
            resize();
            requestAnimationFrame(draw);
        } else if (!entries[0].isIntersecting) {
            running = false;
        }
    }, { threshold: 0.2 });

    observer.observe(canvas.parentElement);
    window.addEventListener('resize', resize);
})();

// ---- Mobile Nav ----
(function initMobileNav() {
    const toggle = document.querySelector('.mobile-toggle');
    const links = document.querySelector('.nav-links');
    if (!toggle || !links) return;

    toggle.addEventListener('click', () => {
        links.classList.toggle('active');
    });

    links.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
            links.classList.remove('active');
        });
    });
})();

// ---- Scroll Reveal ----
(function initScrollReveal() {
    const elements = document.querySelectorAll(
        '.service-card, .process-step, .about-text, .about-visual, .stat, .contact-card'
    );

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.02, rootMargin: '0px 0px 0px 0px' });

    elements.forEach(el => observer.observe(el));
})();

// ---- Counter Animation ----
(function initCounters() {
    const counters = document.querySelectorAll('.stat-number');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.dataset.target);
                const duration = 2000;
                const start = performance.now();

                function update(now) {
                    const elapsed = now - start;
                    const progress = Math.min(elapsed / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    el.textContent = Math.round(target * eased);
                    if (progress < 1) requestAnimationFrame(update);
                }

                requestAnimationFrame(update);
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(c => observer.observe(c));
})();

// ---- Terminal Typewriter ----
(function initTerminal() {
    const typewriter = document.getElementById('typewriter');
    const output = document.getElementById('terminal-output');
    if (!typewriter || !output) return;

    const sequences = [
        {
            cmd: 'brightshift --analyze "daily-tasks"',
            output: [
                '<span class="t-info">Scanning your workflows...</span>',
                '<span class="t-success">Found 12 automatable tasks</span>',
                '<span class="t-purple">Time you get back: 15hrs/week</span>',
            ]
        },
        {
            cmd: 'brightshift --deploy "email-sorter"',
            output: [
                '<span class="t-info">Building AI assistant...</span>',
                '<span class="t-info">Connecting to your inbox...</span>',
                '<span class="t-success">Live! Emails auto-sorted</span>',
                '<span class="t-purple">You: sipping coffee instead</span>',
            ]
        },
        {
            cmd: 'brightshift --status',
            output: [
                '<span class="t-success">All 5 workflows running</span>',
                '<span class="t-info">Tasks automated today: 47</span>',
                '<span class="t-purple">Hours saved this month: 62</span>',
            ]
        }
    ];

    let seqIndex = 0;

    async function typeText(text) {
        typewriter.textContent = '';
        for (let i = 0; i < text.length; i++) {
            typewriter.textContent += text[i];
            await sleep(30 + Math.random() * 40);
        }
    }

    async function showOutput(lines) {
        output.innerHTML = '';
        for (const line of lines) {
            await sleep(400);
            output.innerHTML += '<div>' + line + '</div>';
        }
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function runSequence() {
        const seq = sequences[seqIndex % sequences.length];
        await typeText(seq.cmd);
        await sleep(300);
        await showOutput(seq.output);
        await sleep(3000);
        seqIndex++;
        runSequence();
    }

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            runSequence();
            observer.disconnect();
        }
    }, { threshold: 0.3 });

    observer.observe(document.querySelector('.terminal'));
})();

// ---- Smooth Scroll ----
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});
