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

        // Fade stars out as sun rises (0->0.3 = full stars, 0.3->0.55 = fade out)
        const starOpacity = scrollProgress < 0.2
            ? 1
            : scrollProgress < 0.5
                ? 1 - (scrollProgress - 0.2) / 0.3
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

        // Sky gradient: invisible at night, fades in at dawn
        if (p < 0.1) {
            skyGrad.style.opacity = 0;
        } else if (p < 0.6) {
            const skyP = (p - 0.1) / 0.5;
            skyGrad.style.opacity = skyP;

            const topColor = multiLerp([
                [PALETTE.skyTop, 0],
                [PALETTE.skyMid, 0.4],
                [PALETTE.skyDayTop, 1]
            ], skyP);

            const bottomColor = multiLerp([
                [PALETTE.skyMid, 0],
                [PALETTE.skyHorizon, 0.4],
                [PALETTE.skyDayBot, 1]
            ], skyP);

            skyGrad.style.background = `linear-gradient(to bottom, ${rgbStr(topColor)}, ${rgbStr(bottomColor)})`;
        } else {
            skyGrad.style.opacity = 1;
            skyGrad.style.background = `linear-gradient(to bottom, ${rgbStr(PALETTE.skyDayTop)}, ${rgbStr(PALETTE.skyDayBot)})`;
        }

        // Sun position: rises from below horizon
        // Starts appearing at p=0.2, fully risen by p=0.7
        if (p < 0.15) {
            sun.style.bottom = '-400px';
            if (sunCore) sunCore.style.opacity = 0;
            if (sunGlow) sunGlow.style.opacity = 0;
            if (sunRays) sunRays.style.opacity = 0;
        } else {
            const sunP = Math.min(1, (p - 0.15) / 0.55);
            const eased = 1 - Math.pow(1 - sunP, 3); // ease out cubic
            const bottomPos = -400 + eased * 650; // -400 to 250
            sun.style.bottom = bottomPos + 'px';

            const coreOpacity = Math.min(1, sunP * 1.5);
            if (sunCore) sunCore.style.opacity = coreOpacity;
            if (sunGlow) sunGlow.style.opacity = coreOpacity * 0.8;
            if (sunRays) sunRays.style.opacity = Math.max(0, (sunP - 0.3) / 0.7) * 0.6;
        }

        // Horizon glow
        if (horizon) {
            const hP = Math.max(0, Math.min(1, (p - 0.1) / 0.3));
            const hFade = p > 0.6 ? Math.max(0, 1 - (p - 0.6) / 0.3) : 1;
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

        // Accent color transition
        const accent = multiLerp([
            [PALETTE.accentNight, 0],
            [PALETTE.accentDawn, 0.25],
            [PALETTE.accentRise, 0.5],
            [PALETTE.accentDay, 0.75]
        ], p);

        const secondary = multiLerp([
            [PALETTE.secNight, 0],
            [PALETTE.secDawn, 0.25],
            [PALETTE.secRise, 0.5],
            [PALETTE.secDay, 0.75]
        ], p);

        root.style.setProperty('--accent', rgbStr(accent));
        root.style.setProperty('--accent-secondary', rgbStr(secondary));
        root.style.setProperty('--border-glow', `rgba(${accent[0]}, ${accent[1]}, ${accent[2]}, 0.15)`);

        // Nav background adapts
        if (nav) {
            const bg = multiLerp([
                [PALETTE.bgNight, 0],
                [PALETTE.bgDawn, 0.3],
                [PALETTE.bgSunrise, 0.5],
                [PALETTE.bgDay, 0.8]
            ], p);
            nav.style.background = `rgba(${bg[0]}, ${bg[1]}, ${bg[2]}, 0.85)`;
        }

        // Card backgrounds adapt subtly
        const cardBg = multiLerp([
            [[15, 15, 26], 0],
            [[20, 15, 25], 0.3],
            [[25, 18, 18], 0.6],
            [[30, 25, 18], 0.9]
        ].map(([c, p]) => [c, p]), p);

        root.style.setProperty('--bg-card', rgbStr(cardBg));

        const elevBg = multiLerp([
            [[12, 12, 20], 0],
            [[18, 14, 22], 0.4],
            [[25, 20, 16], 0.8]
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
            [PALETTE.accentDawn, 0.3],
            [PALETTE.gridDay, 0.7]
        ], scrollProgress);

        // Fade grid out during peak sunrise for drama, fade back in
        const gridOpacity = scrollProgress < 0.3
            ? 0.4
            : scrollProgress < 0.5
                ? 0.4 - (scrollProgress - 0.3) * 1.5
                : scrollProgress < 0.65
                    ? 0.1 + (scrollProgress - 0.5) * 1.5
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

    function update() {
        lines.forEach(line => {
            const revealAt = parseFloat(line.dataset.reveal);
            if (scrollProgress >= revealAt) {
                line.classList.add('revealed');
            } else {
                line.classList.remove('revealed');
            }
        });
        requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
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
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

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
