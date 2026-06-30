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

    if (pageId === 'compte') {
      updateClientAccountUI();
    }
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

    // Fallback: if Messages tab exists but nav item is missing, create it
    const nav = document.querySelector('.admin-nav');
    if (nav && !document.querySelector('.admin-nav-item[data-tab="messages-adm"]')) {
      const msgItem = document.createElement('a');
      msgItem.href = '#';
      msgItem.className = 'admin-nav-item';
      msgItem.setAttribute('data-tab', 'messages-adm');
      msgItem.onclick = function (e) { e.preventDefault(); showAdminTab('messages-adm', this); };
      msgItem.textContent = '💬 Messages';
      nav.insertBefore(msgItem, nav.children[4]);
    }

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

  function showDevisAuthNotice(noticeEl, message) {
    if (!noticeEl) return;

    const accountTarget = document.getElementById('page-compte') ? '#' : 'compte.html';
    const actionAttrs = accountTarget === '#'
      ? 'href="#" onclick="event.preventDefault(); showPage(\'compte\')"'
      : 'href="compte.html"';
    const authMessage = message || "Pour demander un devis, connectez-vous ou créez un compte client si vous n'en avez pas encore.";

    noticeEl.innerHTML = `
      <strong>Connexion requise</strong>
      <span>${escapeHtml(authMessage)}</span>
      <div class="devis-auth-actions">
        <a class="btn-green" ${actionAttrs}>Se connecter</a>
        <a class="devis-auth-secondary" ${actionAttrs}>Créer un compte</a>
      </div>
    `;
    noticeEl.classList.add('devis-auth-notice');
    noticeEl.style.display = 'block';
  }

  // Public: Devis submit
  window.submitDevis = async function submitDevis(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();

    const page = $('#page-devis');
    if (!page) return;

    const clientToken = getClientToken();
    const clientUser = getClientUser();
    const noticeEl = $('#devisAccountNotice');

    if (!clientToken || !clientUser) {
      showDevisAuthNotice(noticeEl);
      return;
    }

    const fullNameEl = page.querySelector('input[type="text"][placeholder="Votre nom"]');
    const emailEl = page.querySelector('input[type="email"][placeholder="votre@email.com"]');
    const phoneEl = page.querySelector('input[type="tel"][placeholder="Votre numéro"]');
    const companyEl = page.querySelector('input[type="text"][placeholder="Nom de votre société"]');

    const selects = page.querySelectorAll('select');
    const serviceEl = selects && selects[0] ? selects[0] : null;
    const budgetEl = selects && selects[1] ? selects[1] : null;

    const descEl = page.querySelector('textarea[rows="6"]');
    const desiredTimeEl = page.querySelector('input[type="text"][placeholder="Ex : dans 3 mois, urgent, etc."]');

    const payload = {
      fullName: fullNameEl && fullNameEl.value ? String(fullNameEl.value).trim() : '',
      email: emailEl && emailEl.value ? String(emailEl.value).trim() : '',
      phone: phoneEl && phoneEl.value ? String(phoneEl.value).trim() : '',
      company: companyEl && companyEl.value ? String(companyEl.value).trim() : '',
      service: serviceEl ? String(serviceEl.value || '') : '',
      budget: budgetEl ? String(budgetEl.value || '') : '',
      description: descEl && descEl.value ? String(descEl.value).trim() : '',
      desiredTime: desiredTimeEl && desiredTimeEl.value ? String(desiredTimeEl.value).trim() : ''
    };

    if (!payload.fullName || !payload.email || !payload.service || !payload.budget || !payload.description) {
      if (noticeEl) {
        noticeEl.textContent = 'Merci de compléter les champs obligatoires avant d’envoyer votre demande.';
        noticeEl.style.display = 'block';
      }
      return;
    }

    try {
      if (noticeEl) {
        noticeEl.style.display = 'none';
      }
      await apiFetch('/devis', { method: 'POST', body: payload, token: clientToken });
      showSuccessDevis();

      [fullNameEl, emailEl, phoneEl, companyEl, serviceEl, budgetEl, descEl, desiredTimeEl].forEach((el) => {
        if (!el) return;
        if ('value' in el) el.value = '';
      });
    } catch (e) {
      if (noticeEl) {
        if (e && (e.message === 'invalid_token' || e.message === 'missing_token')) {
          clearClientSession();
          showDevisAuthNotice(noticeEl, 'Votre session a expiré. Reconnectez-vous pour envoyer votre demande de devis.');
        } else {
          noticeEl.textContent = `Impossible d’envoyer votre devis: ${e.message}`;
          noticeEl.style.display = 'block';
        }
      }
    }
  };


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

  const defaultApiBase = window.location.port === '3001'
    ? '/api'
    : `${window.location.protocol}//${window.location.hostname}:3001/api`;

  const API_BASE = (window.API_BASE || '').toString().replace(/\/$/, '') || defaultApiBase;

  function getToken() {
    return window.localStorage.getItem('adminToken');
  }

  function setToken(token) {
    window.localStorage.setItem('adminToken', token);
  }

  function clearToken() {
    window.localStorage.removeItem('adminToken');
  }

  function getClientToken() {
    return window.localStorage.getItem('clientToken');
  }

  function setClientToken(token) {
    window.localStorage.setItem('clientToken', token);
  }

  function clearClientToken() {
    window.localStorage.removeItem('clientToken');
  }

  function clearClientSession() {
    clearClientToken();
    setClientUser(null);
    updateClientAccountUI();
  }

  function getClientUser() {
    try {
      return JSON.parse(window.localStorage.getItem('clientUser') || 'null');
    } catch (e) {
      return null;
    }
  }

  function setClientUser(user) {
    if (!user) {
      window.localStorage.removeItem('clientUser');
      return;
    }

    window.localStorage.setItem('clientUser', JSON.stringify(user));
  }

  async function apiFetch(path, { method = 'GET', body = null, token = null } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const t = token || getToken();
    if (t) headers['Authorization'] = `Bearer ${t}`;

    const url = `${API_BASE}${path}`;
    console.debug('[apiFetch] url=', url, 'method=', method, 'token=', Boolean(t));

    let res;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
      });
    } catch (err) {
      const errorMessage = err && err.message ? err.message : 'Network error';
      throw new Error(`${errorMessage} (${url})`);
    }

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json().catch(() => null) : await res.text().catch(() => null);

    if (!res.ok) {
      const msg = data && data.error ? data.error : `http_${res.status}`;
      throw new Error(msg);
    }

    return data;
  }

  async function clientApiFetch(path, { method = 'GET', body = null, token = null } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const t = token || getClientToken();
    if (t) headers['Authorization'] = `Bearer ${t}`;

    const url = `${API_BASE}${path}`;
    let res;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
      });
    } catch (err) {
      throw new Error(err && err.message ? err.message : 'Network error');
    }

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json().catch(() => null) : await res.text().catch(() => null);

    if (!res.ok) {
      const msg = data && data.error ? data.error : `http_${res.status}`;
      throw new Error(msg);
    }

    return data;
  }

function updateClientAccountUI() {
     const statusEl = $('#clientAccountStatus');
     const noticeEl = $('#clientQuoteNotice');
     const formEl = $('#clientQuoteForm');
     const user = getClientUser();
     const loggedIn = Boolean(getClientToken());

     if (statusEl) {
       statusEl.textContent = loggedIn && user && user.name
         ? `Bonjour ${user.name} 👋` 
         : 'Vous devez créer un compte puis vous connecter pour demander un devis.';
     }

     if (noticeEl) noticeEl.style.display = loggedIn ? 'none' : 'block';
     if (formEl) formEl.style.display = loggedIn ? 'block' : 'none';


      const messagesLinkEl = $('#clientMessagesLink');
      if (messagesLinkEl) messagesLinkEl.style.display = loggedIn ? 'inline-block' : 'none';
     if (loggedIn && user) {
       const nameEl = $('#clientDevisName');
       const emailEl = $('#clientDevisEmail');
       if (nameEl && !nameEl.value) nameEl.value = user.name || '';
       if (emailEl && !emailEl.value) emailEl.value = user.email || '';
     }

     if (document.getElementById('clientDevisHistoryList')) {
       loadClientDevisHistory().catch(() => {});
     }

     if (document.getElementById('clientMessagesList')) {
       updateClientMessagesUI();
     }
   }

   function updateClientMessagesUI() {
     const statusEl = $('#clientMessagesStatus');
     const loginNoticeEl = $('#clientMessagesLoginNotice');
     const listEl = $('#clientMessagesList');
     const containerEl = $('#messagesContainer');
     const loggedIn = Boolean(getClientToken());

     if (!loggedIn) {
       if (loginNoticeEl) loginNoticeEl.style.display = 'block';
       if (listEl) listEl.style.display = 'none';
       return;
     }

     if (loginNoticeEl) loginNoticeEl.style.display = 'none';
     if (listEl) listEl.style.display = 'block';
     if (statusEl) statusEl.textContent = '';

     loadClientMessages().catch((e) => {
       if (containerEl) {
         containerEl.innerHTML = `<div style="color:#b91c1c;">Impossible de charger vos messages : ${escapeHtml(e.message || e)}</div>`;
       }
     });
   }

   async function loadClientMessages() {
     const container = document.getElementById('messagesContainer');
     if (!container) return;

     const token = getClientToken();
     const currentUser = getClientUser();
     const currentEmail = currentUser && currentUser.email ? currentUser.email : '';

     try {
       const data = await clientApiFetch('/messages', { method: 'GET', token });
       const items = Array.isArray(data && data.items) ? data.items : [];
       const clientMessages = items.filter((item) => String(item.email || '').toLowerCase() === String(currentEmail).toLowerCase());

       if (!clientMessages.length) {
         container.innerHTML = '<div style="color:#666; text-align:center; padding:20px;">Aucun message reçu pour le moment.</div>';
         return;
       }

       container.innerHTML = `
         <div style="display:grid; gap:12px;">
           ${clientMessages.map((msg) => {
             const dateLabel = msg.createdAt ? new Date(msg.createdAt).toLocaleString('fr-FR') : '';
             const statusLabel = msg.status === 'read' ? '<span class="badge green">Lu</span>' : '<span class="badge yellow">Non lu</span>';
             const sourceLabel = msg.source === 'devis' ? `Réponse à votre devis #${msg.devisId || ''}` : '';
             return `
               <div style="padding:16px; border:1px solid #e3ebdf; border-radius:12px; background:#fbfdf8;">
                 <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:8px;">
                   <strong>${escapeHtml(msg.subject || 'Message')}</strong>
                   ${statusLabel}
                 </div>
                 ${sourceLabel ? `<div style="font-size:0.85rem; color:#2E7D32; margin-bottom:6px;">${escapeHtml(sourceLabel)}</div>` : ''}
                 <div style="font-size:0.95rem; color:#333; margin-bottom:8px; line-height:1.5;">${escapeHtml(msg.message || '')}</div>
                 <div style="font-size:0.8rem; color:#666;">Reçu le : ${escapeHtml(dateLabel)}</div>
               </div>
             `;
           }).join('')}
         </div>
       `;
     } catch (e) {
       container.innerHTML = `<div style="color:#b91c1c;">Erreur lors du chargement des messages : ${escapeHtml(e.message || e)}</div>`;
     }
   }

  window.submitClientRegister = async function submitClientRegister(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();

    const nameEl = $('#accountRegisterName');
    const emailEl = $('#accountRegisterEmail');
    const passwordEl = $('#accountRegisterPassword');
    const msgEl = $('#accountRegisterMessage');

    const name = nameEl && nameEl.value ? String(nameEl.value).trim() : '';
    const email = emailEl && emailEl.value ? String(emailEl.value).trim() : '';
    const password = passwordEl && passwordEl.value ? String(passwordEl.value) : '';

    if (!name || !email || !password) {
      if (msgEl) {
        msgEl.textContent = 'Merci de remplir tous les champs.';
        msgEl.style.display = 'block';
      }
      return;
    }

    try {
      const data = await clientApiFetch('/auth/register', {
        method: 'POST',
        body: { name, email, password }
      });
      setClientToken(data.token);
      setClientUser(data.user || { name, email, role: 'client' });
      updateClientAccountUI();
      const devisNotice = $('#devisAccountNotice');
      if (devisNotice) devisNotice.style.display = 'none';
      if (msgEl) {
        msgEl.textContent = 'Compte créé avec succès. Vous pouvez maintenant demander un devis.';
        msgEl.style.display = 'block';
      }
    } catch (e) {
      if (msgEl) {
        msgEl.textContent = `Impossible de créer le compte: ${e.message}`;
        msgEl.style.display = 'block';
      }
    }
  };

  window.submitClientLogin = async function submitClientLogin(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();

    const emailEl = $('#accountLoginEmail');
    const passwordEl = $('#accountLoginPassword');
    const msgEl = $('#accountLoginMessage');

    const email = emailEl && emailEl.value ? String(emailEl.value).trim() : '';
    const password = passwordEl && passwordEl.value ? String(passwordEl.value) : '';

    if (!email || !password) {
      if (msgEl) {
        msgEl.textContent = 'Merci d’entrer votre email et votre mot de passe.';
        msgEl.style.display = 'block';
      }
      return;
    }

    try {
      const data = await clientApiFetch('/auth/login', {
        method: 'POST',
        body: { email, password }
      });
      setClientToken(data.token);
      setClientUser(data.user || { email, role: 'client' });
      updateClientAccountUI();
      const devisNotice = $('#devisAccountNotice');
      if (devisNotice) devisNotice.style.display = 'none';
      if (msgEl) {
        msgEl.textContent = 'Connexion réussie. Vous pouvez envoyer votre demande de devis.';
        msgEl.style.display = 'block';
      }
    } catch (e) {
      if (msgEl) {
        msgEl.textContent = `Connexion impossible: ${e.message}`;
        msgEl.style.display = 'block';
      }
    }
  };

  async function loadClientDevisHistory() {
    const container = document.getElementById('clientDevisHistoryList');
    if (!container) return;

    const token = getClientToken();
    if (!token) {
      container.innerHTML = '<div style="color:#666;">Connectez-vous pour voir l’historique de vos demandes.</div>';
      return;
    }

    try {
      const data = await clientApiFetch('/devis', { method: 'GET', token });
      const items = Array.isArray(data && data.items) ? data.items : [];
      const currentUser = getClientUser();
      const currentEmail = currentUser && currentUser.email ? currentUser.email : '';
      const clientItems = items.filter((item) => String(item.clientEmail || item.email || '').toLowerCase() === String(currentEmail).toLowerCase());

      if (!clientItems.length) {
        container.innerHTML = '<div style="color:#666;">Aucune demande n’a encore été envoyée.</div>';
        return;
      }

      container.innerHTML = `
        <div style="display:grid; gap:12px;">
          ${clientItems.map((item) => {
            const statusLabel = item.status === 'accepted' ? 'Accepté' : item.status === 'rejected' ? 'Refusé' : 'En attente';
            return `
              <div style="padding:14px; border:1px solid #e3ebdf; border-radius:12px; background:#fbfdf8;">
                <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:6px;">
                  <strong>${escapeHtml(item.service || 'Demande')}</strong>
                  <span style="font-size:0.9rem; color:#2e7d32; font-weight:700;">${escapeHtml(statusLabel)}</span>
                </div>
                <div style="font-size:0.95rem; color:#555;">Budget : ${escapeHtml(item.budget || '-')}</div>
                <div style="font-size:0.95rem; color:#555;">Envoyée le : ${escapeHtml(item.createdAt ? new Date(item.createdAt).toLocaleDateString('fr-FR') : '-')}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } catch (e) {
      if (e && (e.message === 'invalid_token' || e.message === 'missing_token')) {
        clearClientSession();
        container.innerHTML = '<div style="color:#b91c1c;">Votre session a expiré. Reconnectez-vous pour voir vos demandes.</div>';
        return;
      }

      container.innerHTML = `<div style="color:#b91c1c;">Impossible de charger vos demandes : ${escapeHtml(e.message || e)}</div>`;
    }
  }

  window.submitClientLogout = function submitClientLogout(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    clearClientToken();
    setClientUser(null);
    updateClientAccountUI();
    const msgEl = $('#accountLoginMessage');
    if (msgEl) {
      msgEl.textContent = 'Vous avez été déconnecté.';
      msgEl.style.display = 'block';
    }
  };

  window.submitClientDevis = async function submitClientDevis(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();

    const token = getClientToken();
    if (!token) {
      const msgEl = $('#accountDevisMessage');
      if (msgEl) {
        msgEl.textContent = 'Connectez-vous d’abord pour envoyer votre demande.';
        msgEl.style.display = 'block';
      }
      return;
    }

    const payload = {
      fullName: $('#clientDevisName') && $('#clientDevisName').value ? String($('#clientDevisName').value).trim() : '',
      email: $('#clientDevisEmail') && $('#clientDevisEmail').value ? String($('#clientDevisEmail').value).trim() : '',
      phone: $('#clientDevisPhone') && $('#clientDevisPhone').value ? String($('#clientDevisPhone').value).trim() : '',
      company: $('#clientDevisCompany') && $('#clientDevisCompany').value ? String($('#clientDevisCompany').value).trim() : '',
      service: $('#clientDevisService') ? String($('#clientDevisService').value || '') : '',
      budget: $('#clientDevisBudget') ? String($('#clientDevisBudget').value || '') : '',
      description: $('#clientDevisDescription') && $('#clientDevisDescription').value ? String($('#clientDevisDescription').value).trim() : '',
      desiredTime: $('#clientDevisTime') && $('#clientDevisTime').value ? String($('#clientDevisTime').value).trim() : ''
    };

    if (!payload.fullName || !payload.email || !payload.service || !payload.budget || !payload.description) {
      const msgEl = $('#accountDevisMessage');
      if (msgEl) {
        msgEl.textContent = 'Merci de compléter au minimum votre nom, email, service, budget et description.';
        msgEl.style.display = 'block';
      }
      return;
    }

    try {
      await clientApiFetch('/devis', { method: 'POST', body: payload, token });
      const msgEl = $('#accountDevisMessage');
      if (msgEl) {
        msgEl.textContent = 'Votre demande de devis a bien été envoyée. Nous vous recontacterons bientôt.';
        msgEl.style.display = 'block';
      }
      ['#clientDevisName', '#clientDevisPhone', '#clientDevisCompany', '#clientDevisService', '#clientDevisBudget', '#clientDevisDescription', '#clientDevisTime'].forEach((sel) => {
        const el = $(sel);
        if (el) el.value = '';
      });
      loadClientDevisHistory().catch(() => {});
    } catch (e) {
      const msgEl = $('#accountDevisMessage');
      if (msgEl) {
        if (e && (e.message === 'invalid_token' || e.message === 'missing_token')) {
          clearClientSession();
          msgEl.textContent = 'Votre session a expiré. Reconnectez-vous pour envoyer votre demande.';
        } else {
          msgEl.textContent = `Erreur lors de l’envoi: ${e.message}`;
        }
        msgEl.style.display = 'block';
      }
    }
  };

  function ensureAdminLoginUI() {
    // Login modal is created once.
    if (document.getElementById('adminLoginBox')) return;

    const wrap = document.createElement('div');
    wrap.id = 'adminLoginBox';
    wrap.style.position = 'fixed';
    wrap.style.inset = '0';
    wrap.style.background = 'rgba(0,0,0,0.65)';
    wrap.style.zIndex = '5000';
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.justifyContent = 'center';
    wrap.style.padding = '16px';
    wrap.innerHTML = `
      <div style="width:min(520px, 100%); background:#111827; color:white; border:1px solid rgba(126,217,87,0.25); border-radius:12px; padding:20px; box-shadow:0 10px 40px rgba(0,0,0,0.35); box-sizing:border-box;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <div style="font-family:Montserrat, sans-serif; font-weight:900; letter-spacing:0.05em;">LOGIN ADMIN</div>
          <button id="adminLoginClose" style="background:transparent; color:rgba(255,255,255,0.6); border:0; font-size:18px; cursor:pointer;">×</button>
        </div>
        <div style="display:grid; grid-template-columns:1fr; gap:12px;">
          <div>
            <label style="display:block; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:rgba(255,255,255,0.7); margin-bottom:6px;">Email</label>
            <input id="adminLoginEmail" type="email" placeholder="admin@kmroot.com" style="width:100%; padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.12); outline:none; background:#0b1120; color:white; box-sizing:border-box;" />
          </div>
          <div>
            <label style="display:block; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:rgba(255,255,255,0.7); margin-bottom:6px;">Mot de passe</label>
            <input id="adminLoginPassword" type="password" placeholder="admin123" style="width:100%; padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.12); outline:none; background:#0b1120; color:white; box-sizing:border-box;" />
          </div>
          <div id="adminLoginError" style="display:none; color:#fca5a5; font-weight:700; font-size:13px;">Erreur</div>
          <button id="adminLoginBtn" class="btn-green" style="width:100%; padding:12px 28px;">Se connecter</button>
        </div>
      </div>
    `;

    document.body.appendChild(wrap);

    const close = wrap.querySelector('#adminLoginClose');
    if (close) close.addEventListener('click', () => wrap.remove());

    const adminLoginBtn = wrap.querySelector('#adminLoginBtn');
    if (adminLoginBtn) {
      adminLoginBtn.addEventListener('click', async () => {
        const emailInput = wrap.querySelector('#adminLoginEmail');
        const email = emailInput && emailInput.value ? String(emailInput.value).trim() : '';
        const passwordInput = wrap.querySelector('#adminLoginPassword');
        const password = passwordInput && passwordInput.value ? String(passwordInput.value) : '';
        const errEl = wrap.querySelector('#adminLoginError');

        try {
          if (errEl) errEl.style.display = 'none';
          const data = await apiFetch('/auth/login', {
            method: 'POST',
            body: { email, password },
            token: null
          });
          setToken(data.token);
          wrap.remove();
          await loadAdminData();
        } catch (e) {
          if (errEl) {
            errEl.textContent = `Connexion impossible: ${e.message}`;
            errEl.style.display = 'block';
          }
        }
      });
    }

    const passwordInput = wrap.querySelector('#adminLoginPassword');
    if (passwordInput) {
      passwordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && adminLoginBtn) adminLoginBtn.click();
      });
    }

    const emailInput = wrap.querySelector('#adminLoginEmail');
    if (emailInput) {
      emailInput.focus();
      emailInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const next = wrap.querySelector('#adminLoginPassword');
          if (next) next.focus();
        }
      });
    }
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

  function ensureAdminMessagesNavEntry() {
    const nav = document.querySelector('.admin-nav');
    if (!nav) return;
    if (document.querySelector('.admin-nav-item[data-tab="messages-adm"]')) return;

    const msgItem = document.createElement('a');
    msgItem.href = '#';
    msgItem.className = 'admin-nav-item';
    msgItem.setAttribute('data-tab', 'messages-adm');
    msgItem.onclick = function (e) { e.preventDefault(); showAdminTab('messages-adm', this); };
    msgItem.textContent = '💬 Messages';
    nav.insertBefore(msgItem, nav.children[4]);
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
                  <button class="adm-btn" data-service-id="${s.id}" data-action="toggle">Éditer</button>
                  <button class="adm-btn red" data-service-id="${s.id}" data-action="delete">Suppr.</button>
                </td>
              </tr>
            `
          )
          .join('');

        tBody.querySelectorAll('button[data-service-id][data-action]').forEach((btn) => {
          btn.addEventListener('click', async (ev) => {
            ev.preventDefault();
            const id = btn.getAttribute('data-service-id');
            const action = btn.getAttribute('data-action');
            if (!id || !action) return;

            btn.disabled = true;
            try {
              if (action === 'delete') {
                await apiFetch(`/services/${id}`, { method: 'DELETE' });
              } else {
                // toggle active/inactive (simple edit)
                const row = btn.closest('tr');
                const statusCell = row ? row.children[3] : null;
                const wantsActive = statusCell && statusCell.textContent ? !statusCell.textContent.includes('Actif') : false;
                const next = wantsActive ? 'active' : 'inactive';
                await apiFetch(`/services/${id}`, { method: 'PUT', body: { status: next } });
              }
              await loadAdminTables();
            } catch (e2) {
              alert('Erreur service: ' + (e2 && e2.message ? e2.message : e2));
              btn.disabled = false;
            }
          });
        });
      }
    }



    // Devis
    const devisBox = $('#adm-devis-adm');
    if (devisBox) {
      const tBody = devisBox.querySelector('table tbody');
      if (tBody) {
        const data = await apiFetch('/devis');
        tBody.innerHTML = (data.items || [])
          .map((d) => {
            const dateLabel = d.dateISO ? new Date(d.dateISO).toLocaleDateString('fr-FR') : '';
            let statusHtml = '<span class="badge yellow">En attente</span>';
            if (d.status === 'accepted') statusHtml = '<span class="badge green">Accepté</span>';
            if (d.status === 'rejected') statusHtml = '<span class="badge red">Refusé</span>';

            return `
              <tr>
                <td>${String(d.id).padStart(2, '0')}</td>
                <td>${escapeHtml(d.fullName || '')}</td>
                <td>${escapeHtml(d.service || '')}</td>
                <td>${escapeHtml(d.budget || '')}</td>
                <td>${escapeHtml(dateLabel)}</td>
                <td>${statusHtml}</td>
                <td>
                  <button class="adm-btn" data-devis-id="${d.id}" data-action="accept">Accepter</button>
                  <button class="adm-btn red" data-devis-id="${d.id}" data-action="reject">Refuser</button>
                </td>
              </tr>
            `;
          })
          .join('');

        tBody.querySelectorAll('button[data-devis-id][data-action]').forEach((btn) => {
          btn.addEventListener('click', async (ev) => {
            ev.preventDefault();
            const id = btn.getAttribute('data-devis-id');
            const action = btn.getAttribute('data-action');
            if (!id || !action) return;

            btn.disabled = true;
            try {
              const status = action === 'accept' ? 'accepted' : 'rejected';
              const rejectionReason = action === 'reject'
                ? window.prompt('Raison du refus (facultative) :', 'Votre demande ne correspond pas aux critères actuels.')
                : '';
              await apiFetch(`/devis/${id}`, { method: 'PUT', body: { status, rejectionReason } });
              await loadAdminTables();
              if (status === 'accepted') {
                alert('Le client a été notifié de l’acceptation du devis.');
              } else {
                alert('Le client a été notifié du refus du devis avec la raison fournie.');
              }
            } catch (e2) {
              alert('Erreur devis: ' + (e2 && e2.message ? e2.message : e2));
              btn.disabled = false;
            }
          });
        });
      }
    }

    // Messages
    const messagesBox = $('#adm-messages-adm');
    if (messagesBox) {
      const tBody = messagesBox.querySelector('table tbody');
      if (tBody) {
        const data = await apiFetch('/messages');
        tBody.innerHTML = (data.items || [])
          .map((m) => {
            const dateLabel = m.createdAt ? new Date(m.createdAt).toLocaleString('fr-FR') : '';
            let statusHtml = '<span class="badge yellow">Non lu</span>';
            if (m.status === 'read') statusHtml = '<span class="badge green">Lu</span>';
            return `
              <tr>
                <td>${String(m.id).padStart(2, '0')}</td>
                <td>${escapeHtml(m.senderName || '')}</td>
                <td>${escapeHtml(m.email || '')}</td>
                <td>${escapeHtml(m.subject || '')}</td>
                <td>${escapeHtml(m.message || '')}</td>
                <td>${statusHtml}</td>
                <td>
                  <button class="adm-btn" data-message-id="${m.id}" data-action="read">Marquer lu</button>
                  <button class="adm-btn red" data-message-id="${m.id}" data-action="delete">Suppr.</button>
                </td>
              </tr>
            `;
          })
          .join('');

        tBody.querySelectorAll('button[data-message-id][data-action]').forEach((btn) => {
          btn.addEventListener('click', async (ev) => {
            ev.preventDefault();
            const id = btn.getAttribute('data-message-id');
            const action = btn.getAttribute('data-action');
            if (!id || !action) return;

            btn.disabled = true;
            try {
              if (action === 'delete') {
                const ok = confirm('Supprimer ce message ?');
                if (!ok) return;
                await apiFetch(`/messages/${id}`, { method: 'DELETE' });
              } else {
                await apiFetch(`/messages/${id}`, { method: 'PUT', body: { status: 'read' } });
              }
              await loadAdminTables();
            } catch (e2) {
              alert('Erreur message: ' + (e2 && e2.message ? e2.message : e2));
              btn.disabled = false;
            }
          });
        });
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
                  <button class="adm-btn" data-blog-id="${p.id}" data-action="edit" data-blog-payload='${escapeAttr(JSON.stringify(p))}'>Éditer</button>
                  <button class="adm-btn red" data-blog-id="${p.id}" data-action="delete">Suppr.</button>
                </td>
              </tr>
            `
          )
          .join('');

        tBody.querySelectorAll('button[data-blog-id][data-action]').forEach((btn) => {
          btn.addEventListener('click', async (ev) => {
            ev.preventDefault();
            const id = btn.getAttribute('data-blog-id');
            const action = btn.getAttribute('data-action');
            if (!id || !action) return;

            btn.disabled = true;
            try {
              if (action === 'delete') {
                const ok = confirm('Supprimer cet article ?');
                if (!ok) return;
                await apiFetch(`/blog/${id}`, { method: 'DELETE' });
                await loadAdminTables();
                return;
              }

              if (action === 'edit') {
                const modal = $('#adminModal');
                if (!modal) return;
                modal.dataset.blogId = id;
                const payload = btn.getAttribute('data-blog-payload');
                if (payload !== null) modal.dataset.blogPayload = payload;
                openAdminModal('blog', 'edit');
              }
            } catch (e2) {
              alert('Erreur blog: ' + (e2 && e2.message ? e2.message : e2));
            } finally {
              btn.disabled = false;
            }
          });
        });
      }
    }

    // Realisations
    const realisationsBox = $('#adm-realisations-adm');
    if (realisationsBox) {
      const tBody = realisationsBox.querySelector('table tbody');
      if (tBody) {
        const data = await apiFetch('/realisations');
        tBody.innerHTML = (data.items || [])
          .map(
            (p) => `
              <tr>
                <td>${String(p.id).padStart(2, '0')}</td>
                <td>${escapeHtml(p.title)}</td>
                <td>${escapeHtml(p.category)}</td>
                <td>${escapeHtml(p.dateLabel || '')}</td>
                <td>
                  <button class="adm-btn" data-real-id="${p.id}" data-action="edit" data-real-payload='${escapeAttr(JSON.stringify(p))}'>Éditer</button>
                  <button class="adm-btn red" data-real-id="${p.id}" data-action="delete">Suppr.</button>
                </td>
              </tr>
            `
          )
          .join('');

        tBody.querySelectorAll('button[data-real-id][data-action]').forEach((btn) => {
          btn.addEventListener('click', async (ev) => {
            ev.preventDefault();
            const id = btn.getAttribute('data-real-id');
            const action = btn.getAttribute('data-action');
            if (!id || !action) return;

            btn.disabled = true;
            try {
              if (action === 'delete') {
                const ok = confirm('Supprimer cette réalisation ?');
                if (!ok) return;
                await apiFetch(`/realisations/${id}`, { method: 'DELETE' });
                await loadAdminTables();
                return;
              }

              if (action === 'edit') {
                const modal = $('#adminModal');
                if (!modal) return;
                modal.dataset.realisationsId = id;
                const payload = btn.getAttribute('data-real-payload');
                if (payload !== null) modal.dataset.realisationsPayload = payload;
                openAdminModal('realisations', 'edit');
              }
            } catch (e2) {
              alert('Erreur réalisation: ' + (e2 && e2.message ? e2.message : e2));
            } finally {
              btn.disabled = false;
            }
          });
        });
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
    ensureAdminMessagesNavEntry();
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
    window.location.href = 'home.html';
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

    // CRUD modals (blog + system/config)
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

    } else if (safeResource === 'blog') {
      const isEdit = safeMode === 'edit';
      if (safeMode === 'create' && modal && modal.dataset) {
        delete modal.dataset.blogId;
        delete modal.dataset.blogPayload;
      }
      const blogId = (modal && modal.dataset) ? (modal.dataset.blogId || null) : null;

      bodyEl.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr; gap:14px;">
          <div class="form-group"><label>Titre</label><input type="text" id="blog-title" placeholder="Titre" /></div>
          <div class="form-group"><label>Catégorie</label><input type="text" id="blog-category" placeholder="Catégorie" /></div>
          <div class="form-group"><label>Date (label)</label><input type="text" id="blog-dateLabel" placeholder="Ex: 15 Jan 2025" /></div>
          <div class="form-group"><label>Contenu</label><textarea id="blog-content" rows="8" placeholder="Contenu..." style="width:100%; padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.12); outline:none; background:#0b1120; color:white;"></textarea></div>
          <div id="blog-delete-row" style="display:${isEdit ? 'flex' : 'none'}; justify-content:flex-end; margin-top:6px;">
            <button class="btn-red" id="blogModalDelete" style="padding:10px 16px; border-radius:10px; cursor:pointer;">Supprimer</button>
          </div>
        </div>
      `;

      const fillFromRow = (p) => {
        const t = $('#blog-title');
        const c = $('#blog-category');
        const d = $('#blog-dateLabel');
        const ct = $('#blog-content');
        if (t) t.value = p && p.title ? p.title : '';
        if (c) c.value = p && p.category ? p.category : '';
        if (d) d.value = p && p.dateLabel ? p.dateLabel : '';
        if (ct) ct.value = p && p.content ? p.content : '';
      };

      // If edit, try to populate using stored row snapshot in dataset
      try {
        const raw = modal && modal.dataset ? modal.dataset.blogPayload : null;
        if (isEdit && raw) fillFromRow(JSON.parse(raw));
      } catch (e) {}

      const onSave = async () => {
        const titleEl = $('#blog-title');
        const categoryEl = $('#blog-category');
        const dateEl = $('#blog-dateLabel');
        const contentEl = $('#blog-content');

        const payload = {
          title: titleEl && titleEl.value ? String(titleEl.value).trim() : '',
          category: categoryEl && categoryEl.value ? String(categoryEl.value).trim() : '',
          dateLabel: dateEl && dateEl.value ? String(dateEl.value).trim() : '',
          content: contentEl && contentEl.value ? String(contentEl.value) : ''
        };

        if (!payload.title || !payload.category) {
          alert('Titre et catégorie sont requis.');
          return;
        }

        try {
          if (isEdit) {
            if (!blogId) throw new Error('ID blog manquant');
            await apiFetch(`/blog/${blogId}`, { method: 'PUT', body: payload });
          } else {
            await apiFetch('/blog', { method: 'POST', body: payload });
          }

          // reload and close
          modal.style.display = 'none';
          modal.style.alignItems = '';
          await loadAdminTables();
        } catch (e) {
          alert('Erreur blog: ' + (e && e.message ? e.message : e));
        }
      };

      if (saveBtn) saveBtn.onclick = onSave;

      const delBtn = $('#blogModalDelete');
      if (delBtn) {
        delBtn.onclick = async () => {
          if (!blogId) return;
          const ok = confirm('Supprimer cet article ?');
          if (!ok) return;
          try {
            await apiFetch(`/blog/${blogId}`, { method: 'DELETE' });
            modal.style.display = 'none';
            modal.style.alignItems = '';
            await loadAdminTables();
          } catch (e) {
            alert('Erreur suppression: ' + (e && e.message ? e.message : e));
          }
        };
      }

    } else if (safeResource === 'realisations') {
      const isEdit = safeMode === 'edit';
      if (safeMode === 'create' && modal && modal.dataset) {
        delete modal.dataset.realisationsId;
        delete modal.dataset.realisationsPayload;
      }
      const realisationId = (modal && modal.dataset) ? (modal.dataset.realisationsId || null) : null;

      bodyEl.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr; gap:14px;">
          <div class="form-group"><label>Titre</label><input type="text" id="real-title" placeholder="Titre" /></div>
          <div class="form-group"><label>Catégorie</label><input type="text" id="real-category" placeholder="Catégorie" /></div>
          <div class="form-group"><label>Date (label)</label><input type="text" id="real-dateLabel" placeholder="Ex: 02 Fév 2025" /></div>
          <div class="form-group"><label>Image URL</label><input type="text" id="real-imageUrl" placeholder="https://..." /></div>
          <div id="real-delete-row" style="display:${isEdit ? 'flex' : 'none'}; justify-content:flex-end; margin-top:6px;">
            <button class="btn-red" id="realModalDelete" style="padding:10px 16px; border-radius:10px; cursor:pointer;">Supprimer</button>
          </div>
        </div>
      `;

      const fillFromRow = (p) => {
        const t = $('#real-title');
        const c = $('#real-category');
        const d = $('#real-dateLabel');
        const i = $('#real-imageUrl');
        if (t) t.value = p && p.title ? p.title : '';
        if (c) c.value = p && p.category ? p.category : '';
        if (d) d.value = p && p.dateLabel ? p.dateLabel : '';
        if (i) i.value = p && p.imageUrl ? p.imageUrl : '';
      };

      try {
        const raw = modal && modal.dataset ? modal.dataset.realisationsPayload : null;
        if (isEdit && raw) fillFromRow(JSON.parse(raw));
      } catch (e) {}

      const onSave = async () => {
        const titleEl = $('#real-title');
        const categoryEl = $('#real-category');
        const dateEl = $('#real-dateLabel');
        const imageEl = $('#real-imageUrl');

        const payload = {
          title: titleEl && titleEl.value ? String(titleEl.value).trim() : '',
          category: categoryEl && categoryEl.value ? String(categoryEl.value).trim() : '',
          dateLabel: dateEl && dateEl.value ? String(dateEl.value).trim() : '',
          imageUrl: imageEl && imageEl.value ? String(imageEl.value).trim() : ''
        };

        if (!payload.title || !payload.category || !payload.imageUrl) {
          alert('Titre, catégorie et image URL sont requis.');
          return;
        }

        try {
          if (isEdit) {
            if (!realisationId) throw new Error('ID réalisation manquant');
            await apiFetch(`/realisations/${realisationId}`, { method: 'PUT', body: payload });
          } else {
            await apiFetch('/realisations', { method: 'POST', body: payload });
          }

          modal.style.display = 'none';
          modal.style.alignItems = '';
          await loadAdminTables();
        } catch (e) {
          alert('Erreur réalisation: ' + (e && e.message ? e.message : e));
        }
      };

      if (saveBtn) saveBtn.onclick = onSave;

      const delBtnReal = $('#realModalDelete');
      if (delBtnReal) {
        delBtnReal.onclick = async () => {
          if (!realisationId) return;
          const ok = confirm('Supprimer cette réalisation ?');
          if (!ok) return;
          try {
            await apiFetch(`/realisations/${realisationId}`, { method: 'DELETE' });
            modal.style.display = 'none';
            modal.style.alignItems = '';
            await loadAdminTables();
          } catch (e) {
            alert('Erreur suppression: ' + (e && e.message ? e.message : e));
          }
        };
      }

    } else if (safeResource === 'services') {
      const isEdit = safeMode === 'edit';
      if (safeMode === 'create' && modal && modal.dataset) {
        delete modal.dataset.serviceId;
        delete modal.dataset.servicePayload;
      }
      const serviceId = (modal && modal.dataset) ? (modal.dataset.serviceId || null) : null;

      bodyEl.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr; gap:14px;">
          <div class="form-group"><label>Nom</label><input type="text" id="service-name" placeholder="Nom du service" /></div>
          <div class="form-group"><label>Catégorie</label><input type="text" id="service-category" placeholder="Catégorie" /></div>
          <div class="form-group"><label>Statut</label><select id="service-status"><option value="active">Actif</option><option value="inactive">Inactif</option></select></div>
          <div id="service-delete-row" style="display:${isEdit ? 'flex' : 'none'}; justify-content:flex-end; margin-top:6px;">
            <button class="btn-red" id="serviceModalDelete" style="padding:10px 16px; border-radius:10px; cursor:pointer;">Supprimer</button>
          </div>
        </div>
      `;

      const fillFromRow = (p) => {
        const elName = $('#service-name');
        const elCategory = $('#service-category');
        const elStatus = $('#service-status');
        if (elName) elName.value = p && p.name ? p.name : '';
        if (elCategory) elCategory.value = p && p.category ? p.category : '';
        if (elStatus) elStatus.value = p && p.status ? p.status : 'active';
      };

      try {
        const raw = modal && modal.dataset ? modal.dataset.servicePayload : null;
        if (isEdit && raw) fillFromRow(JSON.parse(raw));
      } catch (e) {}

      const onSave = async () => {
        const titleEl = $('#service-name');
        const categoryEl = $('#service-category');
        const statusEl = $('#service-status');

        const payload = {
          name: titleEl && titleEl.value ? String(titleEl.value).trim() : '',
          category: categoryEl && categoryEl.value ? String(categoryEl.value).trim() : '',
          status: statusEl && statusEl.value ? String(statusEl.value) : 'active'
        };

        if (!payload.name || !payload.category) {
          alert('Nom et catégorie sont requis.');
          return;
        }

        try {
          if (isEdit) {
            if (!serviceId) throw new Error('ID service manquant');
            await apiFetch(`/services/${serviceId}`, { method: 'PUT', body: payload });
          } else {
            await apiFetch('/services', { method: 'POST', body: payload });
          }

          modal.style.display = 'none';
          modal.style.alignItems = '';
          await loadAdminTables();
        } catch (e) {
          alert('Erreur service: ' + (e && e.message ? e.message : e));
        }
      };

      if (saveBtn) saveBtn.onclick = onSave;
      const delBtnService = $('#serviceModalDelete');
      if (delBtnService) {
        delBtnService.onclick = async () => {
          if (!serviceId) return;
          const ok = confirm('Supprimer ce service ?');
          if (!ok) return;
          try {
            await apiFetch(`/services/${serviceId}`, { method: 'DELETE' });
            modal.style.display = 'none';
            modal.style.alignItems = '';
            await loadAdminTables();
          } catch (e) {
            alert('Erreur suppression: ' + (e && e.message ? e.message : e));
          }
        };
      }

    } else if (safeResource === 'gallery') {
      bodyEl.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr; gap:14px;">
          <div class="form-group"><label>Image URL</label><input type="file" id="gallery-imageUrl" placeholder="https://..." /></div>
        </div>
      `;

      const onSave = async () => {
        const imageEl = $('#gallery-imageUrl');
        const payload = {
          imageUrl: imageEl && imageEl.value ? String(imageEl.value).trim() : ''
        };

        if (!payload.imageUrl) {
          alert('Image URL est requise.');
          return;
        }

        try {
          await apiFetch('/gallery', { method: 'POST', body: payload });
          modal.style.display = 'none';
          modal.style.alignItems = '';
          await loadAdminTables();
        } catch (e) {
          alert('Erreur galerie: ' + (e && e.message ? e.message : e));
        }
      };

      if (saveBtn) saveBtn.onclick = onSave;

    } else if (safeResource === 'users') {
      bodyEl.innerHTML = `
        <div style="color:rgba(255,255,255,0.8); line-height:1.6;">
          La gestion des utilisateurs n'est pas disponible sur ce backend.
          Si vous devez ajouter un utilisateur, utilisez la section d'administration du serveur ou le backend adapté.
        </div>
      `;
      if (saveBtn) saveBtn.onclick = () => modal.style.display = 'none';
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

  function replaceRecentRealisations(items) {
    const container = document.querySelector('.recent-section .real-grid');
    if (!container) return;

    container.innerHTML = (items || []).slice(0, 4).map((p) => {
      const title = p.title || '';
      const cat = p.category || '';
      const img = p.imageUrl || '';
      const bg = img
        ? `background:#1a2a1a url('${escapeAttr(img)}') center/cover`
        : 'background:#1a2a1a';

      return `
        <div class="real-card">
          <div class="real-img" style="${bg}"></div>
          <div class="real-info"><h4>${escapeHtml(title)}</h4><span>${escapeHtml(cat)}</span></div>
        </div>
      `;
    }).join('');
  }

  function replaceHomeBlog(items) {
    const container = document.querySelector('.home-blog-grid');
    if (!container) return;

    container.innerHTML = (items || []).slice(0, 3).map((p) => {
      const title = p.title || '';
      const cat = p.category || '';
      const date = p.dateLabel || '';
      // HTML home.html doesn't have a blog section, so this is best-effort.
      return `
        <div class="blog-card">
          <div class="blog-img" style="background:#1a2a1a;"></div>
          <div class="blog-body">
            <span class="blog-cat">${escapeHtml(cat)}</span>
            <h3>${escapeHtml(title)}</h3>
            <div class="blog-meta"><span>${escapeHtml(date)}</span><a href="blog.html">Lire →</a></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function showClientDevisNotification(devisItems) {
    // home.html contient #devisNotifications
    const wrap = document.querySelector('#devisNotifications');
    const text = document.querySelector('#devisNotificationText');
    if (!wrap || !text) return;

    const pendingOrAny = (devisItems || []).slice(0, 5);
    if (!pendingOrAny.length) {
      wrap.style.display = 'none';
      return;
    }

    const first = pendingOrAny[0];
    const status = first.status || '';
    const label = status === 'accepted'
      ? '✅ Votre devis a été accepté !'
      : status === 'rejected'
        ? '❌ Votre devis a été refusé.'
        : '📨 Nous avons bien reçu votre demande de devis.';

    // Message simple: client voit son nom + service
    const details = [first.service ? String(first.service) : '', first.budget ? String(first.budget) : '']
      .filter(Boolean)
      .join(' • ');

    text.textContent = details ? `${label} (${details})` : `${label}`;
    wrap.style.display = 'block';
  }


  async function loadHomeDynamicContent() {
    // Only run on home.html (static page)
    const isHome = /(^|\/)(home\.html)$/.test(window.location.pathname);
    if (!isHome) return;

    const fetchJson = async (url, token) => {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`http_${res.status}`);
      return res.json();
    };

    try {
      const clientToken = getClientToken();
      const [realisations, blog, devis] = await Promise.all([
        fetchJson(`${API_BASE}/realisations`),
        fetchJson(`${API_BASE}/blog`),
        clientToken ? fetchJson(`${API_BASE}/devis`, clientToken).catch(() => null) : Promise.resolve(null)
      ]);

      if (realisations && realisations.items) replaceRecentRealisations(realisations.items);
      if (blog && blog.items) replaceHomeBlog(blog.items);
      if (devis && devis.items) showClientDevisNotification(devis.items);
      if (!devis) showClientDevisNotification([]);
    } catch (e) {
      // fail silently so homepage still renders.
      console.warn('[home] dynamic load failed', e);
    }
  }

  // Boot

  document.addEventListener('DOMContentLoaded', () => { 
    updateClientAccountUI();
    loadHomeDynamicContent().catch(() => {});

    

    scrollTopBtnVisibility();

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

    // On admin page, verify auth immediately so the login form appears even on first load.
    if (document.getElementById('page-admin')) {
      loadAdminData().catch(() => {});
    }

    // Hide success banners initially (in case of cached HTML)
    const c = $('#contactSuccess');
    if (c) c.style.display = 'none';
    const d = $('#devisSuccess');
    if (d) d.style.display = 'none';
  });
})();
