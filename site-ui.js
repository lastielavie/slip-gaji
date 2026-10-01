/* Canonical global site UI. */

/* Section: Theme picker */
(function () {
    'use strict';

    var STORAGE_KEY = 'pandorastack_theme';
    var GRID_KEY = 'pandorastack_grid';
    var MAGNETIC_KEY = 'pandorastack_magnetic';
    var DEFAULT_THEME = 'light';

    var THEMES = [
        { id: 'light',           label: 'Default',         mode: 'light', bg: '#fafafa', surface: '#ffffff', text: '#18181b', accent: '#2563eb' },
        { id: 'solarized-light', label: 'Solarized',       mode: 'light', bg: '#fdf6e3', surface: '#fffbf0', text: '#586e75', accent: '#268bd2' },
        { id: 'sandstone',       label: 'Sandstone',       mode: 'light', bg: '#f5f0e8', surface: '#fffdf9', text: '#44403c', accent: '#c2724f' },
        { id: 'rose',            label: 'Rosé',            mode: 'light', bg: '#fff1f3', surface: '#fffafb', text: '#4c1130', accent: '#e11d6b' },
        { id: 'peach',           label: 'Peach',           mode: 'light', bg: '#fff5ed', surface: '#fffbf7', text: '#43271a', accent: '#f97316' },
        { id: 'mint',            label: 'Mint',            mode: 'light', bg: '#f0faf4', surface: '#f9fffb', text: '#14342b', accent: '#10b981' },
        { id: 'seafoam',         label: 'Seafoam',         mode: 'light', bg: '#ecfbf7', surface: '#f6fffd', text: '#0f3b35', accent: '#0d9488' },
        { id: 'sky',             label: 'Sky',             mode: 'light', bg: '#f0f7ff', surface: '#f9fcff', text: '#102a43', accent: '#0ea5e9' },
        { id: 'lavender',        label: 'Lavender',        mode: 'light', bg: '#f6f3ff', surface: '#fcfaff', text: '#2e1065', accent: '#7c3aed' },
        { id: 'graphite',        label: 'Graphite',        mode: 'light', bg: '#eef1f4', surface: '#ffffff', text: '#1f2933', accent: '#475569' },
        { id: 'lemon',           label: 'Lemon',           mode: 'light', bg: '#fefce8', surface: '#fffef5', text: '#422006', accent: '#ca8a04' },
        { id: 'bubblegum',       label: 'Bubblegum',       mode: 'light', bg: '#fdf2fb', surface: '#fffafe', text: '#500724', accent: '#ec4899' },
        { id: 'aqua',            label: 'Aqua',            mode: 'light', bg: '#ecfeff', surface: '#f5ffff', text: '#083344', accent: '#0891b2' },
        { id: 'linen',           label: 'Linen',           mode: 'light', bg: '#faf6f0', surface: '#fffdfa', text: '#3a352e', accent: '#9a7b4f' },
        { id: 'periwinkle',      label: 'Periwinkle',      mode: 'light', bg: '#eef2ff', surface: '#f7f9ff', text: '#1e1b4b', accent: '#6366f1' },
        { id: 'meadow',          label: 'Meadow',          mode: 'light', bg: '#f3fbe9', surface: '#fafff2', text: '#1a2e05', accent: '#65a30d' },
        { id: 'dark',            label: 'Default',         mode: 'dark',  bg: '#18181b', surface: '#27272a', text: '#fafafa', accent: '#3b82f6' },
        { id: 'solarized-dark',  label: 'Solarized',       mode: 'dark',  bg: '#002b36', surface: '#073642', text: '#eee8d5', accent: '#268bd2' },
        { id: 'crimson',         label: 'Crimson',         mode: 'dark',  bg: '#1a0c0e', surface: '#2a1417', text: '#fce8ea', accent: '#f43f5e' },
        { id: 'monokai',         label: 'Monokai',         mode: 'dark',  bg: '#1e1f1c', surface: '#272822', text: '#f8f8f2', accent: '#a6e22e' },
        { id: 'ember',           label: 'Ember',           mode: 'dark',  bg: '#1a120b', surface: '#2a1d12', text: '#fcefe2', accent: '#fb923c' },
        { id: 'forest',          label: 'Forest',          mode: 'dark',  bg: '#0e1f16', surface: '#173024', text: '#e6f4ea', accent: '#34d399' },
        { id: 'ocean',           label: 'Ocean',           mode: 'dark',  bg: '#08201c', surface: '#10332d', text: '#e4fbf5', accent: '#2dd4bf' },
        { id: 'midnight',        label: 'Midnight',        mode: 'dark',  bg: '#0f172a', surface: '#1e293b', text: '#f1f5f9', accent: '#38bdf8' },
        { id: 'plum',            label: 'Plum',            mode: 'dark',  bg: '#1a1023', surface: '#281836', text: '#f3e8ff', accent: '#c084fc' },
        { id: 'slate',           label: 'Slate',           mode: 'dark',  bg: '#17191d', surface: '#24272d', text: '#eef1f4', accent: '#94a3b8' },
        { id: 'obsidian',        label: 'Obsidian',        mode: 'dark',  bg: '#0b0b0d', surface: '#18181b', text: '#f4f4f5', accent: '#fbbf24' },
        { id: 'cyberpunk',       label: 'Cyberpunk',       mode: 'dark',  bg: '#1c0d18', surface: '#301426', text: '#fdebf7', accent: '#f472b6' },
        { id: 'nord',            label: 'Nord',            mode: 'dark',  bg: '#062029', surface: '#0d3440', text: '#e6fbff', accent: '#22d3ee' },
        { id: 'coffee',          label: 'Coffee',          mode: 'dark',  bg: '#1b1916', surface: '#2a2722', text: '#f3eee7', accent: '#c2a276' },
        { id: 'dracula',         label: 'Dracula',         mode: 'dark',  bg: '#15172b', surface: '#222640', text: '#eef2ff', accent: '#a5b4fc' },
        { id: 'matrix',          label: 'Matrix',          mode: 'dark',  bg: '#111a09', surface: '#1d2b11', text: '#f0fbe6', accent: '#a3e635' }
    ];

    var VALID = THEMES.reduce(function (m, t) { m[t.id] = true; return m; }, {});
    var root = document.documentElement;

    var paletteIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path></svg>';

    function current() {
        var t = localStorage.getItem(STORAGE_KEY);
        return (t && VALID[t]) ? t : DEFAULT_THEME;
    }

    function apply(id) {
        root.setAttribute('data-theme', id);
        localStorage.setItem(STORAGE_KEY, id);
    }

    function preference(key) {
        return localStorage.getItem(key) !== 'false';
    }

    function applyEffect(key, attribute, enabled) {
        localStorage.setItem(key, enabled ? 'true' : 'false');
        root.setAttribute(attribute, enabled ? 'true' : 'false');
    }

    root.setAttribute('data-grid-enabled', preference(GRID_KEY) ? 'true' : 'false');
    root.setAttribute('data-magnetic-enabled', preference(MAGNETIC_KEY) ? 'true' : 'false');

    var btn = document.createElement('button');
    btn.className = 'theme-picker-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Choose theme');
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('data-magnetic-ignore', '');
    btn.innerHTML = paletteIcon;

    var panel = document.createElement('div');
    panel.className = 'theme-picker-panel';
    panel.setAttribute('role', 'menu');
    panel.setAttribute('data-magnetic-ignore', '');

    var title = document.createElement('div');
    title.className = 'theme-picker-title';
    title.textContent = 'Theme';
    panel.appendChild(title);

    var tabs = document.createElement('div');
    tabs.className = 'theme-picker-tabs';
    tabs.setAttribute('role', 'tablist');
    panel.appendChild(tabs);

    var TAB_DEFS = [
        { mode: 'light', label: 'Light' },
        { mode: 'dark',  label: 'Dark' }
    ];

    var grids = {};
    var tabButtons = {};

    var effects = document.createElement('div');
    effects.className = 'theme-effects';
    effects.innerHTML = '<div class="theme-effects-title">Effects</div>';
    panel.appendChild(effects);

    function makeEffectSwitch(label, description, key, attribute) {
        var row = document.createElement('div');
        row.className = 'theme-effect-row';

        var copy = document.createElement('div');
        copy.className = 'theme-effect-copy';
        copy.innerHTML = '<strong>' + label + '</strong><small>' + description + '</small>';

        var toggle = document.createElement('button');
        toggle.className = 'theme-effect-switch';
        toggle.type = 'button';
        toggle.setAttribute('role', 'switch');
        toggle.setAttribute('aria-label', label);
        toggle.addEventListener('click', function () {
            applyEffect(key, attribute, toggle.getAttribute('aria-checked') !== 'true');
            syncEffects();
        });

        row.appendChild(copy);
        row.appendChild(toggle);
        effects.appendChild(row);
        return toggle;
    }

    var gridSwitch = makeEffectSwitch('Grid', 'Show grid', GRID_KEY, 'data-grid-enabled');
    var magneticSwitch = makeEffectSwitch('Magnetic', 'Respond to mouse movement', MAGNETIC_KEY, 'data-magnetic-enabled');

    function markSwitch(toggle, enabled) {
        toggle.setAttribute('aria-checked', enabled ? 'true' : 'false');
        toggle.classList.toggle('active', enabled);
    }

    function syncEffects() {
        var gridOn = preference(GRID_KEY);
        var magneticOn = preference(MAGNETIC_KEY);
        markSwitch(gridSwitch, gridOn);
        markSwitch(magneticSwitch, magneticOn);
        magneticSwitch.disabled = !gridOn;
    }

    syncEffects();

    TAB_DEFS.forEach(function (def) {
        var tab = document.createElement('button');
        tab.className = 'theme-tab';
        tab.type = 'button';
        tab.setAttribute('role', 'tab');
        tab.dataset.mode = def.mode;
        tab.textContent = def.label;
        tab.addEventListener('click', function () { showTab(def.mode); });
        tabs.appendChild(tab);
        tabButtons[def.mode] = tab;

        var grid = document.createElement('div');
        grid.className = 'theme-picker-grid';
        grid.dataset.mode = def.mode;
        panel.appendChild(grid);
        grids[def.mode] = grid;
    });

    var activeTab = 'light';

    function showTab(mode) {
        activeTab = mode;
        TAB_DEFS.forEach(function (def) {
            var on = def.mode === mode;
            tabButtons[def.mode].classList.toggle('active', on);
            tabButtons[def.mode].setAttribute('aria-selected', on ? 'true' : 'false');
            grids[def.mode].style.display = on ? 'grid' : 'none';
        });
    }

    var swatches = THEMES.map(function (theme) {
        var sw = document.createElement('button');
        sw.className = 'theme-swatch';
        sw.type = 'button';
        sw.setAttribute('role', 'menuitemradio');
        sw.setAttribute('aria-label', theme.label);
        sw.dataset.theme = theme.id;
        sw.dataset.mode = theme.mode;
        sw.dataset.accent = theme.accent;
        sw.title = theme.label;
        sw.style.setProperty('--swatch-bg', theme.bg);
        sw.style.setProperty('--swatch-surface', theme.surface);
        sw.style.setProperty('--swatch-accent', theme.accent);
        sw.innerHTML =
            '<span class="sw-palette" aria-hidden="true">' +
                '<span class="sw-color sw-color-bg"></span>' +
                '<span class="sw-color sw-color-surface"></span>' +
                '<span class="sw-color sw-color-accent"></span>' +
            '</span>' +
            '<span class="sw-label">' + theme.label + '</span>';
        sw.addEventListener('click', function () {
            apply(theme.id);
            mark(theme.id);
        });
        grids[theme.mode].appendChild(sw);
        return sw;
    });

    function mark(id) {
        swatches.forEach(function (sw) {
            var on = sw.dataset.theme === id;
            sw.classList.toggle('active', on);
            sw.setAttribute('aria-checked', on ? 'true' : 'false');
            sw.style.borderColor = on ? sw.dataset.accent : 'transparent';
            sw.style.boxShadow = on ? ('0 0 0 1px ' + sw.dataset.accent + ' inset') : 'none';
        });
    }

    function open() {
        var cur = current();
        var meta = THEMES.filter(function (t) { return t.id === cur; })[0];
        showTab(meta ? meta.mode : 'light');
        mark(cur);
        syncEffects();
        panel.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        document.addEventListener('click', onOutside, true);
        document.addEventListener('keydown', onKey);
    }

    function close() {
        panel.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', onOutside, true);
        document.removeEventListener('keydown', onKey);
    }

    function onOutside(e) {
        if (!panel.contains(e.target) && !btn.contains(e.target)) close();
    }

    function onKey(e) {
        if (e.key === 'Escape') { close(); btn.focus(); }
    }

    btn.addEventListener('click', function () {
        if (panel.classList.contains('open')) close();
        else open();
    });

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    root.setAttribute('data-theme', current());
})();

/* Section: Magnetic grid */
(function () {
    const mobile = window.matchMedia('(max-width: 640px)');
    if (mobile.matches || !document.body) return;

    let canvas = document.querySelector('[data-magnetic-grid]');
    const homeMode = canvas && canvas.dataset.gridMode === 'home';

    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.className = 'site-magnetic-grid';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.prepend(canvas);
    }

    if (!canvas.getContext) return;

    const config = homeMode
        ? { spacing: 44, radius: 175, pull: 0.34, opacityLight: 0.92, opacityDark: 0.76 }
        : { spacing: 48, radius: 165, pull: 0.3, opacityLight: 0.8, opacityDark: 0.56 };
    const ctx = canvas.getContext('2d');
    const points = [];
    const pointer = { x: -1000, y: -1000, active: false };
    let frame = 0;
    let lastFrameAt = 0;
    let resizeTimer = 0;
    let width = 0;
    let height = 0;
    let columns = 0;
    let rows = 0;
    let bounds = null;
    let accent = '#2563eb';
    let border = '#e4e4e7';
    let lightTheme = true;

    function gridEnabled() {
        return document.documentElement.getAttribute('data-grid-enabled') !== 'false';
    }

    function magneticEnabled() {
        return document.documentElement.getAttribute('data-magnetic-enabled') !== 'false';
    }

    function readColors() {
        const styles = getComputedStyle(document.documentElement);
        accent = styles.getPropertyValue('--accent-color').trim() || '#2563eb';
        border = styles.getPropertyValue('--border-hover').trim() || '#e4e4e7';
        lightTheme = styles.colorScheme !== 'dark';
        canvas.style.opacity = lightTheme ? config.opacityLight : config.opacityDark;
    }

    function makeGrid() {
        points.length = 0;
        columns = Math.ceil(width / config.spacing) + 1;
        rows = Math.ceil(height / config.spacing) + 1;
        const offsetX = (width - (columns - 1) * config.spacing) / 2;
        const offsetY = (height - (rows - 1) * config.spacing) / 2;

        for (let row = 0; row < rows; row += 1) {
            for (let column = 0; column < columns; column += 1) {
                const x = offsetX + column * config.spacing;
                const y = offsetY + row * config.spacing;
                points.push({ x, y, baseX: x, baseY: y, vx: 0, vy: 0, influence: 0 });
            }
        }
    }

    function draw() {
        if (!gridEnabled()) return;
        ctx.clearRect(0, 0, width, height);
        ctx.lineWidth = homeMode ? 1 : 0.9;
        ctx.strokeStyle = accent;
        ctx.globalAlpha = lightTheme ? (homeMode ? 0.24 : 0.22) : (homeMode ? 0.16 : 0.13);
        ctx.beginPath();

        for (let row = 0; row < rows; row += 1) {
            for (let column = 0; column < columns; column += 1) {
                const point = points[row * columns + column];
                if (column === 0) ctx.moveTo(point.x, point.y);
                else ctx.lineTo(point.x, point.y);
            }
        }

        for (let column = 0; column < columns; column += 1) {
            for (let row = 0; row < rows; row += 1) {
                const point = points[row * columns + column];
                if (row === 0) ctx.moveTo(point.x, point.y);
                else ctx.lineTo(point.x, point.y);
            }
        }
        ctx.stroke();

        ctx.beginPath();
        points.forEach((point) => {
            if (point.influence > 0.025) return;
            ctx.moveTo(point.x + 1, point.y);
            ctx.arc(point.x, point.y, homeMode ? 1 : 0.9, 0, Math.PI * 2);
        });
        ctx.globalAlpha = lightTheme ? (homeMode ? 0.34 : 0.32) : (homeMode ? 0.26 : 0.22);
        ctx.fillStyle = border;
        ctx.fill();

        points.forEach((point) => {
            if (point.influence <= 0.025) return;
            ctx.beginPath();
            ctx.globalAlpha = (lightTheme ? 0.34 : 0.26) + point.influence * 0.58;
            ctx.fillStyle = accent;
            ctx.arc(point.x, point.y, (homeMode ? 1 : 0.9) + point.influence * 1.35, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    function animate(now) {
        frame = 0;
        if (document.hidden) return;

        if (now - lastFrameAt < 1000 / 45) {
            frame = requestAnimationFrame(animate);
            return;
        }
        lastFrameAt = now;
        let moving = false;

        points.forEach((point) => {
            let targetX = point.baseX;
            let targetY = point.baseY;
            let influence = 0;

            if (pointer.active && magneticEnabled()) {
                const dx = pointer.x - point.baseX;
                const dy = pointer.y - point.baseY;
                const distance = Math.hypot(dx, dy);

                if (distance < config.radius) {
                    influence = Math.pow(1 - distance / config.radius, 1.7);
                    targetX += dx * influence * config.pull;
                    targetY += dy * influence * config.pull;
                }
            }

            point.influence += (influence - point.influence) * 0.18;
            point.vx += (targetX - point.x) * 0.13;
            point.vy += (targetY - point.y) * 0.13;
            point.vx *= 0.7;
            point.vy *= 0.7;
            point.x += point.vx;
            point.y += point.vy;

            if (Math.abs(point.vx) + Math.abs(point.vy) > 0.015 ||
                Math.abs(targetX - point.x) + Math.abs(targetY - point.y) > 0.12 ||
                Math.abs(influence - point.influence) > 0.01) {
                moving = true;
            }
        });

        draw();
        if (moving) frame = requestAnimationFrame(animate);
    }

    function requestDraw() {
        if (!frame && !document.hidden && gridEnabled()) frame = requestAnimationFrame(animate);
    }

    function resize() {
        bounds = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        width = Math.max(1, bounds.width);
        height = Math.max(1, bounds.height);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        readColors();
        makeGrid();
        draw();
    }

    window.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'touch' || !bounds || !gridEnabled() || !magneticEnabled()) return;
        const ignored = event.target && event.target.closest && event.target.closest('[data-magnetic-ignore]');

        if (ignored) {
            pointer.active = false;
            requestDraw();
            return;
        }

        const inside = event.clientX >= bounds.left && event.clientX <= bounds.right &&
            event.clientY >= bounds.top && event.clientY <= bounds.bottom;
        pointer.active = inside;

        if (inside) {
            pointer.x = event.clientX - bounds.left;
            pointer.y = event.clientY - bounds.top;
        }
        requestDraw();
    }, { passive: true });

    document.documentElement.addEventListener('mouseleave', () => {
        pointer.active = false;
        requestDraw();
    });

    window.addEventListener('blur', () => {
        pointer.active = false;
        requestDraw();
    });

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resize, 120);
    }, { passive: true });

    const themeObserver = new MutationObserver((records) => {
        var gridChanged = records.some(function (record) {
            return record.attributeName === 'data-grid-enabled';
        });

        if (!gridEnabled()) {
            cancelAnimationFrame(frame);
            frame = 0;
            pointer.active = false;
            return;
        }

        if (!magneticEnabled()) {
            pointer.active = false;
            requestDraw();
        }

        readColors();
        if (gridChanged) resize();
        else draw();
    });
    themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'data-grid-enabled', 'data-magnetic-enabled']
    });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) requestDraw();
    });
    resize();
})();
