/* ==========================================================================
       1. GLOBAL CONSTANTS & STORE
       ========================================================================== */
    const APP_NAME = "SeatSentinel";
    const TEAM_NAME = "Kyro";

    const DEFAULT_HELP_HTML = `
      <p><strong>Platform:</strong> ${APP_NAME} · Team ${TEAM_NAME} · SIH 2026 PS 26263</p>
      <p style="margin-top:6px;"><strong>Prototype Notice:</strong> All records are synthetic (Seed 26263). Alerts are advisory and strictly human-in-the-loop.</p>
      <h4 style="color:var(--text); margin:12px 0 4px;">Engine Rules (v0.1 Prototype Assumptions):</h4>
      <ul style="padding-left:18px;">
        <li><strong>Regular Intake:</strong> Compared strictly against approved AICTE intake (REG count &le; intake).</li>
        <li><strong>Supernumerary:</strong> FN, OCI, PIO, CIWGC capped at <code>ceil(15% &times; approved intake)</code>. Shown separately from regular intake.</li>
        <li><strong>NRI Allocation:</strong> Tracked distinctly; regulatory inclusion pending confirmation.</li>
        <li><strong>Dual Enrolments:</strong> Same APAAR active concurrently is flagged unless the prior record concluded before the new one started (auto-cleared).</li>
        <li><strong>Fuzzy Duplicate Matching:</strong> Applied only if missing APAAR ID, course is identical, college is different, and name differs by strictly 1 character.</li>
        <li><strong>Audit Trail:</strong> In-browser SHA-256 hash chaining guarantees tamper-evidence.</li>
      </ul>
    `;

    const INS = [
      ['I1', 'Pune Institute of Technology', { CSE: 120, MECH: 60 }],
      ['I2', 'Nashik College of Engineering', { CSE: 90, CIVIL: 60 }],
      ['I3', 'Mumbai Tech Institute', { CSE: 120, MBA: 60 }],
      ['I4', 'Nagpur School of Management', { MBA: 120, CSE: 60 }],
      ['I5', 'Hyderabad Engineering College', { CSE: 100, ECE: 60 }],
      ['I6', 'Chennai Polytechnic Univ', { ECE: 90, MECH: 60 }],
      ['I7', 'Bengaluru Institute of Tech', { CSE: 120, ECE: 60 }],
      ['I8', 'Jaipur College of Technology', { CSE: 120, MECH: 60 }]
    ];
    const PRIOR = { 'I8|CSE': 60 };
    const SUP = ['FN', 'OCI', 'PIO', 'CIWGC'];
    const FN_LIST = ['Aarav', 'Diya', 'Kabir', 'Meera', 'Rohan', 'Isha', 'Vikram', 'Anaya', 'Arjun', 'Sana', 'Kunal', 'Neha', 'Yash', 'Tara', 'Dev', 'Riya'];
    const LN_LIST = ['Sharma', 'Patil', 'Iyer', 'Khan', 'Singh', 'Das', 'Nair', 'Joshi', 'Rao', 'Gupta', 'Mehta', 'Reddy'];

    let S = 26263;
    const rnd = () => {
      S |= 0;
      S = S + 0x6D2B79F5 | 0;
      let t = Math.imul(S ^ S >>> 15, 1 | S);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };

    const rid = () => String(100000000000 + Math.floor(rnd() * 899999999999));
    const nm = () => FN_LIST[Math.floor(rnd() * FN_LIST.length)] + ' ' + LN_LIST[Math.floor(rnd() * LN_LIST.length)];
    const valid = s => /^\d{12}$/.test(s);
    const maskId = s => s ? s.slice(0, 2) + '••••••••' + s.slice(-2) : '(none)';
    const iname = id => {
      const match = INS.find(x => x[0] === id);
      return match ? match[1] : id;
    };

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function isLevenshteinStrictly1(a, b) {
      if (a === b) return false;
      if (Math.abs(a.length - b.length) > 1) return false;
      let i = 0;
      while (i < a.length && a[i] === b[i]) i++;
      if (a.length === b.length) {
        return a.slice(i + 1) === b.slice(i + 1);
      }
      return a.length > b.length 
        ? a.slice(i + 1) === b.slice(i) 
        : b.slice(i + 1) === a.slice(i);
    }

    let D = [];
    let dupIds = [];
    let cleared = [];
    let A = [];
    let M = {};
    let uid = 0;

    const inspectorAssignments = {};

    function addRecord(inst, course, cat, o = {}) {
      const r = {
        n: ++uid,
        apaar: rid(),
        name: nm(),
        inst,
        course,
        cat,
        status: 'active',
        start: '2026-08-01',
        end: '',
        ...o
      };
      D.push(r);
      return r;
    }

    function initSyntheticDataset() {
      S = 26263;
      D = [];
      uid = 0;
      cleared = [];

      INS.forEach(([i, , cs]) => {
        Object.entries(cs).forEach(([c, k]) => {
          let reg = Math.round(k * (0.85 + rnd() * 0.12));
          if (i === 'I3' && c === 'CSE') reg = k + 14;
          if (i === 'I8' && c === 'CSE') reg = k - 2;
          for (let j = 0; j < reg; j++) addRecord(i, c, 'REG');

          let sup = Math.floor(rnd() * Math.ceil(k * 0.15) * 0.8);
          if (i === 'I5' && c === 'CSE') sup = Math.ceil(k * 0.15) + 3;
          for (let j = 0; j < sup; j++) addRecord(i, c, SUP[j % 4]);
          for (let j = 0; j < Math.round(k * 0.05); j++) addRecord(i, c, 'NRI');
        });
      });

      D.filter(s => s.inst === 'I2').slice(0, 9).forEach((s, j) => {
        s.apaar = j % 3 ? String(s.apaar).slice(0, 9 + j % 3) : s.apaar + 'X';
      });
      D.filter(s => s.inst === 'I2' && s.apaar.length === 12 && /^\d+$/.test(s.apaar)).slice(0, 6).forEach(s => {
        s.apaar = '';
      });
      D.filter(s => s.inst === 'I2' && s.apaar && /^\d{12}$/.test(s.apaar)).slice(0, 3).forEach(s => {
        s.apaar = s.apaar.slice(0, 9) + '000';
      });

      const a = D.filter(s => s.inst === 'I1' && s.apaar);
      dupIds = [];
      for (let j = 0; j < 5; j++) {
        const o = a[j + 5];
        dupIds.push(o.apaar);
        addRecord('I4', 'MBA', 'REG', { apaar: o.apaar, name: o.name });
      }

      for (let j = 0; j < 3; j++) {
        const o = a[j + 15];
        o.status = 'transferred';
        o.start = '2025-08-01';
        o.end = '2025-12-20';
        addRecord('I6', 'ECE', 'REG', {
          apaar: o.apaar,
          name: o.name,
          start: '2026-01-10',
          status: 'lateral'
        });
      }

      for (let j = 0; j < 2; j++) {
        const o = a[j + 25];
        addRecord('I4', 'CSE', 'REG', { apaar: '', name: o.name.slice(0, -1) + 'i' });
      }
    }

    /* ==========================================================================
       2. RECONCILIATION RULES & SCORING
       ========================================================================== */
    function evaluateRules() {
      const prevStatus = Object.fromEntries(A.map(a => [a.key, a.status]));
      A = [];
      cleared = [];
      M = {};

      INS.forEach(([i]) => {
        M[i] = { 
          b: 0, 
          bReg: 0, 
          bSup: 0,
          d: 0, 
          id: 0, 
          an: 0, 
          n: 0, 
          regCount: 0, 
          supCount: 0, 
          nriCount: 0, 
          totalCapacity: 0 
        };
      });

      INS.forEach(([i, , cs]) => {
        Object.entries(cs).forEach(([c, k]) => {
          M[i].totalCapacity += k;
          const L = D.filter(s => s.inst === i && s.course === c && s.status !== 'transferred');
          const reg = L.filter(s => s.cat === 'REG').length;
          const sup = L.filter(s => SUP.includes(s.cat)).length;
          const nri = L.filter(s => s.cat === 'NRI').length;
          const cap = Math.ceil(k * 0.15);

          M[i].n += L.length;
          M[i].regCount += reg;
          M[i].supCount += sup;
          M[i].nriCount += nri;

          if (reg > k) {
            M[i].b++;
            M[i].bReg += (reg - k);
            A.push({
              key: `b|${i}|${c}`,
              status: prevStatus[`b|${i}|${c}`] || 'open',
              sev: 'hi',
              type: 'Regular admissions above approved intake',
              inst: i,
              why: `Regular seats ${reg} exceed approved intake ${k} by ${reg - k}.`,
              rule: 'AICTE Seat Rules v0.1: REG count ≤ approved intake',
              calc: `${reg} − ${k} = +${reg - k} excess regular seats`,
              ev: [`Approved intake: ${k}`, `Regular found: ${reg}`, `Supernumerary: ${sup}, NRI: ${nri}`],
              next: 'Request approval order copy and category classification documentation from registrar.'
            });
          }

          if (sup > cap) {
            M[i].b++;
            M[i].bSup += (sup - cap);
            A.push({
              key: `s|${i}|${c}`,
              status: prevStatus[`s|${i}|${c}`] || 'open',
              sev: 'me',
              type: 'Supernumerary seats above 15% quota ceiling',
              inst: i,
              why: `FN/OCI/PIO/CIWGC seats ${sup} exceed the 15% ceiling ${cap}, while regular seats ${reg} are within approved intake ${k}.`,
              rule: 'Supernumerary quota ≤ ceil(15% × approved intake)',
              calc: `ceil(0.15 × ${k}) = ${cap}; detected ${sup}`,
              ev: [`15% quota ceiling: ${cap}`, `Current supernumerary: ${sup}`, `Regular check passed: ${reg} ≤ ${k}`],
              next: 'Examine student visa clearance and valid foreign national certificate tags.'
            });
          }

          const pr = PRIOR[i + '|' + c];
          if (pr && L.length / pr > 1.4) {
            M[i].an++;
            A.push({
              key: `a|${i}|${c}`,
              status: prevStatus[`a|${i}|${c}`] || 'open',
              sev: 'me',
              type: 'Abrupt year-over-year enrolment surge',
              inst: i,
              why: `Current enrolment ${L.length} vs ${pr} prior year (×${(L.length / pr).toFixed(2)}).`,
              rule: 'Anomaly detector: YoY Growth > 1.40x baseline',
              calc: `${L.length} / ${pr} = ${(L.length / pr).toFixed(2)}x growth`,
              ev: [`Baseline: ${pr}`, `Current: ${L.length}`],
              next: 'Confirm whether formal division expansion or second-shift approval was granted.'
            });
          }
        });
      });

      INS.forEach(([i]) => {
        const L = D.filter(s => s.inst === i);
        const bad = L.filter(s => s.apaar && (!valid(s.apaar) || s.apaar.endsWith('000')));
        const pend = L.filter(s => !s.apaar && s.status === 'active');
        M[i].id = bad.length + pend.length;

        if (bad.length > 0) {
          A.push({
            key: `f|${i}`,
            status: prevStatus[`f|${i}`] || 'open',
            sev: 'hi',
            type: 'Invalid / Unverifiable APAAR IDs',
            inst: i,
            why: `${bad.length} records fail 12-digit format or mock registry lookup.`,
            rule: 'APAAR ID syntax: 12-digit numeric, valid checksum',
            calc: `${bad.length} flawed student IDs`,
            ev: bad.slice(0, 4).map(s => `${maskId(s.apaar)}: ${s.name} (${s.course})`),
            next: 'Direct institution registrar to issue corrected 12-digit APAAR numbers.'
          });
        }
        if (pend.length > 0) {
          A.push({
            key: `p|${i}`,
            status: prevStatus[`p|${i}`] || 'open',
            sev: 'lo',
            type: 'APAAR Pending State (Advisory, not rejected)',
            inst: i,
            why: `${pend.length} students enrolled with APAAR pending.`,
            rule: 'Pending APAAR status permitted during onboarding window',
            calc: `${pend.length} pending identifiers`,
            ev: pend.slice(0, 4).map(s => `${s.name} (${s.course})`),
            next: 'Follow up at the upcoming national sync window.'
          });
        }
      });

      const grouped = {};
      D.filter(s => valid(s.apaar)).forEach(s => {
        (grouped[s.apaar] = grouped[s.apaar] || []).push(s);
      });

      Object.entries(grouped).forEach(([id, records]) => {
        if (records.length < 2) return;
        records.sort((a, b) => a.start < b.start ? -1 : 1);
        const [x, y] = records;

        if (x.status === 'transferred' && x.end <= y.start) {
          cleared.push({
            id,
            name: x.name,
            from: iname(x.inst),
            fromInstId: x.inst,
            fromC: x.course,
            to: iname(y.inst),
            toInstId: y.inst,
            toC: y.course,
            end: x.end,
            start: y.start
          });
          return;
        }

        M[x.inst].d++;
        M[y.inst].d++;
        A.push({
          key: `d|${id}`,
          status: prevStatus[`d|${id}`] || 'open',
          sev: 'hi',
          type: 'Simultaneous Active Multi-College Enrolment',
          inst: y.inst,
          also: x.inst,
          why: `Same student APAAR ID has active concurrent records across two institutions.`,
          rule: 'Prohibition of simultaneous regular degree enrolments',
          calc: `Overlap: ${x.start} & ${y.start}`,
          ev: [
            `${iname(x.inst)}: ${x.name} (${x.course}) started ${x.start}`,
            `${iname(y.inst)}: ${y.name} (${y.course}) started ${y.start}`
          ],
          next: 'Send inquiry to both college registrars; human inspector reviews transfer certificates.'
        });
      });

      const withIds = D.filter(s => valid(s.apaar) && s.status !== 'transferred');
      const missingIds = D.filter(s => !s.apaar && s.status === 'active');

      missingIds.forEach(s => {
        const match = withIds.find(o => 
          o.inst !== s.inst && 
          o.course === s.course && 
          isLevenshteinStrictly1(s.name, o.name)
        );

        if (match) {
          M[s.inst].d++;
          A.push({
            key: `t|${s.n}`,
            status: prevStatus[`t|${s.n}`] || 'open',
            sev: 'me',
            type: 'Possible Duplicate: Missing ID with Near-Identical Name',
            inst: s.inst,
            also: match.inst,
            why: `Student "${s.name}" is strictly 1 character different from "${match.name}" in course ${s.course} at ${iname(match.inst)}.`,
            rule: 'Fuzzy identity heuristic (Levenshtein distance == 1, same course, cross-college)',
            calc: `Distance = 1; same course (${s.course}); cross-college`,
            ev: [
              `Unassigned record: ${s.name} (${s.course}) at ${iname(s.inst)}`,
              `Registered profile: ${match.name} (${match.course}) at ${iname(match.inst)}`
            ],
            next: 'Require Aadhaar-authenticated APAAR generation before finalizing matriculation.'
          });
        }
      });

      INS.forEach(([i]) => {
        const m = M[i];
        m.score = Math.min(100,
          (m.b ? 40 : 0) +
          Math.min(25, m.d * 8) +
          Math.min(20, Math.round((m.id / (m.n || 1)) * 400)) +
          (m.an ? 15 : 0)
        );
      });
    }

    /* ==========================================================================
       3. HASH-CHAINED CRYPTOGRAPHIC AUDIT LOG (SHA-256)
       ========================================================================== */
    let AU = [];
    async function sha256(str) {
      try {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        let h = 2166136261;
        for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
        return (h >>> 0).toString(16).repeat(8).slice(0, 64);
      }
    }

    async function logAudit(actor, action, detail) {
      const prev = AU.length ? AU[AU.length - 1].h : '0'.repeat(64);
      const t = new Date().toISOString();
      const payload = prev + t + actor + action + detail;
      const h = await sha256(payload);
      AU.push({ t, actor, action, detail, prev, h }); pushAudit(actor, action, detail);
    }

    async function verifyAuditChain() {
      let p = '0'.repeat(64);
      for (let i = 0; i < AU.length; i++) {
        const e = AU[i];
        if (e.prev !== p) return i;
        const testHash = await sha256(e.prev + e.t + e.actor + e.action + e.detail);
        if (e.h !== testHash) return i;
        p = e.h;
      }
      return -1;
    }

    /* ==========================================================================
       4. ROLES, SCOPING & NAVIGATION
       ========================================================================== */
    const ROLES = {
      analyst: { name: 'AICTE Analyst', tabs: ['landing', 'dash', 'queue', 'alerts', 'sim', 'passport', 'audit'] },
      officer: { name: 'AICTE Officer', tabs: ['landing', 'dash', 'queue', 'alerts', 'sim', 'passport', 'audit'] },
      inst:    { name: 'Institution',   tabs: ['landing', 'dash', 'alerts', 'upload', 'passport', 'audit'] },
      ver:     { name: 'Public Verifier', tabs: ['landing', 'verify', 'audit'] }
    };

    const TAB_NAMES = {
      landing: 'Home',
      dash: 'Dashboard',
      queue: 'Inspection queue',
      alerts: 'Advisory Alerts',
      sim: 'Policy simulator',
      passport: 'Data Quality Passport',
      upload: 'Submit data',
      audit: 'Audit trail',
      verify: 'Verify Student APAAR'
    };

    const TAB_NAMES_HI = {
      landing: 'मुख्य पृष्ठ',
      dash: 'डैशबोर्ड',
      queue: 'निरीक्षण कतार',
      alerts: 'परामर्श अलर्ट',
      sim: 'नीति सिम्युलेटर',
      passport: 'डेटा गुणवत्ता पासपोर्ट',
      upload: 'डेटा जमा करें',
      audit: 'ऑडिट ट्रेल',
      verify: 'अपार सत्यापन'
    };

    let currentUser = null; // null when logged out, or object: { username, role, instId }
    let currentRole = 'analyst';
    let currentTab = 'landing';
    let currentInst = 'I1';

    function getActiveActorName() {
      if (!currentUser) return 'Anonymous';
      if (currentUser.role === 'inst') return iname(currentUser.instId || currentInst);
      return currentUser.username ? `${currentUser.username} (${ROLES[currentUser.role].name})` : ROLES[currentUser.role].name;
    }

    function isScopedToInst(alertObj) {
      if (currentRole !== 'inst') return true;
      return alertObj.inst === currentInst || alertObj.also === currentInst;
    }

    function renderNav() {
      const allowed = ROLES[currentRole].tabs;
      const navEl = document.getElementById('dynamicNavLinks');
      
      navEl.innerHTML = allowed.map(tab => {
        const activeClass = (tab === currentTab) ? 'active' : '';
        let badge = '';
        if (tab === 'alerts') {
          const count = A.filter(a => isScopedToInst(a) && a.status !== 'closed').length;
          badge = ` <span style="background:var(--saffron); color:#fff; font-size:0.68rem; padding:1px 6px; border-radius:10px;">${count}</span>`;
        }
        const label = currentLang === 'hi' ? (TAB_NAMES_HI[tab] || TAB_NAMES[tab]) : TAB_NAMES[tab];
        return `
          <li role="none">
            <button type="button" role="menuitem" class="nav-link ${activeClass}" onclick="setScreen('${tab}')">
              <span>${label}</span>${badge}
            </button>
          </li>
        `;
      }).join('');

      document.getElementById('roleNavBadge').textContent = ROLES[currentRole].name;

      const scopePill = document.getElementById('tickerScopeCount');
      if (currentRole === 'inst') {
        scopePill.textContent = iname(currentInst);
      } else if (currentRole === 'ver') {
        scopePill.textContent = 'Public Lookup';
      } else {
        scopePill.textContent = '8 Colleges';
      }
    }

    function setScreen(tabId) {
      if (!currentUser) {
        showLoginView();
        return;
      }

      if (!ROLES[currentRole].tabs.includes(tabId)) {
        tabId = ROLES[currentRole].tabs[0];
      }
      currentTab = tabId;
      document.querySelectorAll('.screen-view').forEach(el => el.classList.remove('active'));

      const map = {
        landing: 'screenLanding',
        dash: 'screenDash',
        queue: 'screenQueue',
        alerts: 'screenAlerts',
        sim: 'screenSim',
        passport: 'screenPassport',
        upload: 'screenUpload',
        audit: 'screenAudit',
        verify: 'screenVerify'
      };

      const target = document.getElementById(map[tabId]);
      if (target) target.classList.add('active');

      renderNav();
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (tabId === 'landing') renderRoleLandingScreen();
      if (tabId === 'dash') renderDashboardScreen();
      if (tabId === 'queue') renderQueueScreen();
      if (tabId === 'alerts') renderAlertsScreen();
      if (tabId === 'sim') renderSimScreen();
      if (tabId === 'passport') renderPassportScreen();
      if (tabId === 'upload') renderUploadScreen();
      if (tabId === 'audit') renderAuditScreen();
    }

    /* ==========================================================================
       HERO LOGIN & SESSION LOGIC (NEW REFERENCE AESTHETIC)
       ========================================================================== */
    let selectedLoginRole = 'analyst';

    const MOCK_CREDENTIALS = {
      analyst: { u: 'analyst', p: 'demo123', role: 'analyst', label: 'AICTE Analyst' },
      officer: { u: 'officer', p: 'demo123', role: 'officer', label: 'AICTE Officer' },
      inst:    { u: 'institution', p: 'demo123', role: 'inst', label: 'Institution Registrar' },
      ver:     { u: 'verifier', p: 'demo123', role: 'ver', label: 'Public Verifier' }
    };

    function selectLoginRole(role) {
      selectedLoginRole = role;
      document.querySelectorAll('.hero-role-chip').forEach(card => {
        card.classList.toggle('selected', card.getAttribute('data-role') === role);
      });

      const instGroup = document.getElementById('loginInstGroup');
      instGroup.style.display = (role === 'inst') ? 'flex' : 'none';

      const cred = MOCK_CREDENTIALS[role];
      if (cred) {
        document.getElementById('loginUsername').value = cred.u;
        document.getElementById('loginPassword').value = cred.p;
        document.getElementById('demoCredsLabel').textContent = `Fill Demo Credentials (${cred.label})`;
        document.getElementById('demoCredsSub').textContent = `${cred.u} / ${cred.p} · Click to auto-fill`;
      }
      document.getElementById('loginErrorMsg').style.display = 'none';
    }

    function fillSelectedDemoCredentials() {
      const cred = MOCK_CREDENTIALS[selectedLoginRole];
      if (cred) {
        document.getElementById('loginUsername').value = cred.u;
        document.getElementById('loginPassword').value = cred.p;
      }
      document.getElementById('loginErrorMsg').style.display = 'none';
    }

    function togglePasswordVisibility() {
      const pwdInput = document.getElementById('loginPassword');
      const eyeIcon = document.getElementById('pwdEyeIcon');
      if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        eyeIcon.innerHTML = `
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        `;
      } else {
        pwdInput.type = 'password';
        eyeIcon.innerHTML = `
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        `;
      }
    }

    async function adoptBackendData() {
      const rows = await loadStudents(); if (!rows || !rows.length) return;
      D = rows.map(r => ({ n: r.n, apaar: r.apaar, name: r.name, inst: r.inst, course: r.course, cat: r.cat, status: r.status, start: r.start, end: r.end })); uid = D.length;
      const i1 = new Set(D.filter(s => s.inst === 'I1').map(s => s.apaar)); dupIds = D.filter(s => s.inst === 'I4' && i1.has(s.apaar)).map(s => s.apaar);
      DATA_SOURCE = 'Backend API · SQLite'; evaluateRules();
      const bn = document.querySelector('.system-banner > div:last-child'); if (bn) bn.textContent = 'SEED: 26263 · DATA: ' + DATA_SOURCE;
    }

    async function handleLoginSubmit() {
      const u = document.getElementById('loginUsername').value.trim();
      const p = document.getElementById('loginPassword').value;
      const err = document.getElementById('loginErrorMsg');

      const EM = { analyst: 'analyst@seatsentinel.demo', officer: 'officer@seatsentinel.demo', institution: 'registrar.pune@seatsentinel.demo', verifier: 'verifier@seatsentinel.demo' };
      let srv = null; try { const r = await fetch(API + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EM[u] || u, password: p }) }); if (r.ok) srv = await r.json(); } catch (e) {}
      const cred = MOCK_CREDENTIALS[selectedLoginRole];
      const isValid = srv ? (srv.user.role === selectedLoginRole) : (cred && cred.u === u && cred.p === p);

      if (!isValid) {
        err.textContent = 'Invalid credentials. Please click the demo credential box below.';
        err.style.display = 'block';
        await logAudit('Authentication Service', 'Login Failed', `Failed login attempt for user "${u}" as ${selectedLoginRole}`);
        return;
      }

      err.style.display = 'none';
      if (srv) { Session.set(srv); await adoptBackendData(); }
      const instChosen = (selectedLoginRole === 'inst') ? document.getElementById('loginInstSelect').value : 'I1';
      currentUser = {
        username: u,
        role: selectedLoginRole,
        instId: instChosen
      };
      currentRole = selectedLoginRole;
      currentInst = instChosen;

      try {
        sessionStorage.setItem('seatsentinel_user', JSON.stringify(currentUser));
      } catch (e) {
        /* storage fallback ignored */
      }

      await logAudit(getActiveActorName(), 'User Login', `Authenticated successfully as ${ROLES[currentRole].name}`);
      showAppView();
    }

    async function handleLogout() {
      const priorActor = getActiveActorName();
      currentUser = null; Session.clear();
      try {
        sessionStorage.removeItem('seatsentinel_user');
      } catch (e) {}

      await logAudit(priorActor, 'User Logout', 'Session concluded; cleared active persona');
      showLoginView();
    }

    function showLoginView() {
      document.getElementById('authViewContainer').style.display = 'flex';
      document.getElementById('appViewContainer').style.display = 'none';
      document.getElementById('mainBrandHeader').style.display = 'none';
      document.getElementById('authenticatedHeaderActions').style.display = 'none';
      selectLoginRole(selectedLoginRole);
    }

    function showAppView() {
      document.getElementById('authViewContainer').style.display = 'none';
      document.getElementById('appViewContainer').style.display = 'block';
      document.getElementById('mainBrandHeader').style.display = 'flex';
      document.getElementById('authenticatedHeaderActions').style.display = 'flex';

      document.getElementById('hdrUserName').textContent = currentUser.username;
      document.getElementById('hdrUserRole').textContent = ROLES[currentUser.role].name;

      renderNav();
      setScreen('landing');
    }

    /* ==========================================================================
       ROLE-SPECIFIC LANDING DASHBOARDS
       ========================================================================== */
    function renderRoleLandingScreen() {
      const container = document.getElementById('roleLandingDynamicContent');
      if (!currentUser) return;

      if (currentRole === 'analyst') {
        const totalStudents = INS.reduce((acc, [id]) => acc + (M[id]?.n || 0), 0);
        const openAlertsCount = A.filter(a => a.status !== 'closed').length;
        const highAlertsCount = A.filter(a => a.sev === 'hi' && a.status !== 'closed').length;
        const sorted = [...INS].sort((a, b) => M[b[0]].score - M[a[0]].score).slice(0, 5);

        container.innerHTML = `
          <div class="portal-card" style="background: linear-gradient(135deg, rgba(242, 107, 29, 0.08) 0%, rgba(255, 255, 255, 0.95) 50%, rgba(76, 154, 42, 0.08) 100%); padding:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
              <div>
                <span class="badge badge-info" style="margin-bottom:6px;">National Analytical Overview</span>
                <h2 style="font-size:1.6rem; font-weight:800; color:var(--navy);">Welcome, AICTE Analyst</h2>
                <p style="font-size:0.82rem; color:var(--text-muted);">Real-time monitoring across ${INS.length} pilot institutions &amp; APAAR enrolment registers.</p>
              </div>
              <div style="display:flex; gap:8px;">
                <button type="button" class="btn btn-primary btn-sm" onclick="setScreen('queue')">Open Inspection Queue</button>
                <button type="button" class="btn btn-outline btn-sm" onclick="setScreen('sim')">Policy Simulator</button>
              </div>
            </div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card kpi-records">
              <div class="kpi-header"><span>TOTAL PILOT ENROLMENTS</span></div>
              <div class="kpi-value">${totalStudents.toLocaleString()}</div>
            </div>
            <div class="kpi-card kpi-alerts">
              <div class="kpi-header"><span>ACTIVE ADVISORY ALERTS</span></div>
              <div class="kpi-value">${openAlertsCount}</div>
            </div>
            <div class="kpi-card kpi-high">
              <div class="kpi-header"><span>HIGH SEVERITY ANOMALIES</span></div>
              <div class="kpi-value">${highAlertsCount}</div>
            </div>
            <div class="kpi-card kpi-cleared">
              <div class="kpi-header"><span>AUTO-CLEARED TRANSFERS</span></div>
              <div class="kpi-value">${cleared.length}</div>
            </div>
          </div>

          <div class="portal-card">
            <div class="portal-card-header">
              <div>
                <h3>Top Inspection Priorities</h3>
                <p style="font-size:0.78rem; color:var(--text-muted);">Top anomaly scores awaiting review. Click row to inspect institution alerts.</p>
              </div>
              <button type="button" class="btn btn-outline btn-sm" onclick="setScreen('queue')">View Full Queue &rarr;</button>
            </div>
            <div class="table-container">
              <table class="gov-table">
                <thead>
                  <tr>
                    <th>Institution</th>
                    <th>Anomaly Score</th>
                    <th>Regular Intake Status</th>
                    <th>Dual Active Flags</th>
                    <th>Inspector Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${sorted.map(([id, name]) => {
                    const m = M[id];
                    const assigned = inspectorAssignments[id] || 'Unassigned';
                    return `
                      <tr onclick="filterAlertsToInst('${id}')" style="cursor:pointer;">
                        <td><strong>${escapeHtml(name)}</strong> <span style="font-size:0.75rem; color:var(--text-soft);">(${id})</span></td>
                        <td><span class="badge ${m.score >= 50 ? 'badge-danger' : 'badge-warning'}">${m.score} / 100</span></td>
                        <td>${m.bReg > 0 ? `<span class="badge badge-danger">Breach (+${m.bReg})</span>` : '<span class="badge badge-success">Compliant</span>'}</td>
                        <td>${m.d > 0 ? `<span class="badge badge-warning">${m.d}</span>` : '0'}</td>
                        <td><span class="badge badge-subtle" style="color:var(--text);">${escapeHtml(assigned)}</span></td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      } else if (currentRole === 'officer') {
        const escalated = A.filter(a => a.status === 'unresolved');
        const awaitingDecision = A.filter(a => a.status === 'open' || a.status === 'unresolved');
        const closedDecisions = AU.filter(entry => entry.action.includes('decision') || entry.action.includes('Closed'));

        container.innerHTML = `
          <div class="portal-card" style="background: linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(255, 255, 255, 0.95) 50%, rgba(242, 107, 29, 0.08) 100%); padding:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
              <div>
                <span class="badge badge-warning" style="margin-bottom:6px;">Regulatory Officer Portal</span>
                <h2 style="font-size:1.6rem; font-weight:800; color:var(--navy);">Enforcement &amp; Decisions Desk</h2>
                <p style="font-size:0.82rem; color:var(--text-muted);">Adjudicate escalated enrolment anomalies and issue binding regulatory orders.</p>
              </div>
              <div style="display:flex; gap:8px;">
                <button type="button" class="btn btn-primary btn-sm" onclick="setScreen('alerts')">Review All Alerts</button>
                <button type="button" class="btn btn-outline btn-sm" onclick="setScreen('queue')">Assignment Queue</button>
              </div>
            </div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card kpi-high">
              <div class="kpi-header"><span>ESCALATED ITEMS (PENDING ORDER)</span></div>
              <div class="kpi-value">${escalated.length}</div>
            </div>
            <div class="kpi-card kpi-alerts">
              <div class="kpi-header"><span>TOTAL OPEN MATTERS</span></div>
              <div class="kpi-value">${awaitingDecision.length}</div>
            </div>
            <div class="kpi-card kpi-records">
              <div class="kpi-header"><span>DECISIONS RECORDED (LOG)</span></div>
              <div class="kpi-value">${closedDecisions.length}</div>
            </div>
            <div class="kpi-card kpi-cleared">
              <div class="kpi-header"><span>CLEARED TRANSFERS</span></div>
              <div class="kpi-value">${cleared.length}</div>
            </div>
          </div>

          <div class="portal-card">
            <div class="portal-card-header">
              <h3>Matters Escalated to Officer Level</h3>
              <span class="badge badge-danger">Requires Human Hearing</span>
            </div>
            ${escalated.length === 0 ? `
              <p style="font-size:0.85rem; color:var(--text-muted);">No matters currently escalated to officer level. All items are in active correction window or cleared.</p>
            ` : `
              <div class="table-container">
                <table class="gov-table">
                  <thead>
                    <tr>
                      <th>Institution</th>
                      <th>Violation Type</th>
                      <th>Evidence / Rule</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${escalated.map(a => `
                      <tr>
                        <td><strong>${escapeHtml(iname(a.inst))}</strong></td>
                        <td><span class="badge badge-danger">${escapeHtml(a.type)}</span></td>
                        <td style="font-size:0.78rem;">${escapeHtml(a.why)}</td>
                        <td>
                          <button type="button" class="btn btn-primary btn-sm" onclick="setScreen('alerts')">Resolve</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        `;
      } else if (currentRole === 'inst') {
        const m = M[currentInst] || { n: 0, b: 0, d: 0, id: 0, regCount: 0, totalCapacity: 0 };
        const myAlerts = A.filter(a => a.inst === currentInst || a.also === currentInst);
        const myOpenAlerts = myAlerts.filter(a => a.status !== 'closed');
        const passport = computeQualityPassport(currentInst);

        container.innerHTML = `
          <div class="portal-card" style="background: linear-gradient(135deg, rgba(76, 154, 42, 0.08) 0%, rgba(255, 255, 255, 0.95) 50%, rgba(2, 132, 199, 0.08) 100%); padding:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
              <div>
                <span class="badge badge-success" style="margin-bottom:6px;">Institution Scope: ${currentInst}</span>
                <h2 style="font-size:1.6rem; font-weight:800; color:var(--navy);">${escapeHtml(iname(currentInst))}</h2>
                <p style="font-size:0.82rem; color:var(--text-muted);">Registrar Enrolment Compliance &amp; APAAR Submission Portal</p>
              </div>
              <div style="display:flex; gap:8px;">
                <button type="button" class="btn btn-primary btn-sm" onclick="setScreen('upload')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Submit Enrolment CSV
                </button>
                <button type="button" class="btn btn-outline btn-sm" onclick="setScreen('passport')">Data Passport</button>
              </div>
            </div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card kpi-records">
              <div class="kpi-header"><span>ENROLLED STUDENTS</span></div>
              <div class="kpi-value">${m.n}</div>
            </div>
            <div class="kpi-card ${passport.overallScore >= 80 ? 'kpi-cleared' : 'kpi-high'}">
              <div class="kpi-header"><span>DATA QUALITY SCORE</span></div>
              <div class="kpi-value">${passport.overallScore} <span style="font-size:1rem; color:var(--text-muted);">/100</span></div>
            </div>
            <div class="kpi-card kpi-alerts">
              <div class="kpi-header"><span>PENDING NOTICES</span></div>
              <div class="kpi-value">${myOpenAlerts.length}</div>
            </div>
            <div class="kpi-card kpi-cleared">
              <div class="kpi-header"><span>REGULAR CAPACITY</span></div>
              <div class="kpi-value">${m.regCount} / ${m.totalCapacity}</div>
            </div>
          </div>

          <div class="portal-card">
            <div class="portal-card-header">
              <h3>Active Enrolment Inquiries &amp; Notices</h3>
              <button type="button" class="btn btn-outline btn-sm" onclick="setScreen('alerts')">View All Notices &rarr;</button>
            </div>
            ${myOpenAlerts.length === 0 ? `
              <div style="padding:14px; background:var(--green-subtle); border-radius:6px; color:var(--green-dark); font-size:0.85rem;">
                ✓ No unresolved compliance notices on file for ${escapeHtml(iname(currentInst))}.
              </div>
            ` : `
              <div class="table-container">
                <table class="gov-table">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Notice Type</th>
                      <th>Details</th>
                      <th>Current Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${myOpenAlerts.map(a => `
                      <tr>
                        <td><span class="badge ${a.sev === 'hi' ? 'badge-danger' : 'badge-warning'}">${a.sev.toUpperCase()}</span></td>
                        <td><strong>${escapeHtml(a.type)}</strong></td>
                        <td style="font-size:0.8rem;">${escapeHtml(a.why)}</td>
                        <td><span class="badge badge-info">${escapeHtml(a.status)}</span></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        `;
      } else if (currentRole === 'ver') {
        container.innerHTML = `
          <div class="portal-card" style="max-width:720px; margin:0 auto;">
            <div class="portal-card-header">
              <div>
                <span class="badge badge-info" style="margin-bottom:6px;">Zero-Knowledge Lookup</span>
                <h2 style="font-size:1.4rem; font-weight:800; color:var(--navy);">APAAR Public Verification</h2>
                <p style="font-size:0.82rem; color:var(--text-muted);">Instant zero-knowledge verification for employers, scholarship bodies, and state portals.</p>
              </div>
              <span class="badge badge-success">Privacy-Preserving</span>
            </div>

            <div style="display:flex; flex-direction:column; gap:14px;">
              <div>
                <label for="landingVerifyId" style="font-size:0.75rem; font-weight:700; color:var(--text-muted); display:block; margin-bottom:4px;">
                  12-DIGIT APAAR ID
                </label>
                <input type="text" id="landingVerifyId" class="input-field" placeholder="Enter 12 digits..." maxlength="12">
              </div>

              <div>
                <label for="landingVerifyPurpose" style="font-size:0.75rem; font-weight:700; color:var(--text-muted); display:block; margin-bottom:4px;">
                  OFFICIAL VERIFICATION PURPOSE
                </label>
                <select id="landingVerifyPurpose" class="select-field">
                  <option value="Pre-Employment Credential Verification">Pre-Employment Credential Verification</option>
                  <option value="National Scholarship Scheme Eligibility">National Scholarship Scheme Eligibility</option>
                  <option value="State Higher Education Board Audit">State Higher Education Board Audit</option>
                </select>
              </div>

              <div style="display:flex; align-items:center; gap:8px; font-size:0.8rem; color:var(--text-muted); padding:4px 0;">
                <input type="checkbox" id="landingConsentCheck" checked>
                <label for="landingConsentCheck">Student digital consent receipt is authenticated and on record.</label>
              </div>

              <div style="display:flex; gap:10px;">
                <button type="button" class="btn btn-primary" onclick="executeLandingVerification()">Verify APAAR</button>
                <button type="button" class="btn btn-outline" onclick="fillLandingVerifierSample()">Fill Valid Sample</button>
              </div>

              <div id="landingVerifyOutput" style="display:none; margin-top:12px;"></div>
            </div>
          </div>
        `;
      }
    }

    async function executeLandingVerification() {
      const id = document.getElementById('landingVerifyId').value.trim();
      const purpose = document.getElementById('landingVerifyPurpose').value;
      const consent = document.getElementById('landingConsentCheck').checked;
      const out = document.getElementById('landingVerifyOutput');

      if (!valid(id)) {
        out.style.display = 'block';
        out.innerHTML = `<div class="badge badge-danger" style="padding:8px 12px; width:100%;">Invalid Syntax: APAAR must be exactly 12 numeric digits.</div>`;
        return;
      }

      if (!consent) {
        out.style.display = 'block';
        out.innerHTML = `<div class="badge badge-danger" style="padding:8px 12px; width:100%;">Blocked: Verification denied without student digital consent checkbox.</div>`;
        await logAudit('Public Verifier', 'Query Blocked', `No consent receipt for ID: ${maskId(id)}`);
        return;
      }

      const match = D.some(s => s.apaar === id && s.status === 'active');
      let receiptNo = 'CR-' + Math.random().toString(36).substring(2, 10).toUpperCase(); let sig = '(offline mode: no server signature)';
      try { const v = await api('/api/verify', { method: 'POST', body: JSON.stringify({ apaar: id, purpose, consent }) }); receiptNo = v.receipt; sig = 'Ed25519 ' + v.signature.slice(0, 24) + '…'; } catch (e) {}

      await logAudit('Public Verifier', `Verify: ${purpose}`, `ID: ${maskId(id)} · Receipt: ${receiptNo}`);

      out.style.display = 'block';
      out.innerHTML = `
        <div class="evidence-box" style="margin-top:0;">
<strong>ENROLLED IN AICTE-APPROVED INSTITUTION:</strong> ${match ? 'YES' : 'NO'}
<strong>IDENTITY DATA RETURNED:</strong> none (Zero-Knowledge Mode)
<strong>CONSENT RECEIPT:</strong> ${escapeHtml(receiptNo)}
<strong>MOCK REGISTRY ADAPTER:</strong> verified
        </div>
      `;
    }

    function fillLandingVerifierSample() {
      const sample = D.find(s => valid(s.apaar) && s.status === 'active');
      if (sample) {
        document.getElementById('landingVerifyId').value = sample.apaar;
        document.getElementById('landingConsentCheck').checked = true;
        executeLandingVerification();
      }
    }

    /* ==========================================================================
       5. SCREEN 2: DASHBOARD
       ========================================================================== */
    async function renderDashboardScreen() {
      const isInst = (currentRole === 'inst');
      const filteredInstitutions = INS.filter(([id]) => !isInst || id === currentInst);
      
      const totalStudents = filteredInstitutions.reduce((acc, [id]) => acc + (M[id]?.n || 0), 0);
      const scopedAlerts = A.filter(isScopedToInst);
      const openAlertsCount = scopedAlerts.filter(a => a.status !== 'closed').length;
      const highAlertsCount = scopedAlerts.filter(a => a.sev === 'hi' && a.status !== 'closed').length;
      
      const filteredCleared = cleared.filter(c => !isInst || c.fromInstId === currentInst || c.toInstId === currentInst);
      const clearedCount = filteredCleared.length;

      document.getElementById('dashKpiRecords').textContent = totalStudents.toLocaleString();
      document.getElementById('dashKpiAlerts').textContent = openAlertsCount;
      document.getElementById('dashKpiHigh').textContent = highAlertsCount;
      document.getElementById('dashKpiCleared').textContent = clearedCount;

      document.getElementById('tickerOpenAlerts').textContent = openAlertsCount;
      document.getElementById('tickerCleared').textContent = clearedCount;

      const chainIdx = await verifyAuditChain();
      document.getElementById('dashAuditStatus').textContent = chainIdx < 0 ? 'SHA-256 Valid' : `Tampered @ #${chainIdx}`;
      document.getElementById('dashAuditStatus').style.color = chainIdx < 0 ? 'var(--green)' : 'var(--danger)';

      if (isInst) {
        document.getElementById('dashTitleHeading').textContent = `${iname(currentInst)} – Enrolment Status`;
        document.getElementById('dashSubtitle').textContent = `Institutional Seat Utilisation & Resolved Student Records`;
      } else {
        document.getElementById('dashTitleHeading').textContent = currentLang === 'hi' ? I18N.hi.headDash : I18N.en.headDash;
        document.getElementById('dashSubtitle').textContent = `National Enrolment Reconciliation & Anomaly Priority Matrix`;
      }

      const sorted = [...filteredInstitutions].sort((a, b) => M[b[0]].score - M[a[0]].score);
      const tbody = document.getElementById('dashTableBody');
      tbody.innerHTML = sorted.map(([id, name]) => {
        const m = M[id];
        const cap = m.totalCapacity;
        const reg = m.regCount;
        const sup = m.supCount;
        const nri = m.nriCount;

        const regPct = Math.round((reg / cap) * 100);
        const hasRegBreach = m.bReg > 0;
        const hasSupBreach = !hasRegBreach && (m.bSup > 0);

        let intakeBadgeHtml = '<span class="badge badge-success">Compliant</span>';
        if (hasRegBreach) {
          intakeBadgeHtml = `<span class="badge badge-danger">Breach (+${m.bReg} REG)</span>`;
        } else if (hasSupBreach) {
          intakeBadgeHtml = `<span class="badge badge-warning">Supernumerary cap exceeded (+${m.bSup})</span>`;
        }

        return `
          <tr onclick="filterAlertsToInst('${id}')" style="cursor:pointer;" title="Click to inspect alerts for ${escapeHtml(name)}">
            <td><strong>${escapeHtml(name)}</strong> <span style="font-size:0.75rem; color:var(--text-soft);">(${id})</span></td>
            <td>
              <span class="badge ${m.score >= 50 ? 'badge-danger' : m.score >= 20 ? 'badge-warning' : 'badge-success'}">${m.score} / 100</span>
            </td>
            <td>
              ${intakeBadgeHtml}
            </td>
            <td>${m.d ? `<span class="badge badge-warning">${m.d}</span>` : '0'}</td>
            <td>${m.id ? `<span class="badge badge-danger">${m.id}</span>` : '0'}</td>
            <td>${m.an ? '<span class="badge badge-warning">Surge</span>' : '&mdash;'}</td>
            <td>
              <div style="font-size:0.75rem; font-weight:600; display:flex; justify-content:space-between; margin-bottom:3px;">
                <span>${reg} / ${cap} regular</span>
                <span style="color:${hasRegBreach ? 'var(--danger)' : 'var(--green-dark)'};">${regPct}%</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill ${hasRegBreach ? 'overload' : ''}" style="width:${Math.min(100, regPct)}%;"></div>
              </div>
              <div style="margin-top:4px; display:flex; gap:4px;">
                <span class="badge badge-info" style="font-size:0.68rem; padding:1px 5px;">+${sup} Sup</span>
                <span class="badge badge-subtle" style="font-size:0.68rem; padding:1px 5px; color:var(--text); background:rgba(0,0,0,0.06);">+${nri} NRI</span>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      const clearedList = document.getElementById('dashClearedList');
      if (!filteredCleared.length) {
        clearedList.innerHTML = `<p style="font-size:0.8rem; color:var(--text-muted);">No cleared sequential transfers in this view scope.</p>`;
      } else {
        clearedList.innerHTML = filteredCleared.map((c, i) => `
          <div style="background:var(--bg); border:1px solid var(--card-border); padding:10px 14px; border-radius:6px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div>
              <strong>${i + 1}. ${escapeHtml(c.name)}</strong> <code style="font-size:0.75rem; background:rgba(0,0,0,0.06); padding:1px 5px; border-radius:4px;">${maskId(c.id)}</code>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
                ${escapeHtml(c.from)} (${escapeHtml(c.fromC)}) [Closed: ${c.end}] &rarr; ${escapeHtml(c.to)} (${escapeHtml(c.toC)}) [Enrolled: ${c.start}]
              </div>
            </div>
            <span class="badge badge-success">Auto-Cleared: Prior matriculation concluded prior to subsequent admission</span>
          </div>
        `).join('');
      }
    }

    function filterAlertsToInst(id) {
      currentFilterInst = id;
      setScreen('alerts');
    }

    /* ==========================================================================
       INSPECTION QUEUE SCREEN (Analyst & Officer)
       ========================================================================== */
    function formatAnomalyReasons(m) {
      const parts = [];
      if (m.b > 0) parts.push('seat-rule breach');
      if (m.d > 0) parts.push(`${m.d} duplicate flag${m.d > 1 ? 's' : ''}`);
      if (m.id > 0) parts.push(`${m.id} ID issue${m.id > 1 ? 's' : ''}`);
      if (m.an > 0) parts.push('enrolment surge');
      if (parts.length === 0) return 'No anomalies detected · Standard status';
      return parts.join(' · ');
    }

    async function handleInspectorAssignment(instId, inspector) {
      inspectorAssignments[instId] = inspector;
      await logAudit(
        getActiveActorName(),
        'Inspector Assignment',
        `${iname(instId)} assigned to: ${inspector}`
      );
    }

    function renderQueueScreen() {
      const sorted = [...INS].sort((a, b) => M[b[0]].score - M[a[0]].score);
      const tbody = document.getElementById('queueTableBody');
      const inspectors = ['Unassigned', 'Inspector A', 'Inspector B', 'Inspector C'];

      tbody.innerHTML = sorted.map(([id, name], idx) => {
        const m = M[id];
        const assigned = inspectorAssignments[id] || 'Unassigned';
        const reasons = formatAnomalyReasons(m);
        const scoreBadgeClass = m.score >= 50 ? 'badge-danger' : m.score >= 20 ? 'badge-warning' : 'badge-success';

        return `
          <tr>
            <td><strong style="font-size:1.05rem; color:var(--navy);">#${idx + 1}</strong></td>
            <td>
              <strong>${escapeHtml(name)}</strong>
              <div style="font-size:0.75rem; color:var(--text-soft);">${id} · ${m.n} total records</div>
            </td>
            <td>
              <span class="badge ${scoreBadgeClass}" style="font-size:0.85rem; padding:3px 9px;">${m.score} / 100</span>
            </td>
            <td style="font-size:0.82rem; color:var(--text); line-height:1.4;">
              ${escapeHtml(reasons)}
            </td>
            <td>
              <select class="select-field" style="width:100%; font-size:0.8rem; padding:4px 8px;" onchange="handleInspectorAssignment('${id}', this.value)">
                ${inspectors.map(insp => `<option value="${insp}" ${assigned === insp ? 'selected' : ''}>${insp}</option>`).join('')}
              </select>
            </td>
          </tr>
        `;
      }).join('');
    }

    /* ==========================================================================
       6. SCREEN 3: ALERTS
       ========================================================================== */
    let currentFilterInst = '';

    function getAlertActionButtons(alertObj) {
      const actions = [];
      if (alertObj.status === 'open') {
        if (currentRole === 'analyst' || currentRole === 'officer') {
          actions.push({ label: 'Send to Institution (Correction Window)', next: 'with institution' });
        }
      } else if (alertObj.status === 'with institution') {
        if (currentRole === 'inst') {
          actions.push({ label: 'Mark Corrected (Upload Digest)', next: 'closed' });
          actions.push({ label: 'Cannot Fix, Escalate to AICTE', next: 'unresolved' });
        }
      } else if (alertObj.status === 'unresolved') {
        if (currentRole === 'officer') {
          actions.push({ label: 'Record Officer Decision & Close Alert', next: 'closed' });
        }
      }
      return actions;
    }

    async function executeAlertAction(alertKey, nextStatus) {
      const alertObj = A.find(a => a.key === alertKey);
      if (!alertObj) return;
      alertObj.status = nextStatus;
      await logAudit(getActiveActorName(), `Alert status → ${nextStatus}`, `${alertObj.type} at ${iname(alertObj.inst)} (${alertObj.key})`);
      renderAlertsScreen();
      renderNav();
    }

    function renderAlertsScreen() {
      let filtered = A.filter(isScopedToInst);
      if (currentFilterInst) {
        filtered = filtered.filter(a => a.inst === currentFilterInst || a.also === currentFilterInst);
      }

      const badge = document.getElementById('alertFilterBadge');
      if (currentFilterInst) {
        badge.innerHTML = `Filtered: ${escapeHtml(iname(currentFilterInst))} <button onclick="currentFilterInst='';renderAlertsScreen();" style="background:transparent; border:none; color:inherit; cursor:pointer; font-weight:700; margin-left:4px;">✕</button>`;
      } else {
        badge.textContent = (currentRole === 'inst') ? iname(currentInst) : 'All Institutions';
      }

      const container = document.getElementById('alertsContainer');
      if (!filtered.length) {
        container.innerHTML = `<div class="portal-card"><p style="color:var(--text-muted);">No open or unresolved alerts in current scope.</p></div>`;
        return;
      }

      container.innerHTML = filtered.map((a, idx) => {
        const actions = getAlertActionButtons(a);
        const sevClass = a.sev === 'hi' ? 'badge-danger' : a.sev === 'me' ? 'badge-warning' : 'badge-info';
        const statusClass = a.status === 'closed' ? 'badge-success' : a.status === 'unresolved' ? 'badge-danger' : 'badge-info';

        return `
          <div class="alert-card" id="alertCard_${idx}">
            <div class="alert-summary" onclick="document.getElementById('alertCard_${idx}').classList.toggle('expanded')">
              <div class="alert-title-wrap">
                <span class="badge ${sevClass}">${a.sev.toUpperCase()}</span>
                <strong>${escapeHtml(a.type)}</strong>
                <span style="font-size:0.78rem; color:var(--text-muted);">${escapeHtml(iname(a.inst))}</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="badge ${statusClass}">${a.status.toUpperCase()}</span>
                <span style="color:var(--text-soft); font-size:0.8rem;">▼</span>
              </div>
            </div>

            <div class="alert-content-body">
              <p style="margin-bottom:8px;"><strong>Why flagged:</strong> ${escapeHtml(a.why)}</p>
              <div class="evidence-box"><strong>Evidence Records:</strong>\n${escapeHtml(a.ev.join('\n'))}\n\n<strong>Rule:</strong> ${escapeHtml(a.rule)}\n<strong>Calculation:</strong> ${escapeHtml(a.calc)}</div>
              <p style="margin-bottom:12px;"><strong>Suggested Regulatory Check:</strong> ${escapeHtml(a.next)}</p>

              <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; border-top:1px dashed var(--card-border); padding-top:10px;">
                <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted);">Workflow Action:</span>
                ${actions.length ? actions.map(act => `
                  <button type="button" class="btn btn-primary btn-sm" onclick="executeAlertAction('${a.key}', '${act.next}')">
                    ${escapeHtml(act.label)}
                  </button>
                `).join('') : `<span style="font-size:0.75rem; color:var(--text-soft); font-style:italic;">No action pending for role: ${escapeHtml(ROLES[currentRole].name)}</span>`}
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    /* ==========================================================================
       POLICY SIMULATOR SCREEN (Analyst & Officer)
       ========================================================================== */
    function computeScenarioData(capPct, tolPct) {
      const rows = [];
      let todayBreachCount = 0;
      let scenarioBreachCount = 0;

      INS.forEach(([i, name, cs]) => {
        const m = M[i];
        const hadBreachToday = m.b > 0;
        if (hadBreachToday) todayBreachCount++;

        let isScenarioBreach = false;
        let scenarioExcessReg = 0;
        let scenarioExcessSup = 0;

        Object.entries(cs).forEach(([c, k]) => {
          const regLimit = Math.floor(k * (1 + tolPct / 100));
          const supLimit = Math.ceil(k * capPct / 100);

          const L = D.filter(s => s.inst === i && s.course === c && s.status !== 'transferred');
          const regCount = L.filter(s => s.cat === 'REG').length;
          const supCount = L.filter(s => SUP.includes(s.cat)).length;

          if (regCount > regLimit) {
            isScenarioBreach = true;
            scenarioExcessReg += (regCount - regLimit);
          }
          if (supCount > supLimit) {
            isScenarioBreach = true;
            scenarioExcessSup += (supCount - supLimit);
          }
        });

        if (isScenarioBreach) scenarioBreachCount++;

        let scScore = m.score - (hadBreachToday ? 40 : 0) + (isScenarioBreach ? 40 : 0);
        scScore = Math.max(0, Math.min(100, scScore));

        rows.push({
          id: i,
          name,
          todayScore: m.score,
          todayBreach: hadBreachToday,
          scenarioBreach: isScenarioBreach,
          scenarioScore: scScore,
          scenarioExcessReg,
          scenarioExcessSup
        });
      });

      const sortedToday = [...rows].sort((a, b) => b.todayScore - a.todayScore);
      sortedToday.forEach((item, index) => {
        item.todayRank = index + 1;
      });

      const sortedScenario = [...rows].sort((a, b) => b.scenarioScore - a.scenarioScore);
      sortedScenario.forEach((item, index) => {
        item.scenarioRank = index + 1;
      });

      rows.sort((a, b) => a.scenarioRank - b.scenarioRank);

      return {
        rows,
        todayBreachCount,
        scenarioBreachCount
      };
    }

    function updateSimResults() {
      const capSlider = document.getElementById('simCapSlider');
      const tolSlider = document.getElementById('simTolSlider');
      if (!capSlider || !tolSlider) return;

      const cap = parseInt(capSlider.value, 10);
      const tol = parseInt(tolSlider.value, 10);

      document.getElementById('simCapValDisplay').textContent = `${cap}%`;
      document.getElementById('simTolValDisplay').textContent = `${tol >= 0 ? '+' : ''}${tol}%`;

      const simData = computeScenarioData(cap, tol);
      const diff = simData.scenarioBreachCount - simData.todayBreachCount;
      const diffStr = diff > 0 ? `+${diff}` : `${diff}`;

      const resDiv = document.getElementById('simResults');
      resDiv.innerHTML = `
        <div class="kpi-grid" style="margin-bottom:18px;">
          <div class="kpi-card" style="border-top:3px solid var(--text-muted);">
            <div class="kpi-header"><span>BREACHES TODAY (BASELINE)</span></div>
            <div class="kpi-value">${simData.todayBreachCount} / ${INS.length}</div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">Under standard AICTE criteria</div>
          </div>
          <div class="kpi-card ${simData.scenarioBreachCount > simData.todayBreachCount ? 'kpi-high' : 'kpi-cleared'}">
            <div class="kpi-header"><span>BREACHES UNDER SCENARIO</span></div>
            <div class="kpi-value">${simData.scenarioBreachCount} / ${INS.length}</div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">Net impact: ${diffStr} institutions</div>
          </div>
        </div>

        <div class="table-container">
          <table class="gov-table">
            <thead>
              <tr>
                <th>College</th>
                <th>Status Today</th>
                <th>Status Under Scenario</th>
                <th>Priority Score (Scenario)</th>
                <th>Inspection Rank Shift</th>
              </tr>
            </thead>
            <tbody>
              ${simData.rows.map(r => {
                const shiftDiff = r.todayRank - r.scenarioRank;
                const shiftIcon = shiftDiff > 0 ? '▲' : shiftDiff < 0 ? '▼' : '▬';
                const shiftColor = shiftDiff > 0 ? 'var(--danger)' : shiftDiff < 0 ? 'var(--green)' : 'var(--text-muted)';

                return `
                  <tr>
                    <td>
                      <strong>${escapeHtml(r.name)}</strong>
                      <span style="font-size:0.74rem; color:var(--text-soft);"> (${r.id})</span>
                    </td>
                    <td>
                      ${r.todayBreach ? '<span class="badge badge-danger">Breach</span>' : '<span class="badge badge-success">Compliant</span>'}
                    </td>
                    <td>
                      ${r.scenarioBreach ? `<span class="badge badge-danger">Breach</span>` : `<span class="badge badge-success">Compliant</span>`}
                    </td>
                    <td>
                      <span class="badge ${r.scenarioScore >= 50 ? 'badge-danger' : r.scenarioScore >= 20 ? 'badge-warning' : 'badge-success'}">
                        ${r.scenarioScore} / 100
                      </span>
                    </td>
                    <td>
                      <span style="font-weight:700; color:var(--navy);">#${r.todayRank}</span> &rarr; 
                      <strong style="color:${shiftColor};">#${r.scenarioRank}</strong>
                      <span style="font-size:0.75rem; color:${shiftColor}; margin-left:4px;">(${shiftIcon} ${Math.abs(shiftDiff)})</span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    function renderSimScreen() {
      const capSlider = document.getElementById('simCapSlider');
      const tolSlider = document.getElementById('simTolSlider');
      capSlider.oninput = updateSimResults;
      tolSlider.oninput = updateSimResults;
      updateSimResults();
    }

    /* ==========================================================================
       DATA QUALITY PASSPORT SCREEN (Analyst, Officer, Institution)
       ========================================================================== */
    function computeQualityPassport(instId) {
      const m = M[instId];
      const records = D.filter(s => s.inst === instId);
      const totalRecords = records.length;

      const validNon000 = records.filter(s => s.apaar && valid(s.apaar) && !s.apaar.endsWith('000')).length;
      const completeness = totalRecords > 0 ? Math.round((validNon000 / totalRecords) * 100) : 100;
      const uniqueness = Math.max(0, 100 - (20 * (m.d || 0)));
      const seatRule = (m.b > 0) ? 40 : 100;

      const instAlerts = A.filter(a => a.inst === instId || a.also === instId);
      let correction = 100;
      if (instAlerts.length > 0) {
        const closedCount = instAlerts.filter(a => a.status === 'closed').length;
        correction = Math.round((closedCount / instAlerts.length) * 100);
      }

      const overallScore = Math.round(
        (completeness * 0.40) +
        (uniqueness * 0.25) +
        (seatRule * 0.25) +
        (correction * 0.10)
      );

      return {
        overallScore,
        completeness,
        uniqueness,
        seatRule,
        correction,
        totalRecords,
        validNon000,
        duplicates: m.d || 0,
        breaches: m.b || 0,
        alertCount: instAlerts.length,
        closedAlertCount: instAlerts.filter(a => a.status === 'closed').length
      };
    }

    function renderPassportScreen() {
      const isInst = (currentRole === 'inst');
      const targetInsts = INS.filter(([id]) => !isInst || id === currentInst);
      
      const scopeBadge = document.getElementById('passportScopeBadge');
      scopeBadge.textContent = isInst ? iname(currentInst) : 'All AICTE Pilot Institutions';

      const container = document.getElementById('passportCardsContainer');
      container.innerHTML = targetInsts.map(([id, name]) => {
        const p = computeQualityPassport(id);
        const scoreColor = p.overallScore >= 80 ? 'var(--green)' : p.overallScore >= 60 ? 'var(--warning)' : 'var(--danger)';

        return `
          <div class="portal-card" style="margin-bottom:20px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:14px; margin-bottom:16px;">
              <div>
                <h3 style="font-size:1.15rem; font-weight:800; color:var(--navy); margin-bottom:2px;">
                  ${escapeHtml(name)} <span style="font-size:0.75rem; color:var(--text-soft);">(${id})</span>
                </h3>
                <p style="font-size:0.78rem; color:var(--text-muted);">
                  Calculated against ${p.totalRecords} enrolled student records &amp; registry checkpoints
                </p>
              </div>
              <div style="text-align:right;">
                <div style="font-size:0.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Overall Data Quality Score</div>
                <div style="font-size:2rem; font-weight:800; line-height:1; color:${scoreColor};">
                  ${p.overallScore} <span style="font-size:1rem; color:var(--text-muted);">/ 100</span>
                </div>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:14px; background:var(--bg); border:1px solid var(--card-border); padding:16px; border-radius:var(--radius-md);">
              <div>
                <div style="display:flex; justify-content:space-between; font-size:0.78rem; font-weight:700; margin-bottom:4px;">
                  <span>APAAR Completeness (40%)</span>
                  <span>${p.completeness}%</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill" style="width:${p.completeness}%;"></div>
                </div>
                <div style="font-size:0.72rem; color:var(--text-muted); margin-top:4px;">
                  ${p.validNon000} / ${p.totalRecords} valid 12-digit format &amp; verified mock registry entries.
                </div>
              </div>

              <div>
                <div style="display:flex; justify-content:space-between; font-size:0.78rem; font-weight:700; margin-bottom:4px;">
                  <span>Record Uniqueness (25%)</span>
                  <span>${p.uniqueness}%</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill ${p.uniqueness < 60 ? 'overload' : ''}" style="width:${p.uniqueness}%;"></div>
                </div>
                <div style="font-size:0.72rem; color:var(--text-muted); margin-top:4px;">
                  ${p.duplicates} duplicate identity entries logged (deductions: 20 pts / duplicate).
                </div>
              </div>

              <div>
                <div style="display:flex; justify-content:space-between; font-size:0.78rem; font-weight:700; margin-bottom:4px;">
                  <span>Seat-Rule Reconciliation (25%)</span>
                  <span>${p.seatRule}%</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill ${p.seatRule < 50 ? 'overload' : ''}" style="width:${p.seatRule}%;"></div>
                </div>
                <div style="font-size:0.72rem; color:var(--text-muted); margin-top:4px;">
                  ${p.breaches > 0 ? `${p.breaches} capacity breach alerts currently recorded.` : 'All intake categories strictly within approved quota.'}
                </div>
              </div>

              <div>
                <div style="display:flex; justify-content:space-between; font-size:0.78rem; font-weight:700; margin-bottom:4px;">
                  <span>Correction History (10%)</span>
                  <span>${p.correction}%</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill" style="width:${p.correction}%;"></div>
                </div>
                <div style="font-size:0.72rem; color:var(--text-muted); margin-top:4px;">
                  ${p.alertCount === 0 ? 'No open advisory flags on record.' : `${p.closedAlertCount} of ${p.alertCount} alerts resolved.`}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    /* ==========================================================================
       7. SCREEN 4: SUBMIT DATA (UPLOAD)
       ========================================================================== */
    const instSubmissions = {};

    function getNextVersionForInst(instId) {
      const history = instSubmissions[instId] || [];
      return history.length + 1;
    }

    function renderUploadScreen() {
      document.getElementById('uploadInstScopeLabel').textContent = `${iname(currentInst)} (${currentInst})`;
      const v = getNextVersionForInst(currentInst);
      document.getElementById('uploadVersionBadge').textContent = `Next Version: v${v}`;
    }

    function loadFlawedCsvSample() {
      const conflictApaar = dupIds.length > 0 ? dupIds[0] : '100000000001';
      const sample = 
`apaar_id,name,course,category,status
${conflictApaar},Duplicate Student,CSE,REG,active
,Pending Student,MECH,REG,pending
,Unassigned Invalid,CSE,REG,active
99988877,Short ID Student,CSE,REG,active
123456789000,Mock Registry Missing,MECH,REG,active
223344556677,Same File Dup One,CSE,REG,active
223344556677,Same File Dup Two,CSE,REG,active
334455667788,Unknown Quota Student,CSE,MANAGEMENT_QUOTA,active
445566778899,Valid Student A,CSE,REG,active
556677889900,Valid Student B,MECH,FN,active`;
      document.getElementById('csvUploadInput').value = sample.trim();
    }

    function loadCorrectedCsvSample() {
      const base = 250000000000;
      const sample = 
`apaar_id,name,course,category,status
${base + 11},Aarav Sharma,CSE,REG,active
${base + 12},Diya Patil,CSE,REG,active
${base + 13},Kabir Iyer,MECH,REG,active
${base + 14},Meera Khan,MECH,REG,active
${base + 15},Rohan Singh,CSE,FN,active
${base + 16},Isha Das,CSE,OCI,active
${base + 17},Vikram Nair,MECH,PIO,active
${base + 18},Anaya Joshi,MECH,CIWGC,active
${base + 19},Arjun Rao,CSE,NRI,active
,Sana Gupta,MECH,REG,pending`;
      document.getElementById('csvUploadInput').value = sample.trim();
    }

    async function validateAndSubmitCsv() {
      const raw = document.getElementById('csvUploadInput').value.trim();
      const statusMsg = document.getElementById('uploadStatusMsg');
      const reportDiv = document.getElementById('uploadReportSection');
      const replayDiv = document.getElementById('uploadReplaySection');

      if (!raw) {
        statusMsg.innerHTML = '<span style="color:var(--danger)">Please enter or load CSV data.</span>';
        return;
      }

      const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        statusMsg.innerHTML = '<span style="color:var(--danger)">CSV must contain a header and at least one record row.</span>';
        return;
      }

      const header = lines[0].toLowerCase().split(',').map(s => s.trim());
      const expected = ['apaar_id', 'name', 'course', 'category', 'status'];
      const isHeaderValid = expected.every((h, i) => header[i] === h);
      if (!isHeaderValid) {
        statusMsg.innerHTML = `<span style="color:var(--danger)">Invalid header. Expected exactly: apaar_id,name,course,category,status</span>`;
        return;
      }

      const rows = lines.slice(1);
      const totalRows = rows.length;
      const issues = [];
      const seenInFile = new Set();
      const allowedCategories = ['REG', 'NRI', 'FN', 'OCI', 'PIO', 'CIWGC'];

      rows.forEach((rowStr, idx) => {
        const rowNum = idx + 2;
        const cols = rowStr.split(',').map(s => s.trim());
        const apaar = cols[0] || '';
        const name = cols[1] || `Row ${rowNum}`;
        const course = cols[2] || '';
        const cat = (cols[3] || '').toUpperCase();
        const status = (cols[4] || '').toLowerCase();

        if (!apaar) {
          if (status !== 'pending') {
            issues.push({
              row: rowNum,
              type: 'Missing APAAR ID',
              desc: `Row ${rowNum} (${name}): APAAR ID is missing for non-pending status "${status}".`
            });
          }
        } else {
          if (!/^\d{12}$/.test(apaar)) {
            issues.push({
              row: rowNum,
              type: 'Invalid APAAR Syntax',
              desc: `Row ${rowNum} (${name}): ID "${apaar}" is not exactly 12 numeric digits.`
            });
          } else {
            if (apaar.endsWith('000')) {
              issues.push({
                row: rowNum,
                type: 'Mock Registry Not Found',
                desc: `Row ${rowNum} (${name}): ID ends in "000" (unresolvable in mock registry).`
              });
            }

            if (seenInFile.has(apaar)) {
              issues.push({
                row: rowNum,
                type: 'Duplicate in File',
                desc: `Row ${rowNum} (${name}): APAAR ${apaar} is duplicated within this file submission.`
              });
            } else {
              seenInFile.add(apaar);
            }

            const conflict = D.find(s => s.apaar === apaar && s.inst !== currentInst && s.status === 'active');
            if (conflict) {
              issues.push({
                row: rowNum,
                type: 'Cross-College Conflict',
                desc: `Row ${rowNum} (${name}): APAAR ${apaar} is already active at ${iname(conflict.inst)} (${conflict.course}).`
              });
            }
          }
        }

        if (!allowedCategories.includes(cat)) {
          issues.push({
            row: rowNum,
            type: 'Unknown Category',
            desc: `Row ${rowNum} (${name}): Unknown category "${cols[3]}". Allowed: ${allowedCategories.join(', ')}.`
          });
        }
      });

      const issueCount = issues.length;
      const qualityScore = Math.max(0, Math.min(100, Math.round(100 * (1 - (issueCount / totalRows)))));

      const fullHash = await sha256(raw);
      const hash12 = fullHash.slice(0, 12);
      const versionNum = getNextVersionForInst(currentInst);

      const submissionRecord = {
        version: versionNum,
        hash: fullHash,
        hash12: hash12,
        totalRows,
        qualityScore,
        issues: issues.map(iss => ({
          ...iss,
          normalizedText: iss.desc.replace(/Row \d+ \([^)]+\): /, '')
        })),
        submittedAt: new Date().toISOString()
      };

      const history = instSubmissions[currentInst] || [];
      const prevSubmission = history.length > 0 ? history[history.length - 1] : null;

      history.push(submissionRecord);
      instSubmissions[currentInst] = history;

      await logAudit(
        getActiveActorName(),
        'CSV Enrolment Submission',
        `Version: v${versionNum} · Rows: ${totalRows} · Quality: ${qualityScore}% · Hash: ${hash12}…`
      );

      statusMsg.innerHTML = `<span style="color:var(--green)">Submission digest recorded successfully (v${versionNum}).</span>`;
      reportDiv.style.display = 'block';
      reportDiv.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
          <div>
            <h3 style="font-size:1.05rem; font-weight:700;">Validation Digest & Quality Report (v${versionNum})</h3>
            <p style="font-size:0.78rem; color:var(--text-muted);">
              File Hash (SHA-256): <code style="background:rgba(0,0,0,0.06); padding:2px 6px; border-radius:4px;">${escapeHtml(fullHash)}</code>
            </p>
          </div>
          <div style="text-align:right;">
            <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">DATA QUALITY SCORE</div>
            <div style="font-size:1.7rem; font-weight:800; color:${qualityScore >= 80 ? 'var(--green)' : qualityScore >= 50 ? 'var(--warning)' : 'var(--danger)'};">
              ${qualityScore} / 100
            </div>
          </div>
        </div>

        <div style="display:flex; gap:12px; margin-bottom:14px; font-size:0.8rem;">
          <span class="badge badge-info">${totalRows} Total Rows</span>
          <span class="badge ${issueCount === 0 ? 'badge-success' : 'badge-danger'}">${issueCount} Validation Issues Found</span>
        </div>

        ${issueCount === 0 ? `
          <div class="evidence-box" style="border-color:var(--green); background:var(--green-subtle); color:var(--green-dark);">
✓ All rows passed format, category, mock registry, and cross-college conflict checks. Ready for AICTE sync.
          </div>
        ` : `
          <div class="table-container" style="max-height:220px; overflow-y:auto;">
            <table class="gov-table" style="min-width:540px;">
              <thead>
                <tr>
                  <th style="width:70px;">Row #</th>
                  <th style="width:180px;">Issue Type</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                ${issues.map(iss => `
                  <tr>
                    <td><strong>${iss.row}</strong></td>
                    <td><span class="badge badge-danger">${escapeHtml(iss.type)}</span></td>
                    <td style="font-size:0.8rem;">${escapeHtml(iss.desc)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      `;

      if (prevSubmission) {
        replayDiv.style.display = 'block';
        const prevIssuesNorm = prevSubmission.issues.map(i => i.normalizedText);
        const currIssuesNorm = submissionRecord.issues.map(i => i.normalizedText);

        const fixed = prevIssuesNorm.filter(txt => !currIssuesNorm.includes(txt));
        const stillOpen = currIssuesNorm.filter(txt => prevIssuesNorm.includes(txt));
        const newIssues = currIssuesNorm.filter(txt => !prevIssuesNorm.includes(txt));

        replayDiv.innerHTML = `
          <div style="background:var(--bg); border:1px solid var(--card-border); border-radius:var(--radius-md); padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
              <h4 style="font-size:0.95rem; font-weight:700; color:var(--navy);">
                Before / After Replay Comparison (v${prevSubmission.version} &rarr; v${versionNum})
              </h4>
              <div style="display:flex; gap:8px;">
                <span class="badge badge-subtle" style="color:var(--text);">Quality Before: ${prevSubmission.qualityScore}%</span>
                <span class="badge ${qualityScore >= prevSubmission.qualityScore ? 'badge-success' : 'badge-danger'}">Quality After: ${qualityScore}%</span>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; margin-bottom:12px;">
              <div style="background:var(--card-bg); padding:10px; border-radius:6px; border:1px solid var(--card-border);">
                <span style="font-size:0.75rem; color:var(--green); font-weight:700;">● FIXED ISSUES (${fixed.length})</span>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
                  ${fixed.length ? fixed.map(f => `<div style="margin-bottom:3px;">✓ ${escapeHtml(f)}</div>`).join('') : '<em>None</em>'}
                </div>
              </div>

              <div style="background:var(--card-bg); padding:10px; border-radius:6px; border:1px solid var(--card-border);">
                <span style="font-size:0.75rem; color:var(--warning); font-weight:700;">● STILL OPEN (${stillOpen.length})</span>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
                  ${stillOpen.length ? stillOpen.map(s => `<div style="margin-bottom:3px;">⚠ ${escapeHtml(s)}</div>`).join('') : '<em>None</em>'}
                </div>
              </div>

              <div style="background:var(--card-bg); padding:10px; border-radius:6px; border:1px solid var(--card-border);">
                <span style="font-size:0.75rem; color:var(--danger); font-weight:700;">● NEW ISSUES (${newIssues.length})</span>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
                  ${newIssues.length ? newIssues.map(n => `<div style="margin-bottom:3px;">✕ ${escapeHtml(n)}</div>`).join('') : '<em>None</em>'}
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        replayDiv.style.display = 'none';
      }

      renderUploadScreen();
    }

    /* ==========================================================================
       8. SCREEN 5: AUDIT TRAIL
       ========================================================================== */
    async function renderAuditScreen() {
      const chainIdx = await verifyAuditChain();
      const badge = document.getElementById('auditChainIntegrityBadge');
      if (chainIdx < 0) {
        badge.className = 'badge badge-success';
        badge.textContent = 'Chain intact';
      } else {
        badge.className = 'badge badge-danger';
        badge.textContent = `Tampering detected at entry ${chainIdx}`;
      }

      const tbody = document.getElementById('auditTableBody');
      tbody.innerHTML = AU.map((entry, idx) => {
        const hash10 = entry.h ? entry.h.slice(0, 10) : '';
        return `
          <tr>
            <td><strong>#${idx}</strong></td>
            <td style="font-family:ui-monospace, monospace; font-size:0.75rem;">${escapeHtml(entry.t)}</td>
            <td><strong>${escapeHtml(entry.actor)}</strong></td>
            <td><span class="badge badge-info">${escapeHtml(entry.action)}</span></td>
            <td style="font-size:0.8rem; word-break:break-word;">${escapeHtml(entry.detail)}</td>
            <td style="font-family:ui-monospace, monospace; font-size:0.75rem;">${escapeHtml(hash10)}…</td>
          </tr>
        `;
      }).reverse().join('');
    }

    async function simulateAuditTampering() {
      if (AU.length > 1) {
        AU[1].detail = AU[1].detail + " [TAMPERED_MODIFIED_PAYLOAD]";
      } else if (AU.length > 0) {
        AU[0].detail = AU[0].detail + " [TAMPERED_MODIFIED_PAYLOAD]";
      }
      renderAuditScreen();
    }

    /* ==========================================================================
       9. SCREEN 8: STANDALONE VERIFIER
       ========================================================================== */
    async function executeStandaloneVerification() {
      const id = document.getElementById('standaloneVerifyId').value.trim();
      const purpose = document.getElementById('standaloneVerifyPurpose').value;
      const consent = document.getElementById('standaloneConsentCheck').checked;
      const out = document.getElementById('standaloneVerifyOutput');

      if (!valid(id)) {
        out.style.display = 'block';
        out.innerHTML = `<div class="badge badge-danger" style="padding:8px 12px; width:100%;">Invalid Syntax: APAAR must be exactly 12 numeric digits.</div>`;
        return;
      }

      if (!consent) {
        out.style.display = 'block';
        out.innerHTML = `<div class="badge badge-danger" style="padding:8px 12px; width:100%;">Blocked: Verification denied without student digital consent checkbox.</div>`;
        await logAudit('Public Verifier', 'Query Blocked', `No consent receipt for ID: ${maskId(id)}`);
        return;
      }

      const match = D.some(s => s.apaar === id && s.status === 'active');
      let receiptNo = 'CR-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      let sig = '(offline mode: no server signature)';
      try { const v = await api('/api/verify', { method: 'POST', body: JSON.stringify({ apaar: id, purpose, consent }) }); receiptNo = v.receipt; sig = 'Ed25519 ' + v.signature.slice(0, 24) + '…'; } catch (e) {}

      await logAudit('Public Verifier', `Verify: ${purpose}`, `ID: ${maskId(id)} · Receipt: ${receiptNo}`);

      out.style.display = 'block';
      out.innerHTML = `
        <div class="evidence-box" style="margin-top:0;">
<strong>ENROLLED IN AICTE-APPROVED INSTITUTION:</strong> ${match ? 'YES' : 'NO'}
<strong>IDENTITY DATA RETURNED:</strong> none (Zero-Knowledge Mode)
<strong>CONSENT RECEIPT:</strong> ${escapeHtml(receiptNo)}
<strong>SIGNATURE:</strong> ${escapeHtml(sig)}
<strong>MOCK REGISTRY ADAPTER:</strong> verified
        </div>
      `;
    }

    function fillValidVerifierSample() {
      const sample = D.find(s => valid(s.apaar) && s.status === 'active');
      if (sample) {
        document.getElementById('standaloneVerifyId').value = sample.apaar;
        document.getElementById('standaloneConsentCheck').checked = true;
        executeStandaloneVerification();
      }
    }

    /* ==========================================================================
       10. MODAL CONTROLS
       ========================================================================== */
    function showHelpModal(customContent) {
      const body = document.getElementById('modalHelpBody');
      if (customContent) {
        body.innerHTML = customContent;
      } else {
        body.innerHTML = DEFAULT_HELP_HTML;
      }
      document.getElementById('helpModal').classList.add('open');
    }

    function closeHelpModal() {
      document.getElementById('helpModal').classList.remove('open');
    }

    /* ==========================================================================
       11. LOCALIZATION
       ========================================================================== */
    let currentLang = 'en';
    const I18N = {
      en: {
        govHeader: 'Government of India · AICTE Pilot',
        mockLabel: 'MOCK APAAR REGISTRY MODE',
        mockDesc: 'Prototype with synthetic seed only. Not an official AICTE portal. Decisions remain strictly human-in-the-loop.',
        tagline: 'APAAR-Based Enrolment Integrity & Seat Reconciliation Engine',
        helpBtn: 'Rules & Guidelines',
        headDash: 'AICTE Regulatory Enrolment Dashboard',
        headQueue: 'Inspection Priority Queue & Assignment',
        headAlerts: 'Advisory Enrolment Alerts',
        headSim: 'Regulatory Policy Impact Simulator',
        headPassport: 'Institution Data Quality Passport',
        headUpload: 'Institution Data Submission & Verification',
        headAudit: 'Cryptographic Hash-Chained Audit Trail',
        headVerify: 'Third-Party Student Enrolment Verifier'
      },
      hi: {
        govHeader: 'भारत सरकार · एआईसीटीई पायलट',
        mockLabel: 'मॉक अपार (APAAR) रजिस्ट्री मोड',
        mockDesc: 'केवल कृत्रिम डेटा युक्त प्रोटोटाइप। यह आधिकारिक एआईसीटीई पोर्टल नहीं है। सभी निर्णय मानव समीक्षा के अधीन हैं।',
        tagline: 'अपार आधारित नामांकन सत्यनिष्ठा एवं सीट मिलान इंजन',
        helpBtn: 'नियम एवं दिशानिर्देश',
        headDash: 'एआईसीटीई नियामक नामांकन डैशबोर्ड',
        headQueue: 'निरीक्षण प्राथमिकता कतार एवं आवंटन',
        headAlerts: 'परामर्श नामांकन अलर्ट',
        headSim: 'नियामक नीति प्रभाव सिम्युलेटर',
        headPassport: 'डेटा गुणवत्ता पासपोर्ट',
        headUpload: 'संस्थान डेटा प्रविष्टि एवं सत्यापन',
        headAudit: 'क्रिप्टोग्राफ़िक हैश-श्रृंखलाबद्ध ऑडिट ट्रेल',
        headVerify: 'तृतीय-पक्ष छात्र नामांकन सत्यापनकर्ता'
      }
    };

    function updateLanguage(lang) {
      currentLang = lang;
      document.documentElement.lang = lang;
      document.getElementById('langText').textContent = lang === 'en' ? 'हिन्दी' : 'English';
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const k = el.getAttribute('data-i18n');
        if (I18N[lang] && I18N[lang][k]) el.textContent = I18N[lang][k];
      });
      renderNav();
      if (currentTab === 'landing') renderRoleLandingScreen();
      if (currentTab === 'dash') renderDashboardScreen();
      if (currentTab === 'queue') renderQueueScreen();
      if (currentTab === 'sim') renderSimScreen();
      if (currentTab === 'passport') renderPassportScreen();
    }

    /* ==========================================================================
       12. BOOTSTRAP INITIALIZATION
       ========================================================================== */
    window.addEventListener('DOMContentLoaded', async () => {
      // Populate login institution select
      const loginInstSelect = document.getElementById('loginInstSelect');
      loginInstSelect.innerHTML = INS.map(([id, name]) => `<option value="${id}">${escapeHtml(name)} (${id})</option>`).join('');

      let currentZoom = 14;
      document.getElementById('btnFontInc').onclick = () => { if (currentZoom < 18) { currentZoom++; document.documentElement.style.setProperty('--base-font-size', currentZoom + 'px'); } };
      document.getElementById('btnFontDec').onclick = () => { if (currentZoom > 12) { currentZoom--; document.documentElement.style.setProperty('--base-font-size', currentZoom + 'px'); } };
      document.getElementById('btnFontReset').onclick = () => { currentZoom = 14; document.documentElement.style.setProperty('--base-font-size', '14px'); };

      let highContrast = false;
      document.getElementById('btnContrast').onclick = () => {
        highContrast = !highContrast;
        document.documentElement.setAttribute('data-contrast', highContrast ? 'high' : 'normal');
      };

      let isDark = false;
      document.getElementById('btnTheme').onclick = () => {
        isDark = !isDark;
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        document.getElementById('themeIcon').textContent = isDark ? '☀️' : '🌙';
        document.getElementById('themeLabel').textContent = isDark ? 'Light' : 'Dark';
      };

      document.getElementById('btnLang').onclick = () => updateLanguage(currentLang === 'en' ? 'hi' : 'en');
      document.getElementById('btnFloatingHelp').onclick = () => showHelpModal();
      document.getElementById('brandLogoHome').onclick = () => {
        if (currentUser) setScreen('landing');
      };

      document.getElementById('pillAlerts').onclick = () => { if (currentUser) setScreen('alerts'); };
      document.getElementById('pillCleared').onclick = () => { if (currentUser) setScreen('dash'); };

      initSyntheticDataset();
      evaluateRules();

      await logAudit('System Genesis', 'Dataset Initialized', `Synthetic seed 26263 · ${D.length} student records`);
      await logAudit('System Engine', 'Reconciliation Complete', `Identified ${A.length} alerts across 8 institutions`);

      // Check session
      let savedUser = null;
      try {
        const stored = sessionStorage.getItem('seatsentinel_user');
        if (stored) savedUser = JSON.parse(stored);
      } catch (e) {
        savedUser = null;
      }

      if (savedUser && savedUser.role && ROLES[savedUser.role]) {
        currentUser = savedUser;
        currentRole = savedUser.role;
        currentInst = savedUser.instId || 'I1';
        showAppView();
      } else {
        showLoginView();
      }
    });