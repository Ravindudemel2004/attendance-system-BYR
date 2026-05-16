/**
 * EduTrack — Student Attendance Management System
 * script.js
 *
 * Architecture:
 *  - State management via a single `appData` object
 *  - All reads/writes go through loadData() / saveData()
 *  - Rendering functions are named render*()
 *  - Chart instances managed in `charts` map to allow re-draw
 */

/* ===================== CONSTANTS ===================== */
const YEARS  = [2026, 2027, 2028, 2029, 2030];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const STATUSES = ['Present','Absent','Late','Excused'];
const LOW_THRESHOLD = 80; // % below which warning shows
const STORAGE_KEY   = 'edutrack_data';

/* ===================== STATE ===================== */
/** @type {{ students: Array<{id:number,name:string}>, attendance: Object }} */
let appData = { students: [], attendance: {} };

/** Chart.js instances — we destroy & recreate on each render */
const charts = {};

/* ===================== DATA HELPERS ===================== */

/** Load data from localStorage */
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) appData = JSON.parse(raw);
    // Ensure both keys always exist
    if (!appData.students)   appData.students   = [];
    if (!appData.attendance) appData.attendance = {};
  } catch(e) {
    console.error('Load error', e);
    appData = { students: [], attendance: {} };
  }
}

/** Save current state to localStorage */
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

/** Build date key string "YYYY-MM-DD" */
function dateKey(y, m, d) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

/** Get attendance record for a date (or empty object) */
function getDateRecord(key) {
  return appData.attendance[key] || {};
}

/** Get next unique student ID */
function nextId() {
  if (!appData.students.length) return 1;
  return Math.max(...appData.students.map(s => s.id)) + 1;
}

/** Compute attendance stats for a student across given date keys */
function calcStats(studentId, dateKeys) {
  const id = String(studentId);
  let P=0, A=0, L=0, E=0;
  for (const k of dateKeys) {
    const rec = getDateRecord(k);
    const status = rec[id];
    if (status === 'Present') P++;
    else if (status === 'Absent') A++;
    else if (status === 'Late') L++;
    else if (status === 'Excused') E++;
  }
  const total = P + A + L + E;
  const pct = total ? Math.round((P / total) * 100) : null;
  return { P, A, L, E, total, pct };
}

/** Get all date keys for a given year (and optionally month) */
function getDateKeys(year, month = null) {
  return Object.keys(appData.attendance).filter(k => {
    if (!k.startsWith(year)) return false;
    if (month !== null) {
      const m = parseInt(k.split('-')[1]);
      return m === month;
    }
    return true;
  });
}

/* ===================== TOAST ===================== */
let toastTimer;
function showToast(msg, duration = 2500) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

/* ===================== DROPDOWN POPULATION ===================== */

/** Populate a <select> with years */
function populateYears(selectId, defaultYear = null) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const current = sel.value || defaultYear || new Date().getFullYear();
  sel.innerHTML = YEARS.map(y =>
    `<option value="${y}" ${y == current ? 'selected' : ''}>${y}</option>`
  ).join('');
}

/** Populate a <select> with months */
function populateMonths(selectId, includeAll = false, defaultMonth = null) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const current = sel.value || defaultMonth || (new Date().getMonth() + 1);
  let opts = includeAll ? `<option value="all">All Months</option>` : '';
  opts += MONTHS.map((m, i) =>
    `<option value="${i+1}" ${(i+1) == current && !includeAll ? 'selected' : ''}>${m}</option>`
  ).join('');
  sel.innerHTML = opts;
}

/** Populate a <select> with days 1–31 */
function populateDays(selectId, defaultDay = null) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const current = sel.value || defaultDay || new Date().getDate();
  sel.innerHTML = Array.from({length:31}, (_,i) =>
    `<option value="${i+1}" ${(i+1) == current ? 'selected' : ''}>${i+1}</option>`
  ).join('');
}

/** Populate analytics student select */
function populateAnaStudents() {
  const sel = document.getElementById('ana-student');
  if (!sel) return;
  sel.innerHTML = `<option value="all">All Students</option>` +
    appData.students.map(s =>
      `<option value="${s.id}">${s.name}</option>`
    ).join('');
}

/* ===================== NAVIGATION ===================== */
function navigateTo(section) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`section-${section}`)?.classList.add('active');
  document.querySelector(`[data-section="${section}"]`)?.classList.add('active');
  document.getElementById('topbarTitle').textContent =
    section.charAt(0).toUpperCase() + section.slice(1);
  // Render the appropriate section
  if (section === 'dashboard') renderDashboard();
  if (section === 'attendance') renderAttendanceTable();
  if (section === 'students') renderStudentTable();
  if (section === 'analytics') renderAnalytics();
}

/* ===================== DASHBOARD ===================== */
function renderDashboard() {
  const y = document.getElementById('dash-year').value;
  const m = document.getElementById('dash-month').value;
  const d = document.getElementById('dash-day').value;
  const key = dateKey(y, m, d);
  const rec = getDateRecord(key);

  // Summary counts
  const total   = appData.students.length;
  let P=0, A=0, L=0, E=0;
  appData.students.forEach(s => {
    const st = rec[String(s.id)];
    if (st === 'Present') P++;
    else if (st === 'Absent') A++;
    else if (st === 'Late') L++;
    else if (st === 'Excused') E++;
  });
  const marked = P + A + L + E;
  const pct = marked ? Math.round((P / marked) * 100) : null;

  document.getElementById('statTotal').textContent   = total;
  document.getElementById('statPresent').textContent = P;
  document.getElementById('statAbsent').textContent  = A;
  document.getElementById('statLate').textContent    = L;
  document.getElementById('statExcused').textContent = E;
  document.getElementById('statPct').textContent     = pct !== null ? pct + '%' : '—';

  renderPieChart(P, A, L, E);
  renderMonthlyTrendChart(y, parseInt(m));
  renderLowAttendanceWarnings(y);
}

/* ===================== PIE CHART ===================== */
function renderPieChart(P, A, L, E) {
  const ctx = document.getElementById('pieChart');
  if (!ctx) return;
  if (charts.pie) charts.pie.destroy();
  charts.pie = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Present','Absent','Late','Excused'],
      datasets: [{
        data: [P, A, L, E],
        backgroundColor: ['#27b87a','#e74c3c','#9b59b6','#f0b429'],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { family: 'DM Sans', size: 12 }, padding: 14, color: getComputedStyle(document.body).getPropertyValue('--text') }
        },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}` } }
      }
    }
  });
}

/* ===================== MONTHLY TREND CHART ===================== */
function renderMonthlyTrendChart(year, currentMonth) {
  const ctx = document.getElementById('monthlyChart');
  if (!ctx) return;
  if (charts.monthly) charts.monthly.destroy();

  // For each month up to currentMonth, compute average attendance %
  const labels = [], data = [];
  for (let m = 1; m <= currentMonth; m++) {
    const keys = getDateKeys(year, m);
    if (!keys.length) { labels.push(MONTHS[m-1].slice(0,3)); data.push(0); continue; }
    let totalPct = 0, count = 0;
    for (const k of keys) {
      const rec = getDateRecord(k);
      let P=0, tot=0;
      appData.students.forEach(s => {
        const st = rec[String(s.id)];
        if (st) { tot++; if (st==='Present') P++; }
      });
      if (tot) { totalPct += (P/tot)*100; count++; }
    }
    labels.push(MONTHS[m-1].slice(0,3));
    data.push(count ? Math.round(totalPct/count) : 0);
  }

  charts.monthly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Avg Attendance %',
        data,
        backgroundColor: 'rgba(58,108,244,.75)',
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: { beginAtZero: true, max: 100,
          ticks: { callback: v => v+'%', font:{family:'DM Sans'} },
          grid: { color: 'rgba(128,128,128,.1)' }
        },
        x: { ticks: { font:{family:'DM Sans'} }, grid: { display:false } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

/* ===================== LOW ATTENDANCE WARNINGS ===================== */
function renderLowAttendanceWarnings(year) {
  const keys = getDateKeys(year);
  const list = [];
  appData.students.forEach(s => {
    const { pct } = calcStats(s.id, keys);
    if (pct !== null && pct < LOW_THRESHOLD) list.push({ name: s.name, pct });
  });
  list.sort((a,b) => a.pct - b.pct);

  const el = document.getElementById('lowAttendanceList');
  const badge = document.getElementById('lowCount');
  badge.textContent = list.length;

  if (!list.length) {
    el.innerHTML = '<p class="empty-msg">No low attendance detected. 🎉</p>';
    return;
  }
  el.innerHTML = list.map(item => `
    <div class="low-att-item">
      <span class="low-att-name">${escHtml(item.name)}</span>
      <span class="low-att-pct">${item.pct}%</span>
    </div>
  `).join('');
}

/* ===================== ATTENDANCE TABLE ===================== */
function renderAttendanceTable(filter = '') {
  const y = document.getElementById('att-year').value;
  const m = document.getElementById('att-month').value;
  const d = document.getElementById('att-day').value;
  const key = dateKey(y, m, d);
  const rec = getDateRecord(key);

  // Show selected date label
  document.getElementById('attDateLabel').textContent =
    `${MONTHS[parseInt(m)-1]} ${d}, ${y}`;

  const tbody = document.getElementById('attTableBody');
  const students = appData.students.filter(s =>
    s.name.toLowerCase().includes(filter.toLowerCase())
  );

  if (!students.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-msg">No students found.</td></tr>';
    return;
  }

  tbody.innerHTML = students.map((s, idx) => {
    const id  = String(s.id);
    const cur = rec[id] || '';
    const badge = cur ? `<span class="badge badge-${cur.toLowerCase()}">${cur}</span>` : `<span class="badge badge-unmarked">—</span>`;
    const radioGroup = STATUSES.map(st => `
      <input class="status-radio" type="radio"
        name="att-${id}" id="att-${id}-${st}"
        value="${st}" data-key="${key}" data-sid="${id}"
        ${cur === st ? 'checked' : ''} />
      <label for="att-${id}-${st}">${st}</label>
    `).join('');
    return `
      <tr>
        <td>${idx+1}</td>
        <td><strong>${escHtml(s.name)}</strong></td>
        <td colspan="4">
          <div class="status-radio-group">${radioGroup}</div>
        </td>
        <td>${badge}</td>
      </tr>`;
  }).join('');

  // Attach change listeners
  tbody.querySelectorAll('.status-radio').forEach(radio => {
    radio.addEventListener('change', e => {
      const { key, sid } = e.target.dataset;
      if (!appData.attendance[key]) appData.attendance[key] = {};
      appData.attendance[key][sid] = e.target.value;
      saveData();
      // Update badge in same row without full re-render
      const badge = e.target.closest('tr').querySelector('.badge');
      if (badge) {
        badge.className = `badge badge-${e.target.value.toLowerCase()}`;
        badge.textContent = e.target.value;
      }
    });
  });
}

/* ===================== STUDENT TABLE ===================== */
function renderStudentTable(filter = '') {
  const tbody = document.getElementById('studentTableBody');
  const badge = document.getElementById('studentCountBadge');

  const students = appData.students.filter(s =>
    s.name.toLowerCase().includes(filter.toLowerCase())
  );
  badge.textContent = `${appData.students.length} student${appData.students.length !== 1 ? 's' : ''}`;

  if (!students.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-msg">${
      appData.students.length ? 'No results found.' : 'No students added yet.'
    }</td></tr>`;
    renderRanking();
    return;
  }

  const allKeys = Object.keys(appData.attendance);
  tbody.innerHTML = students.map((s, idx) => {
    const { total, pct } = calcStats(s.id, allKeys);
    const pctStr = pct !== null ? pct + '%' : '—';
    const pctClass = pct === null ? '' : pct >= LOW_THRESHOLD ? 'good' : pct >= 60 ? 'warn' : 'danger';
    return `
      <tr>
        <td>${idx+1}</td>
        <td><strong>${escHtml(s.name)}</strong></td>
        <td>${total}</td>
        <td>
          ${pctStr}
          <div class="progress-bar-wrap">
            <div class="progress-bar ${pctClass}" style="width:${pct||0}%"></div>
          </div>
        </td>
        <td>
          <button class="btn btn-outline btn-sm" data-id="${s.id}" data-action="edit">✏ Edit</button>
          <button class="btn btn-danger btn-sm" data-id="${s.id}" data-action="delete">🗑</button>
        </td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = parseInt(e.target.dataset.id);
      if (e.target.dataset.action === 'edit') openEditModal(id);
      else if (e.target.dataset.action === 'delete') deleteStudent(id);
    });
  });

  renderRanking();
}

/* ===================== RANKING ===================== */
function renderRanking() {
  const el = document.getElementById('rankingList');
  if (!el) return;
  const allKeys = Object.keys(appData.attendance);
  const ranked = appData.students.map(s => {
    const { pct } = calcStats(s.id, allKeys);
    return { name: s.name, pct: pct !== null ? pct : -1 };
  }).sort((a,b) => b.pct - a.pct);

  if (!ranked.length) { el.innerHTML = '<p class="empty-msg">No students yet.</p>'; return; }

  el.innerHTML = ranked.map((r, i) => {
    const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
    const pctStr = r.pct >= 0 ? r.pct+'%' : '—';
    const pctColor = r.pct >= LOW_THRESHOLD ? 'var(--success)' : r.pct >= 0 ? 'var(--danger)' : 'var(--text-3)';
    return `
      <div class="ranking-item">
        <span class="rank-num ${rankClass}">${i+1}</span>
        <span class="rank-name">${escHtml(r.name)}</span>
        <span class="rank-pct" style="color:${pctColor}">${pctStr}</span>
      </div>`;
  }).join('');
}

/* ===================== ANALYTICS ===================== */
function renderAnalytics() {
  populateAnaStudents();
  renderAnaTable();
}

function renderAnaTable() {
  const year    = document.getElementById('ana-year').value;
  const monthV  = document.getElementById('ana-month').value;
  const studentV= document.getElementById('ana-student').value;

  const month = monthV === 'all' ? null : parseInt(monthV);
  const keys  = getDateKeys(year, month);

  const students = studentV === 'all'
    ? appData.students
    : appData.students.filter(s => s.id === parseInt(studentV));

  const tbody = document.getElementById('anaTableBody');
  if (!students.length || !keys.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-msg">No data for selected filters.</td></tr>';
    renderYearlyChart();
    renderComparisonChart([], []);
    return;
  }

  const rows = students.map(s => {
    const stats = calcStats(s.id, keys);
    const pct = stats.pct;
    const pctStr = pct !== null ? pct + '%' : '—';
    const statusBadge = pct === null ? '' :
      pct >= LOW_THRESHOLD ? '<span class="badge badge-success">✓ Good</span>' :
      pct >= 60 ? '<span class="badge badge-warning">⚠ At Risk</span>' :
      '<span class="badge badge-danger">✗ Low</span>';
    const rowClass = pct === null ? '' : pct < LOW_THRESHOLD ? (pct < 60 ? 'danger-row' : 'warn-row') : '';
    return { s, stats, pct, pctStr, statusBadge, rowClass };
  });

  tbody.innerHTML = rows.map(r => `
    <tr class="${r.rowClass}">
      <td><strong>${escHtml(r.s.name)}</strong></td>
      <td>${r.stats.P}</td>
      <td>${r.stats.A}</td>
      <td>${r.stats.L}</td>
      <td>${r.stats.E}</td>
      <td>${r.stats.total}</td>
      <td>
        ${r.pctStr}
        <div class="progress-bar-wrap">
          <div class="progress-bar ${r.pct >= LOW_THRESHOLD ? 'good' : r.pct >= 60 ? 'warn' : 'danger'}"
            style="width:${r.pct||0}%"></div>
        </div>
      </td>
      <td>${r.statusBadge}</td>
    </tr>`
  ).join('');

  const names = rows.map(r => r.s.name);
  const pcts  = rows.map(r => r.pct !== null ? r.pct : 0);
  renderComparisonChart(names, pcts);
  renderYearlyChart();
}

/* ===================== YEARLY CHART ===================== */
function renderYearlyChart() {
  const ctx = document.getElementById('yearlyChart');
  if (!ctx) return;
  if (charts.yearly) charts.yearly.destroy();

  const labels = [], data = [];
  for (const y of YEARS) {
    const keys = getDateKeys(String(y));
    let totalPct = 0, count = 0;
    for (const k of keys) {
      const rec = getDateRecord(k);
      let P = 0, tot = 0;
      appData.students.forEach(s => {
        const st = rec[String(s.id)];
        if (st) { tot++; if (st==='Present') P++; }
      });
      if (tot) { totalPct += (P/tot)*100; count++; }
    }
    labels.push(String(y));
    data.push(count ? Math.round(totalPct/count) : 0);
  }

  charts.yearly = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Avg Attendance %',
        data,
        borderColor: '#3a6cf4',
        backgroundColor: 'rgba(58,108,244,.1)',
        borderWidth: 2.5,
        fill: true,
        tension: .35,
        pointBackgroundColor: '#3a6cf4',
        pointRadius: 5
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, max: 100, ticks: { callback: v => v+'%' }, grid: { color:'rgba(128,128,128,.1)' } },
        x: { grid: { display: false } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

/* ===================== COMPARISON CHART ===================== */
function renderComparisonChart(names, pcts) {
  const ctx = document.getElementById('comparisonChart');
  if (!ctx) return;
  if (charts.comparison) charts.comparison.destroy();

  const colors = pcts.map(p => p >= LOW_THRESHOLD ? '#27b87a' : p >= 60 ? '#f0b429' : '#e74c3c');

  charts.comparison = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: names,
      datasets: [{
        label: 'Attendance %',
        data: pcts,
        backgroundColor: colors,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      scales: {
        x: { beginAtZero: true, max: 100, ticks: { callback: v => v+'%' }, grid: { color:'rgba(128,128,128,.1)' } },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

/* ===================== STUDENT MANAGEMENT ===================== */

function addStudent(name) {
  name = name.trim();
  if (!name) { showToast('⚠ Please enter a student name.'); return false; }
  if (appData.students.some(s => s.name.toLowerCase() === name.toLowerCase())) {
    showToast('⚠ A student with this name already exists.'); return false;
  }
  appData.students.push({ id: nextId(), name });
  saveData();
  showToast(`✅ "${name}" added.`);
  return true;
}

function deleteStudent(id) {
  const s = appData.students.find(s => s.id === id);
  if (!s) return;
  if (!confirm(`Delete "${s.name}"? This will also remove all their attendance records.`)) return;
  appData.students = appData.students.filter(s => s.id !== id);
  // Remove from attendance records
  const sid = String(id);
  for (const key of Object.keys(appData.attendance)) {
    delete appData.attendance[key][sid];
  }
  saveData();
  showToast(`🗑 "${s.name}" deleted.`);
  renderStudentTable();
}

function openEditModal(id) {
  const s = appData.students.find(s => s.id === id);
  if (!s) return;
  document.getElementById('editStudentName').value = s.name;
  document.getElementById('editStudentId').value   = id;
  document.getElementById('editModal').classList.add('open');
}

function saveEditStudent() {
  const id   = parseInt(document.getElementById('editStudentId').value);
  const name = document.getElementById('editStudentName').value.trim();
  if (!name) { showToast('⚠ Name cannot be empty.'); return; }
  if (appData.students.some(s => s.name.toLowerCase() === name.toLowerCase() && s.id !== id)) {
    showToast('⚠ Another student already has this name.'); return;
  }
  const s = appData.students.find(s => s.id === id);
  if (!s) return;
  s.name = name;
  saveData();
  showToast(`✅ Name updated to "${name}".`);
  closeEditModal();
  renderStudentTable();
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('open');
}

/* ===================== CSV IMPORT / EXPORT ===================== */

/** Import students from CSV file */
function importStudentsCSV(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const lines = e.target.result.split('\n').map(l => l.trim()).filter(Boolean);
    let added = 0, skipped = 0;
    for (const line of lines) {
      // Support: single name per line OR "id,name" format
      const parts = line.split(',');
      const name = (parts.length >= 2 ? parts[1] : parts[0]).replace(/["']/g,'').trim();
      if (!name || name.toLowerCase() === 'name') continue; // skip header
      if (addStudent(name)) added++; else skipped++;
    }
    saveData();
    showToast(`📂 Imported: ${added} added, ${skipped} skipped.`);
    renderStudentTable();
  };
  reader.readAsText(file);
}

/** Export students list as CSV */
function exportStudentsCSV() {
  const allKeys = Object.keys(appData.attendance);
  const rows = [['ID','Name','TotalDays','AttendancePct']];
  appData.students.forEach(s => {
    const { total, pct } = calcStats(s.id, allKeys);
    rows.push([s.id, s.name, total, pct !== null ? pct+'%' : '—']);
  });
  downloadCSV('students.csv', rows);
}

/** Export daily attendance as CSV */
function exportDailyCSV(y, m, d) {
  const key = dateKey(y, m, d);
  const rec = getDateRecord(key);
  const rows = [['Student Name','Status']];
  appData.students.forEach(s => {
    rows.push([s.name, rec[String(s.id)] || '—']);
  });
  downloadCSV(`attendance_${key}.csv`, rows);
}

/** Export monthly attendance CSV */
function exportMonthlyCSV(y, m) {
  const keys = getDateKeys(y, parseInt(m)).sort();
  if (!keys.length) { showToast('⚠ No data for selected month.'); return; }
  const header = ['Student Name', ...keys.map(k => k.split('-').slice(1).join('-'))];
  const rows   = [header];
  appData.students.forEach(s => {
    const row = [s.name, ...keys.map(k => getDateRecord(k)[String(s.id)] || '—')];
    rows.push(row);
  });
  downloadCSV(`attendance_${y}_${String(m).padStart(2,'0')}.csv`, rows);
}

/** Export yearly summary CSV */
function exportYearlyCSV(y) {
  const keys = getDateKeys(y).sort();
  if (!keys.length) { showToast('⚠ No data for selected year.'); return; }
  const rows = [['Student Name','Present','Absent','Late','Excused','TotalDays','Attendance%']];
  appData.students.forEach(s => {
    const st = calcStats(s.id, keys);
    rows.push([s.name, st.P, st.A, st.L, st.E, st.total, st.pct !== null ? st.pct+'%' : '—']);
  });
  downloadCSV(`attendance_yearly_${y}.csv`, rows);
}

/** Export all attendance data as CSV */
function exportAllCSV() {
  const allKeys = Object.keys(appData.attendance).sort();
  const header = ['Date', 'Student Name', 'Status'];
  const rows   = [header];
  for (const k of allKeys) {
    const rec = getDateRecord(k);
    appData.students.forEach(s => {
      rows.push([k, s.name, rec[String(s.id)] || '—']);
    });
  }
  downloadCSV('attendance_all.csv', rows);
}

/** Generic CSV downloader */
function downloadCSV(filename, rows) {
  const content = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`⬇ Downloaded ${filename}`);
}

/* ===================== BACKUP / RESTORE ===================== */

function backupJSON() {
  const json = JSON.stringify(appData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `edutrack_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('⬇ Backup downloaded.');
}

function restoreJSON(file) {
  if (!file) return;
  if (!confirm('Restoring will overwrite ALL current data. Continue?')) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.students || !parsed.attendance) throw new Error('Invalid format');
      appData = parsed;
      saveData();
      showToast('✅ Data restored successfully!');
      // Re-render current section
      const active = document.querySelector('.section.active');
      if (active) {
        const id = active.id.replace('section-','');
        navigateTo(id);
      }
    } catch(err) {
      showToast('❌ Invalid backup file.');
    }
  };
  reader.readAsText(file);
}

/* ===================== CLEAR ALL DATA ===================== */
function clearAllData() {
  if (!confirm('⚠ This will permanently delete ALL students and attendance data. Are you sure?')) return;
  if (!confirm('Last chance — this cannot be undone. Proceed?')) return;
  appData = { students: [], attendance: {} };
  saveData();
  showToast('🗑 All data cleared.');
  renderDashboard();
  renderStudentTable();
  renderAttendanceTable();
}

/* ===================== DARK MODE ===================== */
function initTheme() {
  const saved = localStorage.getItem('edutrack_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeButton(saved);
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('edutrack_theme', next);
  updateThemeButton(next);
  // Redraw charts for color refresh
  const active = document.querySelector('.section.active');
  if (active) navigateTo(active.id.replace('section-',''));
}
function updateThemeButton(theme) {
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀ Light Mode' : '🌙 Dark Mode';
}

/* ===================== UTILITY ===================== */
/** HTML-escape a string */
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ===================== INIT ===================== */
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initTheme();

  // Populate current date defaults
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;
  const cd = now.getDate();

  // All year selects
  ['dash-year','att-year','ana-year','rep-year-d','rep-year-m','rep-year-y'].forEach(id => populateYears(id, cy));
  // All month selects
  ['dash-month','att-month','rep-month-d','rep-month-m'].forEach(id => populateMonths(id, false, cm));
  populateMonths('ana-month', true, cm);
  // All day selects
  ['dash-day','att-day','rep-day-d'].forEach(id => populateDays(id, cd));

  // Display today's date in topbar
  document.getElementById('topbarDate').textContent =
    now.toLocaleDateString('en-US', { weekday:'short', year:'numeric', month:'short', day:'numeric' });

  // Initial render
  renderDashboard();
  renderStudentTable();

  /* --- Navigation --- */
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(item.dataset.section);
      // Close sidebar on mobile after nav
      if (window.innerWidth <= 768)
        document.getElementById('sidebar').classList.remove('open');
    });
  });

  /* --- Sidebar toggle (mobile) --- */
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  /* --- Theme toggle --- */
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  /* --- Dashboard load btn --- */
  document.getElementById('dashLoadBtn').addEventListener('click', renderDashboard);

  /* --- Attendance section --- */
  document.getElementById('attLoadBtn').addEventListener('click', () => renderAttendanceTable());
  document.getElementById('attSearch').addEventListener('input', e => renderAttendanceTable(e.target.value));
  document.getElementById('saveDayBtn').addEventListener('click', () => {
    saveData(); showToast('💾 Attendance saved!');
  });
  document.getElementById('resetDayBtn').addEventListener('click', () => {
    const y = document.getElementById('att-year').value;
    const m = document.getElementById('att-month').value;
    const d = document.getElementById('att-day').value;
    if (!confirm('Reset all attendance for this date?')) return;
    const key = dateKey(y, m, d);
    appData.attendance[key] = {};
    saveData();
    renderAttendanceTable();
    showToast('🔄 Attendance reset for this date.');
  });

  // Bulk "mark all" buttons
  document.querySelectorAll('[data-status]').forEach(btn => {
    btn.addEventListener('click', () => {
      const status = btn.dataset.status;
      const y = document.getElementById('att-year').value;
      const m = document.getElementById('att-month').value;
      const d = document.getElementById('att-day').value;
      const key = dateKey(y, m, d);
      if (!appData.attendance[key]) appData.attendance[key] = {};
      appData.students.forEach(s => {
        appData.attendance[key][String(s.id)] = status;
      });
      saveData();
      renderAttendanceTable();
      showToast(`✅ All marked as ${status}.`);
    });
  });

  /* --- Student section --- */
  document.getElementById('addStudentBtn').addEventListener('click', () => {
    const input = document.getElementById('newStudentName');
    if (addStudent(input.value)) {
      input.value = '';
      renderStudentTable();
    }
  });
  document.getElementById('newStudentName').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('addStudentBtn').click();
  });
  document.getElementById('studentSearch').addEventListener('input', e =>
    renderStudentTable(e.target.value)
  );
  document.getElementById('importCSVBtn').addEventListener('click', () =>
    document.getElementById('csvInput').click()
  );
  document.getElementById('csvInput').addEventListener('change', e => {
    importStudentsCSV(e.target.files[0]);
    e.target.value = '';
  });
  document.getElementById('exportStudentsBtn').addEventListener('click', exportStudentsCSV);

  /* --- Edit modal --- */
  document.getElementById('editModalClose').addEventListener('click',  closeEditModal);
  document.getElementById('editModalCancel').addEventListener('click', closeEditModal);
  document.getElementById('editModalSave').addEventListener('click',   saveEditStudent);
  document.getElementById('editStudentName').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveEditStudent();
  });
  document.getElementById('editModal').addEventListener('click', e => {
    if (e.target === document.getElementById('editModal')) closeEditModal();
  });

  /* --- Analytics --- */
  document.getElementById('anaFilterBtn').addEventListener('click', renderAnaTable);

  /* --- Reports --- */
  document.getElementById('exportDailyBtn').addEventListener('click', () => {
    exportDailyCSV(
      document.getElementById('rep-year-d').value,
      document.getElementById('rep-month-d').value,
      document.getElementById('rep-day-d').value
    );
  });
  document.getElementById('exportMonthlyBtn').addEventListener('click', () => {
    exportMonthlyCSV(
      document.getElementById('rep-year-m').value,
      document.getElementById('rep-month-m').value
    );
  });
  document.getElementById('exportYearlyBtn').addEventListener('click', () => {
    exportYearlyCSV(document.getElementById('rep-year-y').value);
  });
  document.getElementById('exportAllBtn').addEventListener('click', exportAllCSV);
  document.getElementById('printBtn').addEventListener('click', () => {
    navigateTo('analytics');
    setTimeout(() => window.print(), 300);
  });
  document.getElementById('clearAllBtn').addEventListener('click', clearAllData);

  /* --- Backup / Restore --- */
  document.getElementById('backupBtn').addEventListener('click', backupJSON);
  document.getElementById('restoreBtn').addEventListener('click', () =>
    document.getElementById('restoreInput').click()
  );
  document.getElementById('restoreInput').addEventListener('change', e => {
    restoreJSON(e.target.files[0]);
    e.target.value = '';
  });

  /* --- Demo data (seed if empty) --- */
  if (!appData.students.length) seedDemoData();
});

/* ===================== DEMO SEED ===================== */
/**
 * Seed sample data so first-time users see a working dashboard.
 * Remove this function if you prefer a blank start.
 */
function seedDemoData() {
  const names = [
    'Alice Johnson','Bob Martinez','Carol White','David Lee',
    'Emma Brown','Frank Davis','Grace Wilson','Henry Taylor',
    'Isabella Anderson','James Thomas'
  ];
  names.forEach(n => { appData.students.push({ id: nextId(), name: n }); });

  const y = 2026;
  const statuses = ['Present','Absent','Late','Excused'];
  const weights  = [0.70, 0.15, 0.10, 0.05]; // cumulative

  // Seed Jan–May 2026, weekdays only
  for (let m = 1; m <= 5; m++) {
    const daysInMonth = new Date(y, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(y, m-1, d).getDay();
      if (dow === 0 || dow === 6) continue; // skip weekends
      const key = dateKey(y, m, d);
      appData.attendance[key] = {};
      appData.students.forEach(s => {
        const r = Math.random();
        let st = 'Present';
        let cum = 0;
        for (let i = 0; i < statuses.length; i++) {
          cum += weights[i];
          if (r <= cum) { st = statuses[i]; break; }
        }
        // Force one student to have low attendance for warning demo
        if (s.name === 'Henry Taylor' && Math.random() > 0.4) st = 'Absent';
        appData.attendance[key][String(s.id)] = st;
      });
    }
  }
  saveData();
  renderDashboard();
  renderStudentTable();
}
