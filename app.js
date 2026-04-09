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

async function generateSchedule() {
    if (_generatorRunning) { _generatorStop = true; return; }
    _generatorRunning = true;
    _generatorStop = false;

    showLoader();
    updateLoader(0, 0, 1, 0, 'Підготовка задач...', '');
    await tick();

    const manualLessons = state.schedule.filter(s => s.slot === 0 || s.slot === 8 || s.isManual);
    const { tasks, unpairedAlternating, overflowTasks } = buildTasks();

    updateLoader(0, 0, tasks.length, 0, 'Перевірка можливості...', '');
    await tick();
    const issues = checkFeasibility(tasks);
    if (issues.length > 0) {
        _generatorRunning = false;
        hideLoader();
        showFeasibilityError(issues);
        return;
    }

    const startTime = Date.now();
    let bestSchedule = null;
    let bestPlaced = -1;
    let attempt = 0;

    while (!_generatorStop) {
        attempt++;
        if (attempt % 3 === 0) {
            const elapsed = Date.now() - startTime;
            updateLoader(elapsed, attempt, tasks.length, bestPlaced, `Спроба ${attempt}...`, bestPlaced >= 0 ? `Найкраще: ${bestPlaced}/${tasks.length}` : 'Шукаю...');
            await tick();
        }

        const schedule = [...manualLessons.map(l => ({ ...l }))];
        const placed = runGeneration(tasks, schedule);

        if (placed > bestPlaced) {
            bestPlaced = placed;
            bestSchedule = schedule.map(l => ({ ...l }));
        }

        if (bestPlaced === tasks.length) break;
    }

    _generatorRunning = false;
    hideLoader();

    state.schedule = bestSchedule || manualLessons;
    saveData();
    renderSchedule();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const unplaced = tasks.length - bestPlaced;
    const unplacedList = buildUnplacedList(tasks, state.schedule);
    showGenerationReport(
        unplaced === 0 ? true : false,
        unpairedAlternating,
        overflowTasks,
        attempt,
        duration,
        tasks,
        state.schedule,
        unplacedList
    );
}

function stopGenerator() { _generatorStop = true; }

async function tick() { await new Promise(r => setTimeout(r, 0)); }

// Підраховуємо які задачі не розміщено
function buildUnplacedList(tasks, schedule) {
    const result = [];
    tasks.forEach(task => {
        const first = task.items[0];
        const found = schedule.some(ls =>
            ls.teacherId === first.teacherId &&
            ls.classId === first.classId &&
            ls.subject === first.subject &&
            ls.slot >= 1 && ls.slot <= 7
        );
        if (!found) {
            const tObj = state.teachers.find(t => t.id === first.teacherId);
            const cObj = state.classes.find(c => c.id === first.classId);
            result.push(`${first.subject} (${tObj?.name || '?'}) — ${cObj?.name || '?'} кл`);
        }
    });
    return result;
}

// =============================================================
// ОСНОВНИЙ АЛГОРИТМ ГЕНЕРАЦІЇ
// Архітектура: CLASS-FIRST + TEACHER-SCARCITY + SMART SWAP
// 1. Групуємо задачі по класах
// 2. Для кожного класу розподіляємо задачі по днях (враховуючи доступність вчителів)
// 3. Всередині дня заповнюємо слоти послідовно 1,2,3... (no-gap)
// 4. Якщо слот заблокований — пробуємо local swap (в день, між днями, 2-рівневий)
// 5. Залишки розміщуємо relaxed (дозволяємо вікна, але з великим штрафом)
// =============================================================
function runGeneration(tasks, schedule) {
    const classesIds = [...new Set(state.classes.map(c => c.id))];

    // Лічильник навантаження вчителів по днях
    const teacherDayCount = {};
    state.teachers.forEach(t => { teacherDayCount[t.id] = [0, 0, 0, 0, 0]; });
    schedule.forEach(ls => {
        if (teacherDayCount[ls.teacherId] && ls.slot >= 1 && ls.slot <= 7)
            teacherDayCount[ls.teacherId][ls.day]++;
    });

    // Групуємо задачі по класах
    const tasksByClass = {};
    classesIds.forEach(cId => { tasksByClass[cId] = []; });
    tasks.forEach(t => {
        if (!tasksByClass[t.classId]) tasksByClass[t.classId] = [];
        tasksByClass[t.classId].push(t);
    });

    // Сортуємо класи: найщільніші (більше уроків) — першими
    const sortedClasses = [...classesIds].sort((a, b) => {
        const aCount = (tasksByClass[a] || []).length;
        const bCount = (tasksByClass[b] || []).length;
        if (aCount !== bCount) return bCount - aCount;
        return Math.random() - 0.5;
    });

    let totalPlaced = 0;

    sortedClasses.forEach(cId => {
        const classTasks = tasksByClass[cId] || [];
        if (classTasks.length === 0) return;

        // Сортуємо задачі класу: спочатку вчителі з найменшою кількістю вільних днів
        const sortedTasks = [...classTasks].sort((a, b) => {
            const aFD = getTeacherFreeDaysCount(a.items[0].teacherId);
            const bFD = getTeacherFreeDaysCount(b.items[0].teacherId);
            if (aFD !== bFD) return aFD - bFD;
            if (a.priority !== b.priority) return a.priority - b.priority;
            // Труд/технол — в кінець (найгнучкіші)
            const aL = isLaborSubject(a.items[0].subject);
            const bL = isLaborSubject(b.items[0].subject);
            if (aL !== bL) return aL ? 1 : -1;
            return Math.random() - 0.5;
        });

        let pendingTasks = [...sortedTasks];

        // Сортуємо дні: ті де є дефіцитні вчителі — першими
        const days = [0, 1, 2, 3, 4].sort((da, db) => {
            const aScarcity = pendingTasks.filter(t =>
                getTeacherFreeDaysCount(t.items[0].teacherId) <= 3 &&
                !state.teachers.find(tt => tt.id === t.items[0].teacherId)
                    ?.availability[da]?.every(v => v === 2 || v === false)
            ).length;
            const bScarcity = pendingTasks.filter(t =>
                getTeacherFreeDaysCount(t.items[0].teacherId) <= 3 &&
                !state.teachers.find(tt => tt.id === t.items[0].teacherId)
                    ?.availability[db]?.every(v => v === 2 || v === false)
            ).length;
            return bScarcity - aScarcity;
        });

        days.forEach(d => {
            if (pendingTasks.length === 0) return;

            const getClassSlots = () =>
                schedule.filter(ls => ls.day === d && ls.classId === cId && ls.slot >= 1 && ls.slot <= 7)
                    .map(ls => ls.slot).sort((a, b) => a - b);

            let slotCursor = 1;
            let attempts = 0;
            const maxAttempts = pendingTasks.length * 8 + 25;

            while (pendingTasks.length > 0 && slotCursor <= 7 && attempts < maxAttempts) {
                attempts++;

                const classSlots = getClassSlots();
                const nextExpected = classSlots.length === 0 ? 1 : Math.max(...classSlots) + 1;

                if (slotCursor < nextExpected) { slotCursor = nextExpected; continue; }
                if (slotCursor > nextExpected && classSlots.length > 0) break;

                // Сортуємо доступні задачі для цього слоту: дефіцитні першими
                const sortedRemain = [...pendingTasks].sort((a, b) => {
                    const aFD = getTeacherFreeDaysCount(a.items[0].teacherId);
                    const bFD = getTeacherFreeDaysCount(b.items[0].teacherId);
                    if (aFD !== bFD) return aFD - bFD;
                    return a.priority - b.priority;
                });

                let bestTaskIdx = -1;
                let bestScore = Infinity;

                for (const task of sortedRemain) {
                    const item = task.items[0];
                    if (!canPlace(task, item, d, slotCursor, schedule)) continue;
                    const sc = scoreSlot(task, d, slotCursor, schedule, teacherDayCount);
                    const withNoise = sc + Math.random() * 8;
                    if (withNoise < bestScore) {
                        bestScore = withNoise;
                        bestTaskIdx = pendingTasks.indexOf(task);
                    }
                }

                if (bestTaskIdx >= 0) {
                    const task = pendingTasks[bestTaskIdx];
                    commitTask(task, d, slotCursor, schedule, teacherDayCount);
                    pendingTasks.splice(bestTaskIdx, 1);
                    totalPlaced++;
                    slotCursor++;
                } else {
                    // Спробуємо swap
                    const swapped = trySwap(cId, d, slotCursor, pendingTasks, schedule, teacherDayCount);
                    if (swapped) {
                        const newSlots = getClassSlots();
                        slotCursor = newSlots.length === 0 ? 1 : Math.max(...newSlots) + 1;
                    } else {
                        break; // Цей день вичерпано
                    }
                }
            }
        });

        // Fallback: залишки розміщуємо relaxed (дозволяємо вікна)
        if (pendingTasks.length > 0) {
            pendingTasks.sort((a, b) => {
                const aFD = getTeacherFreeDaysCount(a.items[0].teacherId);
                const bFD = getTeacherFreeDaysCount(b.items[0].teacherId);
                return aFD - bFD;
            });
            pendingTasks.forEach(task => {
                const item = task.items[0];
                if (tryPlaceRelaxed(task, item, schedule, teacherDayCount)) {
                    totalPlaced++;
                }
            });
        }
    });

    return totalPlaced;
}

// =============================================================
// ПЕРЕВІРКА: чи можна поставити задачу на (d, s) — СУВОРІ ПРАВИЛА
// =============================================================
function canPlace(task, firstItem, d, s, schedule) {
    if (s < 1 || s > 7) return false;

    // Клас вже зайнятий
    if (schedule.some(ls => ls.day === d && ls.slot === s && ls.classId === firstItem.classId)) return false;

    // Вчитель вже зайнятий
    if (task.items.some(it => schedule.some(ls => ls.day === d && ls.slot === s && ls.teacherId === it.teacherId))) return false;

    // Червона зона
    if (task.items.some(it => getTeacherStatus(it.teacherId, d, s) === 2)) return false;

    // Hard кабінети: gym, computer, фізика, хімія — один клас одночасно
    const roomType = getRoomType(firstItem.subject);
    if (roomType === 'gym' || roomType === 'computer' || roomType === 'physics' || roomType === 'chemistry') {
        if (schedule.some(ls => ls.day === d && ls.slot === s && ls.classId !== firstItem.classId && getRoomType(ls.subject) === roomType))
            return false;
    }
    if (isLaborSubject(firstItem.subject)) {
        if (schedule.some(ls => ls.day === d && ls.slot === s && ls.classId !== firstItem.classId && isLaborSubject(ls.subject)))
            return false;
    }

    // Фізкультура — max 1 раз на день для класу
    if (roomType === 'gym') {
        if (schedule.some(ls => ls.day === d && ls.classId === firstItem.classId && getRoomType(ls.subject) === 'gym'))
            return false;
    }

    return true;
}

// =============================================================
// ОЦІНКА ЯКОСТІ СЛОТУ (менше = краще)
// =============================================================
function scoreSlot(task, d, s, schedule, teacherDayCount) {
    let score = 0;
    const first = task.items[0];
    const priority = task.priority;

    // Жовта зона вчителя
    const maxStatus = task.items.reduce((m, it) => Math.max(m, getTeacherStatus(it.teacherId, d, s)), 0);
    if (maxStatus === 1) score += 1500;

    // Пріоритет 1: не можна на 6-7 урок (важкі предмети — тільки 1-5)
    if (priority === 1) {
        if (s === 5) score += 200;
        if (s === 6) score += 2000;
        if (s === 7) score += 5000;
    } else if (priority === 2) {
        // Середні: краще не на 7-й
        if (s === 6) score += 150;
        if (s === 7) score += 600;
    } else {
        // Легкі (фізкультура, труд, мистецтво) — навпаки, краще вкінці
        score += (7 - s) * 120;
    }

    // Компактність вчителя (мінімізуємо вікна)
    const teacherToday = schedule.filter(ls => ls.day === d && ls.teacherId === first.teacherId && ls.slot >= 1 && ls.slot <= 7);
    if (teacherToday.length > 0) {
        const slots = teacherToday.map(ls => ls.slot);
        const maxExisting = Math.max(...slots);
        const minExisting = Math.min(...slots);
        const distToMax = s - maxExisting;
        const distToMin = minExisting - s;

        if (distToMax === 1 || distToMin === 1) {
            score -= 200; // Сусід — бонус
        } else if (distToMax === -1 || distToMin === -1) {
            score -= 100; // Йде перед або після
        } else {
            // Вікно — штраф пропорційний розміру
            const gap = Math.min(
                s > maxExisting ? s - maxExisting - 1 : Infinity,
                s < minExisting ? minExisting - s - 1 : Infinity
            );
            if (gap === 1) score += 500;   // Вікно 1 урок
            else if (gap === 2) score += 1500; // Вікно 2 уроки
            else score += gap * 1000;
        }
    } else {
        // Перший урок вчителя — тягнемо до початку
        score += (s - 1) * 100;
    }

    // Баланс вчителя по днях — не перевантажувати один день
    const tdCount = (teacherDayCount[first.teacherId] || [0,0,0,0,0])[d];
    if (tdCount >= 6) score += 2000;
    else if (tdCount >= 5) score += 600;
    else if (tdCount >= 4) score += 200;

    // Дублювання предмета в день
    const sameSubjectToday = schedule.filter(ls =>
        ls.day === d && ls.classId === first.classId && ls.subject === first.subject
    );
    if (sameSubjectToday.length > 0) {
        const totalLessons = state.workload
            .filter(w => w.classId === first.classId && w.subject === first.subject)
            .reduce((sum, w) => sum + Math.ceil(parseFloat(w.hours)), 0);
        const freeDays = getTeacherFreeDaysCount(first.teacherId);
        const pairNeeded = totalLessons > freeDays;

        if (pairNeeded) {
            const isAdj = sameSubjectToday.some(ls => Math.abs(ls.slot - s) === 1);
            score += isAdj ? 100 : 4000; // Пара підряд — ок
        } else {
            score += 10000; // Дублювання без потреби — дуже погано
        }
    }

    // Вчитель вже має >2 уроки цього класу сьогодні
    const teacherClassToday = schedule.filter(ls =>
        ls.day === d && ls.classId === first.classId && ls.teacherId === first.teacherId
    ).length;
    if (teacherClassToday >= 2) score += 8000;

    // Труд/технологія — заохочуємо пари
    if (isLaborSubject(first.subject)) {
        const laborToday = schedule.filter(ls =>
            ls.day === d && ls.classId === first.classId && isLaborSubject(ls.subject) && ls.teacherId === first.teacherId
        );
        if (laborToday.length === 1) {
            score += Math.abs(laborToday[0].slot - s) === 1 ? -400 : 200;
        } else if (laborToday.length > 1) score += 8000;
    }

    // Різні предмети того ж вчителя: розподіляємо рівномірно
    // Якщо вчитель вже має урок в цьому класі сьогодні — слабкий штраф
    if (teacherClassToday >= 1 && !isLaborSubject(first.subject)) score += 500;

    return score;
}

// =============================================================
// COMMIT: розмістити задачу
// =============================================================
function commitTask(task, d, s, schedule, teacherDayCount) {
    task.items.forEach(it => {
        schedule.push({
            id: 'sch_' + Date.now() + Math.random(),
            teacherId: it.teacherId,
            classId: it.classId,
            subject: it.subject,
            day: d, slot: s,
            isAlternating: (it.currentHours === 0.5 && it.splitType === 'alternating'),
            pairType: task.type
        });
        if (teacherDayCount[it.teacherId]) teacherDayCount[it.teacherId][d]++;
    });
}

// =============================================================
// SWAP: спробувати звільнити слот для нової задачі
// 3 рівні: всередині дня → інший день → дворівневий
// =============================================================
function trySwap(classId, day, targetSlot, pendingTasks, schedule, teacherDayCount) {
    const prevSlot = targetSlot - 1;
    if (prevSlot < 1) return false;

    const blocking = schedule.find(ls =>
        ls.day === day && ls.slot === prevSlot && ls.classId === classId && !ls.isManual
    );
    if (!blocking) return false;

    // ── Рівень 1: переставити blocking всередині цього ж дня (на більший слот) ──
    for (let laterSlot = targetSlot + 1; laterSlot <= 7; laterSlot++) {
        const tFree = !schedule.some(ls => ls.day === day && ls.slot === laterSlot && ls.teacherId === blocking.teacherId);
        const cFree = !schedule.some(ls => ls.day === day && ls.slot === laterSlot && ls.classId === classId);
        const notRed = getTeacherStatus(blocking.teacherId, day, laterSlot) !== 2;

        if (tFree && cFree && notRed) {
            const idx = schedule.indexOf(blocking);
            if (idx < 0) continue;
            schedule.splice(idx, 1);
            schedule.push({ ...blocking, id: 'sch_sw1_' + Date.now() + Math.random(), slot: laterSlot });
            return true;
        }
    }

    // ── Рівень 2: перекинути blocking в інший день ──
    const otherDays = [0,1,2,3,4].filter(d => d !== day).sort(() => Math.random() - 0.5);

    for (const altDay of otherDays) {
        const altSlots = schedule
            .filter(ls => ls.day === altDay && ls.classId === classId && ls.slot >= 1 && ls.slot <= 7)
            .map(ls => ls.slot);
        const altNext = altSlots.length === 0 ? 1 : Math.max(...altSlots) + 1;
        if (altNext > 7) continue;

        const tFree = !schedule.some(ls => ls.day === altDay && ls.slot === altNext && ls.teacherId === blocking.teacherId);
        const notRed = getTeacherStatus(blocking.teacherId, altDay, altNext) !== 2;
        if (!tFree || notRed) continue;

        const idx = schedule.indexOf(blocking);
        if (idx < 0) continue;
        schedule.splice(idx, 1);
        if (teacherDayCount[blocking.teacherId]) teacherDayCount[blocking.teacherId][day]--;

        const classAfter = schedule
            .filter(ls => ls.day === day && ls.classId === classId && ls.slot >= 1 && ls.slot <= 7)
            .map(ls => ls.slot);
        const expectedNext = classAfter.length === 0 ? 1 : Math.max(...classAfter) + 1;

        if (expectedNext !== targetSlot) {
            // Не допомогло — відновлюємо
            schedule.splice(idx, 0, blocking);
            if (teacherDayCount[blocking.teacherId]) teacherDayCount[blocking.teacherId][day]++;
            continue;
        }

        schedule.push({ ...blocking, id: 'sch_sw2_' + Date.now() + Math.random(), day: altDay, slot: altNext });
        if (teacherDayCount[blocking.teacherId]) teacherDayCount[blocking.teacherId][altDay]++;
        return true;
    }

    // ── Рівень 3: дворівневий — evict урок низького пріоритету з altDay, ──
    //    перенести blocking туди, звільнивши targetSlot
    for (const altDay of otherDays) {
        const altSlots = schedule
            .filter(ls => ls.day === altDay && ls.classId === classId && ls.slot >= 1 && ls.slot <= 7)
            .map(ls => ls.slot);
        if (altSlots.length < 7) continue; // Якщо є місце — вже оброблено вище

        const evictCandidates = schedule
            .filter(ls => ls.day === altDay && ls.classId === classId && ls.slot >= 1 && ls.slot <= 7 &&
                !ls.isManual && ls.teacherId !== blocking.teacherId)
            .sort((a, b) => getPriority(b.subject) - getPriority(a.subject)); // Найлегший першим

        for (const evict of evictCandidates) {
            const thirdDays = [0,1,2,3,4].filter(d => d !== day && d !== altDay).sort(() => Math.random() - 0.5);
            for (const thirdDay of thirdDays) {
                const thirdSlots = schedule
                    .filter(ls => ls.day === thirdDay && ls.classId === classId && ls.slot >= 1 && ls.slot <= 7)
                    .map(ls => ls.slot);
                const thirdNext = thirdSlots.length === 0 ? 1 : Math.max(...thirdSlots) + 1;
                if (thirdNext > 7) continue;

                const evTFree = !schedule.some(ls => ls.day === thirdDay && ls.slot === thirdNext && ls.teacherId === evict.teacherId);
                const evNotRed = getTeacherStatus(evict.teacherId, thirdDay, thirdNext) !== 2;
                if (!evTFree || !evNotRed) continue;

                // Перевіряємо чи blocking може стати на evict.slot в altDay
                const blTFree = !schedule.some(ls =>
                    ls.day === altDay && ls.slot === evict.slot && ls.teacherId === blocking.teacherId && ls !== evict
                );
                const blNotRed = getTeacherStatus(blocking.teacherId, altDay, evict.slot) !== 2;
                if (!blTFree || !blNotRed) continue;

                // Виконуємо своп
                const blockIdx = schedule.indexOf(blocking);
                const evictIdx = schedule.indexOf(evict);
                if (blockIdx < 0 || evictIdx < 0) continue;

                schedule.splice(blockIdx, 1);
                if (teacherDayCount[blocking.teacherId]) teacherDayCount[blocking.teacherId][day]--;

                const classAfter2 = schedule
                    .filter(ls => ls.day === day && ls.classId === classId && ls.slot >= 1 && ls.slot <= 7)
                    .map(ls => ls.slot);
                const expNext2 = classAfter2.length === 0 ? 1 : Math.max(...classAfter2) + 1;
                if (expNext2 !== targetSlot) {
                    schedule.splice(blockIdx, 0, blocking);
                    if (teacherDayCount[blocking.teacherId]) teacherDayCount[blocking.teacherId][day]++;
                    continue;
                }

                // Переносимо evict в thirdDay (з правильного індексу)
                const evictIdx2 = schedule.indexOf(evict);
                schedule.splice(evictIdx2, 1);
                if (teacherDayCount[evict.teacherId]) teacherDayCount[evict.teacherId][altDay]--;
                schedule.push({ ...evict, id: 'sch_sw3e_' + Date.now() + Math.random(), day: thirdDay, slot: thirdNext });
                if (teacherDayCount[evict.teacherId]) teacherDayCount[evict.teacherId][thirdDay]++;

                // Ставимо blocking на звільнене місце в altDay
                schedule.push({ ...blocking, id: 'sch_sw3b_' + Date.now() + Math.random(), day: altDay, slot: evict.slot });
                if (teacherDayCount[blocking.teacherId]) teacherDayCount[blocking.teacherId][altDay]++;

                return true;
            }
        }
    }

    return false;
}

// =============================================================
// RELAXED PLACEMENT: розміщення без суворого no-gap
// Для залишків після class-day циклу
// =============================================================
function tryPlaceRelaxed(task, firstItem, schedule, teacherDayCount) {
    let bestSlot = null;
    let bestScore = Infinity;

    const freeDays = getTeacherFreeDaysCount(firstItem.teacherId);
    // Сортуємо дні: доступні для цього вчителя — першими
    const days = [0,1,2,3,4].sort((a, b) => {
        const aOk = !state.teachers.find(t => t.id === firstItem.teacherId)
            ?.availability[a]?.every(v => v === 2 || v === false) ? 0 : 1;
        const bOk = !state.teachers.find(t => t.id === firstItem.teacherId)
            ?.availability[b]?.every(v => v === 2 || v === false) ? 0 : 1;
        if (aOk !== bOk) return aOk - bOk;
        return Math.random() - 0.5;
    });

    for (const d of days) {
        for (let s = 1; s <= 7; s++) {
            if (!canPlace(task, firstItem, d, s, schedule)) continue;

            const classSlots = schedule
                .filter(ls => ls.day === d && ls.classId === firstItem.classId && ls.slot >= 1 && ls.slot <= 7)
                .map(ls => ls.slot);

            let gapPenalty = 0;
            if (classSlots.length === 0 && s !== 1) {
                gapPenalty = 20000 + s * 1000; // Перший урок не з 1 — великий штраф
            } else if (classSlots.length > 0) {
                const maxSlot = Math.max(...classSlots);
                const gap = s - maxSlot - 1;
                if (gap > 0) gapPenalty = 15000 + gap * 3000; // Вікно — штраф
            }

            const sc = scoreSlot(task, d, s, schedule, teacherDayCount) + gapPenalty;
            const withNoise = sc + Math.random() * 10;
            if (withNoise < bestScore) {
                bestScore = withNoise;
                bestSlot = { d, s };
            }
        }
    }

    if (bestSlot) {
        commitTask(task, bestSlot.d, bestSlot.s, schedule, teacherDayCount);
        return true;
    }
    return false;
}

function getTeacherFreeDaysCount(teacherId) {
    const t = state.teachers.find(t => t.id === teacherId);
    if (!t) return 5;
    return t.availability.filter(d => d.some(v => v !== 2 && v !== false)).length;
}

function countFreeSlots(teacherId) {
    let c = 0;
    for (let d = 0; d < 5; d++)
        for (let s = 1; s <= 7; s++)
            if (getTeacherStatus(teacherId, d, s) !== 2) c++;
    return c;
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

function showGenerationReport(result, unpairedAlternating, overflowTasks, attempts, time, tasks, schedule, unplacedList) {
    const output = document.getElementById('schedule-output');
    const old = document.getElementById('gen-report');
    if (old) old.remove();

    const placed = schedule.filter(s => !s.isManual && s.slot >= 1 && s.slot <= 7).length;
    const isSuccess = result === true;
    const unplacedCount = unplacedList ? unplacedList.length : 0;

    let html = `<div id="gen-report" class="mt-4 space-y-3">`;

    html += `
    <div class="p-4 ${isSuccess ? 'bg-green-50 border-green-500' : 'bg-orange-50 border-orange-500'} border-l-4 rounded shadow-sm">
        <div class="flex justify-between items-center">
            <h3 class="font-bold ${isSuccess ? 'text-green-800' : 'text-orange-800'}">
                ${isSuccess ? '✅ Ідеальний розклад!' : `⚠️ Майже готово — не вмістилось: ${unplacedCount} уроків`}
            </h3>
            <span class="text-[10px] text-gray-500">Спроб: ${attempts} | Час: ${time}с</span>
        </div>
        ${unplacedCount > 0 ? `
        <ul class="list-disc list-inside text-[11px] mt-2 text-orange-700 space-y-1">
            ${(unplacedList || []).map(e => `<li>${e}</li>`).join('')}
        </ul>
        <p class="mt-2 text-[10px] italic text-orange-600">💡 Ці уроки можна вручну розмістити на 0-й або 8-й урок як резерв.</p>
        ` : ''}
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
