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
// =============================================================


// =============================================================
// ГЕНЕРАТОР РОЗКЛАДУ — HYBRID GREEDY + MIN-CONFLICTS
// =============================================================
// Архітектура:
//   Фаза 1: Smart Greedy (MRV-sorted, жадібне розміщення)
//   Фаза 2: Priority Swap (пріоритет 1 витісняє пріоритет 3 з ранніх слотів)
//   Фаза 3: Min-Conflicts Repair (ремонт нерозміщених через перестановки)
//   Random Restart: якщо N ітерацій без покращення — починаємо знову
// =============================================================

let _generatorRunning = false;
let _generatorStop = false;

async function generateSchedule() {
    if (_generatorRunning) { _generatorStop = true; return; }
    _generatorRunning = true;
    _generatorStop = false;

    showLoader();
    const startTime = Date.now();

    // Підготовка задач (один раз)
    const { tasks: allTasks, unpairedAlternating, overflowTasks } = buildTasks();
    const total = allTasks.length;

    // Feasibility check
    const feasIssues = checkFeasibility(allTasks);
    if (feasIssues.length > 0) {
        _generatorRunning = false;
        hideLoader();
        showFeasibilityError(feasIssues);
        return;
    }

    let best = { schedule: [], unplacedCount: Infinity, unplacedList: [] };
    let restart = 0;
    let iterWithoutImprovement = 0;
    const MAX_ITERS_WITHOUT_IMPROVEMENT = 80;

    while (!_generatorStop) {
        restart++;

        // ФАЗА 1: Smart Greedy
        const manual = state.schedule.filter(s => s.slot === 0 || s.slot === 8 || s.isManual);
        const schedule = [...manual];
        const tasks = allTasks.map(t => ({ ...t, items: t.items.map(i => ({ ...i })) }));

        // Shuffle для різноманіття між рестартами
        shuffleWithSeed(tasks, restart);
        // Але завжди: найбільш обмежені вчителі першими
        tasks.sort((a, b) => {
            const aFree = Math.min(...a.items.map(it => countFreeSlots(it.teacherId)));
            const bFree = Math.min(...b.items.map(it => countFreeSlots(it.teacherId)));
            if (aFree !== bFree) return aFree - bFree;
            return a.priority - b.priority;
        });

        const unplacedTasks = [];
        for (const task of tasks) {
            const placed = greedyPlace(task, schedule);
            if (!placed) unplacedTasks.push(task);
        }

        // ФАЗА 2: Priority Swap
        prioritySwapPass(schedule);

        // ФАЗА 2.5: Знаходимо "погано розміщені" уроки пріоритету 1
        // (на слотах 5-7 хоча є ранніші вільні) і повертаємо їх в repair
        {
            const toReplace = [];
            for (const ls of [...schedule]) {
                if (ls.isManual || getPriority(ls.subject) !== 1 || ls.slot < 5) continue;
                let hasEarlier = false;
                for (let es = 1; es < ls.slot && !hasEarlier; es++) {
                    const tFree = !schedule.some(x => x !== ls && x.day === ls.day && x.slot === es && x.teacherId === ls.teacherId);
                    const cFree = !schedule.some(x => x !== ls && x.day === ls.day && x.slot === es && x.classId === ls.classId);
                    const notRed = getTeacherStatus(ls.teacherId, ls.day, es) !== 2;
                    const csb = schedule.filter(x => x !== ls && x.day === ls.day && x.classId === ls.classId && x.slot >= 1 && x.slot <= 7).map(x => x.slot);
                    let ngOk = csb.length === 0 || (es <= Math.max(...csb) + 1 && es >= Math.min(...csb) - 1);
                    if (tFree && cFree && notRed && ngOk) hasEarlier = true;
                }
                if (hasEarlier) toReplace.push(ls);
            }
            for (const ls of toReplace) {
                const idx = schedule.indexOf(ls);
                if (idx !== -1) {
                    schedule.splice(idx, 1);
                    const origTask = tasks.find(t =>
                        t.items.some(it => it.teacherId === ls.teacherId && it.classId === ls.classId && it.subject === ls.subject)
                    );
                    if (origTask && !unplacedTasks.includes(origTask)) unplacedTasks.push(origTask);
                }
            }
        }

        // ФАЗА 3: Min-Conflicts Repair
        const stillUnplaced = [...unplacedTasks];
        await minConflictsRepair(stillUnplaced, schedule, startTime, restart, total, best);

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
            iterWithoutImprovement = 0;
        } else {
            iterWithoutImprovement++;
        }

        updateLoader(restart, Date.now() - startTime, total - best.unplacedCount, total, best.unplacedCount, `Рестарт ${restart} | Без покращення: ${iterWithoutImprovement}`);
        await tick();

        if (best.unplacedCount === 0) break;
        if (iterWithoutImprovement >= MAX_ITERS_WITHOUT_IMPROVEMENT && restart > 10) {
            // Зберігаємо найкраще і продовжуємо з новою стратегією
            iterWithoutImprovement = 0;
        }
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

function shuffleWithSeed(arr, seed) {
    // Детермінований shuffle для відтворюваності, але різний між рестартами
    let s = seed * 9301 + 49297;
    for (let i = arr.length - 1; i > 0; i--) {
        s = (s * 9301 + 49297) % 233280;
        const j = Math.floor((s / 233280) * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    // Після детермінованого — додаємо трохи справжнього рандому
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

// =============================================================
// ФАЗА 1: SMART GREEDY PLACEMENT
// =============================================================
function greedyPlace(task, schedule) {
    const first = task.items[0];
    let bestSlot = null;
    let bestScore = Infinity;

    for (let d = 0; d < 5; d++) {
        for (let s = 1; s <= 7; s++) {
            if (!isHardValid(task, first, d, s, schedule)) continue;
            const sc = scoreSlot(task, first, d, s, schedule);
            if (sc < bestScore) { bestScore = sc; bestSlot = { d, s }; }
        }
    }

    if (bestSlot) {
        commitTask(task, bestSlot.d, bestSlot.s, schedule);
        return true;
    }
    return false;
}

// =============================================================
// ФАЗА 2: PRIORITY SWAP PASS
// Після жадібного розміщення — перевіряємо чи є пріоритет 1
// на слотах 5-7, де стоїть нижче пріоритет на слотах 1-4.
// Якщо так — міняємо місцями.
// =============================================================
function prioritySwapPass(schedule) {
    // Повторюємо до 15 проходів або поки є покращення
    for (let pass = 0; pass < 15; pass++) {
        let improved = false;

        // Всі уроки пріоритету 1 на слотах 5-7
        const lateList = schedule.filter(ls =>
            ls.slot >= 5 && ls.slot <= 7 && !ls.isManual && getPriority(ls.subject) === 1
        );

        for (const late of lateList) {
            // Шукаємо в той самий день/клас урок з нижчим пріоритетом на ранньому слоті
            const earlyList = schedule.filter(ls =>
                ls.day === late.day &&
                ls.classId === late.classId &&
                ls.slot < late.slot &&
                !ls.isManual &&
                getPriority(ls.subject) > getPriority(late.subject)
            );

            for (const early of earlyList) {
                if (canSwap(late, early, schedule)) {
                    // Чистий swap: зберігаємо обидва слоти до зміни
                    const slotLate  = late.slot;
                    const slotEarly = early.slot;
                    late.slot  = slotEarly;
                    early.slot = slotLate;
                    improved = true;
                    break;
                }
            }
            if (improved) break;
        }

        if (!improved) break;
    }
}

function canSwap(lessonA, lessonB, schedule) {
    // Можна поміняти якщо:
    // 1. Вчитель A вільний у слоті B (крім самого A)
    // 2. Вчитель B вільний у слоті A (крім самого B)
    // 3. Клас вільний (але вони вже в одному класі і одному дні — слоти просто міняються)
    // 4. Немає red-zone у вчителів
    const d = lessonA.day; // той самий день
    if (lessonA.teacherId === lessonB.teacherId) return false; // той самий вчитель

    // Перевіряємо чи вчитель A не має іншого уроку на слоті B
    const teacherABusy = schedule.some(ls =>
        ls !== lessonA && ls.day === d && ls.slot === lessonB.slot && ls.teacherId === lessonA.teacherId
    );
    if (teacherABusy) return false;

    // Перевіряємо чи вчитель B не має іншого уроку на слоті A
    const teacherBBusy = schedule.some(ls =>
        ls !== lessonB && ls.day === d && ls.slot === lessonA.slot && ls.teacherId === lessonB.teacherId
    );
    if (teacherBBusy) return false;

    // Red zone check
    if (getTeacherStatus(lessonA.teacherId, d, lessonB.slot) === 2) return false;
    if (getTeacherStatus(lessonB.teacherId, d, lessonA.slot) === 2) return false;

    return true;
}

// =============================================================
// ФАЗА 3: MIN-CONFLICTS REPAIR
// Для кожної нерозміщеної задачі намагаємось звільнити слот
// переміщуючи "блокера" в інший день/слот.
// =============================================================
async function minConflictsRepair(unplacedTasks, schedule, startTime, restart, total, best) {
    const MAX_REPAIR_ITERS = 500;
    let noProgressCount = 0;
    const MAX_NO_PROGRESS = 60; // якщо 60 ітерацій без покращення — рандомізуємо порядок

    for (let iter = 0; iter < MAX_REPAIR_ITERS && unplacedTasks.length > 0; iter++) {
        if (_generatorStop) break;

        if (iter % 20 === 0) {
            updateLoader(restart, Date.now() - startTime, total - unplacedTasks.length, total, unplacedTasks.length,
                `Рестарт ${restart} | Repair ${iter} | Залишилось: ${unplacedTasks.length}`);
            await tick();
        }

        // Якщо довго без покращення — перемішуємо порядок задач
        if (noProgressCount >= MAX_NO_PROGRESS) {
            for (let i = unplacedTasks.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [unplacedTasks[i], unplacedTasks[j]] = [unplacedTasks[j], unplacedTasks[i]];
            }
            noProgressCount = 0;
        }

        // MRV: найменш гнучка задача — перша
        unplacedTasks.sort((a, b) => countValidSlots(a, schedule) - countValidSlots(b, schedule));

        const task = unplacedTasks[0];
        const first = task.items[0];
        let repaired = false;

        // Спроба 1: Пряме розміщення
        if (greedyPlace(task, schedule)) {
            unplacedTasks.shift();
            noProgressCount = 0;
            continue;
        }

        // Спроба 2: Евакуація блокерів з каскадом
        // Збираємо всі слоти де хоча б один з вчителів або клас вільний
        // (тобто є шанс звільнити через евакуацію)
        const candidates = [];
        for (let d = 0; d < 5; d++) {
            for (let s = 1; s <= 7; s++) {
                if (task.items.some(it => getTeacherStatus(it.teacherId, d, s) === 2)) continue;

                // NO-GAP попередня перевірка
                const classSlots = schedule.filter(ls => ls.day === d && ls.classId === first.classId && ls.slot >= 1 && ls.slot <= 7).map(ls => ls.slot);
                if (classSlots.length > 0) {
                    const maxS = Math.max(...classSlots);
                    const minS = Math.min(...classSlots);
                    if (s > maxS + 1 || s < minS - 1) continue;
                }

                // Хто блокує цей слот?
                const blockersT = schedule.filter(ls => ls.day === d && ls.slot === s &&
                    task.items.some(it => it.teacherId === ls.teacherId) && !ls.isManual);
                const blockersC = schedule.filter(ls => ls.day === d && ls.slot === s &&
                    ls.classId === first.classId && !ls.isManual);
                const blockers = [...new Map([...blockersT, ...blockersC].map(b => [b.id, b])).values()];

                // Максимум 2 блокери на слот (3 — занадто складно)
                if (blockers.length <= 2) {
                    candidates.push({ d, s, blockers, score: scoreSlot(task, first, d, s, schedule) });
                }
            }
        }

        // Сортуємо кандидатів: спочатку слоти з меншою кількістю блокерів і кращим score
        candidates.sort((a, b) => a.blockers.length - b.blockers.length || a.score - b.score);

        for (const { d, s, blockers } of candidates) {
            // Евакуюємо всіх блокерів атомарно
            const allChanges = [];
            let allOk = true;

            for (const blocker of blockers) {
                const changes = tryEvacuate(blocker, d, s, schedule, 0);
                if (changes) {
                    allChanges.push(...changes);
                } else {
                    allOk = false;
                    break;
                }
            }

            if (!allOk) {
                // Відкочуємо всі зміни
                rollbackEvacuation(allChanges, schedule);
                continue;
            }

            // Перевіряємо чи тепер можна поставити задачу
            if (isHardValid(task, first, d, s, schedule)) {
                commitTask(task, d, s, schedule);
                unplacedTasks.shift();
                repaired = true;
                noProgressCount = 0;
                break;
            } else {
                // Відкочуємо — щось ще заважає (наприклад prio-1 rule)
                rollbackEvacuation(allChanges, schedule);
            }
        }

        if (!repaired) {
            noProgressCount++;
            // Ротація: переносимо невдалу задачу в кінець черги
            unplacedTasks.push(unplacedTasks.shift());
        }
    }
}

// Евакуація уроку в інший слот/день.
// Підтримує каскадну евакуацію (depth до 2): якщо новий слот зайнятий —
// намагаємось евакуювати і того блокера.
// Повертає масив змін [{lesson, oldDay, oldSlot, newDay, newSlot}] або null при провалі.
// ВАЖЛИВО: всі зміни атомарні — або всі застосовуються, або жодна.
function tryEvacuate(lesson, blockedDay, blockedSlot, schedule, depth) {
    depth = depth || 0;
    if (depth > 2) return null; // обмеження глибини каскаду

    const idx = schedule.indexOf(lesson);
    if (idx === -1) return null;
    if (lesson.isManual) return null;

    // Тимчасово видаляємо блокера
    schedule.splice(idx, 1);

    // Перебираємо можливі нові слоти (рандомізуємо для різноманіття)
    const slots = [];
    for (let d = 0; d < 5; d++)
        for (let s = 1; s <= 7; s++)
            slots.push({ d, s });
    // Легкий shuffle
    for (let i = slots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [slots[i], slots[j]] = [slots[j], slots[i]];
    }

    for (const { d, s } of slots) {
        if (d === blockedDay && s === blockedSlot) continue;
        if (getTeacherStatus(lesson.teacherId, d, s) === 2) continue;

        // NO-GAP
        const classSlots = schedule
            .filter(ls => ls.day === d && ls.classId === lesson.classId && ls.slot >= 1 && ls.slot <= 7)
            .map(ls => ls.slot);
        if (classSlots.length > 0) {
            const maxS = Math.max(...classSlots);
            const minS = Math.min(...classSlots);
            if (s > maxS + 1 || s < minS - 1) continue;
        }

        // Кімнатний конфлікт
        const roomType = getRoomType(lesson.subject);
        if (roomType) {
            if (schedule.some(ls => ls.day === d && ls.slot === s && ls.classId !== lesson.classId && getRoomType(ls.subject) === roomType)) continue;
        }
        if (roomType === 'gym' && schedule.some(ls => ls.day === d && ls.classId === lesson.classId && getRoomType(ls.subject) === 'gym')) continue;

        const teacherConflict = schedule.find(ls => ls.day === d && ls.slot === s && ls.teacherId === lesson.teacherId);
        const classConflict   = schedule.find(ls => ls.day === d && ls.slot === s && ls.classId === lesson.classId);

        if (!teacherConflict && !classConflict) {
            // Слот вільний — перевіряємо чи не порушуємо prio-1 на пізніх слотах
            if (getPriority(lesson.subject) === 1 && s >= 6) {
                // Не евакуюємо пріоритет 1 на слоти 6-7 якщо є раніші варіанти
                // (просто пропускаємо цей слот, продовжуємо пошук)
                continue;
            }
            // Перевіряємо вікно вчителя при евакуації
            const teacherSlots = schedule
                .filter(ls => ls.day === d && ls.teacherId === lesson.teacherId && ls.slot >= 1 && ls.slot <= 7)
                .map(ls => ls.slot);
            if (teacherSlots.length > 0) {
                const minGap = Math.min(...teacherSlots.map(ts => Math.abs(ts - s)));
                if (minGap > 2 && getPriority(lesson.subject) <= 2) continue; // вікно > 1 — пропускаємо
            }
            const movedLesson = { ...lesson, id: 'e_' + Date.now() + Math.random(), day: d, slot: s };
            schedule.push(movedLesson);
            return [{ original: lesson, moved: movedLesson, removedIdx: idx }];
        }

        // Слот зайнятий — каскадна евакуація блокера (тільки якщо не manual)
        if (depth < 2) {
            const cascadeBlocker = teacherConflict || classConflict;
            if (!cascadeBlocker.isManual) {
                const cascadeResult = tryEvacuate(cascadeBlocker, d, s, schedule, depth + 1);
                if (cascadeResult) {
                    // Каскад вдався — тепер слот d/s вільний, розміщуємо lesson
                    const movedLesson = { ...lesson, id: 'e_' + Date.now() + Math.random(), day: d, slot: s };
                    schedule.push(movedLesson);
                    return [{ original: lesson, moved: movedLesson, removedIdx: idx }, ...cascadeResult];
                }
            }
        }
    }

    // Не вдалось — повертаємо lesson на місце
    schedule.splice(idx, 0, lesson);
    return null;
}

// Відкат евакуації: прибираємо moved версії і повертаємо originals
function rollbackEvacuation(changes, schedule) {
    // Видаляємо всі moved уроки
    for (const { moved } of changes) {
        const i = schedule.indexOf(moved);
        if (i !== -1) schedule.splice(i, 1);
    }
    // Повертаємо всі originals (в зворотньому порядку для коректних індексів)
    for (let i = changes.length - 1; i >= 0; i--) {
        const { original, removedIdx } = changes[i];
        // Просто push — порядок не критичний для логіки
        schedule.push(original);
    }
}

function countValidSlots(task, schedule) {
    const first = task.items[0];
    let count = 0;
    for (let d = 0; d < 5; d++)
        for (let s = 1; s <= 7; s++)
            if (isHardValid(task, first, d, s, schedule)) count++;
    return count;
}

// =============================================================
// ПІДГОТОВКА ЗАДАЧ
// =============================================================
function buildTasks() {
    const flatWorkload = [];
    state.workload.forEach(item => {
        const h = parseFloat(item.hours);
        const whole = Math.floor(h);
        const frac = Math.round((h - whole) * 10) / 10;
        for (let i = 0; i < whole; i++)
            flatWorkload.push({ ...item, currentHours: 1, used: false });
        // Додаємо 0.5-годинний слот ЛИШЕ якщо splitType === 'alternating'
        // і дробова частина справді 0.5
        if (Math.abs(frac - 0.5) < 0.01 && item.splitType === 'alternating')
            flatWorkload.push({ ...item, currentHours: 0.5, used: false });
    });

    const tasks = [];
    const unpairedAlternating = [];
    const classesIds = [...new Set(state.classes.map(c => c.id))];

    classesIds.forEach(cId => {
        // Пари одного вчителя
        const tIds = [...new Set(flatWorkload.filter(w => w.classId === cId && w.currentHours === 0.5 && w.splitType === 'alternating' && !w.used).map(w => w.teacherId))];
        tIds.forEach(tId => {
            const alts = flatWorkload.filter(w => w.classId === cId && w.teacherId === tId && w.currentHours === 0.5 && w.splitType === 'alternating' && !w.used);
            while (alts.length >= 2) {
                const [i1, i2] = [alts.shift(), alts.shift()];
                i1.used = i2.used = true;
                tasks.push({ type: 'paired_internal', items: [i1, i2], priority: Math.min(getPriority(i1.subject), getPriority(i2.subject)), classId: cId });
            }
        });
        // Пари різних вчителів
        let rem = flatWorkload.filter(w => w.classId === cId && w.currentHours === 0.5 && w.splitType === 'alternating' && !w.used);
        while (rem.length >= 2) {
            const i1 = rem.shift();
            const i2 = rem.find(w => w.teacherId !== i1.teacherId);
            if (!i2) break;
            rem.splice(rem.indexOf(i2), 1);
            i1.used = i2.used = true;
            tasks.push({ type: 'paired_external', items: [i1, i2], priority: Math.min(getPriority(i1.subject), getPriority(i2.subject)), classId: cId });
        }
        // Непарні
        flatWorkload.filter(w => w.classId === cId && w.currentHours === 0.5 && w.splitType === 'alternating' && !w.used).forEach(item => {
            item.used = true;
            const tObj = state.teachers.find(t => t.id === item.teacherId);
            const cObj = state.classes.find(c => c.id === item.classId);
            unpairedAlternating.push({ subject: item.subject, teacher: tObj?.name || '?', className: cObj?.name || '?', teacherId: item.teacherId, classId: item.classId });
        });
    });

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
        const cands = tasks.filter(t => t.classId === cId && t.priority > 1)
            .sort((a, b) => b.priority - a.priority || (a.type !== 'single' ? 1 : -1));
        for (const c of cands) {
            if (excess <= 0) break;
            if (c.type !== 'single' && !c.items.every(it => getPriority(it.subject) > 1)) continue;
            const idx = tasks.indexOf(c);
            if (idx !== -1) {
                tasks.splice(idx, 1);
                const cls = state.classes.find(x => x.id === cId);
                overflowTasks.push({ subject: c.items.map(it => it.subject).join(' / '), teacher: c.items.map(it => state.teachers.find(tt => tt.id === it.teacherId)?.name || '?').join(' / '), className: cls?.name || '?', priority: c.priority, type: c.type });
                excess--;
            }
        }
    });

    return { tasks, unpairedAlternating, overflowTasks };
}

// =============================================================
// FEASIBILITY CHECK
// =============================================================
function checkFeasibility(tasks) {
    const issues = [];

    const teacherNeeded = {};
    tasks.forEach(task => task.items.forEach(it => { teacherNeeded[it.teacherId] = (teacherNeeded[it.teacherId] || 0) + 1; }));
    Object.entries(teacherNeeded).forEach(([tid, needed]) => {
        let avail = 0;
        for (let d = 0; d < 5; d++) for (let s = 1; s <= 7; s++) if (getTeacherStatus(tid, d, s) !== 2) avail++;
        if (needed > avail) {
            const n = state.teachers.find(t => t.id === tid)?.name || tid;
            issues.push(`👨‍🏫 <b>${n}</b>: потрібно ${needed} слотів, вільних лише ${avail}`);
        }
    });

    const classNeeded = {};
    tasks.forEach(t => { classNeeded[t.classId] = (classNeeded[t.classId] || 0) + 1; });
    Object.entries(classNeeded).forEach(([cid, needed]) => {
        if (needed > 35) {
            const n = state.classes.find(c => c.id === cid)?.name || cid;
            issues.push(`🏫 Клас <b>${n}</b>: ${needed} уроків > 35 максимум`);
        }
    });

    return issues;
}

// =============================================================
// HARD CONSTRAINTS — перевірка валідності слоту
// =============================================================
function isHardValid(task, first, d, s, schedule) {
    // 1. Вчителі задачі зайняті
    if (task.items.some(it => schedule.some(ls => ls.day === d && ls.slot === s && ls.teacherId === it.teacherId))) return false;

    // 2. Клас зайнятий
    if (schedule.some(ls => ls.day === d && ls.slot === s && ls.classId === first.classId)) return false;

    // 2b. Для paired задач: перевіряємо чи всі items можуть бути в цей слот
    //     (їх вчителі вільні і клас не конфліктує між items)
    if (task.items.length > 1) {
        // Перевіряємо попарно: кожен наступний item не конфліктує з попереднім
        for (let i = 1; i < task.items.length; i++) {
            const it = task.items[i];
            // Вчитель item[i] зайнятий?
            if (schedule.some(ls => ls.day === d && ls.slot === s && ls.teacherId === it.teacherId)) return false;
            // Клас item[i] = клас item[0] (той самий клас) — вже перевірено вище
            // Але перевіряємо red zone для кожного вчителя
            if (getTeacherStatus(it.teacherId, d, s) === 2) return false;
        }
    }

    // 3. Червона зона вчителя
    if (task.items.some(it => getTeacherStatus(it.teacherId, d, s) === 2)) return false;

    // 4. NO-GAP: клас не може мати вікно між уроками
    const classSlots = schedule
        .filter(ls => ls.day === d && ls.classId === first.classId && ls.slot >= 1 && ls.slot <= 7)
        .map(ls => ls.slot);
    if (classSlots.length > 0) {
        const maxS = Math.max(...classSlots);
        const minS = Math.min(...classSlots);
        if (s > maxS + 1) return false;
        if (s < minS - 1) return false;
    }

    // 5. Пріоритет 1 — max 1 раз на день (крім примусових пар)
    if (task.priority === 1) {
        const existing = schedule.filter(ls =>
            ls.day === d && ls.classId === first.classId && ls.subject === first.subject
        );
        if (existing.length > 0) {
            const freeDays = countFreeDays(first.teacherId);
            const totalNeeded = state.workload
                .filter(w => w.classId === first.classId && w.subject === first.subject)
                .reduce((sum, w) => sum + Math.ceil(parseFloat(w.hours)), 0);
            if (totalNeeded <= freeDays) return false;
            if (!existing.some(ls => Math.abs(ls.slot - s) === 1)) return false;
        }
    }

    // 6. Пріоритет 1 на слоті 6-7: тільки якщо НЕ існує жодного вільного слоту 1-5
    //    для цього вчителя в цей день (з урахуванням зайнятості класу і вчителя)
    if (task.priority === 1 && s >= 6) {
        for (let earlyS = 1; earlyS <= 5; earlyS++) {
            const teacherFreeEarly = !schedule.some(ls => ls.day === d && ls.slot === earlyS &&
                task.items.some(it => it.teacherId === ls.teacherId));
            const classFreeEarly = !schedule.some(ls =>
                ls.day === d && ls.slot === earlyS && ls.classId === first.classId);
            const notRedEarly = !task.items.some(it => getTeacherStatus(it.teacherId, d, earlyS) === 2);
            // NO-GAP перевірка для раннього слоту
            const classSlots2 = schedule.filter(ls =>
                ls.day === d && ls.classId === first.classId && ls.slot >= 1 && ls.slot <= 7
            ).map(ls => ls.slot);
            let noGapOk = true;
            if (classSlots2.length > 0) {
                const maxS2 = Math.max(...classSlots2);
                const minS2 = Math.min(...classSlots2);
                if (earlyS > maxS2 + 1 || earlyS < minS2 - 1) noGapOk = false;
            }
            if (teacherFreeEarly && classFreeEarly && notRedEarly && noGapOk) {
                return false; // є ранній слот — не можна ставити на 6-7
            }
        }
    }

    // 7. Вікно вчителя: якщо у вчителя вже є уроки в цей день,
    //    перевіряємо чи новий слот не залишає вікно > 1 урок.
    //    ВАЖЛИВО: перевіряємо для всіх предметів (не лише prio 1-2),
    //    але з relaxed для prio 3 (дозволяємо вікно до 2).
    {
        const teacherSlotsToday = schedule
            .filter(ls => ls.day === d && ls.teacherId === first.teacherId && ls.slot >= 1 && ls.slot <= 7)
            .map(ls => ls.slot);
        if (teacherSlotsToday.length > 0) {
            const minGap = Math.min(...teacherSlotsToday.map(ts => Math.abs(ts - s)));
            const maxAllowedGap = task.priority <= 2 ? 2 : 3;
            if (minGap > maxAllowedGap) return false;
        }
    }

    // 8. Кімнатні конфлікти
    const roomType = getRoomType(first.subject);
    if (roomType) {
        if (schedule.some(ls => ls.day === d && ls.slot === s && ls.classId !== first.classId &&
            getRoomType(ls.subject) === roomType)) return false;
    }
    if (roomType === 'gym') {
        if (schedule.some(ls => ls.day === d && ls.classId === first.classId &&
            getRoomType(ls.subject) === 'gym')) return false;
    }

    // 9. Труд/технологія — один кабінет
    if (isLaborSubject(first.subject)) {
        if (schedule.some(ls => ls.day === d && ls.slot === s && ls.classId !== first.classId &&
            isLaborSubject(ls.subject))) return false;
    }

    return true;
}

// =============================================================
// SCORE ФУНКЦІЯ (менше = краще)
// =============================================================
function scoreSlot(task, first, d, s, schedule) {
    let score = 0;
    const priority = task.priority;

    // Жовта зона вчителя
    const maxStatus = task.items.reduce((m, it) => Math.max(m, getTeacherStatus(it.teacherId, d, s)), 0);
    if (maxStatus === 1) score += 1000;

    // ── ПОЗИЦІЯ СЛОТУ залежно від пріоритету ──
    if (priority === 1) {
        // Пріоритет 1: ідеально 1-4, допустимо 5, дуже погано 6-7
        // (але 6-7 вже заблоковані через isHardValid якщо є рання альтернатива)
        if (s <= 4) score += 0;
        else if (s === 5) score += 150;
        else if (s === 6) score += 1500;
        else score += 4000;
    } else if (priority === 2) {
        // Пріоритет 2: бажано 1-5, небажано 6-7
        if (s <= 5) score += 0;
        else if (s === 6) score += 400;
        else score += 900;
    } else {
        // Пріоритет 3: заохочуємо пізніші слоти, щоб звільнити ранні для важливих
        score += Math.max(0, (5 - s)) * 300; // слот 1 = +1200, слот 5+ = 0
    }

    // ── ВІКНА ВЧИТЕЛЯ ──
    // Штраф пропорційний розміру вікна між існуючими уроками і новим
    const teacherSlotsToday = schedule
        .filter(ls => ls.day === d && ls.teacherId === first.teacherId && ls.slot >= 1 && ls.slot <= 7)
        .map(ls => ls.slot);
    if (teacherSlotsToday.length > 0) {
        const minGap = Math.min(...teacherSlotsToday.map(ts => Math.abs(ts - s)));
        if (minGap === 0) score += 0;       // той самий слот (буде заблоковано раніше)
        else if (minGap === 1) score -= 150; // сусідній — бонус
        else if (minGap === 2) score += 300; // вікно в 1 урок — терпимо
        else score += minGap * 600;          // велике вікно — дуже погано
    } else {
        // Перший урок вчителя в цей день — тягнемо ближче до початку
        score += (s - 1) * 80;
    }

    // ── БАЛАНС ВЧИТЕЛЯ ПО ДНЯХ ──
    const dayCount = schedule.filter(ls =>
        ls.day === d && ls.teacherId === first.teacherId && ls.slot >= 1 && ls.slot <= 7
    ).length;
    if (dayCount >= 6) score += 1200;
    else if (dayCount >= 5) score += 400;

    // ── ДУБЛЮВАННЯ ПРЕДМЕТА В ДЕНЬ ──
    // Для пріоритету 1 — вже є hard constraint, тут додатковий soft
    // Для пріоритету 2-3 — штрафуємо (крім підряд)
    const sameSubjToday = schedule.filter(ls =>
        ls.day === d && ls.classId === first.classId && ls.subject === first.subject
    );
    if (sameSubjToday.length > 0) {
        const isAdj = sameSubjToday.some(ls => Math.abs(ls.slot - s) === 1);
        if (priority === 1) {
            score += isAdj ? 200 : 3000;
        } else {
            score += isAdj ? 250 : 4000;
        }
    }

    // ── КЛАС ПОРОЖНІЙ В ЦЕЙ ДЕНЬ ──
    // М'яко заохочуємо починати з слоту 1
    const classSlotsToday = schedule.filter(ls =>
        ls.day === d && ls.classId === first.classId && ls.slot >= 1 && ls.slot <= 7
    );
    if (classSlotsToday.length === 0 && s > 1) {
        score += (s - 1) * 120;
    }

    // ── ПРІОРИТЕТ 1 ПОРУЧ З ПРІОРИТЕТОМ 1 ТОГО Ж КЛАСУ ──
    // Якщо в класу вже є предмет пріоритету 1 на сусідньому слоті —
    // намагаємось рознести їх
    if (priority === 1) {
        const adjHighPrio = schedule.filter(ls =>
            ls.day === d && ls.classId === first.classId &&
            Math.abs(ls.slot - s) === 1 && getPriority(ls.subject) === 1
        );
        score += adjHighPrio.length * 200;
    }

    // Мікро-рандом для різноманіття між рестартами
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
    let el = document.getElementById('gen-loader');
    if (!el) {
        el = document.createElement('div');
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
    }
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
