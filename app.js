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
// ГЕНЕРАТОР РОЗКЛАДУ v3 — CLASS-DAY-PRIORITY ARCHITECTURE
// =============================================================
// Логіка:
//   1. buildTasks() — підготовка задач + чергування + overflow
//   2. Greedy: глобально по пріоритетах (prio1 → prio2 → prio3)
//      з урахуванням дефіциту вчителя (MRV по слотах 1-4)
//   3. Post-greedy fixes:
//      a) subjectOrderFix (мова раніше літератури)
//      b) priorityPushUp (prio1 штовхаємо на ранні слоти через swap/переміщення)
//      c) gapFix (усуваємо вікна вчителів через swap і переміщення)
//   4. minConflictsRepair — для нерозміщених через евакуацію блокерів
//   5. Random restart — різний порядок між спробами
// =============================================================

let _generatorRunning = false;
let _generatorStop = false;

async function generateSchedule() {
    // Якщо вже запущено — зупиняємо попередній запуск і чекаємо
    if (_generatorRunning) {
        _generatorStop = true;
        // Даємо час попередньому циклу завершитись
        await new Promise(r => setTimeout(r, 100));
        // Якщо все ще running (заморожено) — примусовий скид
        if (_generatorRunning) { _generatorRunning = false; }
    }
    _generatorRunning = true;
    _generatorStop = false;

    showLoader();
    const startTime = Date.now();

    const { tasks: allTasks, unpairedAlternating, overflowTasks } = buildTasks();
    const total = allTasks.length;

    const feasIssues = checkFeasibility(allTasks);
    if (feasIssues.length > 0) {
        _generatorRunning = false; hideLoader();
        showFeasibilityError(feasIssues); return;
    }

    let best = { schedule: [], unplacedCount: Infinity, unplacedList: [] };
    let restart = 0;

    while (!_generatorStop) {
        restart++;

        // Даємо браузеру "подихати" між рестартами щоб UI не замерзав
        await tick();
        if (_generatorStop) break;

        const manual = state.schedule.filter(s => s.slot === 0 || s.slot === 8 || s.isManual);
        const schedule = [...manual];

        const tasks = allTasks.map(t => ({ ...t, items: t.items.map(i => ({ ...i })) }));
        shuffleArr(tasks);

        // ── ФАЗА 1: TEACHER-COORDINATED GREEDY ──
        updateLoader(restart, Date.now() - startTime, 0, total, total, `Рестарт ${restart} | Greedy...`);
        const unplacedTasks = await teacherCoordinatedGreedy(tasks, schedule, startTime, restart, total);

        // ── ФАЗА 2a: Мова раніше літератури ──
        subjectOrderFix(schedule);

        // ── ФАЗА 2b: Штовхаємо prio1 на ранні слоти ──
        priorityPushUp(schedule);

        // ── ФАЗА 2c: Усуваємо вікна вчителів ──
        gapFix(schedule);
        await tick();

        // ── ФАЗА 3: Repair нерозміщених ──
        const stillUnplaced = [...unplacedTasks];
        await minConflictsRepair(stillUnplaced, schedule, startTime, restart, total);

        const unplacedCount = stillUnplaced.length;
        if (unplacedCount < best.unplacedCount) {
            best = {
                schedule: JSON.parse(JSON.stringify(schedule)),
                unplacedCount,
                unplacedList: stillUnplaced.map(t => {
                    const it = t.items[0];
                    const tObj = state.teachers.find(x => x.id === it.teacherId);
                    const cObj = state.classes.find(x => x.id === it.classId);
                    return `${it.subject} (${tObj?.name || '?'}) — ${cObj?.name || '?'} кл`;
                })
            };
        }

        updateLoader(restart, Date.now() - startTime,
            total - best.unplacedCount, total, best.unplacedCount,
            `Рестарт ${restart} | Нерозміщено: ${best.unplacedCount}`);
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

// Глобальний скид стану генератора (на випадок краша)
function resetGenerator() {
    _generatorRunning = false;
    _generatorStop = false;
}

function stopGenerator() { _generatorStop = true; }
async function tick() { await new Promise(r => setTimeout(r, 0)); }

function shuffleArr(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

// =============================================================
// ФАЗА 1: TEACHER-COORDINATED GREEDY
//
// Ключова ідея: вчителі з найменшим "запасом" ранніх слотів
// (earlyFree - prio1Needed) отримують пріоритет першими.
// Це вирішує проблему Острівської/Маланчука що ведуть 5+ класів.
//
// Раунд 1: всі prio-1, відсортовані по дефіциту вчителя
//   → спочатку слоти 1-4, потім 5 (вимушено)
// Раунд 2: prio-2, shuffled
// Раунд 3: prio-3, shuffled (scoreSlot штрафує ранні слоти)
// =============================================================
async function teacherCoordinatedGreedy(tasks, schedule, startTime, restart, total) {
    const unplaced = [];

    // Рахуємо вільні слоти 1-4 на всі 5 днів для кожного вчителя
    const earlyFreeByTeacher = {};
    state.teachers.forEach(t => {
        let c = 0;
        for (let d = 0; d < 5; d++)
            for (let s = 1; s <= 4; s++)
                if (getTeacherStatus(t.id, d, s) !== 2) c++;
        earlyFreeByTeacher[t.id] = c;
    });

    // Рахуємо скільки prio-1 задач у кожного вчителя
    const prio1ByTeacher = {};
    tasks.filter(t => t.priority === 1).forEach(t => {
        t.items.forEach(it => {
            prio1ByTeacher[it.teacherId] = (prio1ByTeacher[it.teacherId] || 0) + 1;
        });
    });

    // ── РАУНД 1: prio-1 ──
    const prio1Tasks = tasks.filter(t => t.priority === 1);
    prio1Tasks.sort((a, b) => {
        // Запас = вільних ранніх слотів − потрібних prio-1 уроків
        const margin = t =>
            Math.min(...t.items.map(it =>
                (earlyFreeByTeacher[it.teacherId] || 0) - (prio1ByTeacher[it.teacherId] || 0)
            ));
        return margin(a) - margin(b);
    });

    for (const task of prio1Tasks) {
        const first = task.items[0];
        let placed = false;

        // Дні: де вчитель найменш завантажений на 1-4
        const daysByLoad = [0,1,2,3,4].sort((a, b) =>
            schedule.filter(ls => ls.day === a && ls.teacherId === first.teacherId && 1<=ls.slot&&ls.slot<=4).length -
            schedule.filter(ls => ls.day === b && ls.teacherId === first.teacherId && 1<=ls.slot&&ls.slot<=4).length
        );

        // Спроба 1: слоти 1-4
        outer1: for (const d of daysByLoad)
            for (let s = 1; s <= 4; s++)
                if (isHardValid(task, first, d, s, schedule)) {
                    commitTask(task, d, s, schedule); placed = true; break outer1;
                }

        // Спроба 2: слот 5
        if (!placed)
            outer2: for (const d of daysByLoad)
                if (isHardValid(task, first, d, 5, schedule)) {
                    commitTask(task, d, 5, schedule); placed = true; break outer2;
                }

        // Спроба 3: будь-який валідний
        if (!placed) placed = greedyPlace(task, schedule);

        if (!placed) unplaced.push(task);
    }

    // ── РАУНД 2: prio-2 ──
    const prio2Tasks = tasks.filter(t => t.priority === 2);
    shuffleArr(prio2Tasks);
    for (let i = 0; i < prio2Tasks.length; i++) {
        if (!greedyPlace(prio2Tasks[i], schedule)) unplaced.push(prio2Tasks[i]);
        if (i % 20 === 0) {
            updateLoader(restart, Date.now() - startTime, total - unplaced.length, total, unplaced.length, `Рестарт ${restart} | Greedy prio2 ${i}/${prio2Tasks.length}`);
            await tick();
        }
    }

    // ── РАУНД 3: prio-3 ──
    const prio3Tasks = tasks.filter(t => t.priority >= 3);
    shuffleArr(prio3Tasks);
    for (let i = 0; i < prio3Tasks.length; i++) {
        if (!greedyPlace(prio3Tasks[i], schedule)) unplaced.push(prio3Tasks[i]);
        if (i % 20 === 0) {
            updateLoader(restart, Date.now() - startTime, total - unplaced.length, total, unplaced.length, `Рестарт ${restart} | Greedy prio3 ${i}/${prio3Tasks.length}`);
            await tick();
        }
    }

    return unplaced;
}

function greedyPlace(task, schedule) {
    const first = task.items[0];
    let bestSlot = null, bestScore = Infinity;
    for (let d = 0; d < 5; d++)
        for (let s = 1; s <= 7; s++) {
            if (!isHardValid(task, first, d, s, schedule)) continue;
            const sc = scoreSlot(task, first, d, s, schedule);
            if (sc < bestScore) { bestScore = sc; bestSlot = { d, s }; }
        }
    if (bestSlot) { commitTask(task, bestSlot.d, bestSlot.s, schedule); return true; }
    return false;
}

// =============================================================
// ФАЗА 2a: Мова раніше літератури
// =============================================================
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

// =============================================================
// ФАЗА 2b: priorityPushUp — prio1 на слоті 5+ → намагаємось
// перемістити на 1-4 (swap у дні або переміщення в інший день)
// =============================================================
function priorityPushUp(schedule) {
    for (let pass = 0; pass < 50; pass++) {
        let changed = false;

        const lateList = schedule.filter(ls =>
            !ls.isManual && getPriority(ls.subject) === 1 && ls.slot >= 5
        );

        for (const lateLesson of lateList) {
            const pLate = { items: [lateLesson], priority: 1, type: lateLesson.pairType || 'single' };

            // Варіант А: swap у тому ж дні/класі з нижчим пріоритетом
            const sameDay = schedule.filter(ls =>
                !ls.isManual && ls.day === lateLesson.day &&
                ls.classId === lateLesson.classId && ls.slot < lateLesson.slot &&
                getPriority(ls.subject) > 1
            ).sort((a, b) => a.slot - b.slot);

            let swapped = false;
            for (const early of sameDay)
                if (safeSwap(lateLesson, early, schedule)) { changed = true; swapped = true; break; }
            if (swapped) break;

            // Варіант Б: перемістити в інший день де є слот 1-4
            const withoutLate = schedule.filter(x => x !== lateLesson);
            let betterSlot = null;
            outer:
            for (let d = 0; d < 5; d++) {
                if (d === lateLesson.day) continue;
                for (let s = 1; s <= 4; s++)
                    if (isHardValid(pLate, lateLesson, d, s, withoutLate)) {
                        betterSlot = { d, s }; break outer;
                    }
            }

            if (betterSlot) {
                const idx = schedule.indexOf(lateLesson);
                if (idx !== -1) {
                    schedule.splice(idx, 1);
                    schedule.push({ ...lateLesson, id: 'pp_' + Date.now() + Math.random(), day: betterSlot.d, slot: betterSlot.s });
                    changed = true; break;
                }
            }
        }
        if (!changed) break;
    }
}

// =============================================================
// ФАЗА 2c: gapFix — усуваємо вікна вчителів
// Стратегії: swap з уроком класу в сусідньому слоті,
//            або переміщення уроку в інший день
// =============================================================
function gapFix(schedule) {
    for (let pass = 0; pass < 40; pass++) {
        let changed = false;

        const tIds = [...new Set(schedule.filter(ls => !ls.isManual && 1<=ls.slot&&ls.slot<=7).map(ls => ls.teacherId))];
        outer:
        for (const tid of tIds) {
            for (let d = 0; d < 5; d++) {
                const tSlots = [...new Set(
                    schedule.filter(ls => ls.day===d && ls.teacherId===tid && 1<=ls.slot&&ls.slot<=7).map(ls => ls.slot)
                )].sort((a,b) => a-b);
                if (tSlots.length < 2) continue;

                const gaps = [];
                for (let i = 0; i+1 < tSlots.length; i++) {
                    const g = tSlots[i+1] - tSlots[i] - 1;
                    if (g > 0) gaps.push({ after: tSlots[i], before: tSlots[i+1], size: g });
                }
                if (!gaps.some(g => g.size > 1) && gaps.length <= 1) continue;

                gaps.sort((a,b) => b.size - a.size);

                for (const gap of gaps) {
                    const afterLesson  = schedule.find(ls => ls.day===d && ls.teacherId===tid && ls.slot===gap.before && !ls.isManual);
                    const beforeLesson = schedule.find(ls => ls.day===d && ls.teacherId===tid && ls.slot===gap.after  && !ls.isManual);

                    // Стратегія 1: swap afterLesson з уроком класу в слоті gap.after+1
                    if (afterLesson) {
                        const tgt = gap.after + 1;
                        for (const cand of schedule.filter(ls => ls.day===d && ls.slot===tgt && ls.classId===afterLesson.classId && !ls.isManual && ls.teacherId!==tid))
                            if (safeSwap(afterLesson, cand, schedule)) { changed = true; break outer; }
                    }

                    // Стратегія 2: swap beforeLesson з уроком класу в слоті gap.before-1
                    if (beforeLesson) {
                        const tgt = gap.before - 1;
                        for (const cand of schedule.filter(ls => ls.day===d && ls.slot===tgt && ls.classId===beforeLesson.classId && !ls.isManual && ls.teacherId!==tid))
                            if (safeSwap(beforeLesson, cand, schedule)) { changed = true; break outer; }
                    }

                    // Стратегія 3: перемістити afterLesson в інший день
                    if (afterLesson) {
                        const pLesson = { items:[afterLesson], priority: getPriority(afterLesson.subject), type: afterLesson.pairType||'single' };
                        const withoutLesson = schedule.filter(x => x !== afterLesson);
                        for (let nd = 0; nd < 5; nd++) {
                            if (nd === d) continue;
                            for (let ns = 1; ns <= 7; ns++) {
                                if (!isHardValid(pLesson, afterLesson, nd, ns, withoutLesson)) continue;
                                const idx = schedule.indexOf(afterLesson);
                                if (idx === -1) continue;
                                schedule.splice(idx, 1);
                                const moved = { ...afterLesson, id: 'gf_' + Date.now() + Math.random(), day: nd, slot: ns };
                                schedule.push(moved);
                                // Перевіряємо що в старому дні не погіршились вікна
                                const newSlots = [...new Set(schedule.filter(ls => ls.day===d && ls.teacherId===tid && 1<=ls.slot&&ls.slot<=7).map(ls=>ls.slot))].sort((a,b)=>a-b);
                                let newBig = false, newGaps = 0;
                                for (let i=1; i<newSlots.length; i++) {
                                    const ng = newSlots[i]-newSlots[i-1]-1;
                                    if (ng>0) newGaps++;
                                    if (ng>1) newBig = true;
                                }
                                if (!newBig && newGaps <= 1) { changed = true; break outer; }
                                // Відкочуємо
                                schedule.splice(schedule.indexOf(moved), 1);
                                schedule.splice(idx, 0, afterLesson);
                            }
                        }
                    }
                }
            }
        }
        if (!changed) break;
    }
}

// =============================================================
// SAFE SWAP: перевіряємо isHardValid для обох після swap
// Тільки уроки в той самий день (різні слоти)
// =============================================================
function safeSwap(lessonA, lessonB, schedule) {
    if (lessonA.day !== lessonB.day) return false;
    if (lessonA.teacherId === lessonB.teacherId) return false;

    const d = lessonA.day;
    const sA = lessonA.slot, sB = lessonB.slot;

    if (schedule.some(ls => ls !== lessonA && ls.day === d && ls.slot === sB && ls.teacherId === lessonA.teacherId)) return false;
    if (schedule.some(ls => ls !== lessonB && ls.day === d && ls.slot === sA && ls.teacherId === lessonB.teacherId)) return false;
    if (getTeacherStatus(lessonA.teacherId, d, sB) === 2) return false;
    if (getTeacherStatus(lessonB.teacherId, d, sA) === 2) return false;

    lessonA.slot = sB; lessonB.slot = sA;

    const without = schedule.filter(x => x !== lessonA && x !== lessonB);
    const pA = { items: [lessonA], priority: getPriority(lessonA.subject), type: lessonA.pairType || 'single' };
    const pB = { items: [lessonB], priority: getPriority(lessonB.subject), type: lessonB.pairType || 'single' };
    const okA = isHardValid(pA, lessonA, d, lessonA.slot, without);
    const okB = isHardValid(pB, lessonB, d, lessonB.slot, without);

    if (okA && okB) return true;

    lessonA.slot = sA; lessonB.slot = sB;
    return false;
}

// =============================================================
// REPAIR: min-conflicts з евакуацією блокерів
// =============================================================
async function minConflictsRepair(unplacedTasks, schedule, startTime, restart, total) {
    const MAX_ITERS = 300;
    let noProgress = 0;

    for (let iter = 0; iter < MAX_ITERS && unplacedTasks.length > 0; iter++) {
        if (_generatorStop) break;

        if (iter % 15 === 0) {
            updateLoader(restart, Date.now() - startTime,
                total - unplacedTasks.length, total, unplacedTasks.length,
                `Рестарт ${restart} | Repair ${iter} | Залишилось: ${unplacedTasks.length}`);
            await tick();
        }

        if (noProgress > 40) { shuffleArr(unplacedTasks); noProgress = 0; }

        if (iter % 5 === 0)
            unplacedTasks.sort((a, b) => countValidSlots(a, schedule) - countValidSlots(b, schedule));

        const task = unplacedTasks[0];
        const first = task.items[0];

        if (greedyPlace(task, schedule)) {
            unplacedTasks.shift(); noProgress = 0; continue;
        }

        let repaired = false;
        const candidates = buildCandidates(task, first, schedule);

        for (const { d, s, blockers } of candidates) {
            const allChanges = [];
            let allOk = true;

            for (const blocker of blockers) {
                const changes = tryEvacuate(blocker, d, s, schedule, 0);
                if (changes) allChanges.push(...changes);
                else { allOk = false; break; }
            }

            if (!allOk) { rollbackEvacuation(allChanges, schedule); continue; }

            if (isHardValid(task, first, d, s, schedule)) {
                commitTask(task, d, s, schedule);
                unplacedTasks.shift();
                repaired = true; noProgress = 0; break;
            } else {
                rollbackEvacuation(allChanges, schedule);
            }
        }

        if (!repaired) {
            noProgress++;
            unplacedTasks.push(unplacedTasks.shift());
        }
    }
}

function buildCandidates(task, first, schedule) {
    const candidates = [];
    for (let d = 0; d < 5; d++) {
        // Пропускаємо дні де вчитель повністю заборонений
        if (task.items.some(it =>
            [1,2,3,4,5,6,7].every(s => getTeacherStatus(it.teacherId, d, s) === 2)
        )) continue;

        for (let s = 1; s <= 7; s++) {
            if (task.items.some(it => getTeacherStatus(it.teacherId, d, s) === 2)) continue;

            const csNow = [...new Set(schedule
                .filter(ls => ls.day===d && ls.classId===first.classId && ls.slot>=1 && ls.slot<=7)
                .map(ls => ls.slot))];
            if (csNow.length > 0) {
                const mx = Math.max(...csNow), mn = Math.min(...csNow);
                if (s > mx+1 || s < mn-1) continue;
            }

            const blockersT = schedule.filter(ls => ls.day===d && ls.slot===s && !ls.isManual && task.items.some(it => it.teacherId===ls.teacherId));
            const blockersC = schedule.filter(ls => ls.day===d && ls.slot===s && !ls.isManual && ls.classId===first.classId);
            const blockers = [...new Map([...blockersT, ...blockersC].map(b => [b.id, b])).values()];

            if (blockers.length <= 2)
                candidates.push({ d, s, blockers, score: s + d*7 });
        }
    }
    return candidates.sort((a,b) => a.blockers.length - b.blockers.length || a.score - b.score);
}

function countValidSlots(task, schedule) {
    // Швидка версія: рахуємо лише перші знайдені валідні слоти (для MRV сортування)
    // Не потрібна точна кількість — достатньо порівняльного значення
    const first = task.items[0];
    let c = 0;
    for (let d = 0; d < 5; d++)
        for (let s = 1; s <= 7; s++) {
            if (isHardValid(task, first, d, s, schedule)) c++;
            if (c >= 15) return c; // достатньо для сортування
        }
    return c;
}

// =============================================================
// ЕВАКУАЦІЯ: переміщення блокера в інший слот.
// ВИПРАВЛЕННЯ багу з paired_external:
//   При евакуації lesson з дня D зберігаємо originalDay/originalSlot.
//   Якщо нове місце в той самий день — перевіряємо вікна
//   з урахуванням originalSlot (який "фізично" ще займає місце
//   якщо lesson є частиною paired_external пари).
// =============================================================
function tryEvacuate(lesson, blockedDay, blockedSlot, schedule, depth) {
    if (depth > 2 || lesson.isManual) return null;
    const idx = schedule.indexOf(lesson);
    if (idx === -1) return null;

    const originalDay = lesson.day;
    const originalSlot = lesson.slot;

    schedule.splice(idx, 1);

    const pseudoTask = {
        items: [lesson],
        priority: getPriority(lesson.subject),
        type: lesson.pairType || 'single'
    };

    const slots = [];
    for (let d = 0; d < 5; d++)
        for (let s = 1; s <= 7; s++)
            slots.push({ d, s });
    shuffleArr(slots);

    for (const { d, s } of slots) {
        if (d === blockedDay && s === blockedSlot) continue;
        if (!isHardValid(pseudoTask, lesson, d, s, schedule)) continue;

        // Якщо нове місце в той самий день — враховуємо originalSlot при перевірці вікон.
        // Це виправляє баг з paired_external: видалений запис все ще "займає" фізичний слот
        // через партнера пари, тому не можна створювати вікно між originalSlot і s.
        if (d === originalDay) {
            const currentSlots = [...new Set(
                schedule.filter(ls => ls.day===d && ls.teacherId===lesson.teacherId && ls.slot>=1 && ls.slot<=7)
                    .map(ls => ls.slot)
            )];
            const allWithOriginal = [...new Set([...currentSlots, originalSlot, s])].sort((a,b) => a-b);
            let bigGap = false, gapCount = 0;
            for (let i = 1; i < allWithOriginal.length; i++) {
                const g = allWithOriginal[i] - allWithOriginal[i-1] - 1;
                if (g > 1) bigGap = true;
                if (g > 0) gapCount++;
            }
            if (bigGap || gapCount > 1) continue;
        }

        if (getPriority(lesson.subject) === 1 && s >= 5) {
            let hasEarly = false;
            for (let es = 1; es <= 4 && !hasEarly; es++) {
                if (d === blockedDay && es === blockedSlot) continue;
                const tF = !schedule.some(x => x.day===d && x.slot===es && x.teacherId===lesson.teacherId);
                const cF = !schedule.some(x => x.day===d && x.slot===es && x.classId===lesson.classId);
                if (tF && cF && getTeacherStatus(lesson.teacherId, d, es) !== 2) hasEarly = true;
            }
            if (hasEarly) continue;
        }

        const tC = schedule.find(ls => ls.day===d && ls.slot===s && ls.teacherId===lesson.teacherId);
        const cC = schedule.find(ls => ls.day===d && ls.slot===s && ls.classId===lesson.classId);

        if (!tC && !cC) {
            const moved = { ...lesson, id: 'e_' + Date.now() + Math.random(), day: d, slot: s };
            schedule.push(moved);
            return [{ original: lesson, moved, removedIdx: idx }];
        }

        if (depth < 2) {
            const blocker = tC || cC;
            if (!blocker.isManual) {
                const cascadeResult = tryEvacuate(blocker, d, s, schedule, depth + 1);
                if (cascadeResult) {
                    const stillConflict = schedule.some(ls => ls.day===d && ls.slot===s &&
                        (ls.teacherId===lesson.teacherId || ls.classId===lesson.classId));
                    if (!stillConflict && isHardValid(pseudoTask, lesson, d, s, schedule)) {
                        const moved = { ...lesson, id: 'e_' + Date.now() + Math.random(), day: d, slot: s };
                        schedule.push(moved);
                        return [{ original: lesson, moved, removedIdx: idx }, ...cascadeResult];
                    }
                    rollbackEvacuation(cascadeResult, schedule);
                }
            }
        }
    }

    const stillAbsent = !schedule.some(ls => ls === lesson || ls.id === lesson.id);
    if (stillAbsent) schedule.splice(idx, 0, lesson);
    return null;
}

function rollbackEvacuation(changes, schedule) {
    const movedIds = new Set(changes.map(c => c.moved.id));
    const originalIds = new Set(changes.map(c => c.original.id));
    for (let i = schedule.length - 1; i >= 0; i--) {
        const ls = schedule[i];
        if ((movedIds.has(ls.id) && !originalIds.has(ls.id)) || changes.some(c => c.moved === ls))
            schedule.splice(i, 1);
    }
    for (let i = changes.length - 1; i >= 0; i--) {
        const { original, removedIdx } = changes[i];
        if (!schedule.some(ls => ls === original || ls.id === original.id)) {
            const ins = typeof removedIdx === 'number' ? Math.min(removedIdx, schedule.length) : schedule.length;
            schedule.splice(ins, 0, original);
        }
    }
}

// =============================================================
// HARD CONSTRAINTS
// =============================================================
function isHardValid(task, first, d, s, schedule) {
    // Слоти 0 і 8 — тільки ручне заповнення
    if (s < 1 || s > 7) return false;

    // 1. Вчителі задачі зайняті
    if (task.items.some(it => schedule.some(ls => ls.day===d && ls.slot===s && ls.teacherId===it.teacherId))) return false;

    // 2. Клас зайнятий (виключаємо вчителів цієї ж задачі — для paired)
    {
        const taskTids = new Set(task.items.map(it => it.teacherId));
        if (schedule.some(ls => ls.day===d && ls.slot===s && ls.classId===first.classId && !taskTids.has(ls.teacherId))) return false;
    }

    // 2b. Для paired: всі вчителі items вільні
    if (task.items.length > 1) {
        for (let i = 1; i < task.items.length; i++) {
            const it = task.items[i];
            if (schedule.some(ls => ls.day===d && ls.slot===s && ls.teacherId===it.teacherId)) return false;
            if (getTeacherStatus(it.teacherId, d, s) === 2) return false;
        }
    }

    // 3. Червона зона
    if (task.items.some(it => getTeacherStatus(it.teacherId, d, s) === 2)) return false;

    // 3b. Початкова школа (1-4): абсолютна заборона слотів 5-7
    {
        const cls = state.classes.find(c => c.id === first.classId);
        if (cls && parseInt(cls.name) >= 1 && parseInt(cls.name) <= 4 && s > 4) return false;
    }

    // 4. NO-GAP класу: уроки класу мають іти підряд без пропусків
    const classSlots = [...new Set(schedule
        .filter(ls => ls.day===d && ls.classId===first.classId && ls.slot>=1 && ls.slot<=7)
        .map(ls => ls.slot))];
    if (classSlots.length > 0) {
        const maxS = Math.max(...classSlots), minS = Math.min(...classSlots);
        if (s > maxS + 1 || s < minS - 1) return false;
    }

    // 5. Пріоритет 1 — max 1 раз на день (крім вимушеної пари підряд)
    if (task.priority === 1) {
        const existing = schedule.filter(ls => ls.day===d && ls.classId===first.classId && ls.subject===first.subject);
        if (existing.length > 0) {
            const totalNeeded = state.workload
                .filter(w => w.classId===first.classId && w.subject.toLowerCase()===first.subject.toLowerCase())
                .reduce((sum, w) => sum + Math.ceil(parseFloat(w.hours)), 0);
            if (totalNeeded <= countFreeDays(first.teacherId)) return false;
            if (!existing.some(ls => Math.abs(ls.slot - s) === 1)) return false;
            if (existing.length >= 2) return false;
        }
    }

    // 5b. Будь-який предмет — max 2 однакових в день для класу
    if (schedule.filter(ls => ls.day===d && ls.classId===first.classId && ls.subject===first.subject).length >= 2) return false;

    // 6. Пріоритет 1 — обмеження по слоту:
    //    Слот 7: абсолютна заборона.
    //    Слоти 4-6: дозволено лише якщо немає вільнішого слоту раніше.
    if (task.priority === 1) {
        if (s >= 7) return false;

        if (s >= 4) {
            const csNow = [...new Set(schedule
                .filter(ls => ls.day===d && ls.classId===first.classId && ls.slot>=1 && ls.slot<=7)
                .map(ls => ls.slot))];
            for (let earlyS = 1; earlyS < s; earlyS++) {
                const tFree = !schedule.some(ls => ls.day===d && ls.slot===earlyS && task.items.some(it => it.teacherId===ls.teacherId));
                const cFree = !schedule.some(ls => ls.day===d && ls.slot===earlyS && ls.classId===first.classId);
                const notRed = !task.items.some(it => getTeacherStatus(it.teacherId, d, earlyS) === 2);
                let ngOk = true;
                if (csNow.length > 0) {
                    const mx = Math.max(...csNow), mn = Math.min(...csNow);
                    if (earlyS > mx+1 || earlyS < mn-1) ngOk = false;
                }
                if (tFree && cFree && notRed && ngOk) return false;
            }
        }
    }

    // 7. Вікно вчителя: max 1 вікно по 1 уроку на день
    {
        const tSlots = [...new Set(schedule
            .filter(ls => ls.day===d && ls.teacherId===first.teacherId && ls.slot>=1 && ls.slot<=7)
            .map(ls => ls.slot))];
        if (tSlots.length > 0) {
            const all = [...tSlots, s].sort((a,b) => a-b);
            let gaps = 0, bigGap = false;
            for (let i = 1; i < all.length; i++) {
                const g = all[i] - all[i-1] - 1;
                if (g > 0) gaps++;
                if (g > 1) bigGap = true;
            }
            if (bigGap || gaps > 1) return false;
        }
    }

    // 8. Кімнатні конфлікти
    const roomType = getRoomType(first.subject);
    if (roomType) {
        if (schedule.some(ls => ls.day===d && ls.slot===s && ls.classId!==first.classId && getRoomType(ls.subject)===roomType)) return false;
        if (roomType === 'gym' && schedule.some(ls => ls.day===d && ls.classId===first.classId && getRoomType(ls.subject)==='gym' && ls.slot!==s)) return false;
    }

    // 9. Труд — один кабінет
    if (isLaborSubject(first.subject) &&
        schedule.some(ls => ls.day===d && ls.slot===s && ls.classId!==first.classId && isLaborSubject(ls.subject))) return false;

    // 10. Пріоритет 3 — max 1 раз на день для класу
    if (task.priority === 3 && schedule.some(ls => ls.day===d && ls.classId===first.classId && ls.subject===first.subject)) return false;

    // 11. Пріоритет 2 — не дублюємо якщо є вільні дні
    if (task.priority === 2) {
        const sameDay = schedule.filter(ls => ls.day===d && ls.classId===first.classId && ls.subject===first.subject).length;
        if (sameDay >= 1) {
            const totalNeeded = state.workload
                .filter(w => w.classId===first.classId && w.subject.toLowerCase()===first.subject.toLowerCase())
                .reduce((sum, w) => sum + Math.ceil(parseFloat(w.hours)), 0);
            if (totalNeeded <= countFreeDays(first.teacherId)) return false;
        }
    }

    return true;
}

// =============================================================
// SCORE (менше = краще)
// =============================================================
function scoreSlot(task, first, d, s, schedule) {
    if (!isHardValid(task, first, d, s, schedule)) return Infinity;
    let score = 0;
    const priority = task.priority;

    // Жовта зона
    if (task.items.reduce((m, it) => Math.max(m, getTeacherStatus(it.teacherId, d, s)), 0) === 1) score += 800;

    // Початкова школа — тягнемо до слоту 1
    {
        const cls = state.classes.find(c => c.id === first.classId);
        if (cls && parseInt(cls.name) >= 1 && parseInt(cls.name) <= 4) score += (s-1) * 500;
    }

    // Позиція слоту залежно від пріоритету
    if (priority === 1) {
        if (s <= 3) score += 0;
        else if (s === 4) score += 60;
        else if (s === 5) score += 300;
        else score += 5000;
    } else if (priority === 2) {
        score += s <= 5 ? (s-1)*20 : (s===6 ? 400 : 900);
    } else {
        // Prio 3: великий штраф за ранні слоти (фізкультура/мистецтво — в кінець дня)
        score += Math.max(0, 6-s) * 400;
    }

    // Вікна вчителя — бонус за суміжний слот, штраф за вікно
    const tSlots = [...new Set(schedule
        .filter(ls => ls.day===d && ls.teacherId===first.teacherId && ls.slot>=1 && ls.slot<=7)
        .map(ls => ls.slot))];
    if (tSlots.length > 0) {
        const minGap = Math.min(...tSlots.map(ts => Math.abs(ts-s)));
        if (minGap === 1) score -= 150;
        else if (minGap === 2) score += 250;
        else score += minGap * 600;
    } else {
        score += (s-1) * 80;
    }

    // Баланс по днях
    const dayCount = schedule.filter(ls => ls.day===d && ls.teacherId===first.teacherId && 1<=ls.slot&&ls.slot<=7).length;
    if (dayCount >= 6) score += 1200;
    else if (dayCount >= 5) score += 400;

    // Дублювання предмету в день
    const sameDay = schedule.filter(ls => ls.day===d && ls.classId===first.classId && ls.subject===first.subject);
    if (sameDay.length > 0) {
        const adj = sameDay.some(ls => Math.abs(ls.slot-s) === 1);
        score += priority === 1 ? (adj ? 150 : 2500) : (adj ? 200 : 3500);
    }

    // Клас порожній в цей день — починаємо з 1
    const classToday = [...new Set(schedule.filter(ls => ls.day===d && ls.classId===first.classId && 1<=ls.slot&&ls.slot<=7).map(ls=>ls.slot))];
    if (classToday.length === 0 && s > 1) score += (s-1)*100;

    score += Math.random() * 8;
    return score;
}


// =============================================================
// COMMIT TASK
// =============================================================
function commitTask(task, d, s, schedule) {
    task.items.forEach(it => {
        schedule.push({
            id: 'sch_' + Date.now() + Math.random(),
            teacherId: it.teacherId,
            classId: it.classId,
            subject: it.subject,
            day: d,
            slot: s,
            isAlternating: (it.currentHours === 0.5 && it.splitType === 'alternating'),
            pairType: task.type
        });
    });
}

// =============================================================
// ДОПОМІЖНІ
// =============================================================
function countFreeSlots(teacherId) {
    let c = 0;
    for (let d = 0; d < 5; d++) for (let s = 1; s <= 7; s++) if (getTeacherStatus(teacherId, d, s) !== 2) c++;
    return c;
}

function countFreeDays(teacherId) {
    let c = 0;
    for (let d = 0; d < 5; d++) if (Array.from({length: 7}, (_, s) => getTeacherStatus(teacherId, d, s+1)).some(v => v !== 2)) c++;
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
    if (v === true) return 0; if (v === false) return 2;
    return v || 0;
}

function getPriority(subjectName) {
    if (!subjectName) return 100;
    const n = subjectName.toLowerCase();
    for (const [key, level] of Object.entries(subjectPriorities)) if (n.includes(key)) return level;
    return 10;
}

// =============================================================
// ЛОАДЕР
// =============================================================
function showLoader() {
    // Завжди видаляємо старий лоадер і створюємо новий
    // щоб кнопка "Зупинити" мала свіжий стан і onclick
    const old = document.getElementById('gen-loader');
    if (old) old.remove();

    const el = document.createElement('div');
    el.id = 'gen-loader';
    el.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    el.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl p-8 w-[440px] space-y-4">
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <h2 class="text-lg font-bold text-slate-800">Генерація розкладу...</h2>
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
    el.style.display = 'flex';
}

function updateLoader(restart, ms, placed, total, unplaced, phase) {
    const g = id => document.getElementById(id);
    if (g('loader-time')) g('loader-time').textContent = (ms / 1000).toFixed(1) + 'с';
    if (g('loader-placed')) g('loader-placed').textContent = `${placed} / ${total}`;
    if (g('loader-unplaced')) g('loader-unplaced').textContent = unplaced > 0 ? String(unplaced) : '—';
    if (g('loader-phase')) g('loader-phase').textContent = phase || '';
    if (g('loader-bar')) g('loader-bar').style.width = total > 0 ? `${Math.round(placed / total * 100)}%` : '0%';
}

function hideLoader() {
    const el = document.getElementById('gen-loader');
    if (el) el.style.display = 'none';
}

// =============================================================
// ЗВІТ
// =============================================================
function showFeasibilityError(issues) {
    const output = document.getElementById('schedule-output');
    const old = document.getElementById('gen-report');
    if (old) old.remove();
    output.insertAdjacentHTML('afterbegin', `
    <div id="gen-report" class="mt-4">
        <div class="p-5 bg-red-50 border-red-600 border-l-4 rounded-xl shadow">
            <h3 class="font-bold text-red-800 text-base mb-3">🚫 Математично неможливо скласти розклад</h3>
            <p class="text-[12px] text-red-700 mb-3">Знайдено ${issues.length} причин:</p>
            <ul class="space-y-2">${issues.map(i => `<li class="text-[12px] text-red-800 bg-white border border-red-200 rounded-lg p-3">${i}</li>`).join('')}</ul>
            <p class="mt-3 text-[11px] italic text-red-600">💡 Усуньте проблеми у вкладках «Вчителі» або «Навантаження».</p>
        </div>
    </div>`);
}

function showGenerationReport(errors, unpairedAlternating, overflowTasks, restarts, time) {
    const output = document.getElementById('schedule-output');
    const old = document.getElementById('gen-report');
    if (old) old.remove();

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
        window._unpairedAlternating = unpairedAlternating;
        html += `<div class="p-4 bg-purple-50 border-purple-400 border-l-4 rounded shadow-sm">
            <h3 class="font-bold text-purple-800 mb-2">🔔 Непарні чергування (${unpairedAlternating.length})</h3>
            <div class="space-y-3">${unpairedAlternating.map((u, idx) => `
            <div class="bg-white rounded-lg border border-purple-200 p-3 text-[11px]">
                <div class="font-bold text-slate-700 mb-2">📚 ${u.subject} — <span class="text-blue-600">${u.className}</span> — ${u.teacher}</div>
                <div class="flex flex-wrap gap-2">
                    <button onclick="addUnpairedToSlot(${idx},0)" class="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-[10px] font-bold hover:bg-purple-700 transition">📋 0-й урок</button>
                    <button onclick="addUnpairedToSlot(${idx},8)" class="px-3 py-1.5 bg-slate-600 text-white rounded-lg text-[10px] font-bold hover:bg-slate-700 transition">📋 8-й урок</button>
                    <button onclick="addUnpairedToSchedule(${idx})" class="px-3 py-1.5 bg-green-600 text-white rounded-lg text-[10px] font-bold hover:bg-green-700 transition">✅ В розклад</button>
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

function dismissUnpaired(idx) { if (window._unpairedAlternating) window._unpairedAlternating[idx] = null; }

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