// =============================================================
// ПРІОРИТЕТИ ПРЕДМЕТІВ
// =============================================================
const subjectPriorities = {
    'алгебр': 1, 'геометр': 1, 'матем': 1,
    'фізик': 1, 'хімі': 1,
    'англійськ': 1, 'нім': 1, 'іноземн': 1,
    'укр. мов': 1, 'мов': 1,

    'літ': 2, 'історі': 2, 'біолог': 2, 'географ': 2,
    'право': 2, 'громад': 2, 'етик': 2, 'захист': 2,
    'природ': 2, 'інформ': 2, 'stem': 2, 'стеm': 2,

    'фізкульт': 3, 'фізичн': 3,
    'технолог': 3, 'трудов': 3,
    'мистец': 3, 'музик': 3, 'малюв': 3,
    'добробут': 3, 'основ': 3, 'фінанс': 3
};

function getRoomType(subject) {
    if (!subject) return null;
    const n = subject.toLowerCase();
    if (n.includes('інформ')) return 'computer';
    if (n.includes('фізкульт') || n.includes('фізична культ')) return 'gym';
    if (n.includes('хімі')) return 'chemistry';
    if (n.includes('фізик') && !n.includes('фізкульт') && !n.includes('фізична культ')) return 'physics';
    return null;
}

function isLaborSubject(subject) {
    if (!subject) return false;
    const n = subject.toLowerCase();
    return n.includes('труд') || n.includes('технол');
}

// =============================================================
// СТАН
// =============================================================
let state = {
    activeTab: 'teachers',
    teachers: [],
    classes: [],
    workload: [],
    schedule: [],
    config: {
        maxLessons: 8,
        days: ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця"]
    }
};

function init() {
    try {
        const saved = localStorage.getItem('school_schedule_data');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') {
                state = { ...state, ...parsed };
                if (!state.schedule) state.schedule = [];
            }
        }
    } catch (e) { console.error(e); }
    renderAll();
}

function saveData() { localStorage.setItem('school_schedule_data', JSON.stringify(state)); }
function save() { saveData(); }

// =============================================================
// НАВІГАЦІЯ
// =============================================================
function showTab(tabName) {
    state.activeTab = tabName;
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    const s = document.getElementById(`tab-${tabName}`);
    if (s) s.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.id === `btn-${tabName}`) btn.classList.add('active');
    });
    saveData(); renderAll();
}

function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schedule_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = e => {
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const imp = JSON.parse(ev.target.result);
                if (imp.teachers && imp.classes) {
                    if (confirm('Замінити поточні дані?')) { state = imp; save(); renderAll(); alert('Імпортовано!'); }
                } else alert('Невірна структура файлу.');
            } catch (err) { alert('Помилка: ' + err.message); }
        };
        reader.readAsText(e.target.files[0]);
    };
    input.click();
}

// =============================================================
// ВЧИТЕЛІ
// =============================================================
function addTeacher() {
    const inp = document.getElementById('teacher-name');
    const name = inp.value.trim();
    if (!name) return;
    state.teachers.push({
        id: 't_' + Date.now(), name,
        availability: Array(5).fill(null).map(() => Array(state.config.maxLessons).fill(0)),
        workload: []
    });
    inp.value = ''; save(); renderAll();
}
function deleteTeacher(id) { state.teachers = state.teachers.filter(t => t.id !== id); save(); renderAll(); }

// =============================================================
// КЛАСИ
// =============================================================
function addClass() {
    const inp = document.getElementById('class-name');
    const name = inp.value.trim();
    if (!name) return;
    state.classes.push({ id: 'c_' + Date.now(), name });
    inp.value = ''; save(); renderAll();
}
function deleteClass(id) { state.classes = state.classes.filter(c => c.id !== id); save(); renderAll(); }

// =============================================================
// ДОСТУПНІСТЬ
// =============================================================
let currentEditingTeacherId = null;

function openAvailability(id) {
    currentEditingTeacherId = id;
    const teacher = state.teachers.find(t => t.id === id);
    if (!teacher) return;
    if (!teacher.availability)
        teacher.availability = Array(5).fill(null).map(() => Array(state.config.maxLessons).fill(0));
    else
        teacher.availability = teacher.availability.map(da =>
            (da || []).map(v => v === true ? 0 : v === false ? 2 : (v || 0))
        );
    document.getElementById('modal-teacher-name').innerText = `Доступність: ${teacher.name}`;
    renderAvailabilityGrid(teacher);
    document.getElementById('modal-availability').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-availability').classList.add('hidden');
    currentEditingTeacherId = null; save();
}

function renderAvailabilityGrid(teacher) {
    const container = document.getElementById('availability-grid');
    const days = state.config.days;
    let html = `<table class="w-full border-collapse text-sm"><thead><tr><th class="p-1 text-center text-gray-500">Урок</th>`;
    days.forEach(d => html += `<th class="border p-2 bg-gray-100 font-bold text-center">${d}</th>`);
    html += `</tr></thead><tbody>`;
    for (let l = 0; l <= 7; l++) {
        html += `<tr><td class="border p-2 font-bold bg-gray-50 text-center">${l}</td>`;
        for (let d = 0; d < 5; d++) {
            let status = (teacher.availability[d] || [])[l];
            if (status === true) status = 0;
            else if (status === false) status = 2;
            else status = status || 0;
            const [cc, st, ic] = status === 0
                ? ['bg-green-100 text-green-800 hover:bg-green-200', 'Вільний', '✓']
                : status === 1
                ? ['bg-yellow-100 text-yellow-800 hover:bg-yellow-200', 'Небажано', '⚠']
                : ['bg-red-100 text-red-800 hover:bg-red-200', 'НЕ МОЖНА', '✕'];
            html += `<td onclick="toggleAvailability(${d},${l})" class="border p-2 cursor-pointer text-center font-medium transition select-none ${cc}">
                <div class="text-lg leading-none">${ic}</div><div class="text-[9px] mt-0.5">${st}</div></td>`;
        }
        html += `</tr>`;
    }
    html += `</tbody></table>`;
    container.innerHTML = html;
}

function toggleAvailability(d, l) {
    const teacher = state.teachers.find(t => t.id === currentEditingTeacherId);
    if (!teacher) return;
    if (!teacher.availability[d]) teacher.availability[d] = [];
    let cur = teacher.availability[d][l];
    if (cur === true) cur = 0; else if (cur === false) cur = 2; else cur = cur || 0;
    teacher.availability[d][l] = (cur + 1) % 3;
    renderAvailabilityGrid(teacher);
}

// =============================================================
// ДОПОМІЖНІ ФУНКЦІЇ
// =============================================================
function getTeacherStatus(teacherId, day, slot) {
    const t = state.teachers.find(t => t.id === teacherId);
    if (!t || !t.availability || !t.availability[day]) return 0;
    const v = t.availability[day][slot];
    if (v === true) return 0; if (v === false) return 2;
    return v || 0;
}

function getPriority(subjectName) {
    if (!subjectName) return 100;
    const n = subjectName.toLowerCase();
    for (const [key, level] of Object.entries(subjectPriorities))
        if (n.includes(key)) return level;
    return 10;
}

function getSubjectCode(subject) {
    if (!subject) return "";
    const words = subject.trim().split(/\s+/);
    return words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : subject.substring(0, 2).toUpperCase();
}

// =============================================================
// ЛОАДЕР
// =============================================================
function showLoader() {
    let el = document.getElementById('gen-loader');
    if (!el) {
        el = document.createElement('div');
        el.id = 'gen-loader';
        el.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        el.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl p-8 w-[420px] space-y-4">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <h2 class="text-lg font-bold text-slate-800">CSP Генерація розкладу...</h2>
            </div>
            <div class="text-xs text-slate-500 italic" id="loader-phase">Підготовка задач...</div>
            <div class="space-y-2 text-sm text-slate-600">
                <div class="flex justify-between"><span>Час:</span><span id="loader-time" class="font-bold text-blue-700">0с</span></div>
                <div class="flex justify-between"><span>Розміщено:</span><span id="loader-placed" class="font-bold text-green-700">0</span></div>
                <div class="flex justify-between"><span>Backtrack кроків:</span><span id="loader-bt" class="font-bold text-orange-600">0</span></div>
                <div class="flex justify-between"><span>Поточна задача:</span><span id="loader-cur" class="font-bold text-slate-700 text-xs max-w-[200px] truncate">—</span></div>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div id="loader-bar" class="h-3 bg-blue-500 rounded-full transition-all duration-300" style="width:0%"></div>
            </div>
            <button onclick="stopGenerator()" class="w-full py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition text-sm">
                ⏹ Зупинити та зберегти найкращий результат
            </button>
        </div>`;
        document.body.appendChild(el);
    }
    el.style.display = 'flex';
}

function updateLoader(ms, placed, total, btSteps, phase, curTask) {
    const g = id => document.getElementById(id);
    if (g('loader-time')) g('loader-time').textContent = (ms / 1000).toFixed(1) + 'с';
    if (g('loader-placed')) g('loader-placed').textContent = `${placed} / ${total}`;
    if (g('loader-bt')) g('loader-bt').textContent = btSteps;
    if (g('loader-phase')) g('loader-phase').textContent = phase || '';
    if (g('loader-cur')) g('loader-cur').textContent = curTask || '—';
    if (g('loader-bar')) g('loader-bar').style.width = total > 0 ? `${Math.round(placed / total * 100)}%` : '0%';
}

function hideLoader() {
    const el = document.getElementById('gen-loader');
    if (el) el.style.display = 'none';
}

// =============================================================
// ПІДГОТОВКА ЗАДАЧ (спільна для всіх алгоритмів)
// =============================================================
function buildTasks() {
    const flatWorkload = [];
    state.workload.forEach(item => {
        const h = parseFloat(item.hours);
        const whole = Math.floor(h);
        const frac = Math.round((h - whole) * 10) / 10;
        for (let i = 0; i < whole; i++)
            flatWorkload.push({ ...item, currentHours: 1, used: false });
        if (Math.abs(frac - 0.5) < 0.01)
            flatWorkload.push({ ...item, currentHours: 0.5, used: false });
    });

    const tasks = [];
    const unpairedAlternating = [];
    const classesIds = [...new Set(state.classes.map(c => c.id))];

    // Спаровування чергувань
    classesIds.forEach(cId => {
        // Крок 1: пари одного вчителя
        const teacherIds = [...new Set(
            flatWorkload.filter(w => w.classId === cId && w.currentHours === 0.5 && w.splitType === 'alternating' && !w.used)
                .map(w => w.teacherId)
        )];
        teacherIds.forEach(tId => {
            const alts = flatWorkload.filter(w => w.classId === cId && w.teacherId === tId && w.currentHours === 0.5 && w.splitType === 'alternating' && !w.used);
            while (alts.length >= 2) {
                const [i1, i2] = [alts.shift(), alts.shift()];
                i1.used = i2.used = true;
                tasks.push({ type: 'paired_internal', items: [i1, i2], priority: Math.min(getPriority(i1.subject), getPriority(i2.subject)), classId: cId });
            }
        });
        // Крок 2: пари різних вчителів
        let rem = flatWorkload.filter(w => w.classId === cId && w.currentHours === 0.5 && w.splitType === 'alternating' && !w.used);
        while (rem.length >= 2) {
            const i1 = rem.shift();
            const i2 = rem.find(w => w.teacherId !== i1.teacherId);
            if (!i2) break;
            rem.splice(rem.indexOf(i2), 1);
            i1.used = i2.used = true;
            tasks.push({ type: 'paired_external', items: [i1, i2], priority: Math.min(getPriority(i1.subject), getPriority(i2.subject)), classId: cId });
        }
        // Крок 3: непарні — тільки нотифікація
        flatWorkload.filter(w => w.classId === cId && w.currentHours === 0.5 && w.splitType === 'alternating' && !w.used)
            .forEach(item => {
                item.used = true;
                const tObj = state.teachers.find(t => t.id === item.teacherId);
                const cObj = state.classes.find(c => c.id === item.classId);
                unpairedAlternating.push({ subject: item.subject, teacher: tObj?.name || '?', className: cObj?.name || '?', teacherId: item.teacherId, classId: item.classId });
            });
    });

    // Одиночні задачі
    flatWorkload.filter(w => !w.used).forEach(item => {
        item.used = true;
        tasks.push({ type: 'single', items: [item], priority: getPriority(item.subject), classId: item.classId });
    });

    // Overflow (> 35 слотів на клас)
    const overflowTasks = [];
    const slotsByClass = {};
    classesIds.forEach(cId => slotsByClass[cId] = 0);
    tasks.forEach(t => { if (slotsByClass[t.classId] !== undefined) slotsByClass[t.classId]++; });

    classesIds.forEach(cId => {
        let excess = (slotsByClass[cId] || 0) - 35;
        if (excess <= 0) return;
        const candidates = tasks.filter(t => t.classId === cId && t.priority > 1)
            .sort((a, b) => b.priority - a.priority || (a.type !== 'single' ? 1 : -1));
        for (const cand of candidates) {
            if (excess <= 0) break;
            if (cand.type !== 'single' && !cand.items.every(it => getPriority(it.subject) > 1)) continue;
            const idx = tasks.indexOf(cand);
            if (idx !== -1) {
                tasks.splice(idx, 1);
                const cls = state.classes.find(c => c.id === cId);
                overflowTasks.push({ subject: cand.items.map(it => it.subject).join(' / '), teacher: cand.items.map(it => state.teachers.find(tt => tt.id === it.teacherId)?.name || '?').join(' / '), className: cls?.name || '?', priority: cand.priority, type: cand.type });
                excess--;
            }
        }
    });

    return { tasks, unpairedAlternating, overflowTasks };
}

// =============================================================
// ПЕРЕВІРКА FEASIBILITY перед запуском
// Повертає список причин якщо рішення математично неможливе
// =============================================================
function checkFeasibility(tasks) {
    const issues = [];

    // 1. Перевірка: у вчителя є задачі, але недостатньо вільних слотів
    const teacherSlotNeeded = {};
    tasks.forEach(task => {
        task.items.forEach(it => {
            teacherSlotNeeded[it.teacherId] = (teacherSlotNeeded[it.teacherId] || 0) + 1;
        });
    });
    Object.entries(teacherSlotNeeded).forEach(([tid, needed]) => {
        let available = 0;
        for (let d = 0; d < 5; d++)
            for (let s = 1; s <= 7; s++)
                if (getTeacherStatus(tid, d, s) !== 2) available++;
        if (needed > available) {
            const tname = state.teachers.find(t => t.id === tid)?.name || tid;
            issues.push(`👨‍🏫 <b>${tname}</b>: потрібно ${needed} слотів, але вільних лише ${available} (не враховуючи конфлікти з іншими класами)`);
        }
    });

    // 2. Перевірка: клас має > 7*5 = 35 уроків після overflow
    const classSlotsNeeded = {};
    tasks.forEach(t => { classSlotsNeeded[t.classId] = (classSlotsNeeded[t.classId] || 0) + 1; });
    Object.entries(classSlotsNeeded).forEach(([cid, needed]) => {
        if (needed > 35) {
            const cname = state.classes.find(c => c.id === cid)?.name || cid;
            issues.push(`🏫 Клас <b>${cname}</b>: ${needed} уроків > 35 (максимум 7 уроків × 5 днів). Зменшіть навантаження або воно потрапить в overflow.`);
        }
    });

    // 3. Перевірка: вчитель з 2 робочими днями і > 14 уроків
    const teacherByDayCount = {};
    tasks.forEach(task => {
        task.items.forEach(it => {
            teacherByDayCount[it.teacherId] = (teacherByDayCount[it.teacherId] || 0) + 1;
        });
    });
    Object.entries(teacherByDayCount).forEach(([tid, needed]) => {
        let freeDays = 0;
        for (let d = 0; d < 5; d++)
            if (Array.from({length: 7}, (_, s) => getTeacherStatus(tid, d, s+1)).some(v => v !== 2)) freeDays++;
        const maxPossible = freeDays * 7;
        if (needed > maxPossible) {
            const tname = state.teachers.find(t => t.id === tid)?.name || tid;
            issues.push(`📅 <b>${tname}</b>: ${needed} уроків, але лише ${freeDays} вільних днів (макс. ${maxPossible} слотів). Зменшіть навантаження або додайте вільних днів.`);
        }
    });

    return issues;
}

// =============================================================
// ============================================================
// CSP BACKTRACKING SCHEDULER
// ============================================================
// Архітектура:
//   1. buildTasks() → список задач
//   2. checkFeasibility() → якщо математично неможливо, стоп
//   3. computeDomain(task, schedule) → всі валідні (день, слот) для задачі
//   4. MRV: сортуємо задачі за розміром домену (найменший домен = перший)
//   5. backtrack(taskIdx, schedule) → рекурсивно розміщуємо задачі
//      - при провалі: відмотуємо і пробуємо наступний слот
//   6. Оцінка слоту: score(day, slot, task, schedule) → менше = краще
//      використовується для впорядкування кандидатів у домені
// =============================================================

let _generatorRunning = false;
let _generatorStop = false;
let _btSteps = 0;
let _startTime = 0;
let _totalTasks = 0;

async function generateSchedule() {
    if (_generatorRunning) { _generatorStop = true; return; }
    _generatorRunning = true;
    _generatorStop = false;
    _btSteps = 0;
    _startTime = Date.now();

    showLoader();
    updateLoader(0, 0, 1, 0, 'Підготовка задач...', '');
    await tick();

    // Зберігаємо ручні уроки
    const manualLessons = state.schedule.filter(s => s.slot === 0 || s.slot === 8 || s.isManual);

    // Будуємо задачі
    const { tasks, unpairedAlternating, overflowTasks } = buildTasks();
    _totalTasks = tasks.length;

    // Перевірка математичної можливості
    updateLoader(Date.now() - _startTime, 0, _totalTasks, 0, 'Перевірка математичної можливості...', '');
    await tick();
    const feasibilityIssues = checkFeasibility(tasks);
    if (feasibilityIssues.length > 0) {
        _generatorRunning = false;
        hideLoader();
        showFeasibilityError(feasibilityIssues);
        return;
    }

    // Сортуємо задачі за "дефіцитом" (MRV pre-sort):
    // Задачі вчителів з найменшою кількістю вільних слотів ідуть першими
    tasks.sort((a, b) => {
        const aFree = Math.min(...a.items.map(it => countFreeSlots(it.teacherId)));
        const bFree = Math.min(...b.items.map(it => countFreeSlots(it.teacherId)));
        if (aFree !== bFree) return aFree - bFree;
        // Серед рівних: вищий пріоритет предмету першим
        return a.priority - b.priority;
    });

    updateLoader(Date.now() - _startTime, 0, _totalTasks, 0, 'Запуск CSP backtracking...', '');
    await tick();

    // Запускаємо backtracking
    const schedule = [...manualLessons];
    const result = await cspBacktrack(tasks, schedule, 0);

    _generatorRunning = false;
    hideLoader();

    if (result === 'stopped') {
        // Зупинено вручну — зберігаємо що є
        state.schedule = schedule;
    } else if (result === true) {
        state.schedule = schedule;
    } else {
        // Не знайдено рішення — але зберігаємо часткове
        state.schedule = schedule;
    }

    saveData();
    renderSchedule();

    const duration = ((Date.now() - _startTime) / 1000).toFixed(1);
    // Підраховуємо нерозміщені
    const placedSubjects = new Set(schedule.filter(s => !s.isManual && s.slot >= 1 && s.slot <= 7).map(s => s.id));
    const unplacedCount = _totalTasks - (schedule.filter(s => !s.isManual && s.slot >= 1 && s.slot <= 7).length);
    showGenerationReport(result, unpairedAlternating, overflowTasks, _btSteps, duration, tasks, schedule);
}

function stopGenerator() { _generatorStop = true; }

function countFreeSlots(teacherId) {
    let c = 0;
    for (let d = 0; d < 5; d++)
        for (let s = 1; s <= 7; s++)
            if (getTeacherStatus(teacherId, d, s) !== 2) c++;
    return c;
}

async function tick() { await new Promise(r => setTimeout(r, 0)); }

// =============================================================
// CSP BACKTRACKING (async для оновлення UI)
// =============================================================
async function cspBacktrack(tasks, schedule, depth) {
    if (_generatorStop) return 'stopped';

    // Оновлюємо UI кожні 200 backtrack-кроків
    if (_btSteps % 200 === 0) {
        updateLoader(
            Date.now() - _startTime,
            depth,
            _totalTasks,
            _btSteps,
            `Розміщую задачу ${depth + 1} з ${_totalTasks}...`,
            depth < tasks.length ? taskLabel(tasks[depth]) : '✅'
        );
        await tick();
    }

    // Всі задачі розміщено — SUCCESS
    if (depth === tasks.length) return true;

    // Вибираємо наступну задачу з MRV (мінімальний домен)
    // tasks вже пре-відсортовані, але після depth робимо локальний MRV
    const remaining = tasks.slice(depth);
    let bestIdx = 0;
    let bestDomainSize = Infinity;
    for (let i = 0; i < remaining.length; i++) {
        const dom = computeDomain(remaining[i], schedule);
        if (dom.length < bestDomainSize) {
            bestDomainSize = dom.length;
            bestIdx = i;
        }
        // Якщо домен 0 — одразу повертаємо провал
        if (dom.length === 0) {
            _btSteps++;
            return false;
        }
    }

    // Переставляємо вибрану задачу на позицію depth
    if (bestIdx !== 0) {
        [tasks[depth], tasks[depth + bestIdx]] = [tasks[depth + bestIdx], tasks[depth]];
    }

    const task = tasks[depth];
    const domain = computeDomain(task, schedule);

    // Сортуємо домен за якістю (LCV + score)
    domain.sort((a, b) => scoreSlot(task, a.d, a.s, schedule) - scoreSlot(task, b.d, b.s, schedule));

    for (const { d, s } of domain) {
        if (_generatorStop) return 'stopped';

        // Розміщуємо задачу
        const placed = placeTask(task, d, s, schedule);

        _btSteps++;

        // Forward checking: перевіряємо чи не обнулились домени сусідніх задач
        // (перевіряємо лише задачі що стосуються тих самих вчителів/класів)
        let forwardOk = true;
        if (depth + 1 < tasks.length) {
            // Перевіряємо наступні 10 задач (не всі, для швидкості)
            const lookAhead = Math.min(tasks.length, depth + 11);
            for (let i = depth + 1; i < lookAhead; i++) {
                const nextTask = tasks[i];
                // Перевіряємо лише якщо є перетин по вчителю або класу
                const hasConflict = nextTask.items.some(it =>
                    task.items.some(jt => jt.teacherId === it.teacherId || jt.classId === it.classId)
                );
                if (hasConflict) {
                    const dom = computeDomain(nextTask, schedule);
                    if (dom.length === 0) { forwardOk = false; break; }
                }
            }
        }

        if (forwardOk) {
            const result = await cspBacktrack(tasks, schedule, depth + 1);
            if (result === true || result === 'stopped') return result;
        }

        // Backtrack: прибираємо розміщення
        removePlaced(placed, schedule);
    }

    // Жоден варіант не підійшов
    _btSteps++;
    return false;
}

// Розмістити задачу в schedule і повернути placed IDs для backtrack
function placeTask(task, d, s, schedule) {
    const placed = [];
    task.items.forEach(it => {
        const entry = {
            id: 'sch_' + Date.now() + Math.random(),
            teacherId: it.teacherId,
            classId: it.classId,
            subject: it.subject,
            day: d,
            slot: s,
            isAlternating: (it.currentHours === 0.5 && it.splitType === 'alternating'),
            pairType: task.type
        };
        schedule.push(entry);
        placed.push(entry.id);
    });
    return placed;
}

function removePlaced(placedIds, schedule) {
    for (let i = schedule.length - 1; i >= 0; i--)
        if (placedIds.includes(schedule[i].id)) schedule.splice(i, 1);
}

// =============================================================
// ОБЧИСЛЕННЯ ДОМЕНУ ЗАДАЧІ
// Повертає список { d, s } які є валідними для цієї задачі
// =============================================================
function computeDomain(task, schedule) {
    const domain = [];
    const first = task.items[0];
    const priority = task.priority;

    for (let d = 0; d < 5; d++) {
        for (let s = 1; s <= 7; s++) {
            if (isValidPlacement(task, first, priority, d, s, schedule))
                domain.push({ d, s });
        }
    }
    return domain;
}

function isValidPlacement(task, first, priority, d, s, schedule) {
    // 1. Клас вже зайнятий у цей слот
    if (schedule.some(ls => ls.day === d && ls.slot === s && ls.classId === first.classId)) return false;

    // 2. Будь-який вчитель задачі вже зайнятий
    if (task.items.some(it => schedule.some(ls => ls.day === d && ls.slot === s && ls.teacherId === it.teacherId))) return false;

    // 3. Червона зона
    if (task.items.some(it => getTeacherStatus(it.teacherId, d, s) === 2)) return false;

    // 4. NO-GAP: перший урок класу в цей день має бути на слоті 1,
    //    кожен наступний — рівно +1 від попереднього
    const classSlots = schedule
        .filter(ls => ls.day === d && ls.classId === first.classId && ls.slot >= 1 && ls.slot <= 7)
        .map(ls => ls.slot).sort((a, b) => a - b);
    if (classSlots.length === 0) {
        if (s !== 1) return false;
    } else {
        if (s !== Math.max(...classSlots) + 1) return false;
    }

    // 5. Предмет пріоритету 1 — max 1 раз на день (крім примусових пар)
    if (priority === 1) {
        const existing = schedule.filter(ls => ls.day === d && ls.classId === first.classId && ls.subject === first.subject);
        if (existing.length > 0) {
            // Дозволяємо лише якщо уроків більше ніж вільних днів вчителя
            const freeDays = countFreeDays(first.teacherId);
            const totalNeeded = state.workload
                .filter(w => w.classId === first.classId && w.subject === first.subject)
                .reduce((sum, w) => sum + Math.ceil(parseFloat(w.hours)), 0);
            if (totalNeeded <= freeDays) return false;
            // Дозволяємо пару тільки підряд
            if (!existing.some(ls => Math.abs(ls.slot - s) === 1)) return false;
        }
    }

    // 6. Один тип спеціального кабінету (gym/computer) — один клас в слот
    const roomType = getRoomType(first.subject);
    if (roomType === 'gym' || roomType === 'computer') {
        if (schedule.some(ls => ls.day === d && ls.slot === s && ls.classId !== first.classId && getRoomType(ls.subject) === roomType))
            return false;
    }

    // 7. Фізкультура одного класу — max 1 раз на день
    if (roomType === 'gym') {
        if (schedule.some(ls => ls.day === d && ls.classId === first.classId && getRoomType(ls.subject) === 'gym'))
            return false;
    }

    // 8. Труд/технологія — кабінет один
    if (isLaborSubject(first.subject)) {
        if (schedule.some(ls => ls.day === d && ls.slot === s && ls.classId !== first.classId && isLaborSubject(ls.subject)))
            return false;
    }

    // 9. Хімія/Фізика — soft room (перевіряємо як hard якщо 100000 штраф)
    if (roomType === 'chemistry' || roomType === 'physics') {
        if (schedule.some(ls => ls.day === d && ls.slot === s && ls.classId !== first.classId && getRoomType(ls.subject) === roomType))
            return false; // Теж hard — один кабінет фізики/хімії
    }

    return true;
}

function countFreeDays(teacherId) {
    let c = 0;
    for (let d = 0; d < 5; d++)
        if (Array.from({length: 7}, (_, s) => getTeacherStatus(teacherId, d, s+1)).some(v => v !== 2)) c++;
    return c;
}

// =============================================================
// ОЦІНКА СЛОТУ (менше = краще)
// Використовується для впорядкування кандидатів у домені
// =============================================================
function scoreSlot(task, d, s, schedule) {
    let score = 0;
    const first = task.items[0];
    const priority = task.priority;

    // Жовта зона вчителя
    const maxStatus = task.items.reduce((m, it) => Math.max(m, getTeacherStatus(it.teacherId, d, s)), 0);
    if (maxStatus === 1) score += 1500;

    // Пізні уроки залежно від пріоритету
    if (priority <= 2) {
        if (s === 6) score += 300;
        if (s === 7) score += 800;
    } else {
        // Легкі предмети — краще вкінці (звільняємо початок для важливих)
        score += (7 - s) * 150;
    }

    // Хімія/Фізика — soft room conflict (ще не hard але небажано)
    const roomType = getRoomType(first.subject);
    if (roomType === 'chemistry' || roomType === 'physics') {
        if (schedule.some(ls => ls.day === d && ls.slot === s && ls.classId !== first.classId && getRoomType(ls.subject) === roomType))
            score += 5000;
    }

    // Компактність вчителя (мінімізуємо вікна)
    const teacherToday = schedule.filter(ls => ls.day === d && ls.teacherId === first.teacherId && ls.slot >= 1 && ls.slot <= 7);
    if (teacherToday.length > 0) {
        const dists = teacherToday.map(ls => Math.abs(ls.slot - s));
        const minDist = Math.min(...dists);
        if (minDist === 1) score -= 200;       // Сусід — бонус
        else if (minDist === 2) score += 400;  // Вікно 1 — терпимо
        else score += minDist * 700;           // Більше — погано
    } else {
        // Перший урок вчителя — тягнемо вгору
        score += (s - 1) * 120;
    }

    // Баланс вчителя по днях
    const teacherDayLessons = schedule.filter(ls => ls.day === d && ls.teacherId === first.teacherId && ls.slot >= 1 && ls.slot <= 7).length;
    if (teacherDayLessons >= 6) score += 1500;
    else if (teacherDayLessons >= 5) score += 500;

    // Дублювання предмета в день (для пріоритету 2-3)
    if (priority >= 2) {
        const sameToday = schedule.filter(ls => ls.day === d && ls.classId === first.classId && ls.subject === first.subject).length;
        if (sameToday > 0) {
            const isAdj = schedule.some(ls => ls.day === d && ls.classId === first.classId && ls.subject === first.subject && Math.abs(ls.slot - s) === 1);
            score += isAdj ? 400 : 6000;
        }
    }

    // Труд/технологія — заохочуємо пари
    if (isLaborSubject(first.subject)) {
        const laborToday = schedule.filter(ls => ls.day === d && ls.classId === first.classId && isLaborSubject(ls.subject) && ls.teacherId === first.teacherId);
        if (laborToday.length === 1) {
            score += Math.abs(laborToday[0].slot - s) === 1 ? -400 : 200;
        } else if (laborToday.length > 1) score += 8000;
    }

    // Мікро-рандом для різноманіття між спробами
    score += Math.random() * 15;

    return score;
}

function taskLabel(task) {
    if (!task) return '—';
    const subj = task.items[0].subject;
    const cls = state.classes.find(c => c.id === task.classId)?.name || '?';
    const t = state.teachers.find(t => t.id === task.items[0].teacherId)?.name?.split(' ')[0] || '?';
    return `${subj} / ${cls} кл / ${t}`;
}

// =============================================================
// ЗВІТ ПІСЛЯ ГЕНЕРАЦІЇ
// =============================================================
function showFeasibilityError(issues) {
    const output = document.getElementById('schedule-output');
    const old = document.getElementById('gen-report');
    if (old) old.remove();

    output.insertAdjacentHTML('afterbegin', `
    <div id="gen-report" class="mt-4">
        <div class="p-5 bg-red-50 border-red-600 border-l-4 rounded-xl shadow">
            <h3 class="font-bold text-red-800 text-base mb-3">
                🚫 Математично неможливо скласти розклад
            </h3>
            <p class="text-[12px] text-red-700 mb-3">
                Знайдено <strong>${issues.length}</strong> причин, через які розклад не може бути складений без змін у навантаженні або доступності вчителів:
            </p>
            <ul class="space-y-2">
                ${issues.map(i => `<li class="text-[12px] text-red-800 bg-white border border-red-200 rounded-lg p-3">${i}</li>`).join('')}
            </ul>
            <p class="mt-3 text-[11px] italic text-red-600">
                💡 Усуньте вказані проблеми у вкладках «Вчителі» (доступність) або «Навантаження», після чого запустіть генерацію знову.
            </p>
        </div>
    </div>`);
}

function showGenerationReport(result, unpairedAlternating, overflowTasks, btSteps, time, tasks, schedule) {
    const output = document.getElementById('schedule-output');
    const old = document.getElementById('gen-report');
    if (old) old.remove();

    const placed = schedule.filter(s => !s.isManual && s.slot >= 1 && s.slot <= 7).length;
    // Підраховуємо нерозміщені через tasks які не мають відповідника в schedule
    const placedKeys = new Set(schedule.filter(s => s.slot >= 1 && s.slot <= 7).map(s => `${s.teacherId}_${s.classId}_${s.subject}`));
    // Виходимо з того що result === true = всі розміщено
    const isStopped = result === 'stopped';
    const isSuccess = result === true;
    const unplacedCount = isSuccess ? 0 : (tasks.length - placed);

    let html = `<div id="gen-report" class="mt-4 space-y-3">`;

    html += `
    <div class="p-4 ${isSuccess ? 'bg-green-50 border-green-500' : isStopped ? 'bg-yellow-50 border-yellow-500' : 'bg-orange-50 border-orange-500'} border-l-4 rounded shadow-sm">
        <div class="flex justify-between items-center">
            <h3 class="font-bold ${isSuccess ? 'text-green-800' : isStopped ? 'text-yellow-800' : 'text-orange-800'}">
                ${isSuccess ? '✅ Ідеальний розклад знайдено!' : isStopped ? '⏹ Зупинено вручну' : '⚠️ Рішення не знайдено — збережено часткове'}
            </h3>
            <span class="text-[10px] text-gray-500">Backtrack: ${btSteps} | Час: ${time}с</span>
        </div>
        ${!isSuccess ? `<p class="text-[11px] mt-2 ${isStopped ? 'text-yellow-700' : 'text-orange-700'}">
            Розміщено ${placed} уроків. ${isStopped ? 'Збережено найкращий частковий результат.' : 'CSP не знайшов повного рішення — можливо, навантаження взаємно конфліктує на рівні слотів.'}
        </p>` : ''}
    </div>`;

    if (unpairedAlternating && unpairedAlternating.length > 0) {
        window._unpairedAlternating = unpairedAlternating;
        html += `
        <div class="p-4 bg-purple-50 border-purple-400 border-l-4 rounded shadow-sm">
            <h3 class="font-bold text-purple-800 mb-2">🔔 Непарні чергування (${unpairedAlternating.length})</h3>
            <div class="space-y-3">
                ${unpairedAlternating.map((u, idx) => `
                <div class="bg-white rounded-lg border border-purple-200 p-3 text-[11px]">
                    <div class="font-bold text-slate-700 mb-2">📚 ${u.subject} — <span class="text-blue-600">${u.className}</span> — ${u.teacher}</div>
                    <div class="flex flex-wrap gap-2">
                        <button onclick="addUnpairedToSlot(${idx},0)" class="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-[10px] font-bold hover:bg-purple-700 transition">📋 0-й урок</button>
                        <button onclick="addUnpairedToSlot(${idx},8)" class="px-3 py-1.5 bg-slate-600 text-white rounded-lg text-[10px] font-bold hover:bg-slate-700 transition">📋 8-й урок</button>
                        <button onclick="addUnpairedToSchedule(${idx})" class="px-3 py-1.5 bg-green-600 text-white rounded-lg text-[10px] font-bold hover:bg-green-700 transition">✅ В розклад</button>
                    </div>
                </div>`).join('')}
            </div>
        </div>`;
    }

    if (overflowTasks && overflowTasks.length > 0) {
        const byClass = {};
        overflowTasks.forEach(ot => { if (!byClass[ot.className]) byClass[ot.className] = []; byClass[ot.className].push(ot); });
        html += `
        <div class="p-4 bg-red-50 border-red-500 border-l-4 rounded shadow-sm">
            <h3 class="font-bold text-red-800 mb-1">🚫 Overflow — ${overflowTasks.length} урок(ів) поза розкладом (> 35/тиждень)</h3>
            ${Object.entries(byClass).map(([cn, items]) => `
            <div class="bg-white rounded border border-red-200 p-2 mt-2">
                <div class="font-bold text-red-700 text-[11px] mb-1">Клас ${cn}:</div>
                ${items.map(ot => `<div class="text-[11px] text-slate-700">• <b>${ot.subject}</b> — ${ot.teacher}</div>`).join('')}
            </div>`).join('')}
            <p class="mt-2 text-[10px] italic text-red-600">💡 Розмістіть вручну на 0-й або 8-й урок.</p>
        </div>`;
    }

    html += `</div>`;
    output.insertAdjacentHTML('afterbegin', html);
}

// =============================================================
// UNPAIRED ACTIONS
// =============================================================
function addUnpairedToSlot(idx, slot) {
    const item = window._unpairedAlternating?.[idx];
    if (!item) return;
    for (let d = 0; d < 5; d++) {
        if (!state.schedule.some(s => s.day === d && s.slot === slot && s.teacherId === item.teacherId) &&
            !state.schedule.some(s => s.day === d && s.slot === slot && s.classId === item.classId)) {
            state.schedule.push({ id: 'sch_up_' + Date.now(), teacherId: item.teacherId, classId: item.classId, subject: item.subject, day: d, slot, isAlternating: true, isManual: true });
            save(); renderSchedule();
            alert(`✅ "${item.subject}" → ${slot === 0 ? '0-й' : '8-й'} урок (${state.config.days[d]})`);
            return;
        }
    }
    alert('Не знайдено вільного слота.');
}

function addUnpairedToSchedule(idx) {
    const item = window._unpairedAlternating?.[idx];
    if (!item) return;
    for (let d = 0; d < 5; d++)
        for (let s = 1; s <= 7; s++)
            if (!state.schedule.some(ls => ls.day === d && ls.slot === s && ls.teacherId === item.teacherId) &&
                !state.schedule.some(ls => ls.day === d && ls.slot === s && ls.classId === item.classId) &&
                getTeacherStatus(item.teacherId, d, s) !== 2) {
                state.schedule.push({ id: 'sch_up_' + Date.now(), teacherId: item.teacherId, classId: item.classId, subject: item.subject, day: d, slot: s, isAlternating: true, isManual: true });
                save(); renderSchedule();
                alert(`✅ "${item.subject}" → ${state.config.days[d]}, урок ${s}`);
                return;
            }
    alert('Не знайдено вільного слота.');
}

// =============================================================
// РЕНДЕР
// =============================================================
function renderAll() { renderTeachers(); renderClasses(); renderWorkload(); renderSchedule(); }

function renderTeachers() {
    const c = document.getElementById('list-teachers');
    if (!c) return;
    c.innerHTML = state.teachers.map(t => `
        <div class="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center border-l-4 border-blue-500">
            <span onclick="openAvailability('${t.id}')" class="font-medium text-slate-700 cursor-pointer hover:text-blue-600 transition underline decoration-dotted">${t.name}</span>
            <button onclick="deleteTeacher('${t.id}')" class="text-red-400 hover:text-red-600 text-sm font-bold">Видалити</button>
        </div>`).join('');
}

function renderClasses() {
    const c = document.getElementById('list-classes');
    if (!c) return;
    c.innerHTML = state.classes.map(c => `
        <div class="bg-white px-4 py-2 rounded shadow flex items-center gap-4 border border-gray-200">
            <span class="font-bold">${c.name}</span>
            <button onclick="deleteClass('${c.id}')" class="text-gray-400 hover:text-red-500 text-sm">✕</button>
        </div>`).join('');
}

function renderWorkload() {
    const container = document.getElementById('workload-container');
    if (!container) return;
    if (!state.teachers?.length || !state.classes?.length) {
        container.innerHTML = `<div class="p-10 text-center bg-white rounded-xl border-2 border-dashed border-gray-200"><p class="text-gray-400">Спочатку додайте вчителів та класи.</p></div>`;
        return;
    }
    let html = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">`;
    state.teachers.forEach(teacher => {
        const tw = (state.workload || []).filter(w => w.teacherId == teacher.id)
            .sort((a, b) => {
                const ca = state.classes.find(c => c.id == a.classId)?.name || "";
                const cb = state.classes.find(c => c.id == b.classId)?.name || "";
                return ca.localeCompare(cb, undefined, {numeric: true}) || a.subject.localeCompare(b.subject);
            });
        const total = tw.reduce((s, w) => s + parseFloat(w.hours), 0);
        html += `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
            <div class="p-4 bg-slate-50 border-b flex justify-between items-center">
                <h3 class="font-bold text-slate-800 truncate pr-2">${teacher.name}</h3>
                <span class="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">${total} год</span>
            </div>
            <div class="p-4 space-y-2 overflow-y-auto" style="max-height:200px;min-height:60px;">
                ${tw.length > 0 ? tw.map(w => {
                    const cls = state.classes.find(c => c.id == w.classId);
                    let badge = w.splitType === 'alternating' ? `<span class="ml-1 text-[8px] bg-purple-100 text-purple-700 px-1 rounded">↕Тиждень</span>` : w.splitType === 'semester' ? `<span class="ml-1 text-[8px] bg-blue-100 text-blue-700 px-1 rounded">↕Семестр</span>` : '';
                    return `<div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100 text-sm">
                        <div class="truncate"><span class="font-bold text-blue-600">${cls?.name || '?'}</span><span class="text-gray-500 ml-1">${w.subject}</span>${badge}</div>
                        <div class="flex items-center gap-2"><span class="font-bold">${w.hours}г</span><button onclick="deleteWorkload('${w.id}')" class="text-gray-300 hover:text-red-500 text-xl font-light">&times;</button></div>
                    </div>`;
                }).join('') : '<p class="text-center text-gray-300 text-xs py-4 italic">Навантаження не додано</p>'}
            </div>
            <div class="p-4 bg-gray-50 border-t space-y-3">
                <div class="grid grid-cols-2 gap-2">
                    <div><label class="block text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Клас</label>
                        <select id="sel-cls-${teacher.id}" class="w-full text-sm border rounded-lg p-2 bg-white">${state.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
                    <div><label class="block text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Години</label>
                        <input type="number" id="hrs-${teacher.id}" value="2" min="0.5" step="0.5" max="20" class="w-full text-sm border rounded-lg p-2 bg-white"></div>
                </div>
                <div><label class="block text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Предмет</label>
                    <input type="text" id="sub-${teacher.id}" class="w-full text-sm border rounded-lg p-2 bg-white" placeholder="напр. Математика"></div>
                <button onclick="addWorkloadInline('${teacher.id}')" class="w-full py-2.5 bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 transition-all">Додати навантаження</button>
            </div>
        </div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
}

function addWorkloadInline(teacherId) {
    const tId = String(teacherId);
    const classId = document.getElementById(`sel-cls-${tId}`)?.value;
    const hours = parseFloat(document.getElementById(`hrs-${tId}`)?.value);
    const subject = document.getElementById(`sub-${tId}`)?.value.trim();
    if (!subject || isNaN(hours) || hours <= 0) { alert("Вкажіть предмет та години."); return; }
    let splitType = 'none', semesterPriority = 'none';
    if (hours % 1 !== 0) {
        if (confirm(`Дробові години (${hours}).\nОК — Чергування по ТИЖНЯХ\nСкасувати — По СЕМЕСТРАХ`)) {
            splitType = 'alternating';
        } else {
            splitType = 'semester';
            semesterPriority = confirm("Більше у ПЕРШОМУ семестрі?") ? 'first' : 'second';
        }
    }
    if (!state.workload) state.workload = [];
    state.workload.push({ id: String(Date.now()), teacherId: tId, classId: String(classId), subject, hours, splitType, semesterPriority });
    document.getElementById(`sub-${tId}`).value = '';
    renderAll(); save();
}

function deleteWorkload(id) {
    if (!confirm('Видалити?')) return;
    state.workload = state.workload.filter(w => w.id != id);
    renderAll(); save();
}

function updateManualLesson(teacherId, day, slot, element) {
    const text = element.innerText.trim();
    const tId = String(teacherId);
    state.schedule = state.schedule.filter(s => !(String(s.teacherId) === tId && s.day == day && s.slot == slot));
    if (text) {
        const parts = text.split(' ');
        const className = parts[0];
        const subjectName = parts.slice(1).join(' ') || "урок";
        let cls = state.classes.find(c => c.name.toLowerCase() === className.toLowerCase());
        if (!cls) { cls = { id: 'c_' + Date.now(), name: className }; state.classes.push(cls); }
        state.schedule.push({ id: 'sch_m_' + Date.now() + Math.random(), teacherId: tId, day: parseInt(day), slot: parseInt(slot), classId: String(cls.id), subject: subjectName, isManual: true });
    }
    save();
}

function renderSchedule() {
    const container = document.getElementById('schedule-output');
    if (!container) return;
    const currentSchedule = state.schedule || [];
    const fmtName = (n) => {
        if (!n) return "";
        const p = n.trim().split(/\s+/);
        return `${p[0]}<span class="initials">${p[1] ? ` ${p[1][0]}.` : ''}${p[2] ? `${p[2][0]}.` : ''}</span>`;
    };
    const days = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця"];
    let html = `<div class="overflow-x-auto bg-white rounded-xl shadow-md border border-gray-200">
    <table class="w-full border-collapse text-[10px]">
        <thead><tr class="bg-slate-100 text-slate-700 uppercase">
            <th class="w-12 border-b border-r p-2">День</th>
            <th class="w-8 border-b border-r p-2">№</th>
            ${state.teachers.map(t => `<th class="border-b border-r vertical-th bg-slate-50 text-slate-700 font-bold">${fmtName(t.name)}</th>`).join('')}
        </tr></thead><tbody>`;
    days.forEach((dayName, di) => {
        for (let si = 0; si <= 8; si++) {
            html += `<tr class="${si === 8 ? 'border-b-2 border-b-slate-300' : 'border-b border-gray-100'} hover:bg-blue-50/30">`;
            if (si === 0) html += `<td rowspan="9" class="bg-slate-50 border-r text-center font-bold text-slate-500 uppercase [writing-mode:vertical-lr] rotate-180 p-2">${dayName}</td>`;
            html += `<td class="text-center border-r p-1 ${si === 0 ? 'text-orange-600 font-bold bg-orange-50/50' : 'text-gray-400'}">${si}</td>`;
            state.teachers.forEach(teacher => {
                const tl = currentSchedule.filter(s => s.day == di && s.slot == si && s.teacherId == teacher.id);
                let cc = '';
                if (tl.length > 0) {
                    const cls = state.classes.find(c => c.id == tl[0].classId);
                    const isIntAlt = tl.length > 1 || tl[0].pairType === 'paired_internal';
                    const isExtAlt = tl.length === 1 && (tl[0].pairType === 'paired_external' || tl[0].isAlternating);
                    const marker = isIntAlt ? `<span class="ml-0.5 text-[7px] text-purple-500">●</span>` : isExtAlt ? `<span class="ml-0.5 text-[7px] text-blue-500">●</span>` : '';
                    const subjectsText = tl.map(l => l.subject).join(' / ');
                    const semBadge = (() => {
                        const wi = state.workload?.find(w => w.teacherId === teacher.id && w.classId === tl[0].classId && w.subject === tl[0].subject && w.splitType === 'semester');
                        return wi ? `<span class="text-[7px] text-indigo-500 block">↕ сем</span>` : '';
                    })();
                    cc = `<div class="w-full h-full flex flex-col justify-center items-center bg-blue-50 py-1">
                        <span class="block text-blue-900 font-bold leading-none text-[11px]">${cls?.name || ''}${marker}</span>
                        <span class="text-blue-700 text-[8px] truncate max-w-[45px] mt-0.5" title="${subjectsText}">${subjectsText}</span>
                        ${semBadge}</div>`;
                }
                html += `<td class="p-0 border-r border-gray-100 min-w-[40px]">
                    <div contenteditable="true" onblur="updateManualLesson('${teacher.id}',${di},${si},this)"
                        class="min-h-[40px] flex items-center justify-center outline-none focus:bg-yellow-50 transition-colors">${cc}</div></td>`;
            });
            html += `</tr>`;
        }
    });
    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

function printSchedule() {
    if (!state.schedule?.length) { alert("Розклад порожній!"); return; }
    const pw = window.open('', '_blank');
    const days = ["ПОНЕДІЛОК", "ВІВТОРОК", "СЕРЕДА", "ЧЕТВЕР", "П'ЯТНИЦЯ"];
    const date = new Date().toLocaleDateString('uk-UA');
    const totalWidth = 199, sideW = 20;
    const colW = (totalWidth - sideW) / state.teachers.length;
    const fmtN = n => { if (!n) return ""; const p = n.trim().split(/\s+/); return p[0] + (p[1] ? ` ${p[1][0]}.` : '') + (p[2] ? `${p[2][0]}.` : ''); };
    let html = `<html><head><style>
        @page{size:A4 portrait;margin:5mm}body{margin:0;padding:0;font-family:"Arial Narrow",Arial,sans-serif;-webkit-print-color-adjust:exact}
        .pw{width:200mm;margin:0 auto}table{width:${totalWidth}mm;border-collapse:collapse;table-layout:fixed;border:.5mm solid black;margin-left:.5mm}
        th,td{border:.1mm solid black;text-align:center;padding:0;height:4.5mm;overflow:hidden;font-size:8pt;box-sizing:border-box}
        thead th{border-bottom:.7mm solid black!important}.day-boundary td{border-top:.7mm solid black!important}
        .cd{width:12mm;font-weight:bold;font-size:7pt}.cn{width:8mm;background:#f0f0f0!important;font-weight:bold}
        .ct{width:${colW}mm}.dt{writing-mode:vertical-lr;transform:rotate(180deg);white-space:nowrap}
        .tnc{height:25mm;writing-mode:vertical-lr;transform:rotate(180deg);font-weight:bold;font-size:8.5pt;text-align:left;padding:1mm 0}
        .lb{line-height:1.1;display:flex;flex-direction:column;justify-content:center;height:100%}
        .cn2{font-weight:bold;font-size:8.5pt;display:block}.sc{font-size:6pt;display:block}.s0{background:#fff9e6!important}
        h2{text-align:center;font-size:11pt;margin:1mm 0}
    </style></head><body><div class="pw"><h2>ЗВЕДЕНИЙ РОЗКЛАД (${date})</h2>
    <table><thead><tr><th class="cd">ДН</th><th class="cn">№</th>
    ${state.teachers.map(t => `<th class="ct tnc">${fmtN(t.name)}</th>`).join('')}</tr></thead><tbody>`;
    days.forEach((dn, di) => {
        const dl = state.schedule.filter(s => s.day === di);
        if (!dl.length) return;
        const slots = dl.map(s => s.slot);
        const minS = Math.min(...slots, 1), maxS = Math.max(...slots, 7);
        for (let si = minS; si <= maxS; si++) {
            const isF = si === minS;
            html += `<tr class="${isF && di > 0 ? 'day-boundary' : ''}">`;
            if (isF) html += `<td rowspan="${maxS - minS + 1}" class="cd"><span class="dt">${dn}</span></td>`;
            html += `<td class="cn${si === 0 ? ' s0' : ''}">${si}</td>`;
            state.teachers.forEach(t => {
                const l = state.schedule.find(s => s.day === di && s.slot === si && s.teacherId == t.id);
                const s0 = si === 0 ? 's0' : '';
                if (l) {
                    const cn = state.classes.find(c => c.id == l.classId)?.name || '';
                    html += `<td class="${s0}"><div class="lb"><span class="cn2">${cn}${l.isAlternating ? ' ○' : ''}</span><span class="sc">${getSubjectCode(l.subject)}</span></div></td>`;
                } else html += `<td class="${s0}"></td>`;
            });
            html += `</tr>`;
        }
    });
    html += `</tbody></table></div><script>window.onload=function(){setTimeout(()=>{window.print();window.close();},500);}</script></body></html>`;
    pw.document.write(html); pw.document.close();
}

window.onload = init;
