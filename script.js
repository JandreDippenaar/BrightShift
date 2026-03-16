/* ============================================
   AI CONSULTING - INTERACTIVE SCRIPTS
   ============================================ */

// ---- Grid Canvas Background ----
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
                const alpha = 0.06 + intensity * 0.25;
                const r = Math.round(0 + intensity * 0);
                const g = Math.round(240 * intensity);
                const b = Math.round(255 * intensity);
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                ctx.fill();
            }
        }
        requestAnimationFrame(draw);
    }
    draw();
})();

// ---- Floating Particles ----
(function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    const count = 30;

    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.top = Math.random() * 100 + '%';
        p.style.animationDelay = Math.random() * 8 + 's';
        p.style.animationDuration = (6 + Math.random() * 6) + 's';

        const colors = ['#00f0ff', '#7b61ff', '#4d7cff'];
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.width = (1 + Math.random() * 2) + 'px';
        p.style.height = p.style.width;

        container.appendChild(p);
    }
})();

// ---- Mobile Nav Toggle ----
(function initMobileNav() {
    const toggle = document.querySelector('.mobile-toggle');
    const links = document.querySelector('.nav-links');
    if (!toggle || !links) return;

    toggle.addEventListener('click', () => {
        links.classList.toggle('active');
        toggle.classList.toggle('active');
    });

    links.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
            links.classList.remove('active');
            toggle.classList.remove('active');
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
            cmd: 'ai workflow --analyze --target="daily-tasks"',
            output: [
                '<span class="t-info">Scanning workflows...</span>',
                '<span class="t-success">Found 12 automatable tasks</span>',
                '<span class="t-purple">Estimated time saved: 15hrs/week</span>',
            ]
        },
        {
            cmd: 'ai deploy --agent="document-processor"',
            output: [
                '<span class="t-info">Building agent pipeline...</span>',
                '<span class="t-info">Connecting to knowledge base...</span>',
                '<span class="t-success">Agent deployed successfully</span>',
                '<span class="t-purple">Processing speed: 50x manual</span>',
            ]
        },
        {
            cmd: 'ai optimize --pipeline="customer-support"',
            output: [
                '<span class="t-info">Analyzing support tickets...</span>',
                '<span class="t-success">AI routing enabled for 80% of tickets</span>',
                '<span class="t-purple">Response time: 2hrs -> 30sec</span>',
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

    // Start when terminal is visible
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            runSequence();
            observer.disconnect();
        }
    }, { threshold: 0.3 });

    observer.observe(document.querySelector('.terminal'));
})();

// ---- Smooth Scroll for anchor links ----
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// ---- Navbar background on scroll ----
(function initNavScroll() {
    const nav = document.querySelector('.nav');
    if (!nav) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.style.borderBottomColor = 'rgba(0, 240, 255, 0.08)';
        } else {
            nav.style.borderBottomColor = 'rgba(255, 255, 255, 0.06)';
        }
    });
})();
