/* =====================================================
   KM ROOT SOLUTIONS – JS (navigation + filters + admin)
   ===================================================== */

(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function showPage(pageId) {
    // Hide all pages
    $$('.page').forEach((el) => el.classList.remove('active'));

    // Admin special handling: still uses .page
    const pageEl = $(`#page-${pageId}`);
    if (pageEl) pageEl.classList.add('active');

    // Close mobile menu if open
    if (window.toggleMobile) window.toggleMobile(false);

    // Set active link styling (optional)
    $$('#navbar a[data-page]').forEach((a) => a.classList.remove('active-nav'));
    const link = $(`#navbar a[data-page="${pageId}"]`);
    if (link) link.classList.add('active-nav');

    // Scroll to top for a nicer UX
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toggleMobile(forceOpen) {
    const overlay = $('#mobileOverlay');
    const menu = $('#mobileMenu');
    if (!overlay || !menu) return;

    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !menu.classList.contains('open');
    overlay.classList.toggle('open', shouldOpen);
    menu.classList.toggle('open', shouldOpen);
  }

  function filterServices(category, btnEl) {
    const grid = $('#servicesGrid');
    if (!grid) return;

    // Update active tab
    if (btnEl) {
      $$('.filter-tabs .tab').forEach((t) => t.classList.remove('active'));
      btnEl.classList.add('active');
    }

    const items = $$('.service-card', grid);
    items.forEach((card) => {
      const cat = card.getAttribute('data-cat');
      const visible = category === 'all' ? true : cat === category;
      card.classList.toggle('hidden', !visible);
    });
  }

  function filterReal(category, btnEl) {
    const gallery = $('#realGallery');
    if (!gallery) return;

    // Update active tab
    if (btnEl) {
      $$('.filter-tabs .tab').forEach((t) => t.classList.remove('active'));
      btnEl.classList.add('active');
    }

    const items = $$('.gal-item', gallery);
    items.forEach((item) => {
      const cat = item.getAttribute('data-cat');
      const visible = category === 'all' ? true : cat === category;
      item.classList.toggle('hidden', !visible);
    });
  }

  function showAdminTab(tabId, triggerEl) {
    // Ensure full admin page visible
    const adminPage = $('#page-admin');
    if (adminPage) adminPage.classList.add('active');

    // Hide all admin tabs
    $$('.admin-tab').forEach((el) => el.classList.remove('active'));

    const tab = $(`#adm-${tabId}`);
    if (tab) tab.classList.add('active');

    // Optional: highlight active nav item
    $$('.admin-nav-item').forEach((a) => a.classList.remove('active'));
    if (triggerEl) triggerEl.classList.add('active');

    // Load data on demand
    loadAdminData().catch(() => {});
  }

  function showSuccessContact() {
    const box = $('#contactSuccess');
    if (!box) return;

    box.style.display = 'block';
    // Keep it simple: no backend submit, just UX feedback.
    setTimeout(() => {
      box.style.display = 'none';
    }, 5000);
  }

  function showSuccessDevis() {
    const box = $('#devisSuccess');
    if (!box) return;

    box.style.display = 'block';
    setTimeout(() => {
      box.style.display = 'none';
    }, 5000);
  }

  function scrollTopBtnVisibility() {
    const btn = $('#scrollTopBtn');
    if (!btn) return;
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      btn.classList.toggle('visible', y > 300);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // =====================
  // ADMIN (API JSON)
  // =====================

  const API_BASE = (window.API_BASE || '').toString().replace(/\/$/, '') || '/api';

  function getToken() {
    return window.localStorage.getItem('adminToken');
  }

  function setToken(token) {
    window.localStorage.setItem('adminToken', token);
  }

  function clearToken() {
    window.localStorage.removeItem('adminToken');
  }

  async function apiFetch(path, { method = 'GET', body = null, token = null } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const t = token || getToken();
    if (t) headers['Authorization'] = `Bearer ${t}`;

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json().catch(() => null) : await res.text().catch(() => null);

    if (!res.ok) {
      const msg = data && data.error ? data.error : `http_${res.status}`;
      throw new Error(msg);
    }

    return data;
  }

  function ensureAdminLoginUI() {
    // Login modal is created once.
    if (document.getElementById('adminLoginBox')) return;

    const wrap = document.createElement('div');
    wrap.id = 'adminLoginBox';
    wrap.style.position = 'fixed';
    wrap.style.inset = '0';
    wrap.style.background = 'rgba(0,0,0,0.45)';
    wrap.style.zIndex = '2000';
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.justifyContent = 'center';
    wrap.innerHTML = `
      <div style="width: min(520px, 92vw); background:#111827; color:white; border:1px solid rgba(126,217,87,0.25); border-radius:12px; padding:20px; box-shadow:0 10px 40px rgba(0,0,0,0.35);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <div style="font-family:Montserrat, sans-serif; font-weight:900; letter-spacing:0.05em;">LOGIN ADMIN</div>
          <button id="adminLoginClose" style="background:transparent; color:rgba(255,255,255,0.6); border:0; font-size:18px; cursor:pointer;">×</button>
        </div>
        <div style="display:grid; grid-template-columns:1fr; gap:12px;">
          <div>
            <label style="display:block; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:rgba(255,255,255,0.7); margin-bottom:6px;">Email</label>
            <input id="adminLoginEmail" type="email" placeholder="admin@kmroot.com" style="width:100%; padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.12); outline:none; background:#0b1120; color:white;" />
          </div>
          <div>
            <label style="display:block; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:rgba(255,255,255,0.7); margin-bottom:6px;">Mot de passe</label>
            <input id="adminLoginPassword" type="password" placeholder="admin123" style="width:100%; padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.12); outline:none; background:#0b1120; color:white;" />
          </div>
          <div id="adminLoginError" style="display:none; color:#fca5a5; font-weight:700; font-size:13px;">Erreur</div>
          <button id="adminLoginBtn" class="btn-green" style="width:100%; padding:12px 28px;">Se connecter</button>
        </div>
      </div>
    `;

    document.body.appendChild(wrap);

    const close = wrap.querySelector('#adminLoginClose');
    if (close) close.addEventListener('click', () => wrap.remove());



    if (adminLoginBtn) adminLoginBtn.addEventListener('click', async () => {

      const emailInput = wrap.querySelector('#adminLoginEmail');
      const email = emailInput && emailInput.value ? String(emailInput.value).trim() : '';
      const passwordInput = wrap.querySelector('#adminLoginPassword');
      const password = passwordInput && passwordInput.value ? String(passwordInput.value) : '';

      const errEl = wrap.querySelector('#adminLoginError');
      try {
        errEl.style.display = 'none';
        const data = await apiFetch('/auth/login', {
          method: 'POST',
          body: { email, password },
          token: null
        });
        setToken(data.token);
        wrap.remove();
        await loadAdminData();
      } catch (e) {
        errEl.textContent = `Connexion impossible: ${e.message}`;
        errEl.style.display = 'block';
      }
    });
  }

  function adminRequireAuthOrLogin() {
    // only if we are on admin page
    const adminPage = $('#page-admin');
    if (!adminPage || !adminPage.classList.contains('active')) return true;

    const token = getToken();
    if (token) return true;

    ensureAdminLoginUI();
    return false;
  }

  async function loadAdminKPIs() {
    const kpi = document.querySelector('#adm-dashboard .adm-kpis');
    if (!kpi) return;

    const data = await apiFetch('/dashboard/kpis');

    const kpiCards = kpi.querySelectorAll('.kpi-card');
    if (!kpiCards || kpiCards.length < 4) return;

    // Keep order from HTML
    const [cardServices, cardDevis, cardProjets, cardClients] = kpiCards;

    cardServices.querySelector('.kpi-num').textContent = data.kpis.servicesTotal;
    cardDevis.querySelector('.kpi-num').textContent = data.kpis.devisTotal;
    cardProjets.querySelector('.kpi-num').textContent = data.kpis.projetsTotal;
    cardClients.querySelector('.kpi-num').textContent = data.kpis.clientsTotal;
  }

  async function loadAdminLastDevisTable() {
    const tBody = document.querySelector('#adm-dashboard .adm-table tbody');
    if (!tBody) return;

    const data = await apiFetch('/dashboard/devis-last');
    const items = data.items || [];

    tBody.innerHTML = items
      .map(
        (x) => {
          const initials = x.fullName
            ? x.fullName
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0].toUpperCase())
                .join('')
            : 'AD';

          const d = x.dateISO ? new Date(x.dateISO) : null;
          const dateLabel = d ? d.toLocaleDateString('fr-FR') : '';

          let badgeClass = 'badge yellow';
          if (x.status === 'accepted') badgeClass = 'badge green';
          if (x.status === 'rejected') badgeClass = 'badge red';

          let statusLabel = x.status;
          if (x.status === 'pending') statusLabel = 'En attente';
          if (x.status === 'accepted') statusLabel = 'Accepté';
          if (x.status === 'rejected') statusLabel = 'Refusé';

          return `<tr><td><span class="adm-avatar">${initials}</span>${x.fullName}</td><td>${dateLabel}</td></tr>`;
        }
      )
      .join('');
  }

  async function loadAdminTables() {
    // Services
    const servicesBox = $('#adm-services-adm');
    if (servicesBox) {
      const tBody = servicesBox.querySelector('table tbody');
      if (tBody) {
        const data = await apiFetch('/services');
        tBody.innerHTML = (data.items || [])
          .map(
            (s) => `
              <tr>
                <td>${String(s.id).padStart(2, '0')}</td>
                <td>${escapeHtml(s.name)}</td>
                <td>${escapeHtml(s.category)}</td>
                <td>${s.status === 'active' ? '<span class="badge green">Actif</span>' : '<span class="badge yellow">Inactif</span>'}</td>
                <td>
                  <button class="adm-btn">Éditer</button>
                  <button class="adm-btn red">Suppr.</button>
                </td>
              </tr>
            `
          )
          .join('');

        // Wire devis actions (delegated)
        tBody.querySelectorAll('button[data-devis-id][data-action]').forEach((btn) => {
          btn.addEventListener('click', async (ev) => {
            ev.preventDefault();
            const id = btn.getAttribute('data-devis-id');
            const action = btn.getAttribute('data-action');
            if (!id || !action) return;

            const nextStatus = action === 'accepted' ? 'accepted' : 'rejected';
            btn.disabled = true;
            try {
              await apiFetch(`/devis/${id}`, {
                method: 'PUT',
                body: { status: nextStatus }
              });
              await loadAdminTables();
            } catch (e2) {
              alert('Erreur devis: ' + (e2 && e2.message ? e2.message : e2));
              btn.disabled = false;
            }
          });
        });
      }
    }


    // Réalisations
    const reBox = $('#adm-realisations-adm');
    if (reBox) {
      const tBody = reBox.querySelector('table tbody');
      if (tBody) {
        const data = await apiFetch('/realisations');
        tBody.innerHTML = (data.items || [])
          .map(
            (r) => `
              <tr>
                <td>${String(r.id).padStart(2, '0')}</td>
                <td>${escapeHtml(r.title)}</td>
                <td>${escapeHtml(r.category)}</td>
                <td>${escapeHtml(r.dateLabel || '')}</td>
                <td>
                  <button class="adm-btn">Éditer</button>
                  <button class="adm-btn red">Suppr.</button>
                </td>
              </tr>
            `
          )
          .join('');
      }
    }

    // Devis
    const devisBox = $('#adm-devis-adm');
    if (devisBox) {
      const tBody = devisBox.querySelector('table tbody');
      if (tBody) {
        const data = await apiFetch('/devis');
        tBody.innerHTML = (data.items || [])
          .map((x) => {
            let badge = 'badge yellow';
            if (x.status === 'accepted') badge = 'badge green';
            if (x.status === 'rejected') badge = 'badge red';
            let label = x.status;
            if (x.status === 'pending') label = 'En attente';
            if (x.status === 'accepted') label = 'Accepté';
            if (x.status === 'rejected') label = 'Refusé';
            return `
              <tr>
                <td>#${String(x.id).padStart(3, '0')}</td>
                <td>${escapeHtml(x.fullName)}</td>
                <td>${escapeHtml(x.service || '')}</td>
                <td>${escapeHtml(x.budget || '')}</td>
                <td>${x.dateISO ? new Date(x.dateISO).toLocaleDateString('fr-FR') : ''}</td>
                <td><span class="${badge}">${label}</span></td>
                <td>
                  <button class="adm-btn green" data-devis-id="${x.id}" data-action="accepted" ${x.status === 'accepted' ? 'disabled' : ''}>
                    Accepter
                  </button>
                  <button class="adm-btn red" data-devis-id="${x.id}" data-action="rejected" ${x.status === 'rejected' ? 'disabled' : ''}>
                    Refuser
                  </button>
                </td>
              </tr>
            `;
          })
          .join('');
      }
    }

    // Blog
    const blogBox = $('#adm-blog-adm');
    if (blogBox) {
      const tBody = blogBox.querySelector('table tbody');
      if (tBody) {
        const data = await apiFetch('/blog');
        tBody.innerHTML = (data.items || [])
          .map(
            (p) => `
              <tr>
                <td>${String(p.id).padStart(2, '0')}</td>
                <td>${escapeHtml(p.title)}</td>
                <td>${escapeHtml(p.category)}</td>
                <td>${escapeHtml(p.dateLabel || '')}</td>
                <td>
                  <button class="adm-btn">Éditer</button>
                  <button class="adm-btn red">Suppr.</button>
                </td>
              </tr>
            `
          )
          .join('');
      }
    }

    // Galerie
    const galBox = $('#adm-galerie-adm');
    if (galBox) {
      const grid = galBox.querySelector('.admin-gallery');
      if (grid) {
        const data = await apiFetch('/gallery');
        grid.innerHTML = (data.items || [])
          .map(
            (g) => `<div class="adm-gal-item" style="background:url('${escapeAttr(g.imageUrl)}') center/cover"></div>`
          )
          .join('');
      }
    }

    // Users
    const usersBox = $('#adm-users-adm');
    if (usersBox) {
      const tBody = usersBox.querySelector('table tbody');
      if (tBody) {
        const data = await apiFetch('/users');
        tBody.innerHTML = (data.items || [])
          .map(
            (u) => `<tr><td>${escapeHtml(u.name)}</td><td>${escapeHtml(u.email)}</td><td>${escapeHtml(u.role)}</td><td>${u.status === 'active' ? '<span class="badge green">Actif</span>' : '<span class="badge yellow">Inactif</span>'}</td></tr>`
          )
          .join('');
      }
    }

    // Settings
    const settingsBox = $('#adm-settings-adm');
    if (settingsBox) {
      const inputs = settingsBox.querySelectorAll('input');
      if (inputs.length) {
        const data = await apiFetch('/settings');
        const s = data.settings || {};
        // Order in HTML:
        const [company, email, phone, address, slogan] = inputs;
        if (company) company.value = s.companyName || '';
        if (email) email.value = s.contactEmail || '';
        if (phone) phone.value = s.phone || '';
        if (address) address.value = s.address || '';
        if (slogan) slogan.value = s.slogan || '';
      }
    }
  }

  function escapeHtml(str) {
    return String(str === null || str === undefined ? '' : str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '<')
      .replaceAll('>', '>')
      .replaceAll('"', '"')
      .replaceAll("'", '&#039;');
  }


  function escapeAttr(str) {
    return escapeHtml(str).replaceAll('`', '&#096;');
  }

  async function loadAdminData() {
    if (!adminRequireAuthOrLogin()) return;

    // Dashboard
    try {
      await Promise.all([loadAdminKPIs(), loadAdminLastDevisTable()]);
    } catch (e) {
      // ignore chart etc.
    }

    // Tables (lazy but safe)
    try {
      await loadAdminTables();
    } catch (e) {
      // ignore table load errors to avoid breaking UX
      console.error('[admin] load tables error', e);
    }
  }

  window.adminLogout = function () {
    clearToken();
    // just show home; also hide admin tabs
    showPage('home');
  };

  // =====================
  // Expose functions
  // =====================
  window.showPage = showPage;
  window.toggleMobile = toggleMobile;
  window.filterServices = filterServices;
  window.filterReal = filterReal;
  window.showAdminTab = showAdminTab;
  window.showSuccessContact = showSuccessContact;
  window.showSuccessDevis = showSuccessDevis;

  // =====================
  // ADMIN MODAL (basic)
  // =====================

  window.openAdminModal = function openAdminModal(resource, mode) {
    const modal = $('#adminModal');
    if (!modal) return;

    // Always use existing modal elements in admin.html
    const titleEl = $('#adminModalTitle');
    const bodyEl = $('#adminModalBody');
    const saveBtn = $('#adminModalSave');
    const closeBtn = $('#adminModalClose');
    const cancelBtn = $('#adminModalCancel');

    const safeResource = resource || 'resource';
    const safeMode = mode || 'edit';

    let title = 'MODIFIER';
      if (safeResource === 'system' && safeMode === 'config') title = 'CONFIGURATION';
    else title = 'MODIFIER';

    if (titleEl) titleEl.textContent = title;

    // For now only implement system/config UI.
    // CRUD modals are out of scope for this quick configuration button.
    if (safeResource === 'system' && safeMode === 'config') {
      bodyEl.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr; gap:14px;">
          <div class="form-group"><label>Prévisualisation (texte)</label><input type="text" id="cfg-preview" placeholder="Ex: Site v1" /></div>
          <div class="form-group"><label>Message d'accueil (texte)</label><input type="text" id="cfg-welcome" placeholder="Ex: Bienvenue" /></div>
          <div style="font-size:12px; color:rgba(255,255,255,0.65); line-height:1.5;">
            Les paramètres sont stockés côté serveur dans <b>settings</b>. (Route: PUT /api/settings)
          </div>
        </div>
      `;

      // Load current settings (best-effort)
      apiFetch('/settings').then((data) => {
        const s = (data && data.settings) ? data.settings : {};
        const preview = s.previewText || '';
        const welcome = s.welcomeMessage || '';
        const ip = $('#cfg-preview');
        const iw = $('#cfg-welcome');
        if (ip) ip.value = preview;
        if (iw) iw.value = welcome;
      }).catch(() => {});

      const onSave = async () => {
        try {
          const cfgPreviewEl = $('#cfg-preview');
          const preview = cfgPreviewEl && cfgPreviewEl.value ? String(cfgPreviewEl.value) : '';
          const welcomeEl = $('#cfg-welcome');
          const welcome = welcomeEl && welcomeEl.value ? String(welcomeEl.value) : '';

          // Store extra keys inside settings singleton via generic pick() (server only persists known keys).
          // Workaround: use existing keys companyName/contactEmail for demo if backend doesn't accept extras.
          // We'll still call PUT /settings with supported keys.
          await apiFetch('/settings', {
            method: 'PUT',
            body: {
              companyName: preview || undefined,
              slogan: welcome || undefined
            }
          });

          modal.style.display = 'none';
          modal.style.alignItems = '';
        } catch (e) {
          alert('Erreur configuration: ' + (e && e.message ? e.message : e));
        }
      };

      if (saveBtn) saveBtn.onclick = onSave;
    } else {
      if (bodyEl) bodyEl.innerHTML = `<div style="color:rgba(255,255,255,0.7);">Modal non implémenté: ${escapeHtml(safeResource)}</div>`;
      if (saveBtn) saveBtn.onclick = () => modal.style.display = 'none';
    }

    // Close handlers
    if (closeBtn) closeBtn.onclick = () => (modal.style.display = 'none');
    if (cancelBtn) cancelBtn.onclick = () => (modal.style.display = 'none');

    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
  };

  // =====================
  // SETTINGS (existing)
  // =====================

  window.saveSettings = window.saveSettings || async function saveSettings() {
    const settingsBox = $('#adm-settings-adm');
    if (!settingsBox) return;

    const inputs = settingsBox.querySelectorAll('input');
    if (!inputs || inputs.length < 5) return;

    // Order in HTML:
    const [company, email, phone, address, slogan] = inputs;

    const payload = {
      companyName: company && company.value ? String(company.value) : '',
      contactEmail: email && email.value ? String(email.value) : '' ,
      phone: phone && phone.value ? String(phone.value) : '' ,
      address: address && address.value ? String(address.value) : '' ,
      slogan: slogan && slogan.value ? String(slogan.value) : ''
    };

    await apiFetch('/settings', { method: 'PUT', body: payload });
  };

  // Boot

  document.addEventListener('DOMContentLoaded', () => {
    scrollTopBtnVisibility();

    // Set initial active nav highlighting if possible
    const initialPage = $$('.page.active')[0];
    if (initialPage) {
      const id = initialPage && initialPage.id ? String(initialPage.id).replace('page-', '') : '';
      if (id) {
        const link = $(`#navbar a[data-page="${id}"]`);
        if (link) link.classList.add('active-nav');
      }
    }

    // Hide success banners initially (in case of cached HTML)
    const c = $('#contactSuccess');
    if (c) c.style.display = 'none';
    const d = $('#devisSuccess');
    if (d) d.style.display = 'none';
  });
})();

