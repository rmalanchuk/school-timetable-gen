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
// ГЕНЕРАТОР РОЗКЛАДУ — ГОЛОВНА ФУНКЦІЯ

// ================================================================
// ГЕНЕРАТОР РОЗКЛАДУ v6
// Архітектура:
//   buildTasks    → задачі + чергування (prio-1 з prio-1)
//   Phase 1       → greedy: спочатку prio-1 на 1-4, потім решта
//   Phase 2       → subjectOrderFix, priorityPushUp, gapFix
//   Phase 3       → repair евакуацією блокерів
//   sanitize      → видалення тимчасових записів
//   restart loop  → до 0 нерозміщених або зупинки
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

    let best = { schedule: [], unplacedCount: Infinity, unplacedList: [] };
    let restart = 0;

    while (!_generatorStop) {
        restart++;

        // Беремо тільки справжні ручні уроки (слот 0/8 або явно isManual)
        // Всі інші — результат попередньої генерації, не беремо
        const manual   = state.schedule.filter(s => (s.slot === 0 || s.slot === 8 || s.isManual === true));
        const schedule = manual.map(s => ({ ...s }));
        const tasks    = allTasks.map(t => ({ ...t, items: t.items.map(i => ({ ...i })) }));

        // Фаза 1: greedy
        const unplaced = phasedGreedy(tasks, schedule);

        // Фаза 2: quality passes
        subjectOrderFix(schedule);
        // gapFix ПЕРШИЙ — прибирає вікна вчителів (напр. Бенесько [1,2,4,5,6] → [1,2,3,5,6])
        // тоді priorityPushUp може зробити swap який раніше блокувався вікном
        gapFix(schedule);
        priorityPushUp(schedule);
        // Ще раз обидва — priorityPushUp міг перемістити уроки і створити нові вікна
        gapFix(schedule);
        priorityPushUp(schedule);
        // selfReorder: переставляємо уроки одного вчителя (prio-1 вище prio-2/3)
        selfReorder(schedule);

        // Фаза 3: repair
        const stillUnplaced = [...unplaced];
        await repairUnplaced(stillUnplaced, schedule, startTime, restart, total);

        // Додатковий прохід gapFix після repair
        gapFix(schedule);
        // Очищення тимчасових
        sanitize(schedule);

        const count = stillUnplaced.length;
        if (count < best.unplacedCount) {
            best = {
                schedule:     JSON.parse(JSON.stringify(schedule)),
                unplacedCount: count,
                unplacedList:  stillUnplaced.map(t => {
                    const it   = t.items[0];
                    const tObj = state.teachers.find(x => x.id === it.teacherId);
                    const cObj = state.classes.find(x => x.id === it.classId);
                    return `${it.subject} (${tObj?.name || '?'}) — ${cObj?.name || '?'} кл`;
                })
            };
        }

        updateLoader(restart, Date.now() - startTime,
            total - best.unplacedCount, total, best.unplacedCount,
            `Рестарт ${restart} | Не розміщено: ${best.unplacedCount}`);
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

// Видаляємо тимчасові записи і надлишкові уроки
function sanitize(schedule) {
    // 1. Видаляємо tmp_
    for (let i = schedule.length - 1; i >= 0; i--) {
        const id = String(schedule[i].id || '');
        if (id.startsWith('tmp_')) {
            schedule.splice(i, 1);
        }
    }

    // 2. Видаляємо дублікати teacher+day+slot+classId
    const seen = new Map();
    for (let i = schedule.length - 1; i >= 0; i--) {
        const ls = schedule[i];
        if (ls.slot < 1 || ls.slot > 7) continue;
        const key = ls.teacherId + '|' + ls.day + '|' + ls.slot + '|' + ls.classId;
        if (seen.has(key)) {
            schedule.splice(i, 1);
        } else {
            seen.set(key, true);
        }
    }

    // 3. Обрізаємо надлишок по teacher+class+subject
    // Рахуємо потрібну кількість з навантаження
    const needed = {};
    state.workload.forEach(w => {
        const h = parseFloat(w.hours);
        const whole = Math.floor(h);
        const frac = Math.round((h - whole) * 10) / 10;
        // Цілих уроків
        const slots = whole + (Math.abs(frac - 0.5) < 0.01 && w.splitType === 'alternating' ? 1 : 0);
        const key = w.teacherId + '|' + w.classId + '|' + w.subject.toLowerCase();
        needed[key] = (needed[key] || 0) + slots;
    });

    // Рахуємо скільки є в розкладі
    const counts = {};
    for (let i = schedule.length - 1; i >= 0; i--) {
        const ls = schedule[i];
        if (ls.slot < 1 || ls.slot > 7 || ls.isManual) continue;
        const key = ls.teacherId + '|' + ls.classId + '|' + ls.subject.toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
        const need = needed[key] || 0;
        if (counts[key] > need) {
            // Надлишок — видаляємо цей урок (ітеруємо з кінця, тому видаляємо пізніші)
            schedule.splice(i, 1);
            counts[key]--;
        }
    }
}

// ================================================================
// BUILD TASKS
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
        // Пари одного вчителя (фіолетовий маркер)
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
        // ПРАВИЛО: спочатку prio-1 з prio-1, потім prio-2 з prio-2, потім будь-які
        let rem = flat.filter(w => w.classId === cId && w.currentHours === 0.5 && w.splitType === 'alternating' && !w.used);
        while (rem.length >= 2) {
            const i1 = rem.shift();
            const p1 = getPriority(i1.subject);
            // Шукаємо партнера: спочатку той самий пріоритет, потім будь-який
            const i2 = rem.find(w => w.teacherId !== i1.teacherId && getPriority(w.subject) === p1)
                    || rem.find(w => w.teacherId !== i1.teacherId);
            if (!i2) { unpairedAlt.push({ subject: i1.subject, teacher: state.teachers.find(t => t.id === i1.teacherId)?.name || '?', className: state.classes.find(c => c.id === i1.classId)?.name || '?', teacherId: i1.teacherId, classId: i1.classId }); i1.used = true; break; }
            rem.splice(rem.indexOf(i2), 1);
            i1.used = i2.used = true;
            tasks.push({ type: 'paired_external', items: [i1, i2], priority: Math.min(p1, getPriority(i2.subject)), classId: cId });
        }

        // Непарні залишки
        flat.filter(w => w.classId === cId && w.currentHours === 0.5 && w.splitType === 'alternating' && !w.used).forEach(item => {
            item.used = true;
            const tObj = state.teachers.find(t => t.id === item.teacherId);
            const cObj = state.classes.find(c => c.id === item.classId);
            unpairedAlt.push({ subject: item.subject, teacher: tObj?.name || '?', className: cObj?.name || '?', teacherId: item.teacherId, classId: item.classId });
        });
    });

    // Одиночні
    flat.filter(w => !w.used).forEach(item => {
        item.used = true;
        tasks.push({ type: 'single', items: [item], priority: getPriority(item.subject), classId: item.classId });
    });

    // Overflow (> 35 на клас)
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
// isHardValid — ЄДИНА ТОЧКА ПЕРЕВІРКИ ВСІХ ПРАВИЛ
// ================================================================
function isHardValid(task, first, d, s, schedule) {
    // 1. Вчитель зайнятий
    if (task.items.some(it => schedule.some(ls => ls.day === d && ls.slot === s && ls.teacherId === it.teacherId))) return false;

    // 2. Клас зайнятий (виняток: paired задача — ті самі вчителі)
    {
        const tids = new Set(task.items.map(it => it.teacherId));
        if (schedule.some(ls => ls.day === d && ls.slot === s && ls.classId === first.classId && !tids.has(ls.teacherId))) return false;
    }

    // 2b. Для paired: всі вчителі вільні
    if (task.items.length > 1) {
        for (let i = 1; i < task.items.length; i++) {
            const it = task.items[i];
            if (schedule.some(ls => ls.day === d && ls.slot === s && ls.teacherId === it.teacherId)) return false;
            if (getTeacherStatus(it.teacherId, d, s) === 2) return false;
        }
    }

    // 3. Червона зона
    if (task.items.some(it => getTeacherStatus(it.teacherId, d, s) === 2)) return false;

    // 3b. Початкові класи 1-4: max слот 4
    {
        const cls = state.classes.find(c => c.id === first.classId);
        if (cls && parseInt(cls.name) >= 1 && parseInt(cls.name) <= 4 && s > 4) return false;
    }

    // 4. NO-GAP класу
    const classSlots = [...new Set(schedule
        .filter(ls => ls.day === d && ls.classId === first.classId && ls.slot >= 1 && ls.slot <= 7)
        .map(ls => ls.slot))];
    if (classSlots.length > 0) {
        const mx = Math.max(...classSlots), mn = Math.min(...classSlots);
        if (s > mx + 1 || s < mn - 1) return false;
    }

    // 5. Prio-1: max 1 раз на день (крім вимушених подвійних уроків)
    if (task.priority === 1) {
        const existing = schedule.filter(ls => ls.day === d && ls.classId === first.classId && ls.subject === first.subject);
        if (existing.length > 0) {
            const totalNeeded = state.workload
                .filter(w => w.classId === first.classId && w.subject.toLowerCase() === first.subject.toLowerCase())
                .reduce((sum, w) => sum + Math.ceil(parseFloat(w.hours)), 0);
            const freeDays = countFreeDays(first.teacherId);
            if (totalNeeded <= freeDays) return false;
            if (!existing.some(ls => Math.abs(ls.slot - s) === 1)) return false;
            if (existing.length >= 2) return false;
        }
    }

    // 5b. Max 2 однакових предмети на день
    if (schedule.filter(ls => ls.day === d && ls.classId === first.classId && ls.subject === first.subject).length >= 2) return false;

    // 6. PRIO-1: НІКОЛИ не вище слоту 5. Ніколи слот 6-7.
    //    Слот 4-5: тільки якщо немає вільного раніше для обох (вчитель+клас+no-gap)
    if (task.priority === 1) {
        if (s >= 6) return false; // АБСОЛЮТНА ЗАБОРОНА 6-7

        if (s >= 4) {
            // Шукаємо чи є вільний слот 1..(s-1) для вчителя І класу одночасно
            const csNow = [...new Set(schedule
                .filter(ls => ls.day === d && ls.classId === first.classId && ls.slot >= 1 && ls.slot <= 7)
                .map(ls => ls.slot))];
            for (let es = 1; es < s; es++) {
                const tFree   = !schedule.some(ls => ls.day === d && ls.slot === es && task.items.some(it => it.teacherId === ls.teacherId));
                const cFree   = !schedule.some(ls => ls.day === d && ls.slot === es && ls.classId === first.classId);
                const notRed  = !task.items.some(it => getTeacherStatus(it.teacherId, d, es) === 2);
                let   ngOk    = true;
                if (csNow.length > 0) {
                    const mx = Math.max(...csNow), mn = Math.min(...csNow);
                    if (es > mx + 1 || es < mn - 1) ngOk = false;
                }
                if (tFree && cFree && notRed && ngOk) return false; // є кращий слот
            }
        }
    }

    // 7. Вікно вчителя:
    //    НІКОЛИ не дозволяємо вікно > 1 урок
    //    Вікно = 1 урок: дозволено лише якщо у вчителя <= 3 уроків в цей день
    //    (коли багато уроків — вимагаємо підряд)
    {
        const tSlots = [...new Set(schedule
            .filter(ls => ls.day === d && ls.teacherId === first.teacherId && ls.slot >= 1 && ls.slot <= 7)
            .map(ls => ls.slot))];
        if (tSlots.length > 0) {
            const all = [...tSlots, s].sort((a, b) => a - b);
            let gaps = 0, bigGap = false;
            for (let i = 1; i < all.length; i++) {
                const g = all[i] - all[i - 1] - 1;
                if (g > 0) gaps++;
                if (g > 1) bigGap = true;
            }
            if (bigGap)   return false;  // вікно > 1 — заборона завжди
            if (gaps > 1) return false;  // > 1 вікна — заборона завжди
            // Вікно = 1: дозволяємо лише якщо вчитель матиме <= 4 уроків
            if (gaps > 0 && all.length >= 5) return false; // >= 5 уроків підряд — вікна заборонені
        }
    }

    // 8. Кімнатні конфлікти
    const roomType = getRoomType(first.subject);
    if (roomType) {
        if (schedule.some(ls => ls.day === d && ls.slot === s && ls.classId !== first.classId && getRoomType(ls.subject) === roomType)) return false;
    }
    if (roomType === 'gym') {
        if (schedule.some(ls => ls.day === d && ls.classId === first.classId && getRoomType(ls.subject) === 'gym' && ls.slot !== s)) return false;
    }

    // 9. Труд — один кабінет
    if (isLaborSubject(first.subject)) {
        if (schedule.some(ls => ls.day === d && ls.slot === s && ls.classId !== first.classId && isLaborSubject(ls.subject))) return false;
    }

    // 10. Prio-3: max 1 раз на день для класу
    if (task.priority === 3) {
        if (schedule.some(ls => ls.day === d && ls.classId === first.classId && ls.subject === first.subject)) return false;
    }

    // 11. Prio-2: не дублюємо якщо є вільні дні
    if (task.priority === 2) {
        const sameDay = schedule.filter(ls => ls.day === d && ls.classId === first.classId && ls.subject === first.subject).length;
        if (sameDay >= 1) {
            const freeDays    = countFreeDays(first.teacherId);
            const totalNeeded = state.workload
                .filter(w => w.classId === first.classId && w.subject.toLowerCase() === first.subject.toLowerCase())
                .reduce((sum, w) => sum + Math.ceil(parseFloat(w.hours)), 0);
            if (totalNeeded <= freeDays) return false;
        }
    }

    return true;
}

// ================================================================
// SCORE — менше = краще
// ================================================================
function scoreSlot(task, first, d, s, schedule) {
    if (!isHardValid(task, first, d, s, schedule)) return Infinity;
    let score = 0;
    const priority = task.priority;

    // Жовта зона
    if (task.items.some(it => getTeacherStatus(it.teacherId, d, s) === 1)) score += 800;

    // Початкові класи — якомога раніше
    {
        const cls = state.classes.find(c => c.id === first.classId);
        if (cls && parseInt(cls.name) >= 1 && parseInt(cls.name) <= 4) score += (s - 1) * 500;
    }

    // Позиція слоту по пріоритету
    if (priority === 1) {
        // prio-1: 1-3 ідеально, 4 добре, 5 вимушено
        if      (s <= 3) score += 0;
        else if (s === 4) score += 80;
        else              score += 500; // s=5, 6 заблоковано правилом
    } else if (priority === 2) {
        score += (s - 1) * 25;
    } else {
        // prio-3: штрафуємо ранні слоти — виштовхуємо на 5-7
        score += Math.max(0, 6 - s) * 400;
    }

    // Вікна вчителя — максимально уникаємо
    const tSlots = [...new Set(schedule
        .filter(ls => ls.day === d && ls.teacherId === first.teacherId && ls.slot >= 1 && ls.slot <= 7)
        .map(ls => ls.slot))];
    if (tSlots.length > 0) {
        const minDist = Math.min(...tSlots.map(ts => Math.abs(ts - s)));
        if      (minDist === 1) score -= 400;  // сусідній — великий бонус (без вікна!)
        else if (minDist === 2) score += 600;  // вікно 1 — великий штраф
        else                    score += minDist * 1000; // велике вікно — величезний штраф
    } else {
        score += (s - 1) * 80; // перший урок дня — якомога раніше
    }

    // Баланс по днях (не перевантажувати один день)
    const dayCount = schedule.filter(ls => ls.day === d && ls.teacherId === first.teacherId && ls.slot >= 1 && ls.slot <= 7).length;
    if      (dayCount >= 6) score += 1500;
    else if (dayCount >= 5) score += 500;

    // Дублювання предмету в день
    const sameDay = schedule.filter(ls => ls.day === d && ls.classId === first.classId && ls.subject === first.subject);
    if (sameDay.length > 0) {
        const adj = sameDay.some(ls => Math.abs(ls.slot - s) === 1);
        score += priority === 1 ? (adj ? 200 : 3000) : (adj ? 300 : 4000);
    }

    // Клас без уроків цього дня — починати з 1
    const classToday = [...new Set(schedule.filter(ls => ls.day === d && ls.classId === first.classId && ls.slot >= 1 && ls.slot <= 7).map(ls => ls.slot))];
    if (classToday.length === 0 && s > 1) score += (s - 1) * 150;

    // Бонус за суміжність того самого ПРЕДМЕТУ у вчителя в цей день
    // (щоб інформатика йшла блоком, а не через уроки)
    const sameSubjTeacher = schedule.filter(ls =>
        ls.day === d && ls.teacherId === first.teacherId &&
        ls.subject === first.subject && 1 <= ls.slot && ls.slot <= 7
    ).map(ls => ls.slot);
    if (sameSubjTeacher.length > 0) {
        const minSubjDist = Math.min(...sameSubjTeacher.map(ts => Math.abs(ts - s)));
        if (minSubjDist === 1) score -= 300; // сусідній урок того ж предмету — великий бонус
        else if (minSubjDist === 2) score += 100;
        else score += minSubjDist * 200; // далеко від інших уроків цього предмету — штраф
    }

    score += Math.random() * 10;
    return score;
}

// ================================================================
// PHASED GREEDY
// Раунд A: початкові класи 1-4
// Раунд B: prio-1 старших класів (дефіцитні вчителі першими)
// Раунд C: prio-2
// Раунд D: prio-3
// Раунд E: retry нерозміщених
// ================================================================
function phasedGreedy(tasks, schedule) {
    const unplaced    = [];
    const primaryIds  = new Set(state.classes.filter(c => { const n = parseInt(c.name); return n >= 1 && n <= 4; }).map(c => c.id));

    // Дефіцит вчителя = кількість prio-1 задач - кількість вільних слотів 1-4
    const earlyFree  = {};
    const prio1Count = {};
    state.teachers.forEach(t => {
        let f = 0;
        for (let d = 0; d < 5; d++) for (let s = 1; s <= 4; s++) if (getTeacherStatus(t.id, d, s) !== 2) f++;
        earlyFree[t.id] = f;
    });
    tasks.filter(t => t.priority === 1).forEach(t => {
        t.items.forEach(it => { prio1Count[it.teacherId] = (prio1Count[it.teacherId] || 0) + 1; });
    });

    const dayOrder = shuffleArr([0, 1, 2, 3, 4]);

    // Функція розміщення prio-1: строго 1-4, потім 5 якщо вимушено
    function placePrio1(task) {
        const first = task.items[0];

        // Дні сортуємо: менше навантаження вчителя на 1-4 і менше уроків класу = краще
        const days = [...dayOrder].sort((a, b) => {
            const tA = schedule.filter(ls => ls.day === a && ls.teacherId === first.teacherId && 1 <= ls.slot && ls.slot <= 4).length;
            const tB = schedule.filter(ls => ls.day === b && ls.teacherId === first.teacherId && 1 <= ls.slot && ls.slot <= 4).length;
            const cA = new Set(schedule.filter(ls => ls.day === a && ls.classId === first.classId && 1 <= ls.slot && ls.slot <= 7).map(ls => ls.slot)).size;
            const cB = new Set(schedule.filter(ls => ls.day === b && ls.classId === first.classId && 1 <= ls.slot && ls.slot <= 7).map(ls => ls.slot)).size;
            return (tA + cA * 0.1) - (tB + cB * 0.1);
        });

        // Спроба 1: слоти 1-4
        for (const d of days) {
            for (let s = 1; s <= 4; s++) {
                if (!isHardValid(task, first, d, s, schedule)) continue;
                commitTask(task, d, s, schedule);
                return true;
            }
        }
        // Спроба 2: слот 5 (вимушено — всі 1-4 зайняті)
        for (const d of days) {
            if (!isHardValid(task, first, d, 5, schedule)) continue;
            commitTask(task, d, 5, schedule);
            return true;
        }
        // Крайній випадок: будь-який валідний слот
        return greedyPlace(task, schedule);
    }

    // Раунд A: початкові класи
    const primTasks = shuffleArr(tasks.filter(t => primaryIds.has(t.classId)));
    primTasks.sort((a, b) => a.priority - b.priority);
    for (const task of primTasks) {
        if (!(task.priority === 1 ? placePrio1(task) : greedyPlace(task, schedule))) unplaced.push(task);
    }

    // Раунд B: prio-1 старших класів, найдефіцитніші першими
    const seniorP1 = tasks.filter(t => t.priority === 1 && !primaryIds.has(t.classId));
    seniorP1.sort((a, b) => {
        const aD = Math.max(...a.items.map(it => (prio1Count[it.teacherId] || 0) - (earlyFree[it.teacherId] || 0)));
        const bD = Math.max(...b.items.map(it => (prio1Count[it.teacherId] || 0) - (earlyFree[it.teacherId] || 0)));
        return bD - aD;
    });
    for (const task of seniorP1) {
        if (!placePrio1(task)) unplaced.push(task);
    }

    // Раунд C: prio-2
    for (const task of shuffleArr(tasks.filter(t => t.priority === 2))) {
        if (!greedyPlace(task, schedule)) unplaced.push(task);
    }

    // Раунд D: prio-3
    for (const task of shuffleArr(tasks.filter(t => t.priority >= 3))) {
        if (!greedyPlace(task, schedule)) unplaced.push(task);
    }

    // Раунд E: retry
    const retry = [...unplaced]; unplaced.length = 0;
    for (const task of retry) {
        if (!greedyPlace(task, schedule)) unplaced.push(task);
    }

    return unplaced;
}

function greedyPlace(task, schedule) {
    const first = task.items[0];
    let best = null, bestScore = Infinity;
    for (let d = 0; d < 5; d++) {
        for (let s = 1; s <= 7; s++) {
            if (!isHardValid(task, first, d, s, schedule)) continue;
            const sc = scoreSlot(task, first, d, s, schedule);
            if (sc < bestScore) { bestScore = sc; best = { d, s }; }
        }
    }
    if (best) { commitTask(task, best.d, best.s, schedule); return true; }
    return false;
}

// ================================================================
// SUBJECT ORDER FIX: мова раніше літератури
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
                    for (const lang of lessons.filter(ls => isLang(ls.subject))) {
                        for (const lit of lessons.filter(ls => isLit(ls.subject))) {
                            if (lang.slot > lit.slot && safeSwap(lang, lit, schedule)) changed = true;
                        }
                    }
                }
            }
        }
        if (!changed) break;
    }
}

// ================================================================
// PRIORITY PUSH UP
// Якщо prio-1 на слоті 5:
//   A) swap в тому ж дні/класі з prio-2/3 на ранньому слоті
//   B) перемістити в інший день на слот 1-4
//      — перевіряємо isHardValid нового дня
//      — перевіряємо NO-GAP і вікна вчителя старого дня після видалення
// ================================================================
function priorityPushUp(schedule) {
    for (let pass = 0; pass < 60; pass++) {
        let changed = false;

        const late = schedule.filter(ls => !ls.isManual && getPriority(ls.subject) === 1 && ls.slot >= 5);
        for (const lateL of late) {
            const pseudo = { items: [lateL], priority: 1, type: lateL.pairType || 'single' };
            let done = false;

            // A: swap у тому ж дні/класі з нижчим пріоритетом
            const candidates = schedule.filter(ls =>
                !ls.isManual && ls.day === lateL.day && ls.classId === lateL.classId &&
                ls.slot < lateL.slot && getPriority(ls.subject) > 1
            ).sort((a, b) => a.slot - b.slot);
            for (const c of candidates) {
                if (safeSwap(lateL, c, schedule)) { changed = true; done = true; break; }
            }
            if (done) break;

            // B: перемістити в інший день на слот 1-4
            const oldDay = lateL.day;
            const idx    = schedule.indexOf(lateL);
            if (idx !== -1) {
                schedule.splice(idx, 1); // тимчасово видаляємо

                for (let d = 0; d < 5 && !done; d++) {
                    if (d === oldDay) continue;
                    for (let s = 1; s <= 4 && !done; s++) {
                        if (!isHardValid(pseudo, lateL, d, s, schedule)) continue;

                        // Перевіряємо старий день після видалення
                        // NO-GAP для класу
                        const clsOld = [...new Set(schedule
                            .filter(ls => ls.day === oldDay && ls.classId === lateL.classId && 1 <= ls.slot && ls.slot <= 7)
                            .map(ls => ls.slot))].sort((a, b) => a - b);
                        let clsOk = true;
                        for (let i = 1; i < clsOld.length; i++) {
                            if (clsOld[i] - clsOld[i - 1] > 2) { clsOk = false; break; }
                        }
                        if (!clsOk) continue;

                        // Вікна вчителя в старому дні
                        const tOld = [...new Set(schedule
                            .filter(ls => ls.day === oldDay && ls.teacherId === lateL.teacherId && 1 <= ls.slot && ls.slot <= 7)
                            .map(ls => ls.slot))].sort((a, b) => a - b);
                        let tOldOk = true;
                        let tGaps = 0;
                        for (let i = 1; i < tOld.length; i++) {
                            const g = tOld[i] - tOld[i - 1] - 1;
                            if (g > 1) { tOldOk = false; break; }
                            if (g > 0) tGaps++;
                        }
                        if (!tOldOk || tGaps > 1) continue;

                        schedule.push({ ...lateL, id: uid('sch'), day: d, slot: s });
                        changed = true; done = true;
                    }
                }

                if (!done) schedule.splice(idx, 0, lateL); // повертаємо якщо не знайшли
            }
            if (done) break;
        }
        if (!changed) break;
    }
}

// ================================================================
// SELF REORDER: переставляємо уроки одного вчителя в межах дня
// щоб prio-1 стояли раніше prio-2/3
// (safeSwap не працює між уроками одного вчителя)
// ================================================================
function selfReorder(schedule) {
    for (let pass = 0; pass < 20; pass++) {
        let changed = false;

        const tIds = [...new Set(schedule.filter(ls => !ls.isManual && 1 <= ls.slot && ls.slot <= 7).map(ls => ls.teacherId))];

        for (const tid of tIds) {
            for (let d = 0; d < 5; d++) {
                const dayLessons = schedule.filter(ls =>
                    ls.day === d && ls.teacherId === tid && !ls.isManual && 1 <= ls.slot && ls.slot <= 7
                );
                if (dayLessons.length < 2) continue;

                // Шукаємо prio-1 урок що стоїть пізніше prio-2/3 уроку того ж вчителя
                for (const late of dayLessons.filter(ls => getPriority(ls.subject) === 1 && ls.slot >= 4)) {
                    for (const early of dayLessons.filter(ls => getPriority(ls.subject) > 1 && ls.slot < late.slot)) {
                        // Перевіряємо чи можна поміняти місцями
                        const sLate = late.slot, sEarly = early.slot;

                        // Після swap: перевіряємо isHardValid для обох (без цих двох)
                        late.slot = sEarly;
                        early.slot = sLate;
                        const without = schedule.filter(x => x !== late && x !== early);
                        const pLate  = { items: [late],  priority: getPriority(late.subject),  type: late.pairType  || 'single' };
                        const pEarly = { items: [early], priority: getPriority(early.subject), type: early.pairType || 'single' };
                        const okL = isHardValid(pLate,  late,  d, sEarly, without);
                        const okE = isHardValid(pEarly, early, d, sLate,  without);

                        if (okL && okE) {
                            changed = true;
                            break;
                        } else {
                            // Відкат
                            late.slot = sLate;
                            early.slot = sEarly;
                        }
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
// GAP FIX: усуваємо вікна вчителів
// S1: swap урок після вікна ↔ будь-який урок на цільовому слоті
// S2: swap урок перед вікном ↔ будь-який урок на цільовому слоті
// S3: перемістити урок після вікна в інший день (з перевіркою обох днів)
// ================================================================
function gapFix(schedule) {
    for (let pass = 0; pass < 100; pass++) {
        let changed = false;

        const tIds = [...new Set(schedule.filter(ls => !ls.isManual && 1 <= ls.slot && ls.slot <= 7).map(ls => ls.teacherId))];
        for (const tid of tIds) {
            for (let d = 0; d < 5; d++) {
                const tSlots = [...new Set(
                    schedule.filter(ls => ls.day === d && ls.teacherId === tid && 1 <= ls.slot && ls.slot <= 7).map(ls => ls.slot)
                )].sort((a, b) => a - b);
                if (tSlots.length < 2) continue;

                const gaps = [];
                for (let i = 0; i + 1 < tSlots.length; i++) {
                    const g = tSlots[i + 1] - tSlots[i] - 1;
                    if (g > 0) gaps.push({ lo: tSlots[i], hi: tSlots[i + 1], size: g });
                }
                const hasLarge = gaps.some(g => g.size > 1);
                const tooMany  = gaps.length > 1;
                if (!hasLarge && !tooMany) continue;

                gaps.sort((a, b) => b.size - a.size);

                for (const gap of gaps) {
                    const afterL  = schedule.find(ls => ls.day === d && ls.teacherId === tid && ls.slot === gap.hi && !ls.isManual);
                    const beforeL = schedule.find(ls => ls.day === d && ls.teacherId === tid && ls.slot === gap.lo && !ls.isManual);

                    // S1: swap afterL ↔ будь-який урок на gap.lo+1
                    if (afterL) {
                        const tgt = gap.lo + 1;
                        for (const cand of schedule.filter(ls => ls.day === d && ls.slot === tgt && !ls.isManual && ls.teacherId !== tid)) {
                            if (safeSwap(afterL, cand, schedule)) { changed = true; break; }
                        }
                    }
                    if (changed) break;

                    // S2: swap beforeL ↔ будь-який урок на gap.hi-1
                    if (beforeL && !changed) {
                        const tgt = gap.hi - 1;
                        for (const cand of schedule.filter(ls => ls.day === d && ls.slot === tgt && !ls.isManual && ls.teacherId !== tid)) {
                            if (safeSwap(beforeL, cand, schedule)) { changed = true; break; }
                        }
                    }
                    if (changed) break;

                    // S3: перемістити afterL в інший день
                    if (afterL && !changed) {
                        const pL    = { items: [afterL], priority: getPriority(afterL.subject), type: afterL.pairType || 'single' };
                        const idxA  = schedule.indexOf(afterL);
                        if (idxA !== -1) {
                            schedule.splice(idxA, 1);

                            for (let nd = 0; nd < 5 && !changed; nd++) {
                                if (nd === d) continue;
                                for (let ns = 1; ns <= 7 && !changed; ns++) {
                                    if (!isHardValid(pL, afterL, nd, ns, schedule)) continue;

                                    // Перевіряємо старий день
                                    const tNew = [...new Set(schedule
                                        .filter(ls => ls.day === d && ls.teacherId === tid && 1 <= ls.slot && ls.slot <= 7)
                                        .map(ls => ls.slot))].sort((a, b) => a - b);
                                    let nGaps = 0, nBig = false;
                                    for (let i = 1; i < tNew.length; i++) {
                                        const ng = tNew[i] - tNew[i - 1] - 1;
                                        if (ng > 0) nGaps++;
                                        if (ng > 1) nBig = true;
                                    }
                                    if (nBig || nGaps > 1) continue;

                                    // NO-GAP для класу в старому дні
                                    const clsNew = [...new Set(schedule
                                        .filter(ls => ls.day === d && ls.classId === afterL.classId && 1 <= ls.slot && ls.slot <= 7)
                                        .map(ls => ls.slot))].sort((a, b) => a - b);
                                    let clsOk = true;
                                    for (let i = 1; i < clsNew.length; i++) {
                                        if (clsNew[i] - clsNew[i - 1] > 2) { clsOk = false; break; }
                                    }
                                    if (!clsOk) continue;

                                    schedule.push({ ...afterL, id: uid('sch'), day: nd, slot: ns });
                                    changed = true;
                                }
                            }
                            if (!changed) schedule.splice(idxA, 0, afterL);
                        }
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
// REPAIR: евакуація блокерів
// ================================================================
async function repairUnplaced(unplacedTasks, schedule, startTime, restart, total) {
    const MAX = 600;
    let noProgress = 0;

    for (let iter = 0; iter < MAX && unplacedTasks.length > 0; iter++) {
        if (_generatorStop) break;
        if (iter % 10 === 0) {
            updateLoader(restart, Date.now() - startTime, total - unplacedTasks.length, total, unplacedTasks.length,
                `Рестарт ${restart} | Repair ${iter} | Залишилось: ${unplacedTasks.length}`);
            await tick();
        }

        if (noProgress > 40) {
            shuffleArr(unplacedTasks);
            noProgress = 0;
            const tmp = [...unplacedTasks]; unplacedTasks.length = 0;
            for (const t of tmp) { if (!greedyPlace(t, schedule)) unplacedTasks.push(t); }
            continue;
        }

        if (iter % 7 === 0) {
            unplacedTasks.sort((a, b) => countValidSlots(a, schedule) - countValidSlots(b, schedule));
        }

        const task  = unplacedTasks[0];
        const first = task.items[0];

        if (greedyPlace(task, schedule)) { unplacedTasks.shift(); noProgress = 0; continue; }

        const candidates = buildCandidates(task, first, schedule);
        let repaired = false;

        for (const { d, s, blockers } of candidates) {
            const evacuated = [];
            let ok = true;

            for (const blocker of blockers) {
                const result = evacuateOne(blocker, d, s, schedule);
                if (result) evacuated.push(result);
                else { ok = false; break; }
            }

            if (!ok) {
                // Rollback
                for (const { orig, moved } of evacuated) {
                    const mi = schedule.indexOf(moved);
                    if (mi !== -1) schedule.splice(mi, 1);
                    if (!schedule.includes(orig)) schedule.push(orig);
                }
                continue;
            }

            if (isHardValid(task, first, d, s, schedule)) {
                commitTask(task, d, s, schedule);
                // Перейменовуємо tmp_ → sch_ і ГАРАНТУЄМО що оригінал видалений
                for (const { orig, moved } of evacuated) {
                    moved.id = uid('sch');
                    // Видаляємо оригінал якщо він якимось чином повернувся
                    const origIdx = schedule.indexOf(orig);
                    if (origIdx !== -1) schedule.splice(origIdx, 1);
                }
                unplacedTasks.shift();
                repaired = true; noProgress = 0;
                break;
            } else {
                // Rollback
                for (const { orig, moved } of evacuated) {
                    const mi = schedule.indexOf(moved);
                    if (mi !== -1) schedule.splice(mi, 1);
                    if (!schedule.includes(orig)) schedule.push(orig);
                }
            }
        }

        if (!repaired) { noProgress++; unplacedTasks.push(unplacedTasks.shift()); }
    }
}

// Евакуація одного уроку — без рекурсії, без каскадів
function evacuateOne(lesson, blockedDay, blockedSlot, schedule) {
    if (lesson.isManual) return null;
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
        const conflict = schedule.some(ls => ls.day === d && ls.slot === s &&
            (ls.teacherId === lesson.teacherId || ls.classId === lesson.classId));
        if (!conflict) {
            const moved = { ...lesson, id: uid('tmp'), day: d, slot: s };
            schedule.push(moved);
            return { orig: lesson, moved, removedIdx: idx };
        }
    }

    schedule.splice(idx, 0, lesson);
    return null;
}

function buildCandidates(task, first, schedule) {
    const result = [];
    for (let d = 0; d < 5; d++) {
        if (task.items.every(it => [1,2,3,4,5,6,7].every(s => getTeacherStatus(it.teacherId, d, s) === 2))) continue;
        for (let s = 1; s <= 7; s++) {
            if (task.items.some(it => getTeacherStatus(it.teacherId, d, s) === 2)) continue;
            const cs = [...new Set(schedule.filter(ls => ls.day === d && ls.classId === first.classId && 1 <= ls.slot && ls.slot <= 7).map(ls => ls.slot))];
            if (cs.length > 0) { const mx = Math.max(...cs), mn = Math.min(...cs); if (s > mx + 1 || s < mn - 1) continue; }
            const bT = schedule.filter(ls => ls.day === d && ls.slot === s && task.items.some(it => it.teacherId === ls.teacherId) && !ls.isManual);
            const bC = schedule.filter(ls => ls.day === d && ls.slot === s && ls.classId === first.classId && !ls.isManual);
            const blockers = [...new Map([...bT, ...bC].map(b => [b.id, b])).values()];
            if (blockers.length <= 2) result.push({ d, s, blockers, score: s + d * 7 });
        }
    }
    return result.sort((a, b) => a.blockers.length - b.blockers.length || a.score - b.score);
}

function countValidSlots(task, schedule) {
    const first = task.items[0];
    let c = 0;
    for (let d = 0; d < 5; d++) for (let s = 1; s <= 7; s++) if (isHardValid(task, first, d, s, schedule)) c++;
    return c;
}

// ================================================================
// COMMIT + HELPERS
// ================================================================
function commitTask(task, d, s, schedule) {
    task.items.forEach(it => {
        schedule.push({
            id:            uid('sch'),
            teacherId:     it.teacherId,
            classId:       it.classId,
            subject:       it.subject,
            day:           d,
            slot:          s,
            isAlternating: (it.currentHours === 0.5 && it.splitType === 'alternating'),
            pairType:      task.type
        });
    });
}

function countFreeSlots(teacherId) {
    let c = 0;
    for (let d = 0; d < 5; d++) for (let s = 1; s <= 7; s++) if (getTeacherStatus(teacherId, d, s) !== 2) c++;
    return c;
}

function countFreeDays(teacherId) {
    let c = 0;
    for (let d = 0; d < 5; d++)
        if (Array.from({ length: 7 }, (_, s) => getTeacherStatus(teacherId, d, s + 1)).some(v => v !== 2)) c++;
    return c;
}

function isLaborSubject(subject) {
    if (!subject) return false;
    const n = subject.toLowerCase();
    return n.includes('труд') || n.includes('технол');
}

function getTeacherStatus(teacherId, day, slot) {
    const t = state.teachers.find(t => t.id === teacherId);
    if (!t || !t.availability || !t.availability[day]) return 0;
    const v = t.availability[day][slot];
    if (v === true)  return 0;
    if (v === false) return 2;
    return v || 0;
}

function getPriority(subjectName) {
    if (!subjectName) return 100;
    const n = subjectName.toLowerCase();
    for (const [key, level] of Object.entries(subjectPriorities)) if (n.includes(key)) return level;
    return 10;
}

function getSubjectCode(subject) {
    if (!subject) return '';
    const words = subject.trim().split(/\s+/);
    return words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : subject.substring(0, 2).toUpperCase();
}

// ================================================================
// LOADER
// ================================================================
function showLoader() {
    let el = document.getElementById('gen-loader');
    if (!el) {
        el = document.createElement('div');
        el.id = 'gen-loader';
        el.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        el.innerHTML = `<div class="bg-white rounded-2xl shadow-2xl p-8 w-[440px] space-y-4">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <h2 class="text-lg font-bold text-slate-800">Генерація розкладу v6...</h2>
            </div>
            <div class="text-[11px] text-slate-500 italic min-h-[16px]" id="loader-phase"></div>
            <div class="space-y-2 text-sm text-slate-600">
                <div class="flex justify-between"><span>Час:</span><span id="loader-time" class="font-bold text-blue-700">0с</span></div>
                <div class="flex justify-between"><span>Розміщено:</span><span id="loader-placed" class="font-bold text-green-700">0</span></div>
                <div class="flex justify-between"><span>Залишилось:</span><span id="loader-unplaced" class="font-bold text-orange-600">—</span></div>
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
    if (g('loader-time'))    g('loader-time').textContent    = (ms / 1000).toFixed(1) + 'с';
    if (g('loader-placed'))  g('loader-placed').textContent  = `${placed} / ${total}`;
    if (g('loader-unplaced'))g('loader-unplaced').textContent = unplaced > 0 ? String(unplaced) : '—';
    if (g('loader-phase'))   g('loader-phase').textContent   = phase || '';
    if (g('loader-bar'))     g('loader-bar').style.width     = total > 0 ? `${Math.round(placed / total * 100)}%` : '0%';
}

function hideLoader() {
    const el = document.getElementById('gen-loader');
    if (el) el.style.display = 'none';
}

// ================================================================
// REPORTS
// ================================================================
function showFeasibilityError(issues) {
    const output = document.getElementById('schedule-output');
    const old = document.getElementById('gen-report'); if (old) old.remove();
    output.insertAdjacentHTML('afterbegin', `<div id="gen-report" class="mt-4">
        <div class="p-5 bg-red-50 border-red-600 border-l-4 rounded-xl shadow">
            <h3 class="font-bold text-red-800 text-base mb-3">🚫 Математично неможливо скласти розклад</h3>
            <p class="text-[12px] text-red-700 mb-3">Знайдено ${issues.length} причин:</p>
            <ul class="space-y-2">${issues.map(i => `<li class="text-[12px] text-red-800 bg-white border border-red-200 rounded-lg p-3">${i}</li>`).join('')}</ul>
            <p class="mt-3 text-[11px] italic text-red-600">💡 Усуньте проблеми у вкладках «Вчителі» або «Навантаження».</p>
        </div></div>`);
}

function showGenerationReport(errors, unpairedAlternating, overflowTasks, restarts, time) {
    const output   = document.getElementById('schedule-output');
    const old      = document.getElementById('gen-report'); if (old) old.remove();
    const isSuccess = errors.length === 0;
    let html = `<div id="gen-report" class="mt-4 space-y-3">`;
    html += `<div class="p-4 ${isSuccess ? 'bg-green-50 border-green-500' : 'bg-orange-50 border-orange-500'} border-l-4 rounded shadow-sm">
        <div class="flex justify-between items-center">
            <h3 class="font-bold ${isSuccess ? 'text-green-800' : 'text-orange-800'}">
                ${isSuccess ? '✅ Ідеальний розклад!' : `⚠️ Не вмістилось: ${errors.length} уроків`}
            </h3>
            <span class="text-[10px] text-gray-500">Рестарти: ${restarts} | Час: ${time}с</span>
        </div>
        ${errors.length > 0 ? `<ul class="list-disc list-inside text-[11px] mt-2 text-orange-700 space-y-1">${errors.map(e => `<li>${e}</li>`).join('')}</ul>
        <p class="mt-2 text-[10px] italic text-orange-600">💡 Розмістіть вручну на 0-й або 8-й урок.</p>` : ''}
    </div>`;
    if (unpairedAlternating?.length > 0) {
        window._unpairedAlt = unpairedAlternating;
        html += `<div class="p-4 bg-purple-50 border-purple-400 border-l-4 rounded shadow-sm">
            <h3 class="font-bold text-purple-800 mb-2">🔔 Непарні чергування (${unpairedAlternating.length})</h3>
            <div class="space-y-2">${unpairedAlternating.map((u, i) => `
            <div class="bg-white rounded-lg border border-purple-200 p-2 text-[11px]">
                <div class="font-bold text-slate-700 mb-1">📚 ${u.subject} — <span class="text-blue-600">${u.className}</span> — ${u.teacher}</div>
                <div class="flex flex-wrap gap-2">
                    <button onclick="addUnpairedToSlot(${i},0)" class="px-2 py-1 bg-purple-600 text-white rounded text-[10px] font-bold hover:bg-purple-700">📋 0-й урок</button>
                    <button onclick="addUnpairedToSlot(${i},8)" class="px-2 py-1 bg-slate-600 text-white rounded text-[10px] font-bold hover:bg-slate-700">📋 8-й урок</button>
                    <button onclick="addUnpairedToSchedule(${i})" class="px-2 py-1 bg-green-600 text-white rounded text-[10px] font-bold hover:bg-green-700">✅ В розклад</button>
                </div>
            </div>`).join('')}</div>
        </div>`;
    }
    if (overflowTasks?.length > 0) {
        const byClass = {};
        overflowTasks.forEach(ot => { if (!byClass[ot.className]) byClass[ot.className] = []; byClass[ot.className].push(ot); });
        html += `<div class="p-4 bg-red-50 border-red-500 border-l-4 rounded shadow-sm">
            <h3 class="font-bold text-red-800 mb-1">🚫 Overflow — ${overflowTasks.length} урок(ів) поза розкладом (> 35/тиждень)</h3>
            ${Object.entries(byClass).map(([cn, items]) => `<div class="bg-white rounded border border-red-200 p-2 mt-2">
                <div class="font-bold text-red-700 text-[11px] mb-1">Клас ${cn}:</div>
                ${items.map(ot => `<div class="text-[11px] text-slate-700">• <b>${ot.subject}</b> — ${ot.teacher}</div>`).join('')}
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
        if (!state.schedule.some(s => s.day === d && s.slot === slot && s.teacherId === item.teacherId) &&
            !state.schedule.some(s => s.day === d && s.slot === slot && s.classId === item.classId)) {
            state.schedule.push({ id: uid('up'), teacherId: item.teacherId, classId: item.classId, subject: item.subject, day: d, slot, isAlternating: true, isManual: true });
            save(); renderSchedule();
            alert(`✅ "${item.subject}" → ${slot === 0 ? '0-й' : '8-й'} урок (${state.config.days[d]})`);
            return;
        }
    }
    alert('Не знайдено вільного слота.');
}

function addUnpairedToSchedule(idx) {
    const item = window._unpairedAlt?.[idx]; if (!item) return;
    for (let d = 0; d < 5; d++)
        for (let s = 1; s <= 7; s++)
            if (!state.schedule.some(ls => ls.day === d && ls.slot === s && ls.teacherId === item.teacherId) &&
                !state.schedule.some(ls => ls.day === d && ls.slot === s && ls.classId === item.classId) &&
                getTeacherStatus(item.teacherId, d, s) !== 2) {
                state.schedule.push({ id: uid('up'), teacherId: item.teacherId, classId: item.classId, subject: item.subject, day: d, slot: s, isAlternating: true, isManual: true });
                save(); renderSchedule();
                alert(`✅ "${item.subject}" → ${state.config.days[d]}, урок ${s}`);
                return;
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

                    cellContent = `
                        <div class="w-full h-full flex flex-col justify-center items-center bg-blue-50 py-1 relative">
                            <span class="block text-blue-900 font-bold leading-none text-[11px]">
                                ${cls?.name || ''}${altMarker}
                            </span>
                            <span class="text-blue-700 text-[8px] truncate max-w-[45px] mt-0.5" title="${subjectsText}">
                                ${subjectsText}
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