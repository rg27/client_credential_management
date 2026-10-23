const SELECTORS = {
    popup: "popup",
    popupTitle: "popupTitle",
    popupMessage: "popupMessage",
    loaderText: "loader-text"
};

/* ---- Zoho Creator settings ------------------------------------------------ */
const CREATOR_WORKSPACE = "tradelicensezone";            
const CREATOR_API_NAME = "get_client_credentials_report";
const CREATOR_PUBLIC_KEY = "";                           

const THEME_KEY = "client-credentials-theme";
const PASSWORD_MASK = "••••••••";

/* Credential types, in the order they appear in the dropdown */
const PORTALS = [
    { key: "zohobooks",  label: "Zoho Books" },
    { key: "xero",       label: "Xero Accounting Software" },
    { key: "emaratax",   label: "EmaraTax" },
    { key: "quickbooks", label: "Quickbooks" },
    { key: "bank",       label: "Bank" },
    { key: "dmcc",       label: "DMCC" }
];
const OTHER_PORTAL = { key: "other", label: "Other" };

const ICONS = {
    chevron: '<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>',
    open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>',
    external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94"></path><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19"></path><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path><path d="m2 2 20 20"></path></svg>',
    sun: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"></path>',
    collapse: '<path d="m7 15 5 5 5-5"></path><path d="m7 9 5-5 5 5"></path>',
    expand: '<path d="m7 20 5-5 5 5"></path><path d="m7 4 5 5 5-5"></path>'
};

const state = {
    all: [],
    query: "",        
    client: null,     
    portal: "all",    
    collapsed: new Set()
};

let currentView = [];     
let clientOptions = [];   
let clientActive = -1;    
let toastTimer = null;

/* ==========================================================================
   Theme
   ========================================================================== */

function resolveInitialTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) { }
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);

    const btn = document.getElementById("themeBtn");
    const icon = document.getElementById("themeIcon");
    if (!btn || !icon) return;

    const next = theme === "dark" ? "light" : "dark";
    icon.innerHTML = theme === "dark" ? ICONS.sun : ICONS.moon;
    btn.title = `Switch to ${next} theme`;
    btn.setAttribute("aria-label", `Switch to ${next} theme`);
}

applyTheme(resolveInitialTheme());

/* ==========================================================================
   Data loading (Zoho Creator custom API)
   ========================================================================== */

async function loadCredentials() {
    const loader = document.getElementById("loader-overlay");
    if (loader) loader.classList.remove("hidden");

    try {
        const config = {
            api_name: CREATOR_API_NAME,
            workspace_name: CREATOR_WORKSPACE,
            http_method: "GET"
        };
        if (CREATOR_PUBLIC_KEY) config.public_key = CREATOR_PUBLIC_KEY;

        const response = await ZOHO.CREATOR.DATA.invokeCustomApi(config);
        console.log("[Data Fetch] Raw response:", response);

        state.all = extractRecords(response);
        state.all.forEach((rec, i) => { rec._i = i; });
        render();
    } catch (err) {
        console.error("[Data Fetch Error]", err);
        const detail = err && (err.message || err.responseText || err.description);
        showPopup("Couldn't load credentials", detail || "The credentials report failed to load. Refresh and try again.", "error");
    } finally {
        if (loader) loader.classList.add("hidden");
    }
}

function extractRecords(payload, depth = 0) {
    if (depth > 4 || payload == null) return [];
    if (typeof payload === "string") {
        try { return extractRecords(JSON.parse(payload), depth + 1); } catch (e) { return []; }
    }
    if (Array.isArray(payload)) return payload;
    for (const key of ["records", "data", "result", "response"]) {
        if (payload[key] != null) {
            const found = extractRecords(payload[key], depth + 1);
            if (found.length) return found;
        }
    }
    return [];
}

/* ==========================================================================
   UI wiring
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    applyTheme(resolveInitialTheme());
    loadCredentials();

    const searchInput = document.getElementById("searchInput");
    const searchClear = document.getElementById("searchClear");
    const clientMenu = document.getElementById("clientMenu");
    const portalBtn = document.getElementById("portalBtn");
    const portalMenu = document.getElementById("portalMenu");

    document.getElementById("themeBtn").addEventListener("click", () => {
        const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        applyTheme(next);
        try { localStorage.setItem(THEME_KEY, next); } catch (e) { }
    });

    searchInput.addEventListener("input", (e) => {
        state.client = null;
        state.query = e.target.value.toLowerCase().trim();
        clientActive = state.query ? 0 : -1;
        openClientMenu();
        render();
    });

    searchInput.addEventListener("focus", openClientMenu);
    searchInput.addEventListener("click", openClientMenu);

    searchInput.addEventListener("keydown", (e) => {
        const menuOpen = !clientMenu.classList.contains("hidden");

        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!menuOpen) { openClientMenu(); return; }
            const last = clientOptions.length - 1;
            if (last < 0) return;
            clientActive = e.key === "ArrowDown"
                ? Math.min(last, clientActive + 1)
                : Math.max(0, clientActive - 1);
            highlightClientOption();
        } else if (e.key === "Enter") {
            if (menuOpen && clientActive >= 0 && clientOptions[clientActive]) {
                e.preventDefault();
                selectClient(clientOptions[clientActive].value);
            }
        } else if (e.key === "Escape") {
            if (menuOpen) closeMenus();
            else if (searchInput.value) clearSearch();
        } else if (e.key === "Tab") {
            closeMenus();
        }
    });

    clientMenu.addEventListener("mousedown", (e) => e.preventDefault());
    clientMenu.addEventListener("click", (e) => {
        const item = e.target.closest("[data-idx]");
        if (!item) return;
        const opt = clientOptions[Number(item.dataset.idx)];
        if (opt) selectClient(opt.value);
    });

    searchClear.addEventListener("click", () => {
        clearSearch();
        searchInput.focus();
    });

    document.addEventListener("keydown", (e) => {
        const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
        if (e.key === "/" && !typing) {
            e.preventDefault();
            searchInput.focus();
        }
    });

    portalBtn.addEventListener("click", () => {
        const open = portalMenu.classList.contains("hidden");
        closeMenus();
        if (open) {
            portalMenu.classList.remove("hidden");
            portalBtn.setAttribute("aria-expanded", "true");
        }
    });

    portalMenu.addEventListener("click", (e) => {
        const item = e.target.closest("[data-portal]");
        if (!item) return;
        state.portal = item.dataset.portal;
        closeMenus();
        render();
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest("#clientCombo") && !e.target.closest("#portalDropdown")) closeMenus();
    });

    document.getElementById("toggleAllBtn").addEventListener("click", () => {
        const names = currentView.map(g => g.company);
        const anyOpen = names.some(n => !state.collapsed.has(n));
        names.forEach(n => anyOpen ? state.collapsed.add(n) : state.collapsed.delete(n));
        render();
    });

    document.getElementById("clearFiltersBtn").addEventListener("click", () => {
        searchInput.value = "";
        state.query = "";
        state.client = null;
        state.portal = "all";
        render();
    });

    document.getElementById("credentials-tbody").addEventListener("click", (e) => {
        const toggle = e.target.closest("[data-toggle]");
        if (toggle) {
            const company = toggle.dataset.toggle;
            state.collapsed.has(company) ? state.collapsed.delete(company) : state.collapsed.add(company);
            render();
            return;
        }

        const copyBtn = e.target.closest("[data-copy]");
        if (copyBtn) {
            const rec = state.all[Number(copyBtn.dataset.i)];
            if (!rec) return;
            const field = copyBtn.dataset.copy;
            const labels = { username: "Username", password: "Password" };
            copyText(String(rec[field] ?? ""), copyBtn, labels[field] || "Value");
            return;
        }

        const revealBtn = e.target.closest("[data-reveal]");
        if (revealBtn) {
            togglePassword(revealBtn);
            return;
        }
    });
});

/* ==========================================================================
   Client dropdown
   ========================================================================== */

function companyOf(rec) {
    return rec.company_name || "Unassigned company";
}

function renderClientMenu() {
    const menu = document.getElementById("clientMenu");
    const q = state.client ? "" : state.query;

    const counts = new Map();
    state.all.forEach(rec => {
        const c = companyOf(rec);
        counts.set(c, (counts.get(c) || 0) + 1);
    });

    let names = [...counts.keys()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    if (q) names = names.filter(n => n.toLowerCase().includes(q));

    clientOptions = names.map(n => ({ value: n, label: n, count: counts.get(n) }));
    if (!q) clientOptions.unshift({ value: null, label: "All clients", count: counts.size, isAll: true });

    if (clientOptions.length === 0) {
        menu.innerHTML = `<div class="menu-empty">${state.all.length ? "No client matches this search" : "No clients yet"}</div>`;
        return;
    }

    menu.innerHTML = clientOptions.map((opt, idx) => {
        const selected = opt.isAll ? !state.client : state.client === opt.value;
        const cls = "menu-item" + (selected ? " is-selected" : "") + (idx === clientActive ? " is-active" : "");
        const lead = opt.isAll ? "" : `<span class="avatar" style="--h:${hueFor(opt.value)}">${escapeHtml(initials(opt.value))}</span>`;
        const count = opt.isAll
            ? `${opt.count} ${opt.count === 1 ? "client" : "clients"}`
            : `${opt.count} ${opt.count === 1 ? "login" : "logins"}`;
        return `<button type="button" class="${cls}" role="option" aria-selected="${selected}" data-idx="${idx}">
                    ${lead}<span class="item-label">${highlight(opt.label, q)}</span><span class="item-count">${count}</span>
                </button>`;
    }).join("");

    if (menu.querySelector(".is-active")) highlightClientOption();
}

function highlightClientOption() {
    const menu = document.getElementById("clientMenu");
    menu.querySelectorAll(".menu-item").forEach(el => {
        const active = Number(el.dataset.idx) === clientActive;
        el.classList.toggle("is-active", active);
        if (active) el.scrollIntoView({ block: "nearest" });
    });
}

function openClientMenu() {
    document.getElementById("portalMenu").classList.add("hidden");
    document.getElementById("portalBtn").setAttribute("aria-expanded", "false");

    renderClientMenu();
    document.getElementById("clientMenu").classList.remove("hidden");
    document.getElementById("searchInput").setAttribute("aria-expanded", "true");
}

function closeMenus() {
    document.getElementById("clientMenu").classList.add("hidden");
    document.getElementById("portalMenu").classList.add("hidden");
    document.getElementById("searchInput").setAttribute("aria-expanded", "false");
    document.getElementById("portalBtn").setAttribute("aria-expanded", "false");
    clientActive = -1;
}

function selectClient(value) {
    const input = document.getElementById("searchInput");
    state.client = value;
    state.query = "";
    input.value = value || "";
    closeMenus();
    render();
}

function clearSearch() {
    document.getElementById("searchInput").value = "";
    state.query = "";
    state.client = null;
    closeMenus();
    render();
}

/* ==========================================================================
   Data helpers
   ========================================================================== */

function portalKey(name) {
    const n = (name || "").toLowerCase().replace(/\s+/g, "");
    if (n.includes("zoho")) return "zohobooks";
    if (n.includes("xero")) return "xero";
    if (n.includes("emaratax")) return "emaratax";
    if (n.includes("quickbooks")) return "quickbooks";
    if (n.includes("bank")) return "bank";
    if (n.includes("dmcc")) return "dmcc";
    return "other";
}

function matchesFilters(item) {
    if (state.client && companyOf(item) !== state.client) return false;

    const q = state.query;
    if (!q) return true;

    return [item.company_name, item.portal_name, item.username, item.created_updated, item.notes]
        .some(v => String(v || "").toLowerCase().includes(q));
}

function buildGroups(records) {
    const map = new Map();
    records.forEach(rec => {
        const company = companyOf(rec);
        if (!map.has(company)) {
            // FIX: capture account_id so it's available in the group object
            map.set(company, { items: [], account_id: rec.account_id || "" });
        }
        map.get(company).items.push(rec);
    });

    return [...map]
        .map(([company, data]) => ({ company, items: data.items, account_id: data.account_id }))
        .sort((a, b) => a.company.localeCompare(b.company, undefined, { sensitivity: "base" }));
}

function normalizeUrl(raw) {
    let u = String(raw || "").trim();
    if (!u) return null;
    
    const match = u.match(/href=["']([^"']+)["']/i);
    if (match && match[1]) {
        u = match[1].trim();
    } else {
        u = u.replace(/<[^>]*>/g, "").trim();
    }

    if (!u) return null;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = "https://" + u;
    return /^https?:\/\//i.test(u) ? u : null;   
}

/* ==========================================================================
   Rendering
   ========================================================================== */

function render() {
    const searched = state.all.filter(matchesFilters);

    const counts = {};
    searched.forEach(item => {
        const k = portalKey(item.portal_name);
        counts[k] = (counts[k] || 0) + 1;
    });
    renderPortalMenu(counts, searched.length);

    const visible = state.portal === "all"
        ? searched
        : searched.filter(item => portalKey(item.portal_name) === state.portal);

    currentView = buildGroups(visible);

    renderTable(currentView, state.query);
    renderChrome(visible.length, currentView.length);
}

function renderPortalMenu(counts, total) {
    const options = PORTALS.slice();
    if (counts.other) options.push(OTHER_PORTAL);

    let html = portalItemHtml("all", "All credential types", total, false);
    html += '<div class="menu-divider"></div>';
    options.forEach(p => { html += portalItemHtml(p.key, p.label, counts[p.key] || 0, true); });
    document.getElementById("portalMenu").innerHTML = html;

    const selected = options.find(p => p.key === state.portal);
    const dot = document.getElementById("portalDot");
    document.getElementById("portalLabel").textContent = selected ? selected.label : "All credential types";
    dot.className = selected ? `dot tone-${selected.key}` : "dot dot--all";
}

function portalItemHtml(key, label, count, withDot) {
    const selected = state.portal === key;
    const dot = withDot ? `<span class="dot tone-${key}"></span>` : '<span class="dot dot--all"></span>';
    return `<button type="button" class="menu-item${selected ? " is-selected" : ""}" role="option" aria-selected="${selected}" data-portal="${key}">
                ${dot}<span class="item-label">${escapeHtml(label)}</span><span class="item-count">${count}</span>
            </button>`;
}

function renderTable(groups, q) {
    const tbody = document.getElementById("credentials-tbody");
    const emptyState = document.getElementById("empty-state");
    const table = tbody.closest("table");

    if (groups.length === 0) {
        tbody.innerHTML = "";
        table.classList.add("hidden");
        renderEmpty();
        emptyState.classList.remove("hidden");
        return;
    }

    table.classList.remove("hidden");
    emptyState.classList.add("hidden");

    const dash = '<span class="empty-cell">—</span>';
    let html = "";

    groups.forEach(({ company, items, account_id }) => {
        const collapsed = !q && !state.client && state.collapsed.has(company);
        const hue = hueFor(company);
        const safeCompany = escapeHtml(company);
        const count = items.length;

        // Clean account_id if it contains accidental HTML tags from backend
        const cleanAccId = String(account_id || "").replace(/<[^>]*>/g, "").trim();
        const crmAccountLinkHtml = cleanAccId
            ? `<a href="https://crm.zoho.com/crm/org682300086/tab/Accounts/${encodeURIComponent(cleanAccId)}" target="_blank" rel="noopener noreferrer" class="crm-account-link" title="Open CRM Account: ${safeCompany}" onclick="event.stopPropagation()">
                   ${ICONS.external}<span>CRM</span>
               </a>`
            : "";

        html += `
            <tr class="group-row${collapsed ? " is-collapsed" : ""}" style="--h:${hue}">
                <td colspan="6">
                    <button type="button" class="group-toggle" data-toggle="${safeCompany}" aria-expanded="${!collapsed}">
                        ${ICONS.chevron}
                        <span class="avatar">${escapeHtml(initials(company))}</span>
                        <span class="group-name" title="${safeCompany}">${highlight(company, q)}</span>
                        ${crmAccountLinkHtml}
                        <span class="group-count">${count} ${count === 1 ? "login" : "logins"}</span>
                    </button>
                </td>
            </tr>
        `;

        if (collapsed) return;

        items.forEach(item => {
            const i = item._i;
            const key = portalKey(item.portal_name);
            const portalName = item.portal_name || "General portal";
            const username = item.username || "";
            const password = item.password || "";
            const created = item.created_updated || "";
            const notes = item.notes || "";

            const userHtml = username
                ? `<div class="cell-row">
                       <span class="mono-text" title="${escapeHtml(username)}">${highlight(username, q)}</span>
                       <button type="button" class="cell-btn" data-copy="username" data-i="${i}" title="Copy username" aria-label="Copy username">${ICONS.copy}</button>
                   </div>`
                : dash;

            const passHtml = password
                ? `<div class="cell-row">
                       <span class="mono-text pw-text is-masked">${PASSWORD_MASK}</span>
                       <button type="button" class="cell-btn" data-reveal="${i}" title="Show password" aria-label="Show password">${ICONS.eye}</button>
                       <button type="button" class="cell-btn" data-copy="password" data-i="${i}" title="Copy password" aria-label="Copy password">${ICONS.copy}</button>
                   </div>`
                : dash;

            const href = normalizeUrl(item.url_link);
            const openHtml = href
                ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="action-btn" title="Open ${escapeHtml(href)}">
                       ${ICONS.open}<span class="btn-label">Open</span>
                   </a>`
                : `<span class="action-btn is-disabled" title="No login link saved">
                       ${ICONS.open}<span class="btn-label">Open</span>
                   </span>`;

            html += `
                <tr class="data-row" style="--h:${hue}">
                    <td>
                        <span class="portal-badge tone-${key}">
                            <span>${highlight(portalName, q)}</span>
                        </span>
                    </td>
                    <td>${userHtml}</td>
                    <td>${passHtml}</td>
                    <td class="actions-cell">${openHtml}</td>
                    <td>${created ? `<span class="created-text">${highlight(created, q)}</span>` : dash}</td>
                    <td>${notes ? `<div class="notes-text" title="${escapeHtml(notes)}">${highlight(notes, q)}</div>` : dash}</td>
                </tr>
            `;
        });
    });

    tbody.innerHTML = html;
}

function renderEmpty() {
    const filtered = state.query || state.client || state.portal !== "all";
    const title = document.getElementById("empty-title");
    const sub = document.getElementById("empty-subtitle");
    const clear = document.getElementById("clearFiltersBtn");

    if (filtered) {
        title.textContent = "No matching credentials";
        sub.textContent = "Try a different client or credential type, or clear your filters.";
        clear.classList.remove("hidden");
    } else {
        title.textContent = "No client credentials yet";
        sub.textContent = "Credentials added in Client Credentials will show up here, grouped by company.";
        clear.classList.add("hidden");
    }
}

function renderChrome(loginCount, companyCount) {
    const total = state.all.length;
    const status = document.getElementById("status-text");
    status.textContent = loginCount === total
        ? `${total} ${total === 1 ? "login" : "logins"} across ${companyCount} ${companyCount === 1 ? "company" : "companies"}`
        : `Showing ${loginCount} of ${total} logins`;

    const hasValue = !!document.getElementById("searchInput").value;
    document.getElementById("searchClear").classList.toggle("hidden", !hasValue);
    document.getElementById("searchKbd").classList.toggle("hidden", hasValue);

    const anyOpen = currentView.some(g => !state.collapsed.has(g.company));
    const toggleBtn = document.getElementById("toggleAllBtn");
    const label = anyOpen ? "Collapse all companies" : "Expand all companies";
    toggleBtn.title = label;
    toggleBtn.setAttribute("aria-label", label);
    document.getElementById("toggleAllIcon").innerHTML = anyOpen ? ICONS.collapse : ICONS.expand;
    toggleBtn.disabled = currentView.length === 0;
}

/* ==========================================================================
   Actions
   ========================================================================== */

function togglePassword(btn) {
    const rec = state.all[Number(btn.dataset.reveal)];
    const text = btn.closest(".cell-row").querySelector(".pw-text");
    if (!rec || !text) return;

    const reveal = text.classList.contains("is-masked");
    text.classList.toggle("is-masked", !reveal);
    text.textContent = reveal ? String(rec.password) : PASSWORD_MASK;
    btn.innerHTML = reveal ? ICONS.eyeOff : ICONS.eye;
    btn.classList.toggle("is-on", reveal);
    btn.title = reveal ? "Hide password" : "Show password";
    btn.setAttribute("aria-label", btn.title);
}

function copyText(text, btn, label) {
    const done = () => {
        showToast(`${label} copied`);
        if (!btn) return;
        btn.classList.add("is-copied");
        btn.innerHTML = ICONS.check;
        setTimeout(() => {
            btn.classList.remove("is-copied");
            btn.innerHTML = ICONS.copy;
        }, 1400);
    };

    const fallback = () => {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;";
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try { ok = document.execCommand("copy"); } catch (e) { }
        document.body.removeChild(ta);
        ok ? done() : showToast("Couldn't copy. Select the text instead.");
    };

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else {
        fallback();
    }
}

/* ==========================================================================
   Small utilities
   ========================================================================== */

function hueFor(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return h;
}

function initials(name) {
    return (name || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(w => w[0])
        .join("")
        .toUpperCase();
}

function escapeHtml(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function highlight(text, q) {
    const s = String(text ?? "");
    if (!q) return escapeHtml(s);
    const i = s.toLowerCase().indexOf(q);
    if (i < 0) return escapeHtml(s);
    return escapeHtml(s.slice(0, i))
        + "<mark>" + escapeHtml(s.slice(i, i + q.length)) + "</mark>"
        + escapeHtml(s.slice(i + q.length));
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add("hidden"), 1800);
}

function showPopup(titleText, message, type = "error") {
    const popup = document.getElementById(SELECTORS.popup);
    const iconDiv = document.getElementById("statusIcon");
    const title = document.getElementById(SELECTORS.popupTitle);
    const msg = document.getElementById(SELECTORS.popupMessage);

    popup.classList.remove("hidden");
    title.textContent = titleText;
    msg.textContent = message;

    if (type === "success") {
        popup.setAttribute("data-status", "success");
        iconDiv.className = "status-icon status-icon--success";
        iconDiv.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>';
    } else {
        popup.setAttribute("data-status", "error");
        iconDiv.className = "status-icon status-icon--error";
        iconDiv.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>';
    }
}

function closeModalPopup() {
    const popup = document.getElementById(SELECTORS.popup);
    if (popup) popup.classList.add("hidden");
}