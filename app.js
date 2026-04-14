// =============================================================
// ПРІОРИТЕТИ ПРЕДМЕТІВ
// =============================================================
const subjectPriorities = {
    // 1 - НАЙВИЩА СКЛАДНІСТЬ
    'алгебр': 1, 'геометр': 1, 'матем': 1,
    'фізик': 1, 'хімі': 1,
    'англійськ': 1, 'нім': 1, 'іноземн': 1,
    'укр. мов': 1, 'мов': 1,

    // 2 - СЕРЕДНЯ СКЛАДНІСТЬ
    'літ': 2, 'історі': 2, 'біолог': 2, 'географ': 2,
    'право': 2, 'громад': 2, 'етик': 2, 'захист': 2,
    'природ': 2, 'інформ': 2, 'stem': 2, 'стеm': 2,

    // 3 - НИЖЧА СКЛАДНІСТЬ
    'фізкульт': 3, 'фізичн': 3,
    'технолог': 3, 'трудов': 3,
    'мистец': 3, 'музик': 3, 'малюв': 3,
    'добробут': 3, 'основ': 3, 'фінанс': 3
};

// =============================================================
// СПЕЦІАЛІЗОВАНІ КАБІНЕТИ
// =============================================================
function getRoomType(subject) {
    if (!subject) return null;
    const name = subject.toLowerCase();
    if (name.includes('інформ')) return 'computer';
    if (name.includes('фізкульт') || name.includes('фізичн культ')) return 'gym';
    if (name.includes('хімі')) return 'chemistry';
    if (name.includes('фізик') && !name.includes('фізкульт') && !name.includes('фізична культ')) return 'physics';
    return null;
}

// =============================================================
// СТАН ДОДАТКУ
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

// =============================================================
// ІНІЦІАЛІЗАЦІЯ ТА ЗБЕРЕЖЕННЯ
// =============================================================
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
    } catch (e) {
        console.error("Помилка при читанні з localStorage:", e);
    }
    renderAll();
}

function saveData() {
    localStorage.setItem('school_schedule_data', JSON.stringify(state));
}
function save() { saveData(); }

// =============================================================
// НАВІГАЦІЯ
// =============================================================
function showTab(tabName) {
    state.activeTab = tabName;
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    const activeSection = document.getElementById(`tab-${tabName}`);
    if (activeSection) activeSection.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.id === `btn-${tabName}`) btn.classList.add('active');
    });
    saveData();
    renderAll();
}

function exportData() {
    const dataStr = JSON.stringify(state, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.download = `schedule_backup_${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = event => {
            try {
                const importedState = JSON.parse(event.target.result);
                if (importedState.teachers && importedState.classes) {
                    if (confirm('Ви впевнені? Поточні дані будуть замінені даними з файлу.')) {
                        state = importedState;
                        save();
                        renderAll();
                        alert('Дані успішно імпортовані!');
                    }
                } else {
                    alert('Помилка: Файл має неправильну структуру.');
                }
            } catch (err) {
                alert('Помилка при читанні файлу: ' + err.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// =============================================================
// ВЧИТЕЛІ
// =============================================================
function addTeacher() {
    const nameInput = document.getElementById('teacher-name');
    const name = nameInput.value.trim();
    if (!name) return;
    const newTeacher = {
        id: 't_' + Date.now(),
        name: name,
        availability: Array(5).fill(null).map(() => Array(state.config.maxLessons).fill(0)),
        workload: []
    };
    state.teachers.push(newTeacher);
    nameInput.value = '';
    save();
    renderAll();
}

function deleteTeacher(id) {
    state.teachers = state.teachers.filter(t => t.id !== id);
    save();
    renderAll();
}

// =============================================================
// КЛАСИ
// =============================================================
function addClass() {
    const nameInput = document.getElementById('class-name');
    const name = nameInput.value.trim();
    if (!name) return;
    const newClass = { id: 'c_' + Date.now(), name: name };
    state.classes.push(newClass);
    nameInput.value = '';
    save();
    renderAll();
}

function deleteClass(id) {
    state.classes = state.classes.filter(c => c.id !== id);
    save();
    renderAll();
}

// =============================================================
// МОДУЛЬ ДОСТУПНОСТІ ВЧИТЕЛЯ
// =============================================================
let currentEditingTeacherId = null;

function openAvailability(id) {
    currentEditingTeacherId = id;
    const teacher = state.teachers.find(t => t.id === id);
    if (!teacher) return;
    if (!teacher.availability) {
        teacher.availability = Array(5).fill(null).map(() => Array(state.config.maxLessons).fill(0));
    } else {
        teacher.availability = teacher.availability.map(dayArr =>
            (dayArr || []).map(v => {
                if (v === true) return 0;
                if (v === false) return 2;
                return v || 0;
            })
        );
    }
    document.getElementById('modal-teacher-name').innerText = `Доступність: ${teacher.name}`;
    renderAvailabilityGrid(teacher);
    document.getElementById('modal-availability').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-availability').classList.add('hidden');
    currentEditingTeacherId = null;
    save();
}

function renderAvailabilityGrid(teacher) {
    const container = document.getElementById('availability-grid');
    const days = state.config.days;

    let html = `<table class="w-full border-collapse text-sm">
        <thead><tr><th class="p-1 text-center text-gray-500">Урок</th>`;
    days.forEach(d => html += `<th class="border p-2 bg-gray-100 font-bold text-center">${d}</th>`);
    html += `</tr></thead><tbody>`;

    for (let l = 0; l <= 7; l++) {
        html += `<tr><td class="border p-2 font-bold bg-gray-50 text-center">${l}</td>`;
        for (let d = 0; d < 5; d++) {
            const avail = teacher.availability[d] || [];
            let status = avail[l];
            if (status === true) status = 0;
            else if (status === false) status = 2;
            else if (status === undefined || status === null) status = 0;

            let colorClass, statusText, icon;
            if (status === 0) {
                colorClass = 'bg-green-100 text-green-800 hover:bg-green-200';
                statusText = 'Вільний';
                icon = '✓';
            } else if (status === 1) {
                colorClass = 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
                statusText = 'Небажано';
                icon = '⚠';
            } else {
                colorClass = 'bg-red-100 text-red-800 hover:bg-red-200';
                statusText = 'НЕ МОЖНА';
                icon = '✕';
            }
            html += `
                <td onclick="toggleAvailability(${d}, ${l})"
                    class="border p-2 cursor-pointer text-center font-medium transition select-none ${colorClass}"
                    title="Клікніть для зміни">
                    <div class="text-lg leading-none">${icon}</div>
                    <div class="text-[9px] mt-0.5">${statusText}</div>
                </td>`;
        }
        html += `</tr>`;
    }
    html += `</tbody></table>`;
    container.innerHTML = html;
}

function toggleAvailability(dayIndex, lessonIndex) {
    const teacher = state.teachers.find(t => t.id === currentEditingTeacherId);
    if (!teacher) return;
    if (!teacher.availability[dayIndex]) teacher.availability[dayIndex] = [];
    let cur = teacher.availability[dayIndex][lessonIndex];
    if (cur === true) cur = 0;
    else if (cur === false) cur = 2;
    else cur = cur || 0;
    teacher.availability[dayIndex][lessonIndex] = (cur + 1) % 3;
    renderAvailabilityGrid(teacher);
}


// =============================================================
// ГЕНЕРАТОР РОЗКЛАДУ v9
// ================================================================

let _generatorRunning = false;
let _generatorStop    = false;
let _idCounter        = 0;

function uid(pfx) {
    return pfx + '_' + (++_idCounter) + '_' + (Math.random() * 1e9 | 0);
}

async function generateSchedule() {
    if (_generatorRunning) { _generatorStop = true; return; }
    _generatorRunning = true;
    _generatorStop    = false;
    _idCounter        = 0;
    showLoader();

    const startTime = Date.now();
    const { tasks: allTasks, unpairedAlternating, overflowTasks } = buildTasks();
    const total = allTasks.length;

    const issues = checkFeasibility(allTasks);
    if (issues.length > 0) {
        _generatorRunning = false;
        hideLoader();
        showFeasibilityError(issues);
        return;
    }

    let best = { schedule: [], unplacedCount: Infinity, unplacedList: [], tasks: [] };
    let restart = 0;
    let noImproveSince = 0;

    while (!_generatorStop) {
        restart++;
        const ms = Date.now() - startTime;

        let schedule, stillUnplaced;

        const doLocalSearch = best.unplacedCount < Infinity
                           && best.unplacedCount > 0
                           && noImproveSince >= 2;

        if (doLocalSearch) {
            schedule = JSON.parse(JSON.stringify(best.schedule));
            stillUnplaced = best.tasks.map(t => ({ ...t, items: t.items.map(i => ({ ...i })) }));

            updateLoader(restart, ms, total - best.unplacedCount, total, best.unplacedCount,
                `🔍 Local Search | Розміщуємо ${stillUnplaced.length} уроків (глибина 6)...`);
            await tick();

            await localSearchRepair(stillUnplaced, schedule, startTime, restart, total);
            subjectOrderFix(schedule);
            priorityPushUp(schedule);
            gapFix(schedule);
            gapFix(schedule); // другий прохід для залишкових вікон
            selfReorder(schedule);
            sanitize(schedule);

        } else {
            const manual = state.schedule.filter(s => s.slot === 0 || s.slot === 8);
            schedule = manual.map(s => ({ ...s }));
            const tasks = allTasks.map(t => ({ ...t, items: t.items.map(i => ({ ...i })) }));

            updateLoader(restart, ms, total - best.unplacedCount, total, best.unplacedCount,
                `⚡ Генерація ${restart} | Найкращий: ${best.unplacedCount === Infinity ? '—' : best.unplacedCount} не розм.`);
            await tick();

            buildGymReservations(tasks);
    const unplaced = phasedGreedy(tasks, schedule);
            subjectOrderFix(schedule);
            gapFix(schedule);
            priorityPushUp(schedule);
            gapFix(schedule);
            priorityPushUp(schedule);
            selfReorder(schedule);

            stillUnplaced = [...unplaced];
            await repairUnplaced(stillUnplaced, schedule, startTime, restart, total);
            gapFix(schedule);
            sanitize(schedule);
        }

        const count = stillUnplaced.length;
        if (count < best.unplacedCount) {
            best = {
                schedule:      JSON.parse(JSON.stringify(schedule)),
                unplacedCount: count,
                unplacedList:  stillUnplaced.map(t => {
                    const it   = t.items[0];
                    const tObj = state.teachers.find(x => x.id === it.teacherId);
                    const cObj = state.classes.find(x => x.id === it.classId);
                    return `${it.subject} (${tObj?.name || '?'}) — ${cObj?.name || '?'} кл`;
                }),
                tasks: stillUnplaced.map(t => ({ ...t, items: t.items.map(i => ({ ...i })) }))
            };
            noImproveSince = 0;
        } else {
            noImproveSince++;
        }

        updateLoader(restart, Date.now() - startTime,
            total - best.unplacedCount, total, best.unplacedCount,
            `Рестарт ${restart} | Найкращий: ${best.unplacedCount} | Поточний: ${count}`);
        await tick();
        if (best.unplacedCount === 0) break;
    }

    _generatorRunning = false;
    hideLoader();
    state.schedule = best.schedule;
    saveData();
    renderSchedule();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    showGenerationReport(best.unplacedList, unpairedAlternating, overflowTasks, restart, duration);
}

function stopGenerator() { _generatorStop = true; }
async function tick() { await new Promise(r => setTimeout(r, 0)); }

function shuffleArr(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function sanitize(schedule) {
    // 1. Видаляємо tmp_ (незакомічені евакуації)
    for (let i = schedule.length - 1; i >= 0; i--) {
        if (String(schedule[i].id || '').startsWith('tmp_')) schedule.splice(i, 1);
    }

    // 2. Видаляємо дублікати teacher+day+slot (той самий вчитель двічі в одному слоті)
    // Залишаємо перший зустрітий (зазвичай оригінал)
    const seen = new Map();
    for (let i = 0; i < schedule.length; i++) {
        const ls = schedule[i];
        if (ls.slot < 1 || ls.slot > 7) continue;
        const key = ls.teacherId + '|' + ls.day + '|' + ls.slot + '|' + ls.classId;
        if (seen.has(key)) {
            schedule.splice(i, 1);
            i--;
        } else {
            seen.set(key, true);
        }
    }

    // 3. Обрізаємо надлишок по teacher+class+subject
    // Рахуємо скільки потрібно
    const needed = {};
    state.workload.forEach(w => {
        const h = parseFloat(w.hours);
        const whole = Math.floor(h);
        const frac  = Math.round((h - whole) * 10) / 10;
        const slots = whole + (Math.abs(frac - 0.5) < 0.01 && w.splitType === 'alternating' ? 1 : 0);
        const key = w.teacherId + '|' + w.classId + '|' + w.subject.toLowerCase();
        needed[key] = (needed[key] || 0) + slots;
    });

    // Ітеруємо ЗВЕРХУ вниз — залишаємо перші N, видаляємо надлишкові
    const counts = {};
    for (let i = 0; i < schedule.length; i++) {
        const ls = schedule[i];
        if (ls.slot < 1 || ls.slot > 7 || ls.isManual) continue;
        const key = ls.teacherId + '|' + ls.classId + '|' + ls.subject.toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
        if (counts[key] > (needed[key] || 0)) {
            schedule.splice(i, 1);
            i--;
        }
    }
}

// ================================================================
// BUILD TASKS — парування за пріоритетом
// ================================================================
function buildTasks() {
    const flat = [];
    state.workload.forEach(item => {
        const h     = parseFloat(item.hours);
        const whole = Math.floor(h);
        const frac  = Math.round((h - whole) * 10) / 10;
        for (let i = 0; i < whole; i++)
            flat.push({ ...item, currentHours: 1, used: false });
        if (Math.abs(frac - 0.5) < 0.01 && item.splitType === 'alternating')
            flat.push({ ...item, currentHours: 0.5, used: false });
    });

    const tasks = [], unpairedAlt = [];
    const classIds = [...new Set(state.classes.map(c => c.id))];

    classIds.forEach(cId => {
        // Пари одного вчителя (фіолетовий)
        const tIds = [...new Set(flat
            .filter(w => w.classId === cId && w.currentHours === 0.5 && w.splitType === 'alternating' && !w.used)
            .map(w => w.teacherId))];
        tIds.forEach(tId => {
            const alts = flat.filter(w => w.classId === cId && w.teacherId === tId && w.currentHours === 0.5 && w.splitType === 'alternating' && !w.used);
            while (alts.length >= 2) {
                const [i1, i2] = [alts.shift(), alts.shift()];
                i1.used = i2.used = true;
                tasks.push({ type: 'paired_internal', items: [i1, i2], priority: Math.min(getPriority(i1.subject), getPriority(i2.subject)), classId: cId });
            }
        });
        // Пари різних вчителів (синій маркер)
        // Прохід 1: prio-1 з prio-1
        // Прохід 2: prio-2 з prio-2
        // Прохід 3: залишки між собою (різні пріоритети — теж паруємо!)
        let rem = flat.filter(w => w.classId === cId && w.currentHours === 0.5 && w.splitType === 'alternating' && !w.used);
        for (const targetPrio of [1, 2, null]) { // null = будь-який
            const pool = targetPrio !== null ? rem.filter(w => getPriority(w.subject) === targetPrio) : [...rem];
            while (pool.length >= 2) {
                const i1 = pool.shift();
                if (i1.used) continue;
                const i2 = pool.find(w => w.teacherId !== i1.teacherId && !w.used);
                if (!i2) continue;
                pool.splice(pool.indexOf(i2), 1);
                rem = rem.filter(w => w !== i1 && w !== i2);
                i1.used = i2.used = true;
                tasks.push({ type: 'paired_external', items: [i1, i2], priority: Math.min(getPriority(i1.subject), getPriority(i2.subject)), classId: cId });
            }
        }
        // Непарні
        flat.filter(w => w.classId === cId && w.currentHours === 0.5 && w.splitType === 'alternating' && !w.used).forEach(item => {
            item.used = true;
            const tObj = state.teachers.find(t => t.id === item.teacherId);
            const cObj = state.classes.find(c => c.id === item.classId);
            unpairedAlt.push({ subject: item.subject, teacher: tObj?.name || '?', className: cObj?.name || '?', teacherId: item.teacherId, classId: item.classId });
        });
    });

    flat.filter(w => !w.used).forEach(item => {
        item.used = true;
        tasks.push({ type: 'single', items: [item], priority: getPriority(item.subject), classId: item.classId });
    });

    // Overflow
    const overflowTasks = [];
    const slotsByClass  = {};
    classIds.forEach(cId => slotsByClass[cId] = 0);
    tasks.forEach(t => { if (slotsByClass[t.classId] !== undefined) slotsByClass[t.classId]++; });
    classIds.forEach(cId => {
        let excess = (slotsByClass[cId] || 0) - 35;
        if (excess <= 0) return;
        const groups = {};
        tasks.filter(t => t.classId === cId && t.priority > 1).forEach(t => {
            const key = t.items[0].subject + '_' + t.items[0].teacherId;
            if (!groups[key]) groups[key] = { tasks: [], priority: t.priority, subject: t.items[0].subject, teacher: state.teachers.find(tt => tt.id === t.items[0].teacherId)?.name || '?' };
            groups[key].tasks.push(t);
        });
        const sorted = Object.values(groups).sort((a, b) => b.priority - a.priority || a.tasks.length - b.tasks.length);
        const cls = state.classes.find(x => x.id === cId);
        for (const g of sorted) {
            if (excess <= 0) break;
            if (g.tasks.some(t => t.type !== 'single' && !t.items.every(it => getPriority(it.subject) > 1))) continue;
            const toRemove = Math.min(g.tasks.length, excess);
            for (let i = 0; i < toRemove; i++) {
                const c = g.tasks[i], idx = tasks.indexOf(c);
                if (idx !== -1) { tasks.splice(idx, 1); overflowTasks.push({ subject: g.subject, teacher: g.teacher, className: cls?.name || '?', priority: g.priority, type: c.type }); excess--; }
            }
        }
    });

    return { tasks, unpairedAlternating: unpairedAlt, overflowTasks };
}

// ================================================================
// FEASIBILITY CHECK
// ================================================================
function checkFeasibility(tasks) {
    const issues = [];
    const tNeed  = {};
    tasks.forEach(task => task.items.forEach(it => { tNeed[it.teacherId] = (tNeed[it.teacherId] || 0) + 1; }));
    Object.entries(tNeed).forEach(([tid, needed]) => {
        let avail = 0;
        for (let d = 0; d < 5; d++) for (let s = 1; s <= 7; s++) if (getTeacherStatus(tid, d, s) !== 2) avail++;
        if (needed > avail) { const n = state.teachers.find(t => t.id === tid)?.name || tid; issues.push(`👨‍🏫 <b>${n}</b>: потрібно ${needed} слотів, вільних лише ${avail}`); }
    });
    const cNeed = {};
    tasks.forEach(t => { cNeed[t.classId] = (cNeed[t.classId] || 0) + 1; });
    Object.entries(cNeed).forEach(([cid, needed]) => {
        if (needed > 35) { const n = state.classes.find(c => c.id === cid)?.name || cid; issues.push(`🏫 Клас <b>${n}</b>: ${needed} уроків > 35 максимум`); }
    });
    return issues;
}

// ================================================================
// isHardValid
// ================================================================
function isHardValid(task, first, d, s, schedule) {
    if (task.items.some(it => schedule.some(ls => ls.day === d && ls.slot === s && ls.teacherId === it.teacherId))) return false;
    {
        const tids = new Set(task.items.map(it => it.teacherId));
        if (schedule.some(ls => ls.day === d && ls.slot === s && ls.classId === first.classId && !tids.has(ls.teacherId))) return false;
    }
    if (task.items.length > 1) {
        for (let i = 1; i < task.items.length; i++) {
            const it = task.items[i];
            if (schedule.some(ls => ls.day === d && ls.slot === s && ls.teacherId === it.teacherId)) return false;
            if (getTeacherStatus(it.teacherId, d, s) === 2) return false;
        }
    }
    if (task.items.some(it => getTeacherStatus(it.teacherId, d, s) === 2)) return false;
    {
        const cls = state.classes.find(c => c.id === first.classId);
        if (cls && parseInt(cls.name) >= 1 && parseInt(cls.name) <= 4 && s > 4) return false;
    }
    const classSlots = [...new Set(schedule
        .filter(ls => ls.day === d && ls.classId === first.classId && ls.slot >= 1 && ls.slot <= 7)
        .map(ls => ls.slot))];
    if (classSlots.length > 0) {
        const mx = Math.max(...classSlots), mn = Math.min(...classSlots);
        if (s > mx + 1 || s < mn - 1) return false;
    }
    if (task.priority === 1) {
        const existing = schedule.filter(ls => ls.day === d && ls.classId === first.classId && ls.subject === first.subject);
        if (existing.length > 0) {
            const totalNeeded = state.workload.filter(w => w.classId === first.classId && w.subject.toLowerCase() === first.subject.toLowerCase()).reduce((sum, w) => sum + Math.ceil(parseFloat(w.hours)), 0);
            const freeDays = countFreeDays(first.teacherId);
            if (totalNeeded <= freeDays) return false;
            if (!existing.some(ls => Math.abs(ls.slot - s) === 1)) return false;
            if (existing.length >= 2) return false;
        }
    }
    if (schedule.filter(ls => ls.day === d && ls.classId === first.classId && ls.subject === first.subject).length >= 2) return false;
    if (task.priority === 1) {
        if (s >= 6) return false; // АБСОЛЮТНА ЗАБОРОНА 6-7
        if (s >= 4) {
            const csNow = [...new Set(schedule.filter(ls => ls.day === d && ls.classId === first.classId && ls.slot >= 1 && ls.slot <= 7).map(ls => ls.slot))];
            for (let es = 1; es < s; es++) {
                const tFree  = !schedule.some(ls => ls.day === d && ls.slot === es && task.items.some(it => it.teacherId === ls.teacherId));
                const cFree  = !schedule.some(ls => ls.day === d && ls.slot === es && ls.classId === first.classId);
                const notRed = !task.items.some(it => getTeacherStatus(it.teacherId, d, es) === 2);
                let ngOk = true;
                if (csNow.length > 0) { const mx = Math.max(...csNow), mn = Math.min(...csNow); if (es > mx + 1 || es < mn - 1) ngOk = false; }
                if (tFree && cFree && notRed && ngOk) return false;
            }
        }
    }
    {
        const tSlots = [...new Set(schedule.filter(ls => ls.day === d && ls.teacherId === first.teacherId && ls.slot >= 1 && ls.slot <= 7).map(ls => ls.slot))];

        // Ліміт: якщо вчитель вже має 5+ уроків в цей день і є менш завантажений день — заборона
        if (tSlots.length >= 5) {
            for (let od = 0; od < 5; od++) {
                if (od === d) continue;
                const allRed = [1,2,3,4,5].every(s2 => task.items.some(it => getTeacherStatus(it.teacherId, od, s2) === 2));
                if (allRed) continue; // цей день повністю заблокований — не рахуємо
                const tOther = schedule.filter(ls => ls.day === od && ls.teacherId === first.teacherId && 1 <= ls.slot && ls.slot <= 7).length;
                if (tOther < tSlots.length) return false; // є менш завантажений день
            }
        }

        if (tSlots.length > 0) {
            const all = [...tSlots, s].sort((a, b) => a - b);
            let gaps = 0, bigGap = false;
            for (let i = 1; i < all.length; i++) { const g = all[i] - all[i-1] - 1; if (g > 0) gaps++; if (g > 1) bigGap = true; }
            if (bigGap)   return false;  // вікно > 1 урок — заборона завжди
            if (gaps > 1) return false;  // більше 1 вікна — заборона
        }
    }
    const roomType = getRoomType(first.subject);
    if (roomType) {
        if (schedule.some(ls => ls.day === d && ls.slot === s && ls.classId !== first.classId && getRoomType(ls.subject) === roomType)) return false;
    }
    if (roomType === 'gym') {
        if (schedule.some(ls => ls.day === d && ls.classId === first.classId && getRoomType(ls.subject) === 'gym' && ls.slot !== s)) return false;
    }

    // Gym резервування: не-gym урок не може зайняти зарезервований слот
    // якщо для нього є альтернатива
    if (roomType !== 'gym' && _gymReserved.has(`${first.classId}|${d}|${s}`)) {
        for (let dd = 0; dd < 5; dd++) {
            for (let ss = 1; ss <= 7; ss++) {
                if (dd === d && ss === s) continue;
                if (_gymReserved.has(`${first.classId}|${dd}|${ss}`)) continue;
                const tFree = !schedule.some(ls => ls.day === dd && ls.slot === ss && task.items.some(it => it.teacherId === ls.teacherId));
                const cFree = !schedule.some(ls => ls.day === dd && ls.slot === ss && ls.classId === first.classId);
                const notRed = !task.items.some(it => getTeacherStatus(it.teacherId, dd, ss) === 2);
                if (tFree && cFree && notRed) return false; // є альтернатива — не займаємо резерв
            }
        }
    }

    if (isLaborSubject(first.subject)) {
        if (schedule.some(ls => ls.day === d && ls.slot === s && ls.classId !== first.classId && isLaborSubject(ls.subject))) return false;
    }
    if (task.priority === 3) {
        if (schedule.some(ls => ls.day === d && ls.classId === first.classId && ls.subject === first.subject)) return false;
    }
    if (task.priority === 2) {
        const sameDay = schedule.filter(ls => ls.day === d && ls.classId === first.classId && ls.subject === first.subject).length;
        if (sameDay >= 1) {
            const freeDays    = countFreeDays(first.teacherId);
            const totalNeeded = state.workload.filter(w => w.classId === first.classId && w.subject.toLowerCase() === first.subject.toLowerCase()).reduce((sum, w) => sum + Math.ceil(parseFloat(w.hours)), 0);
            if (totalNeeded <= freeDays) return false;
        }
    }
    return true;
}

// ================================================================
// SCORE
// ================================================================
function scoreSlot(task, first, d, s, schedule) {
    if (!isHardValid(task, first, d, s, schedule)) return Infinity;
    let score = 0;
    const priority = task.priority;
    if (task.items.some(it => getTeacherStatus(it.teacherId, d, s) === 1)) score += 800;
    {
        const cls = state.classes.find(c => c.id === first.classId);
        if (cls && parseInt(cls.name) >= 1 && parseInt(cls.name) <= 4) score += (s - 1) * 500;
    }
    if (priority === 1) {
        if      (s <= 3) score += 0;
        else if (s === 4) score += 80;
        else              score += 500;
    } else if (priority === 2) {
        score += (s - 1) * 25;
    } else {
        score += Math.max(0, 6 - s) * 400;
    }
    const tSlots = [...new Set(schedule.filter(ls => ls.day === d && ls.teacherId === first.teacherId && ls.slot >= 1 && ls.slot <= 7).map(ls => ls.slot))];
    if (tSlots.length > 0) {
        const minDist = Math.min(...tSlots.map(ts => Math.abs(ts - s)));
        if      (minDist === 1) score -= 400;
        else if (minDist === 2) score += 600;
        else                    score += minDist * 1000;
    } else {
        score += (s - 1) * 80;
    }
    const dayCount = schedule.filter(ls => ls.day === d && ls.teacherId === first.teacherId && ls.slot >= 1 && ls.slot <= 7).length;
    if      (dayCount >= 6) score += 4000;
    else if (dayCount >= 5) score += 1500;
    else if (dayCount >= 4) score += 300;
    const sameDay = schedule.filter(ls => ls.day === d && ls.classId === first.classId && ls.subject === first.subject);
    if (sameDay.length > 0) {
        const adj = sameDay.some(ls => Math.abs(ls.slot - s) === 1);
        score += priority === 1 ? (adj ? 200 : 3000) : (adj ? 300 : 4000);
    }
    const classToday = [...new Set(schedule.filter(ls => ls.day === d && ls.classId === first.classId && ls.slot >= 1 && ls.slot <= 7).map(ls => ls.slot))];
    if (classToday.length === 0 && s > 1) score += (s - 1) * 150;

    // Вчитель починає пізно — штраф (щоб Маланчук починав з слоту 1)
    const teacherToday = [...new Set(schedule.filter(ls => ls.day === d && ls.teacherId === first.teacherId && 1 <= ls.slot && ls.slot <= 7).map(ls => ls.slot))];
    if (teacherToday.length === 0 && s > 1 && priority <= 2) score += (s - 1) * 180;
    const sameSubjTeacher = schedule.filter(ls => ls.day === d && ls.teacherId === first.teacherId && ls.subject === first.subject && 1 <= ls.slot && ls.slot <= 7).map(ls => ls.slot);
    if (sameSubjTeacher.length > 0) {
        const minSubjDist = Math.min(...sameSubjTeacher.map(ts => Math.abs(ts - s)));
        if (minSubjDist === 1) score -= 300;
        else if (minSubjDist === 2) score += 100;
        else score += minSubjDist * 200;
    }
    // Бонус за суміжність інформатики (комп'ютерний клас — блоком)
    if (getRoomType(first.subject) === 'computer') {
        const compSlots = schedule.filter(ls =>
            ls.day === d && getRoomType(ls.subject) === 'computer' && 1 <= ls.slot && ls.slot <= 7
        ).map(ls => ls.slot);
        if (compSlots.length > 0) {
            const minDist = Math.min(...compSlots.map(ts => Math.abs(ts - s)));
            if (minDist === 1) score -= 600; // великий бонус — ставимо впритул
            else score += minDist * 300;     // штраф за розрив
        }
    }

    // Gym уроки — штраф якщо зала вже зайнята в цей слот іншим класом
    // (це вже є в isHardValid, але додаємо score penalty для "сусідніх" слотів)
    if (getRoomType(first.subject) === 'gym') {
        // Бонус за суміжність з іншими gym уроками того ж вчителя
        const gymSlots = schedule.filter(ls =>
            ls.day === d && ls.teacherId === first.teacherId &&
            getRoomType(ls.subject) === 'gym' && 1 <= ls.slot && ls.slot <= 7
        ).map(ls => ls.slot);
        if (gymSlots.length > 0) {
            const minDist = Math.min(...gymSlots.map(gs => Math.abs(gs - s)));
            if (minDist === 1) score -= 200;  // сусідній gym — бонус
            else score += minDist * 100;
        }
    }

    score += Math.random() * 10;
    return score;
}

// ================================================================
// GYM RESERVATION: резервуємо слоти зали для gym-вчителів
// Викликається перед phasedGreedy, результат зберігається глобально
// ================================================================
let _gymReserved = new Set(); // "classId|day|slot"

function buildGymReservations(tasks) {
    _gymReserved = new Set();

    // Gym задачі по вчителях і класах
    const gymByTeacher = {};
    tasks.filter(t => getRoomType(t.items[0].subject) === 'gym').forEach(t => {
        const tid = t.items[0].teacherId;
        const cid = t.classId;
        if (!gymByTeacher[tid]) gymByTeacher[tid] = {};
        if (!gymByTeacher[tid][cid]) gymByTeacher[tid][cid] = 0;
        gymByTeacher[tid][cid]++;
    });

    // Для кожного gym-вчителя і класу знаходимо можливі слоти
    Object.entries(gymByTeacher).forEach(([tid, classes]) => {
        const avail = state.teachers.find(t => t.id === tid)?.availability || [];

        Object.entries(classes).forEach(([cid, needed]) => {
            // Знаходимо всі слоти де вчитель може + зала теоретично може бути вільна
            const possibleSlots = [];
            for (let d = 0; d < 5; d++) {
                for (let s = 1; s <= 7; s++) {
                    if (avail[d]?.[s] === 2) continue; // червона зона
                    possibleSlots.push({ d, s });
                }
            }

            // Якщо можливих слотів мало — резервуємо
            if (possibleSlots.length <= needed + 5) {
                possibleSlots.forEach(({ d, s }) => {
                    _gymReserved.add(`${cid}|${d}|${s}`);
                });
            }
        });
    });
}

// ================================================================
// PRE-ASSIGNMENT: резервуємо слоти для дефіцитних вчителів
// Для кожного вчителя з навантаженням > 15 годин — позначаємо
// слоти які вони мають зайняти. prio-2/3 не можуть їх займати.
// ================================================================
function buildReservations(tasks) {
    const reserved = new Set(); // ключ: "teacherId|day|slot"

    // Для кожного вчителя рахуємо скільки prio-1 уроків потрібно
    const tPrio1 = {};
    tasks.filter(t => t.priority === 1).forEach(t => {
        t.items.forEach(it => {
            if (!tPrio1[it.teacherId]) tPrio1[it.teacherId] = { count: 0, classIds: new Set() };
            tPrio1[it.teacherId].count++;
            tPrio1[it.teacherId].classIds.add(it.classId);
        });
    });

    // Вчителі з дефіцитом (більше prio-1 ніж вільних слотів 1-4)
    Object.entries(tPrio1).forEach(([tid, info]) => {
        let free14 = 0;
        for (let d = 0; d < 5; d++)
            for (let s = 1; s <= 4; s++)
                if (getTeacherStatus(tid, d, s) !== 2) free14++;

        if (info.count > free14) {
            // Дефіцит — резервуємо ВСІ вільні слоти 1-4 цього вчителя
            for (let d = 0; d < 5; d++)
                for (let s = 1; s <= 5; s++)
                    if (getTeacherStatus(tid, d, s) !== 2)
                        reserved.add(`${tid}|${d}|${s}`);
        } else if (info.count >= 10) {
            // Багато годин — резервуємо слоти 1-4
            for (let d = 0; d < 5; d++)
                for (let s = 1; s <= 4; s++)
                    if (getTeacherStatus(tid, d, s) !== 2)
                        reserved.add(`${tid}|${d}|${s}`);
        }
    });

    return reserved;
}

// Перевіряємо чи ставимо prio-2/3 урок на зарезервований слот
function isReservedSlot(task, first, d, s, reserved) {
    if (task.priority === 1) return false; // prio-1 може ставитись куди завгодно
    // Перевіряємо чи цей слот зарезервований для будь-якого вчителя
    // Але блокуємо тільки якщо є prio-1 вчитель для ЦЬОГО класу в цей день
    // (щоб не перекривати весь розклад)
    return false; // Поки вимкнено — використовуємо тільки через score
}

// ================================================================
// PHASED GREEDY v2
// Ключова ідея: спочатку ВСІ prio-1 всіх класів і вчителів,
// потім prio-2, потім prio-3. Всередині prio-1 — round-robin
// по вчителях щоб рівномірно розподілити дефіцитних.
// ================================================================
function phasedGreedy(tasks, schedule) {
    const unplaced   = [];
    const primaryIds = new Set(state.classes.filter(c => {
        const n = parseInt(c.name); return n >= 1 && n <= 4;
    }).map(c => c.id));

    // Дефіцит вчителя = prio-1 задач - вільних слотів 1-4
    const earlyFree = {}, prio1Count = {};
    state.teachers.forEach(t => {
        let f = 0;
        for (let d = 0; d < 5; d++) for (let s = 1; s <= 4; s++)
            if (getTeacherStatus(t.id, d, s) !== 2) f++;
        earlyFree[t.id] = f;
    });
    tasks.filter(t => t.priority === 1).forEach(t => {
        t.items.forEach(it => {
            prio1Count[it.teacherId] = (prio1Count[it.teacherId] || 0) + 1;
        });
    });

    const dayOrder = shuffleArr([0, 1, 2, 3, 4]);

    // Розміщення prio-1: строго 1-4, потім 5, потім будь-який
    function placePrio1(task) {
        const first = task.items[0];
        // Дні: спочатку де вчитель найменш завантажений на 1-4
        // І де клас має найменше уроків (більше шансів знайти місце)
        const days = [...dayOrder].sort((a, b) => {
            const tA_all = schedule.filter(ls => ls.day === a && ls.teacherId === first.teacherId && 1 <= ls.slot && ls.slot <= 7).length;
            const tB_all = schedule.filter(ls => ls.day === b && ls.teacherId === first.teacherId && 1 <= ls.slot && ls.slot <= 7).length;
            const tA_14  = schedule.filter(ls => ls.day === a && ls.teacherId === first.teacherId && 1 <= ls.slot && ls.slot <= 4).length;
            const tB_14  = schedule.filter(ls => ls.day === b && ls.teacherId === first.teacherId && 1 <= ls.slot && ls.slot <= 4).length;
            const cA = new Set(schedule.filter(ls => ls.day === a && ls.classId === first.classId && 1 <= ls.slot && ls.slot <= 7).map(ls => ls.slot)).size;
            const cB = new Set(schedule.filter(ls => ls.day === b && ls.classId === first.classId && 1 <= ls.slot && ls.slot <= 7).map(ls => ls.slot)).size;
            return (tA_all * 3 + tA_14 + cA) - (tB_all * 3 + tB_14 + cB);
        });
        // Спроба 1: слоти 1-4
        for (const d of days) {
            for (let s = 1; s <= 4; s++) {
                if (!isHardValid(task, first, d, s, schedule)) continue;
                commitTask(task, d, s, schedule); return true;
            }
        }
        // Спроба 2: слот 5
        for (const d of days) {
            if (!isHardValid(task, first, d, 5, schedule)) continue;
            commitTask(task, d, 5, schedule); return true;
        }
        // Спроба 3: будь-який слот
        return greedyPlace(task, schedule);
    }

    // РАУНД A: початкові класи 1-4 (prio-1 першими)
    const primTasks = shuffleArr(tasks.filter(t => primaryIds.has(t.classId)));
    primTasks.sort((a, b) => a.priority - b.priority);
    for (const task of primTasks) {
        if (!(task.priority === 1 ? placePrio1(task) : greedyPlace(task, schedule)))
            unplaced.push(task);
    }

    // РАУНД B: prio-1 старших класів
    // Round-robin по вчителях: по одному уроку за раз
    // Порядок: дефіцитні вчителі першими (prio1Count - earlyFree)
    const seniorP1 = tasks.filter(t => t.priority === 1 && !primaryIds.has(t.classId));
    seniorP1.sort((a, b) => {
        const aD = Math.max(...a.items.map(it => (prio1Count[it.teacherId]||0) - (earlyFree[it.teacherId]||0)));
        const bD = Math.max(...b.items.map(it => (prio1Count[it.teacherId]||0) - (earlyFree[it.teacherId]||0)));
        return bD - aD;
    });

    const p1ByTeacher = {};
    seniorP1.forEach(t => {
        const tid = t.items[0].teacherId;
        if (!p1ByTeacher[tid]) p1ByTeacher[tid] = [];
        p1ByTeacher[tid].push(t);
    });

    let anyLeft = true;
    while (anyLeft) {
        anyLeft = false;
        for (const queue of Object.values(p1ByTeacher)) {
            if (queue.length === 0) continue;
            anyLeft = true;
            const task = queue.shift();
            if (!placePrio1(task)) unplaced.push(task);
        }
    }

    // Після prio-1: виштовхуємо вгору і виправляємо порядок мова/літ
    priorityPushUp(schedule);
    subjectOrderFix(schedule);

    // РАУНД C: prio-2 (без gym)
    for (const task of shuffleArr(tasks.filter(t => t.priority === 2 && getRoomType(t.items[0].subject) !== 'gym'))) {
        if (!greedyPlace(task, schedule)) unplaced.push(task);
    }

    // РАУНД D: GYM — обмежені вчителі першими (Крайник перед Машкаринцем)
    const gymTasks = tasks.filter(t => getRoomType(t.items[0].subject) === 'gym');
    gymTasks.sort((a, b) => {
        let aF=0, bF=0;
        for(let d=0;d<5;d++) for(let s=1;s<=7;s++) {
            if(getTeacherStatus(a.items[0].teacherId,d,s)!==2) aF++;
            if(getTeacherStatus(b.items[0].teacherId,d,s)!==2) bF++;
        }
        return aF - bF; // менше вільних слотів → першими
    });
    for (const task of gymTasks) {
        if (!greedyPlace(task, schedule)) unplaced.push(task);
    }

    // РАУНД E: prio-3 не-gym
    for (const task of shuffleArr(tasks.filter(t => t.priority >= 3 && getRoomType(t.items[0].subject) !== 'gym'))) {
        if (!greedyPlace(task, schedule)) unplaced.push(task);
    }

    // РАУНД F: pushUp + retry
    priorityPushUp(schedule);
    gapFix(schedule);
    const retry = [...unplaced]; unplaced.length = 0;
    for (const task of retry) {
        if (!greedyPlace(task, schedule)) unplaced.push(task);
    }

    return unplaced;
}

function greedyPlace(task, schedule) {
    const first = task.items[0];
    let best = null, bestScore = Infinity;
    for (let d = 0; d < 5; d++) for (let s = 1; s <= 7; s++) {
        if (!isHardValid(task, first, d, s, schedule)) continue;
        const sc = scoreSlot(task, first, d, s, schedule);
        if (sc < bestScore) { bestScore = sc; best = { d, s }; }
    }
    if (best) { commitTask(task, best.d, best.s, schedule); return true; }
    return false;
}

// ================================================================
// SUBJECT ORDER FIX
// ================================================================
function subjectOrderFix(schedule) {
    const isLang = s => { const n = s.toLowerCase(); return (n.includes('мов') || n.includes('англ') || n.includes('нім')) && !n.includes('літ') && !n.includes('зарубіжн'); };
    const isLit  = s => { const n = s.toLowerCase(); return n.includes('літ') || n.includes('зарубіжн'); };
    for (let pass = 0; pass < 20; pass++) {
        let changed = false;
        for (let d = 0; d < 5; d++) {
            const tIds = [...new Set(schedule.filter(ls => ls.day === d && !ls.isManual).map(ls => ls.teacherId))];
            for (const tid of tIds) {
                const cIds = [...new Set(schedule.filter(ls => ls.day === d && ls.teacherId === tid).map(ls => ls.classId))];
                for (const cid of cIds) {
                    const lessons = schedule.filter(ls => ls.day === d && ls.teacherId === tid && ls.classId === cid && !ls.isManual);
                    for (const lang of lessons.filter(ls => isLang(ls.subject)))
                        for (const lit of lessons.filter(ls => isLit(ls.subject)))
                            if (lang.slot > lit.slot && safeSwap(lang, lit, schedule)) changed = true;
                }
            }
        }
        if (!changed) break;
    }
}

// ================================================================
// PRIORITY PUSH UP
// ================================================================
function priorityPushUp(schedule) {
    for (let pass = 0; pass < 60; pass++) {
        let changed = false;
        const late = schedule.filter(ls => !ls.isManual && getPriority(ls.subject) === 1 && ls.slot >= 5);
        for (const lateL of late) {
            const pseudo = { items: [lateL], priority: 1, type: lateL.pairType || 'single' };
            let done = false;

            // Варіант A: swap в тому ж класі/дні з нижчим пріоритетом
            const candidatesA = schedule.filter(ls =>
                !ls.isManual && ls.day === lateL.day && ls.classId === lateL.classId &&
                ls.slot < lateL.slot && getPriority(ls.subject) > 1
            ).sort((a, b) => a.slot - b.slot);
            for (const c of candidatesA) { if (safeSwap(lateL, c, schedule)) { changed = true; done = true; break; } }
            if (done) break;

            // Варіант B: у тому ж класі але шукаємо ширше — будь-який ранній слот
            // де вчитель вільний і клас може прийняти (через swap з блокером)
            if (!done) {
                for (let targetSlot = 1; targetSlot <= 4 && !done; targetSlot++) {
                    // Хто стоїть на targetSlot в цьому класі?
                    const blocker = schedule.find(ls =>
                        ls.day === lateL.day && ls.slot === targetSlot &&
                        ls.classId === lateL.classId && !ls.isManual &&
                        getPriority(ls.subject) > 1 && ls.teacherId !== lateL.teacherId
                    );
                    if (!blocker) {
                        // Слот вільний для класу — перевіримо вчителя
                        const withoutLate = schedule.filter(x => x !== lateL);
                        if (isHardValid(pseudo, lateL, lateL.day, targetSlot, withoutLate)) {
                            const idx = schedule.indexOf(lateL);
                            if (idx !== -1) {
                                schedule.splice(idx, 1);
                                schedule.push({ ...lateL, id: uid('sch'), day: lateL.day, slot: targetSlot });
                                changed = true; done = true;
                            }
                        }
                    } else {
                        // Є блокер — свапаємо lateL з блокером
                        if (safeSwap(lateL, blocker, schedule)) { changed = true; done = true; }
                    }
                }
            }
            if (done) break;
            const oldDay = lateL.day;
            const idx    = schedule.indexOf(lateL);
            if (idx !== -1) {
                schedule.splice(idx, 1);
                for (let d = 0; d < 5 && !done; d++) {
                    if (d === oldDay) continue;
                    for (let s = 1; s <= 4 && !done; s++) {
                        if (!isHardValid(pseudo, lateL, d, s, schedule)) continue;
                        const clsOld = [...new Set(schedule.filter(ls => ls.day === oldDay && ls.classId === lateL.classId && 1 <= ls.slot && ls.slot <= 7).map(ls => ls.slot))].sort((a, b) => a - b);
                        let clsOk = true;
                        for (let i = 1; i < clsOld.length; i++) { if (clsOld[i] - clsOld[i-1] > 2) { clsOk = false; break; } }
                        if (!clsOk) continue;
                        const tOld = [...new Set(schedule.filter(ls => ls.day === oldDay && ls.teacherId === lateL.teacherId && 1 <= ls.slot && ls.slot <= 7).map(ls => ls.slot))].sort((a, b) => a - b);
                        let tOldOk = true, tGaps = 0;
                        for (let i = 1; i < tOld.length; i++) { const g = tOld[i] - tOld[i-1] - 1; if (g > 1) { tOldOk = false; break; } if (g > 0) tGaps++; }
                        if (!tOldOk || tGaps > 1) continue;
                        schedule.push({ ...lateL, id: uid('sch'), day: d, slot: s });
                        changed = true; done = true;
                    }
                }
                if (!done) schedule.splice(idx, 0, lateL);
            }
            if (done) break;
        }
        if (!changed) break;
    }
}

// ================================================================
// SELF REORDER
// ================================================================
function selfReorder(schedule) {
    for (let pass = 0; pass < 20; pass++) {
        let changed = false;
        const tIds = [...new Set(schedule.filter(ls => !ls.isManual && 1 <= ls.slot && ls.slot <= 7).map(ls => ls.teacherId))];
        for (const tid of tIds) {
            for (let d = 0; d < 5; d++) {
                const dayL = schedule.filter(ls => ls.day === d && ls.teacherId === tid && !ls.isManual && 1 <= ls.slot && ls.slot <= 7);
                if (dayL.length < 2) continue;
                for (const late of dayL.filter(ls => getPriority(ls.subject) === 1 && ls.slot >= 4)) {
                    for (const early of dayL.filter(ls => getPriority(ls.subject) > 1 && ls.slot < late.slot)) {
                        const sL = late.slot, sE = early.slot;
                        late.slot = sE; early.slot = sL;
                        const without = schedule.filter(x => x !== late && x !== early);
                        const pL = { items: [late],  priority: getPriority(late.subject),  type: late.pairType  || 'single' };
                        const pE = { items: [early], priority: getPriority(early.subject), type: early.pairType || 'single' };
                        if (isHardValid(pL, late, d, sE, without) && isHardValid(pE, early, d, sL, without)) { changed = true; break; }
                        late.slot = sL; early.slot = sE;
                    }
                    if (changed) break;
                }
                if (changed) break;
            }
            if (changed) break;
        }
        if (!changed) break;
    }
}

// ================================================================
// GAP FIX
// ================================================================
function gapFix(schedule) {
    function tGaps(tid, d) {
        const sl = [...new Set(schedule.filter(ls=>ls.day===d&&ls.teacherId===tid&&1<=ls.slot&&ls.slot<=7).map(ls=>ls.slot))].sort((a,b)=>a-b);
        let gaps=0,big=false;
        for(let i=1;i<sl.length;i++){const g=sl[i]-sl[i-1]-1;if(g>0)gaps++;if(g>1)big=true;}
        return {gaps,big,slots:sl};
    }

    for (let pass = 0; pass < 60; pass++) {
        let changed = false;
        const tIds = [...new Set(schedule.filter(ls=>!ls.isManual&&1<=ls.slot&&ls.slot<=7).map(ls=>ls.teacherId))];

        for (const tid of tIds) {
            for (let d = 0; d < 5; d++) {
                const {gaps, big, slots:tSlots} = tGaps(tid, d);
                if (!big && gaps === 0) continue;

                const gapList = [];
                for(let i=0;i+1<tSlots.length;i++){
                    const g=tSlots[i+1]-tSlots[i]-1;
                    if(g>0) gapList.push({lo:tSlots[i],hi:tSlots[i+1],size:g});
                }
                gapList.sort((a,b)=>b.size-a.size);

                for (const gap of gapList) {
                    const afterL  = schedule.find(ls=>ls.day===d&&ls.teacherId===tid&&ls.slot===gap.hi&&!ls.isManual);
                    const beforeL = schedule.find(ls=>ls.day===d&&ls.teacherId===tid&&ls.slot===gap.lo&&!ls.isManual);

                    // S1: swap afterL ↔ урок на gap.lo+1
                    if (afterL) {
                        for (const cand of schedule.filter(ls=>ls.day===d&&ls.slot===gap.lo+1&&!ls.isManual&&ls.teacherId!==tid)) {
                            if (safeSwap(afterL, cand, schedule)) { changed = true; break; }
                        }
                    }
                    if (changed) break;

                    // S2: swap beforeL ↔ урок на gap.hi-1
                    if (beforeL) {
                        for (const cand of schedule.filter(ls=>ls.day===d&&ls.slot===gap.hi-1&&!ls.isManual&&ls.teacherId!==tid)) {
                            if (safeSwap(beforeL, cand, schedule)) { changed = true; break; }
                        }
                    }
                    if (changed) break;

                    // S3: перемістити afterL в інший день
                    if (afterL) {
                        const pL = {items:[afterL],priority:getPriority(afterL.subject),type:afterL.pairType||'single'};
                        const idxA = schedule.indexOf(afterL);
                        if (idxA !== -1) {
                            schedule.splice(idxA, 1);
                            let moved = false;
                            for (let nd=0;nd<5&&!moved;nd++) {
                                if (nd===d) continue;
                                for (let ns=1;ns<=7&&!moved;ns++) {
                                    if (!isHardValid(pL, afterL, nd, ns, schedule)) continue;
                                    const {gaps:ng, big:nb} = tGaps(tid, d);
                                    if (nb || ng > gaps) continue;
                                    const clsOld = [...new Set(schedule.filter(ls=>ls.day===d&&ls.classId===afterL.classId&&1<=ls.slot&&ls.slot<=7).map(ls=>ls.slot))].sort((a,b)=>a-b);
                                    let clsOk=true;
                                    for(let i=1;i<clsOld.length;i++){if(clsOld[i]-clsOld[i-1]>2){clsOk=false;break;}}
                                    if(!clsOk) continue;
                                    schedule.push({...afterL,id:uid('sch'),day:nd,slot:ns});
                                    changed=true; moved=true;
                                }
                            }
                            if (!moved) schedule.splice(idxA, 0, afterL);
                        }
                    }
                    if (changed) break;
                }
                // продовжуємо до наступного вчителя без break
            }
        }
        if (!changed) break;
    }
}

// ================================================================
// SAFE SWAP
// ================================================================
function safeSwap(lA, lB, schedule) {
    if (lA.day !== lB.day || lA.teacherId === lB.teacherId) return false;
    const d = lA.day, sA = lA.slot, sB = lB.slot;
    if (schedule.some(ls => ls !== lA && ls.day === d && ls.slot === sB && ls.teacherId === lA.teacherId)) return false;
    if (schedule.some(ls => ls !== lB && ls.day === d && ls.slot === sA && ls.teacherId === lB.teacherId)) return false;
    if (getTeacherStatus(lA.teacherId, d, sB) === 2) return false;
    if (getTeacherStatus(lB.teacherId, d, sA) === 2) return false;
    lA.slot = sB; lB.slot = sA;
    const without = schedule.filter(x => x !== lA && x !== lB);
    const pA = { items: [lA], priority: getPriority(lA.subject), type: lA.pairType || 'single' };
    const pB = { items: [lB], priority: getPriority(lB.subject), type: lB.pairType || 'single' };
    if (isHardValid(pA, lA, d, sB, without) && isHardValid(pB, lB, d, sA, without)) return true;
    lA.slot = sA; lB.slot = sB;
    return false;
}

// ================================================================
// EVACUATION — з параметром maxDepth
// repairUnplaced: maxDepth=3
// localSearchRepair: maxDepth=6
// ================================================================
function tryEvacuate(lesson, blockedDay, blockedSlot, schedule, depth, maxDepth) {
    if (depth > maxDepth || lesson.isManual) return null;
    const idx = schedule.indexOf(lesson);
    if (idx === -1) return null;
    schedule.splice(idx, 1);

    const pseudo = { items: [lesson], priority: getPriority(lesson.subject), type: lesson.pairType || 'single' };
    const slots = [];
    for (let d = 0; d < 5; d++) for (let s = 1; s <= 7; s++) slots.push({ d, s });
    shuffleArr(slots);

    for (const { d, s } of slots) {
        if (d === blockedDay && s === blockedSlot) continue;
        if (!isHardValid(pseudo, lesson, d, s, schedule)) continue;
        const tC = schedule.find(ls => ls.day === d && ls.slot === s && ls.teacherId === lesson.teacherId);
        const cC = schedule.find(ls => ls.day === d && ls.slot === s && ls.classId === lesson.classId);
        if (!tC && !cC) {
            const moved = { ...lesson, id: uid('tmp'), day: d, slot: s };
            schedule.push(moved);
            return { orig: lesson, moved };
        }
        if (depth < maxDepth) {
            const blocker = tC || cC;
            if (!blocker.isManual) {
                const cascade = tryEvacuate(blocker, d, s, schedule, depth + 1, maxDepth);
                if (cascade) {
                    const conflict = schedule.some(ls => ls.day === d && ls.slot === s && (ls.teacherId === lesson.teacherId || ls.classId === lesson.classId));
                    if (!conflict && isHardValid(pseudo, lesson, d, s, schedule)) {
                        const moved = { ...lesson, id: uid('tmp'), day: d, slot: s };
                        schedule.push(moved);
                        return { orig: lesson, moved, cascade };
                    }
                    rollbackEvac(cascade, schedule);
                }
            }
        }
    }

    schedule.splice(idx, 0, lesson);
    return null;
}

function rollbackEvac(result, schedule) {
    if (!result) return;
    if (result.cascade) rollbackEvac(result.cascade, schedule);
    const mi = schedule.indexOf(result.moved);
    if (mi !== -1) schedule.splice(mi, 1);
    if (!schedule.includes(result.orig)) schedule.push(result.orig);
}

function commitEvac(result, schedule) {
    if (!result) return;
    if (result.cascade) commitEvac(result.cascade, schedule);
    result.moved.id = uid('sch');
    // Видаляємо оригінал — шукаємо і за посиланням, і за ключем
    const oi = schedule.indexOf(result.orig);
    if (oi !== -1) {
        schedule.splice(oi, 1);
    } else {
        // Якщо посилання не знайшлось — шукаємо за ключем щоб уникнути дублікатів
        const key = result.orig.teacherId + '|' + result.orig.classId + '|' +
                    result.orig.subject + '|' + result.orig.day + '|' + result.orig.slot;
        for (let i = schedule.length - 1; i >= 0; i--) {
            const ls = schedule[i];
            if (ls.teacherId === result.orig.teacherId && ls.classId === result.orig.classId &&
                ls.subject === result.orig.subject && ls.day === result.orig.day &&
                ls.slot === result.orig.slot && ls !== result.moved) {
                schedule.splice(i, 1);
                break;
            }
        }
    }
}

function buildCandidates(task, first, schedule, maxBlockers) {
    const result = [];
    for (let d = 0; d < 5; d++) {
        if (task.items.every(it => [1,2,3,4,5,6,7].every(s => getTeacherStatus(it.teacherId, d, s) === 2))) continue;
        for (let s = 1; s <= 7; s++) {
            if (task.items.some(it => getTeacherStatus(it.teacherId, d, s) === 2)) continue;
            const cs = [...new Set(schedule.filter(ls => ls.day === d && ls.classId === first.classId && 1 <= ls.slot && ls.slot <= 7).map(ls => ls.slot))];
            if (cs.length > 0) { const mx = Math.max(...cs), mn = Math.min(...cs); if (s > mx+1 || s < mn-1) continue; }
            const bT = schedule.filter(ls => ls.day === d && ls.slot === s && task.items.some(it => it.teacherId === ls.teacherId) && !ls.isManual);
            const bC = schedule.filter(ls => ls.day === d && ls.slot === s && ls.classId === first.classId && !ls.isManual);
            const blockers = [...new Map([...bT, ...bC].map(b => [b.id, b])).values()];

            // Стандартний ліміт блокерів
            if (blockers.length <= maxBlockers) {
                result.push({ d, s, blockers, score: s + d * 7 });
                continue;
            }

            // Якщо клас повний (7 уроків) — дозволяємо більше блокерів
            // але тільки якщо всі блокери можна евакуювати (prio-3 або prio-2)
            // і їх не більше maxBlockers+2
            if (cs.length >= 6 && blockers.length <= maxBlockers + 2) {
                const allEvacuable = blockers.every(b => !b.isManual && getPriority(b.subject) >= 2);
                if (allEvacuable) result.push({ d, s, blockers, score: s + d * 7 + 50 }); // штраф за складність
            }
        }
    }
    return result.sort((a, b) => a.blockers.length - b.blockers.length || a.score - b.score);
}

function countValidSlots(task, schedule) {
    const first = task.items[0]; let c = 0;
    for (let d = 0; d < 5; d++) for (let s = 1; s <= 7; s++) if (isHardValid(task, first, d, s, schedule)) c++;
    return c;
}

// ================================================================
// REPAIR — адаптивна глибина:
//   > 20 нерозміщених → глибина 3, блокери 4
//   8-20              → глибина 5, блокери 3
//   ≤ 7               → глибина 7, блокери 2
// Якщо noProgress > 60 — виходимо (немає сенсу крутитись)
// ================================================================
async function repairUnplaced(unplacedTasks, schedule, startTime, restart, total) {
    let noProgress = 0;
    const MAX = 1500;

    // Лічильник невдалих спроб для кожної задачі
    const taskFailCount = new Map();

    for (let iter = 0; iter < MAX && unplacedTasks.length > 0; iter++) {
        if (_generatorStop) break;

        const remaining = unplacedTasks.length;
        const depth    = remaining > 20 ? 3 : remaining > 7 ? 5 : 7;
        const maxBlock = remaining > 20 ? 4 : remaining > 7 ? 3 : 2;

        if (iter % 8 === 0) {
            updateLoader(restart, Date.now()-startTime,
                total-remaining, total, remaining,
                `Рестарт ${restart} | Repair iter ${iter} | Залишилось: ${remaining} | Глибина: ${depth}`);
            await tick();
        }

        // Якщо надто довго без прогресу — виходимо
        if (noProgress > 80) break;

        // Кожні 25 ітерацій без прогресу — перемішуємо
        if (noProgress > 0 && noProgress % 25 === 0) {
            shuffleArr(unplacedTasks);
            const tmp = [...unplacedTasks]; unplacedTasks.length = 0;
            for (const t of tmp) { if (!greedyPlace(t, schedule)) unplacedTasks.push(t); }
            if (unplacedTasks.length < tmp.length) { noProgress = 0; continue; }
        }

        if (iter % 7 === 0)
            unplacedTasks.sort((a, b) => countValidSlots(a, schedule) - countValidSlots(b, schedule));

        const task = unplacedTasks[0];
        const first = task.items[0];
        const taskKey = first.teacherId + '|' + first.classId + '|' + first.subject;

        if (greedyPlace(task, schedule)) {
            unplacedTasks.shift(); noProgress = 0;
            taskFailCount.delete(taskKey);
            continue;
        }

        const fails = (taskFailCount.get(taskKey) || 0) + 1;
        taskFailCount.set(taskKey, fails);

        // Кожні 8 спроб: якщо 0 валідних слотів — задача заблокована поточним розкладом
        if (fails % 8 === 0) {
            const vc = countValidSlots(task, schedule);
            if (vc === 0) {
                if (unplacedTasks.length > 1) {
                    unplacedTasks.push(unplacedTasks.shift());
                    noProgress++;
                    continue;
                }
                break; // єдина задача без місця — виходимо на рестарт
            }
        }

        // 40 невдалих спроб — відкладаємо
        if (fails > 40 && unplacedTasks.length > 1) {
            unplacedTasks.push(unplacedTasks.shift());
            noProgress++;
            continue;
        }

        const candidates = buildCandidates(task, first, schedule, maxBlock);
        let repaired = false;

        for (const { d, s, blockers } of candidates) {
            const evacuated = []; let ok = true;
            for (const blocker of blockers) {
                const result = tryEvacuate(blocker, d, s, schedule, 0, depth);
                if (result) evacuated.push(result);
                else { ok = false; break; }
            }
            if (!ok) { for (const r of evacuated) rollbackEvac(r, schedule); continue; }

            if (isHardValid(task, first, d, s, schedule)) {
                commitTask(task, d, s, schedule);
                for (const r of evacuated) commitEvac(r, schedule);
                unplacedTasks.shift(); repaired = true; noProgress = 0;
                taskFailCount.delete(taskKey);
                break;
            } else {
                for (const r of evacuated) rollbackEvac(r, schedule);
            }
        }

        if (!repaired) { noProgress++; unplacedTasks.push(unplacedTasks.shift()); }
    }
}

// ================================================================
// LOCAL SEARCH REPAIR
// Запускається на найкращому відомому розкладі.
// Перед кожною спробою: gapFix + priorityPushUp.
// Адаптивна глибина як в repairUnplaced.
// Вихід: якщо 60 ітерацій без прогресу або 20с.
// ================================================================
async function localSearchRepair(unplacedTasks, schedule, startTime, restart, total) {
    const lsStart = Date.now();
    let noProgress = 0;
    const MAX = 1000;

    // Спочатку спробуємо pushUp і gapFix — можливо деякі одразу вмістяться
    priorityPushUp(schedule);
    gapFix(schedule);
    subjectOrderFix(schedule);
    const quickPlaced = [...unplacedTasks];
    unplacedTasks.length = 0;
    for (const t of quickPlaced) {
        if (!greedyPlace(t, schedule)) unplacedTasks.push(t);
    }
    if (unplacedTasks.length === 0) return;

    const lsTaskFails = new Map();
    for (let iter = 0; iter < MAX && unplacedTasks.length > 0; iter++) {
        if (_generatorStop) break;

        // Виходимо якщо застрягли
        if (noProgress > 60 || Date.now() - lsStart > 15000) break;

        const remaining = unplacedTasks.length;
        const depth    = remaining > 20 ? 3 : remaining > 7 ? 5 : 7;
        const maxBlock = remaining > 20 ? 4 : remaining > 7 ? 3 : 2;

        if (iter % 5 === 0) {
            updateLoader(restart, Date.now()-startTime,
                total-remaining, total, remaining,
                `🔍 LS iter ${iter} | Залишилось: ${remaining} | Глибина: ${depth}`);
            await tick();
        }

        if (iter % 6 === 0)
            unplacedTasks.sort((a, b) => countValidSlots(a, schedule) - countValidSlots(b, schedule));

        const task = unplacedTasks[0];
        const first = task.items[0];

        if (greedyPlace(task, schedule)) {
            unplacedTasks.shift(); noProgress = 0;
            lsTaskFails.delete(task);
            continue;
        }

        // Перевіряємо чи є взагалі валідні слоти
        const lsFails = (lsTaskFails.get(task) || 0) + 1;
        lsTaskFails.set(task, lsFails);
        if (lsFails % 10 === 0 && countValidSlots(task, schedule) === 0) {
            if (unplacedTasks.length > 1) {
                unplacedTasks.push(unplacedTasks.shift());
                noProgress++;
                continue;
            }
            break;
        }

        const candidates = buildCandidates(task, first, schedule, maxBlock);
        let repaired = false;

        for (const { d, s, blockers } of candidates) {
            const evacuated = []; let ok = true;
            for (const blocker of blockers) {
                const result = tryEvacuate(blocker, d, s, schedule, 0, depth);
                if (result) evacuated.push(result);
                else { ok = false; break; }
            }
            if (!ok) { for (const r of evacuated) rollbackEvac(r, schedule); continue; }

            if (isHardValid(task, first, d, s, schedule)) {
                commitTask(task, d, s, schedule);
                for (const r of evacuated) commitEvac(r, schedule);
                unplacedTasks.shift(); repaired = true; noProgress = 0;
                break;
            } else {
                for (const r of evacuated) rollbackEvac(r, schedule);
            }
        }

        if (!repaired) {
            noProgress++;
            // Відкладаємо якщо ця задача безнадійна прямо зараз
            const lsKey = first.teacherId + '|' + first.classId + '|' + first.subject;
            unplacedTasks.push(unplacedTasks.shift());
        }
    }
}

// ================================================================
// COMMIT + HELPERS
// ================================================================
function commitTask(task, d, s, schedule) {
    task.items.forEach(it => {
        schedule.push({ id: uid('sch'), teacherId: it.teacherId, classId: it.classId, subject: it.subject, day: d, slot: s, isAlternating: (it.currentHours === 0.5 && it.splitType === 'alternating'), pairType: task.type });
    });
}
function countFreeSlots(teacherId) { let c = 0; for (let d = 0; d < 5; d++) for (let s = 1; s <= 7; s++) if (getTeacherStatus(teacherId, d, s) !== 2) c++; return c; }
function countFreeDays(teacherId) { let c = 0; for (let d = 0; d < 5; d++) if (Array.from({length:7},(_,s)=>getTeacherStatus(teacherId,d,s+1)).some(v=>v!==2)) c++; return c; }
function isLaborSubject(subject) { if (!subject) return false; const n = subject.toLowerCase(); return n.includes('труд') || n.includes('технол'); }
function getTeacherStatus(teacherId, day, slot) { const t = state.teachers.find(t=>t.id===teacherId); if (!t||!t.availability||!t.availability[day]) return 0; const v = t.availability[day][slot]; if (v===true) return 0; if (v===false) return 2; return v||0; }
function getPriority(subjectName) { if (!subjectName) return 100; const n = subjectName.toLowerCase(); for (const [key,level] of Object.entries(subjectPriorities)) if (n.includes(key)) return level; return 10; }
function getSubjectCode(subject) { if (!subject) return ''; const words = subject.trim().split(/\s+/); return words.length >= 2 ? (words[0][0]+words[1][0]).toUpperCase() : subject.substring(0,2).toUpperCase(); }

// ================================================================
// LOADER + REPORTS
// ================================================================
function showLoader() {
    let el = document.getElementById('gen-loader');
    if (!el) {
        el = document.createElement('div'); el.id = 'gen-loader';
        el.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        el.innerHTML = `<div class="bg-white rounded-2xl shadow-2xl p-8 w-[460px] space-y-4">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <h2 class="text-lg font-bold text-slate-800">Генерація розкладу v9...</h2>
            </div>
            <div class="text-[11px] text-slate-500 italic min-h-[16px]" id="loader-phase"></div>
            <div class="space-y-2 text-sm text-slate-600">
                <div class="flex justify-between"><span>Час:</span><span id="loader-time" class="font-bold text-blue-700">0с</span></div>
                <div class="flex justify-between"><span>Розміщено:</span><span id="loader-placed" class="font-bold text-green-700">0</span></div>
                <div class="flex justify-between"><span>Залишилось:</span><span id="loader-unplaced" class="font-bold text-orange-600">—</span></div>
                <div class="flex justify-between border-t pt-2"><span class="text-slate-500">🏆 Найкращий:</span><span id="loader-best" class="font-bold text-purple-700">—</span></div>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div id="loader-bar" class="h-3 bg-blue-500 rounded-full transition-all" style="width:0%"></div>
            </div>
            <button onclick="stopGenerator()" class="w-full py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition text-sm">
                ⏹ Зупинити та зберегти найкращий результат
            </button>
        </div>`;
        document.body.appendChild(el);
    }
    el.style.display = 'flex';
}
function updateLoader(restart, ms, placed, total, unplaced, phase) {
    const g = id => document.getElementById(id);
    if (g('loader-time'))     g('loader-time').textContent     = (ms/1000).toFixed(1)+'с';
    if (g('loader-placed'))   g('loader-placed').textContent   = `${placed} / ${total}`;
    if (g('loader-unplaced')) g('loader-unplaced').textContent = unplaced > 0 ? String(unplaced) : '—';
    if (g('loader-phase'))    g('loader-phase').textContent    = phase || '';
    if (g('loader-bar'))      g('loader-bar').style.width      = total > 0 ? `${Math.round(placed/total*100)}%` : '0%';
    if (g('loader-best'))     g('loader-best').textContent     = unplaced === 0 ? '✅ Всі!' : unplaced === Infinity ? '—' : `${unplaced} не розм.`;
}
function hideLoader() { const el = document.getElementById('gen-loader'); if (el) el.style.display = 'none'; }

function showFeasibilityError(issues) {
    const output = document.getElementById('schedule-output');
    const old = document.getElementById('gen-report'); if (old) old.remove();
    output.insertAdjacentHTML('afterbegin', `<div id="gen-report" class="mt-4"><div class="p-5 bg-red-50 border-red-600 border-l-4 rounded-xl shadow">
        <h3 class="font-bold text-red-800 text-base mb-3">🚫 Математично неможливо скласти розклад</h3>
        <ul class="space-y-2">${issues.map(i=>`<li class="text-[12px] text-red-800 bg-white border border-red-200 rounded-lg p-3">${i}</li>`).join('')}</ul>
        <p class="mt-3 text-[11px] italic text-red-600">💡 Усуньте проблеми у вкладках «Вчителі» або «Навантаження».</p>
    </div></div>`);
}

function showGenerationReport(errors, unpairedAlternating, overflowTasks, restarts, time) {
    const output = document.getElementById('schedule-output');
    const old = document.getElementById('gen-report'); if (old) old.remove();
    const isSuccess = errors.length === 0;
    let html = `<div id="gen-report" class="mt-4 space-y-3">`;
    html += `<div class="p-4 ${isSuccess?'bg-green-50 border-green-500':'bg-orange-50 border-orange-500'} border-l-4 rounded shadow-sm">
        <div class="flex justify-between items-center">
            <h3 class="font-bold ${isSuccess?'text-green-800':'text-orange-800'}">${isSuccess?'✅ Ідеальний розклад!':`⚠️ Не вмістилось: ${errors.length} уроків`}</h3>
            <span class="text-[10px] text-gray-500">Рестарти: ${restarts} | Час: ${time}с</span>
        </div>
        ${errors.length>0?`<ul class="list-disc list-inside text-[11px] mt-2 text-orange-700 space-y-1">${errors.map(e=>`<li>${e}</li>`).join('')}</ul><p class="mt-2 text-[10px] italic text-orange-600">💡 Розмістіть вручну на 0-й або 8-й урок.</p>`:''}
    </div>`;
    if (unpairedAlternating?.length > 0) {
        window._unpairedAlt = unpairedAlternating;
        html += `<div class="p-4 bg-purple-50 border-purple-400 border-l-4 rounded shadow-sm">
            <h3 class="font-bold text-purple-800 mb-2">🔔 Непарні чергування (${unpairedAlternating.length})</h3>
            <div class="space-y-2">${unpairedAlternating.map((u,i)=>`<div class="bg-white rounded-lg border border-purple-200 p-2 text-[11px]">
                <div class="font-bold text-slate-700 mb-1">📚 ${u.subject} — <span class="text-blue-600">${u.className}</span> — ${u.teacher}</div>
                <div class="flex flex-wrap gap-2">
                    <button onclick="addUnpairedToSlot(${i},0)" class="px-2 py-1 bg-purple-600 text-white rounded text-[10px] font-bold hover:bg-purple-700">📋 0-й урок</button>
                    <button onclick="addUnpairedToSlot(${i},8)" class="px-2 py-1 bg-slate-600 text-white rounded text-[10px] font-bold hover:bg-slate-700">📋 8-й урок</button>
                    <button onclick="addUnpairedToSchedule(${i})" class="px-2 py-1 bg-green-600 text-white rounded text-[10px] font-bold hover:bg-green-700">✅ В розклад</button>
                </div>
            </div>`).join('')}</div></div>`;
    }
    if (overflowTasks?.length > 0) {
        const byClass = {};
        overflowTasks.forEach(ot => { if (!byClass[ot.className]) byClass[ot.className]=[]; byClass[ot.className].push(ot); });
        html += `<div class="p-4 bg-red-50 border-red-500 border-l-4 rounded shadow-sm">
            <h3 class="font-bold text-red-800 mb-1">🚫 Overflow — ${overflowTasks.length} урок(ів) поза розкладом (> 35/тиждень)</h3>
            ${Object.entries(byClass).map(([cn,items])=>`<div class="bg-white rounded border border-red-200 p-2 mt-2">
                <div class="font-bold text-red-700 text-[11px] mb-1">Клас ${cn}:</div>
                ${items.map(ot=>`<div class="text-[11px] text-slate-700">• <b>${ot.subject}</b> — ${ot.teacher}</div>`).join('')}
            </div>`).join('')}
            <p class="mt-2 text-[10px] italic text-red-600">💡 Розмістіть вручну на 0-й або 8-й урок.</p>
        </div>`;
    }
    html += `</div>`;
    output.insertAdjacentHTML('afterbegin', html);
}

function addUnpairedToSlot(idx, slot) {
    const item = window._unpairedAlt?.[idx]; if (!item) return;
    for (let d = 0; d < 5; d++) {
        if (!state.schedule.some(s=>s.day===d&&s.slot===slot&&s.teacherId===item.teacherId) &&
            !state.schedule.some(s=>s.day===d&&s.slot===slot&&s.classId===item.classId)) {
            state.schedule.push({id:uid('up'),teacherId:item.teacherId,classId:item.classId,subject:item.subject,day:d,slot,isAlternating:true,isManual:true});
            save(); renderSchedule(); alert(`✅ "${item.subject}" → ${slot===0?'0-й':'8-й'} урок (${state.config.days[d]})`); return;
        }
    }
    alert('Не знайдено вільного слота.');
}
function addUnpairedToSchedule(idx) {
    const item = window._unpairedAlt?.[idx]; if (!item) return;
    for (let d = 0; d < 5; d++) for (let s = 1; s <= 7; s++)
        if (!state.schedule.some(ls=>ls.day===d&&ls.slot===s&&ls.teacherId===item.teacherId) &&
            !state.schedule.some(ls=>ls.day===d&&ls.slot===s&&ls.classId===item.classId) &&
            getTeacherStatus(item.teacherId,d,s)!==2) {
            state.schedule.push({id:uid('up'),teacherId:item.teacherId,classId:item.classId,subject:item.subject,day:d,slot:s,isAlternating:true,isManual:true});
            save(); renderSchedule(); alert(`✅ "${item.subject}" → ${state.config.days[d]}, урок ${s}`); return;
        }
    alert('Не знайдено вільного слота.');
}


function renderAll() {
    renderTeachers();
    renderClasses();
    renderWorkload();
    renderSchedule();
}

function renderTeachers() {
    const container = document.getElementById('list-teachers');
    if (!container) return;
    container.innerHTML = state.teachers.map(t => `
        <div class="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center border-l-4 border-blue-500">
            <span onclick="openAvailability('${t.id}')"
                class="font-medium text-slate-700 cursor-pointer hover:text-blue-600 transition underline decoration-dotted">
                ${t.name}
            </span>
            <button onclick="deleteTeacher('${t.id}')" class="text-red-400 hover:text-red-600 text-sm font-bold">
                Видалити
            </button>
        </div>`).join('');
}

function renderClasses() {
    const container = document.getElementById('list-classes');
    if (!container) return;
    container.innerHTML = state.classes.map(c => `
        <div class="bg-white px-4 py-2 rounded shadow flex items-center gap-4 border border-gray-200">
            <span class="font-bold">${c.name}</span>
            <button onclick="deleteClass('${c.id}')" class="text-gray-400 hover:text-red-500 text-sm">✕</button>
        </div>`).join('');
}

function renderWorkload() {
    const container = document.getElementById('workload-container');
    if (!container) return;

    if (!state.teachers || state.teachers.length === 0 || !state.classes || state.classes.length === 0) {
        container.innerHTML = `
            <div class="p-10 text-center bg-white rounded-xl border-2 border-dashed border-gray-200">
                <p class="text-gray-400 font-medium">Спочатку додайте вчителів та класи.</p>
            </div>`;
        return;
    }

    let html = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">`;

    state.teachers.forEach(teacher => {
        const currentWorkload = state.workload || [];
        const teacherWorkload = currentWorkload.filter(w => w.teacherId == teacher.id);

        teacherWorkload.sort((a, b) => {
            const classA = state.classes.find(c => c.id == a.classId)?.name || "";
            const classB = state.classes.find(c => c.id == b.classId)?.name || "";
            const classComp = classA.localeCompare(classB, undefined, { numeric: true });
            return classComp !== 0 ? classComp : a.subject.localeCompare(b.subject);
        });

        const totalHours = teacherWorkload.reduce((sum, w) => sum + parseFloat(w.hours), 0);

        html += `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                <div class="p-4 bg-slate-50 border-b border-gray-100 flex justify-between items-center">
                    <h3 class="font-bold text-slate-800 truncate pr-2">${teacher.name}</h3>
                    <span class="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap">${totalHours} год</span>
                </div>
                <div class="p-4 space-y-2 overflow-y-auto" style="max-height:200px;min-height:60px;">
                    ${teacherWorkload.length > 0 ? teacherWorkload.map(w => {
                        const cls = state.classes.find(c => c.id == w.classId);
                        let badge = '';
                        if (w.splitType === 'alternating') badge = `<span class="ml-1 text-[8px] bg-purple-100 text-purple-700 px-1 rounded">↕Тиждень</span>`;
                        else if (w.splitType === 'semester') badge = `<span class="ml-1 text-[8px] bg-blue-100 text-blue-700 px-1 rounded">↕Семестр</span>`;
                        return `
                            <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100 text-sm">
                                <div class="truncate">
                                    <span class="font-bold text-blue-600">${cls ? cls.name : '?'}</span>
                                    <span class="text-gray-500 ml-1">${w.subject}</span>
                                    ${badge}
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="font-bold">${w.hours}г</span>
                                    <button onclick="deleteWorkload('${w.id}')" class="text-gray-300 hover:text-red-500 text-xl font-light">&times;</button>
                                </div>
                            </div>`;
                    }).join('') : '<p class="text-center text-gray-300 text-xs py-4 italic">Навантаження не додано</p>'}
                </div>
                <div class="p-4 bg-gray-50 border-t border-gray-100 space-y-3">
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Клас</label>
                            <select id="sel-cls-${teacher.id}" class="w-full text-sm border rounded-lg p-2 bg-white">
                                ${state.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Години</label>
                            <input type="number" id="hrs-${teacher.id}" value="2" min="0.5" step="0.5" max="20"
                                class="w-full text-sm border rounded-lg p-2 bg-white">
                        </div>
                    </div>
                    <div>
                        <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Предмет</label>
                        <input type="text" id="sub-${teacher.id}"
                            class="w-full text-sm border rounded-lg p-2 bg-white"
                            placeholder="напр. Математика">
                    </div>
                    <button onclick="addWorkloadInline('${teacher.id}')"
                        class="w-full py-2.5 bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 transition-all">
                        Додати навантаження
                    </button>
                </div>
            </div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}

function addWorkloadInline(teacherId) {
    const tIdStr = String(teacherId);
    const classSelect = document.getElementById(`sel-cls-${tIdStr}`);
    const hourInput = document.getElementById(`hrs-${tIdStr}`);
    const subjectInput = document.getElementById(`sub-${tIdStr}`);

    const classId = classSelect.value;
    const hours = parseFloat(hourInput.value);
    const subject = subjectInput.value.trim();

    if (!subject || isNaN(hours) || hours <= 0) {
        alert("Вкажіть назву предмета та кількість годин.");
        return;
    }

    let splitType = 'none';
    let semesterPriority = 'none';

    if (hours % 1 !== 0) {
        const isAlternating = confirm(
            `Години дробові (${hours}).\n\n` +
            `ОК — Чергування по ТИЖНЯХ\n` +
            `Скасувати — Розподіл по СЕМЕСТРАХ`
        );
        if (isAlternating) {
            splitType = 'alternating';
        } else {
            splitType = 'semester';
            semesterPriority = confirm("Більше годин у ПЕРШОМУ семестрі?") ? 'first' : 'second';
        }
    }

    const newItem = {
        id: String(Date.now()),
        teacherId: String(tIdStr),
        classId: String(classId),
        subject: subject,
        hours: hours,
        splitType: splitType,
        semesterPriority: semesterPriority
    };

    if (!state.workload) state.workload = [];
    state.workload.push(newItem);

    subjectInput.value = "";
    renderAll();
    save();
}

function deleteWorkload(id) {
    if (!confirm('Видалити цей запис?')) return;
    state.workload = state.workload.filter(w => w.id != id);
    renderAll();
    save();
}

function updateManualLesson(teacherId, day, slot, element) {
    const text = element.innerText.trim();
    const tIdStr = String(teacherId);

    state.schedule = state.schedule.filter(s =>
        !(String(s.teacherId) === tIdStr && s.day == day && s.slot == slot)
    );

    if (text) {
        const parts = text.split(' ');
        const className = parts[0];
        const subjectName = parts.slice(1).join(' ') || "урок";

        let cls = state.classes.find(c => c.name.toLowerCase() === className.toLowerCase());
        if (!cls) {
            cls = { id: 'c_' + Date.now(), name: className };
            state.classes.push(cls);
        }

        state.schedule.push({
            id: 'sch_m_' + Date.now() + Math.random(),
            teacherId: tIdStr,
            day: parseInt(day),
            slot: parseInt(slot),
            classId: String(cls.id),
            subject: subjectName,
            isManual: true
        });
    }
    save();
}

function renderSchedule() {
    const container = document.getElementById('schedule-output');
    if (!container) return;

    const currentSchedule = state.schedule || [];

    const formatNameForTable = (fullName) => {
        if (!fullName) return "";
        const parts = fullName.trim().split(/\s+/);
        const lastName = parts[0] || "";
        const firstNameInitial = parts[1] ? ` ${parts[1][0]}.` : "";
        const middleNameInitial = parts[2] ? `${parts[2][0]}.` : "";
        return `${lastName}<span class="initials">${firstNameInitial}${middleNameInitial}</span>`;
    };

    const daysNames = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця"];

    let html = `<div class="overflow-x-auto bg-white rounded-xl shadow-md border border-gray-200">
        <table class="w-full border-collapse text-[10px]">
            <thead>
                <tr class="bg-slate-100 text-slate-700 uppercase">
                    <th class="w-12 border-b border-r p-2">День</th>
                    <th class="w-8 border-b border-r p-2">№</th>
                    ${state.teachers.map(t => `
                        <th class="border-b border-r vertical-th bg-slate-50 text-slate-700 font-bold">
                            ${formatNameForTable(t.name)}
                        </th>`).join('')}
                </tr>
            </thead>
            <tbody>`;

    daysNames.forEach((dayName, dayIdx) => {
        for (let slotIdx = 0; slotIdx <= 8; slotIdx++) {
            html += `<tr class="${slotIdx === 8 ? 'border-b-2 border-b-slate-300' : 'border-b border-gray-100'} hover:bg-blue-50/30">`;

            if (slotIdx === 0) {
                html += `<td rowspan="9" class="bg-slate-50 border-r text-center font-bold text-slate-500 uppercase [writing-mode:vertical-lr] rotate-180 p-2">${dayName}</td>`;
            }

            html += `<td class="text-center border-r p-1 ${slotIdx === 0 ? 'text-orange-600 font-bold bg-orange-50/50' : 'text-gray-400'}">${slotIdx}</td>`;

            state.teachers.forEach(teacher => {
                const teacherLessons = currentSchedule.filter(s =>
                    s.day == dayIdx && s.slot == slotIdx && s.teacherId == teacher.id
                );

                let cellContent = '';

                if (teacherLessons.length > 0) {
                    const cls = state.classes.find(c => c.id == teacherLessons[0].classId);
                    const isInternalAlt = teacherLessons.length > 1 || (teacherLessons[0].pairType === 'paired_internal');
                    const isExternalAlt = teacherLessons.length === 1 && (teacherLessons[0].pairType === 'paired_external' || teacherLessons[0].isAlternating);

                    let markerClass = '';
                    let markerChar = '';
                    if (isInternalAlt) { markerClass = 'text-purple-500'; markerChar = '●'; }
                    else if (isExternalAlt) { markerClass = 'text-blue-500'; markerChar = '●'; }

                    const altMarker = markerChar ? `<span class="ml-0.5 text-[7px] ${markerClass}">${markerChar}</span>` : '';
                    const subjectsText = teacherLessons.map(l => l.subject).join(' / ');

                    const semBadge = (() => {
                        const wItem = state.workload.find(w =>
                            w.teacherId === teacher.id &&
                            w.classId === teacherLessons[0].classId &&
                            w.subject === teacherLessons[0].subject &&
                            w.splitType === 'semester'
                        );
                        if (!wItem) return '';
                        return `<span class="text-[7px] text-indigo-500 block">↕ сем</span>`;
                    })();

                    // Для paired_internal: показуємо обидва предмети через /
                    const displaySubject = teacherLessons.length > 1
                        ? teacherLessons.map(l => {
                            const n = l.subject.trim().split(/\s+/);
                            return n.length >= 2 ? n[0][0]+n[1][0] : l.subject.substring(0,2);
                          }).join('/')
                        : subjectsText;

                    cellContent = `
                        <div class="w-full h-full flex flex-col justify-center items-center bg-blue-50 py-1 relative">
                            <span class="block text-blue-900 font-bold leading-none text-[11px]">
                                ${cls?.name || ''}${altMarker}
                            </span>
                            <span class="text-blue-700 text-[8px] truncate max-w-[55px] mt-0.5" title="${subjectsText}">
                                ${displaySubject}
                            </span>
                            ${semBadge}
                        </div>`;
                }

                html += `
                    <td class="p-0 border-r border-gray-100 min-w-[40px]">
                        <div contenteditable="true"
                             onblur="updateManualLesson('${teacher.id}', ${dayIdx}, ${slotIdx}, this)"
                             class="min-h-[40px] flex items-center justify-center outline-none focus:bg-yellow-50 transition-colors">
                            ${cellContent}
                        </div>
                    </td>`;
            });
            html += `</tr>`;
        }
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

function printSchedule() {
    if (!state.schedule || state.schedule.length === 0) {
        alert("Розклад порожній!");
        return;
    }

    const printWindow = window.open('', '_blank');
    const daysNames = ["ПОНЕДІЛОК", "ВІВТОРОК", "СЕРЕДА", "ЧЕТВЕР", "П'ЯТНИЦЯ"];
    const dateStr = new Date().toLocaleDateString('uk-UA');

    const totalWidth = 199;
    const sideColsWidth = 20;
    const teachersCount = state.teachers.length;
    const colWidth = (totalWidth - sideColsWidth) / teachersCount;

    const formatName = (fullName) => {
        if (!fullName) return "";
        const parts = fullName.trim().split(/\s+/);
        return parts[0] + (parts[1] ? ` ${parts[1][0]}.` : "") + (parts[2] ? `${parts[2][0]}.` : "");
    };

    let html = `
        <html>
        <head>
            <style>
                @page { size: A4 portrait; margin: 5mm; }
                body { margin: 0; padding: 0; font-family: "Arial Narrow", Arial, sans-serif; -webkit-print-color-adjust: exact; }
                .page-wrapper { width: 200mm; margin: 0 auto; }
                table { width: ${totalWidth}mm; border-collapse: collapse; table-layout: fixed; border: 0.5mm solid black; margin-left: 0.5mm; }
                th, td { border: 0.1mm solid black; text-align: center; padding: 0; height: 4.5mm; overflow: hidden; font-size: 8pt; }
                thead th { border-bottom: 0.7mm solid black !important; }
                .day-boundary td { border-top: 0.7mm solid black !important; }
                .col-day { width: 12mm; font-weight: bold; font-size: 7pt; }
                .col-num { width: 8mm; background-color: #f0f0f0 !important; font-weight: bold; }
                .col-teacher { width: ${colWidth}mm; }
                .day-text { writing-mode: vertical-lr; transform: rotate(180deg); white-space: nowrap; }
                .teacher-name-cell { height: 25mm; writing-mode: vertical-lr; transform: rotate(180deg); font-weight: bold; font-size: 8.5pt; text-align: left; padding: 1mm 0; }
                .lesson-box { line-height: 1.1; display: flex; flex-direction: column; justify-content: center; height: 100%; }
                .class-name { font-weight: bold; font-size: 8.5pt; display: block; }
                .subject-code { font-size: 6pt; display: block; }
                .slot-0 { background-color: #fff9e6 !important; }
                h2 { text-align: center; font-size: 11pt; margin: 1mm 0; }
            </style>
        </head>
        <body>
            <div class="page-wrapper">
                <h2>ЗВЕДЕНИЙ РОЗКЛАД (${dateStr})</h2>
                <table>
                    <thead>
                        <tr>
                            <th class="col-day">ДН</th>
                            <th class="col-num">№</th>
                            ${state.teachers.map(t => `<th class="col-teacher teacher-name-cell">${formatName(t.name)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>`;

    daysNames.forEach((dayName, dayIdx) => {
        const lessonsThisDay = state.schedule.filter(s => s.day === dayIdx);
        if (lessonsThisDay.length === 0) return;

        const slots = lessonsThisDay.map(s => s.slot);
        const minSlot = Math.min(...slots, 1);
        const maxSlot = Math.max(...slots, 7);
        const totalRows = maxSlot - minSlot + 1;

        for (let slotIdx = minSlot; slotIdx <= maxSlot; slotIdx++) {
            const isFirst = (slotIdx === minSlot);
            const isBoundary = (isFirst && dayIdx > 0);

            html += `<tr class="${isBoundary ? 'day-boundary' : ''}">`;
            if (isFirst) {
                html += `<td rowspan="${totalRows}" class="col-day"><span class="day-text">${dayName}</span></td>`;
            }
            html += `<td class="col-num ${slotIdx === 0 ? 'slot-0' : ''}">${slotIdx}</td>`;

            state.teachers.forEach(teacher => {
                const lesson = state.schedule.find(s => s.day === dayIdx && s.slot === slotIdx && s.teacherId == teacher.id);
                const s0 = slotIdx === 0 ? 'slot-0' : '';

                if (lesson) {
                    const clsName = state.classes.find(c => c.id == lesson.classId)?.name || '';
                    const rawCode = getSubjectCode(lesson.subject);
                    const altMarker = lesson.isAlternating ? ' ○' : '';

                    html += `<td class="${s0}">
                        <div class="lesson-box">
                            <span class="class-name">${clsName}${altMarker}</span>
                            <span class="subject-code">${rawCode}</span>
                        </div>
                    </td>`;
                } else {
                    html += `<td class="${s0}"></td>`;
                }
            });
            html += `</tr>`;
        }
    });

    html += `</tbody></table></div>
        <script>window.onload = function() { setTimeout(() => { window.print(); window.close(); }, 500); };</script>
    </body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
}

function getSubjectCode(subject) {
    if (!subject) return "";
    const words = subject.trim().split(/\s+/);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return subject.substring(0, 2).toUpperCase();
}

window.onload = init;
