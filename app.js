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

let _generatorRunning = false;
let _generatorStop = false;

async function generateSchedule() {
    if (_generatorRunning) {
        _generatorStop = true;
        return;
    }
    _generatorRunning = true;
    _generatorStop = false;

    showLoader();

    const startTime = Date.now();

    let bestAttempt = {
        schedule: [],
        unplacedCount: Infinity,
        unplacedList: [],
        unpairedAlternating: [],
        overflowTasks: []
    };

    let attempt = 0;
    const totalLessons = countTotalLessons();

    while (!_generatorStop) {
        attempt++;

        if (attempt % 5 === 0) {
            await new Promise(r => setTimeout(r, 0));
        }

        const result = runSingleGeneration();

        if (result.unplaced.length < bestAttempt.unplacedCount) {
            bestAttempt = {
                schedule: JSON.parse(JSON.stringify(result.schedule)),
                unplacedCount: result.unplaced.length,
                unplacedList: result.unplaced,
                unpairedAlternating: result.unpairedAlternating,
                overflowTasks: result.overflowTasks || []
            };
        }

        updateLoader(attempt, Date.now() - startTime, totalLessons - bestAttempt.unplacedCount, totalLessons, bestAttempt.unplacedCount);

        if (bestAttempt.unplacedCount === 0) break;
    }

    _generatorRunning = false;
    hideLoader();

    state.schedule = bestAttempt.schedule;
    saveData();
    renderSchedule();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    showGenerationReport(bestAttempt.unplacedList, bestAttempt.unpairedAlternating, bestAttempt.overflowTasks || [], attempt, duration);
}

function stopGenerator() {
    _generatorStop = true;
}

function countTotalLessons() {
    let total = 0;
    state.workload.forEach(item => {
        const h = parseFloat(item.hours);
        total += Math.ceil(h);
    });
    return total;
}

// =============================================================
// ЛОАДЕР
// =============================================================
function showLoader() {
    let loader = document.getElementById('gen-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'gen-loader';
        loader.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        loader.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl p-8 w-96 space-y-5">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <h2 class="text-lg font-bold text-slate-800">Генерація розкладу...</h2>
                </div>
                <div class="space-y-2 text-sm text-slate-600">
                    <div class="flex justify-between">
                        <span>Спроба:</span>
                        <span id="loader-attempt" class="font-bold text-blue-700">1</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Час:</span>
                        <span id="loader-time" class="font-bold text-blue-700">0с</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Розміщено уроків:</span>
                        <span id="loader-placed" class="font-bold text-green-700">0</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Не вмістилось:</span>
                        <span id="loader-unplaced" class="font-bold text-orange-600">—</span>
                    </div>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div id="loader-bar" class="h-3 bg-blue-500 rounded-full transition-all" style="width:0%"></div>
                </div>
                <button onclick="stopGenerator()"
                    class="w-full py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition text-sm">
                    ⏹ Зупинити та зберегти найкращий результат
                </button>
            </div>`;
        document.body.appendChild(loader);
    }
    loader.style.display = 'flex';
}

function updateLoader(attempt, ms, placed, total, unplaced) {
    const el = id => document.getElementById(id);
    const atEl = el('loader-attempt');
    const tmEl = el('loader-time');
    const plEl = el('loader-placed');
    const upEl = el('loader-unplaced');
    const barEl = el('loader-bar');
    if (atEl) atEl.textContent = attempt;
    if (tmEl) tmEl.textContent = (ms / 1000).toFixed(1) + 'с';
    if (plEl) plEl.textContent = `${placed} / ${total}`;
    if (upEl) upEl.textContent = unplaced > 0 ? `${unplaced}` : '—';
    if (barEl) barEl.style.width = total > 0 ? `${Math.round((placed / total) * 100)}%` : '0%';
}

function hideLoader() {
    const loader = document.getElementById('gen-loader');
    if (loader) loader.style.display = 'none';
}

// =============================================================
// ПІДРАХУНОК ДОСТУПНИХ СЛОТІВ ВЧИТЕЛЯ
// =============================================================
function countTeacherAvailableSlots(teacherId) {
    const teacher = state.teachers.find(t => t.id === teacherId);
    if (!teacher || !teacher.availability) return 35; // default max
    let count = 0;
    for (let d = 0; d < 5; d++) {
        for (let s = 1; s <= 7; s++) {
            const status = getTeacherStatus(teacherId, d, s);
            if (status !== 2) count++; // 0 або 1 = доступний
        }
    }
    return count;
}

function countTeacherAvailableDays(teacherId) {
    const teacher = state.teachers.find(t => t.id === teacherId);
    if (!teacher || !teacher.availability) return 5;
    let days = 0;
    for (let d = 0; d < 5; d++) {
        let hasSlot = false;
        for (let s = 1; s <= 7; s++) {
            if (getTeacherStatus(teacherId, d, s) !== 2) {
                hasSlot = true;
                break;
            }
        }
        if (hasSlot) days++;
    }
    return days;
}

function getTeacherAvailableDaysList(teacherId) {
    const teacher = state.teachers.find(t => t.id === teacherId);
    if (!teacher || !teacher.availability) return [0, 1, 2, 3, 4];
    const days = [];
    for (let d = 0; d < 5; d++) {
        for (let s = 1; s <= 7; s++) {
            if (getTeacherStatus(teacherId, d, s) !== 2) {
                days.push(d);
                break;
            }
        }
    }
    return days;
}

// =============================================================
// ОДНА СПРОБА ГЕНЕРАЦІЇ
// =============================================================
function runSingleGeneration() {
    let tempSchedule = state.schedule.filter(s => s.slot === 0 || s.slot === 8 || s.isManual);
    let unplaced = [];
    let unpairedAlternating = [];

    const flatWorkload = [];
    state.workload.forEach(item => {
        let h = parseFloat(item.hours);
        const wholePart = Math.floor(h);
        const fracPart = Math.round((h - wholePart) * 10) / 10;
        for (let i = 0; i < wholePart; i++) {
            flatWorkload.push({ ...item, currentHours: 1, used: false });
        }
        if (Math.abs(fracPart - 0.5) < 0.01) {
            flatWorkload.push({ ...item, currentHours: 0.5, used: false });
        }
    });

    const tasks = [];
    const classesIds = [...new Set(state.classes.map(c => c.id))];

    // Спаровування чергувань
    classesIds.forEach(cId => {
        const teacherIds = [...new Set(
            flatWorkload
                .filter(w => w.classId === cId && w.currentHours === 0.5 && w.splitType === 'alternating' && !w.used)
                .map(w => w.teacherId)
        )];
        teacherIds.forEach(tId => {
            const sameTeacherAlts = flatWorkload.filter(w =>
                w.classId === cId && w.teacherId === tId &&
                w.currentHours === 0.5 && w.splitType === 'alternating' && !w.used
            );
            while (sameTeacherAlts.length >= 2) {
                const i1 = sameTeacherAlts.shift();
                const i2 = sameTeacherAlts.shift();
                i1.used = true; i2.used = true;
                tasks.push({
                    type: 'paired_internal',
                    items: [i1, i2],
                    priority: Math.min(getPriority(i1.subject), getPriority(i2.subject)),
                    classId: cId
                });
            }
        });

        let remainingAlts = flatWorkload.filter(w =>
            w.classId === cId && w.currentHours === 0.5 &&
            w.splitType === 'alternating' && !w.used
        );
        while (remainingAlts.length >= 2) {
            const i1 = remainingAlts.shift();
            const i2 = remainingAlts.find(w => w.teacherId !== i1.teacherId);
            if (!i2) break;
            remainingAlts.splice(remainingAlts.indexOf(i2), 1);
            i1.used = true; i2.used = true;
            tasks.push({
                type: 'paired_external',
                items: [i1, i2],
                priority: Math.min(getPriority(i1.subject), getPriority(i2.subject)),
                classId: cId
            });
        }

        flatWorkload.filter(w =>
            w.classId === cId && w.currentHours === 0.5 &&
            w.splitType === 'alternating' && !w.used
        ).forEach(item => {
            item.used = true;
            const tObj = state.teachers.find(t => t.id === item.teacherId);
            const clsObj = state.classes.find(c => c.id === item.classId);
            unpairedAlternating.push({
                subject: item.subject,
                teacher: tObj ? tObj.name : '?',
                className: clsObj ? clsObj.name : '?',
                teacherId: item.teacherId,
                classId: item.classId,
                hours: item.hours
            });
        });
    });

    // Одиночні задачі
    flatWorkload.filter(w => !w.used).forEach(item => {
        item.used = true;
        tasks.push({
            type: 'single',
            items: [item],
            priority: getPriority(item.subject),
            classId: item.classId
        });
    });

    // Overflow handling
    const overflowTasks = [];
    const MAX_SLOTS_PER_CLASS = 35;

    const classSlotsCount = {};
    classesIds.forEach(cId => { classSlotsCount[cId] = 0; });
    tasks.forEach(t => {
        if (classSlotsCount[t.classId] !== undefined) classSlotsCount[t.classId]++;
    });

    classesIds.forEach(cId => {
        let excess = (classSlotsCount[cId] || 0) - MAX_SLOTS_PER_CLASS;
        if (excess <= 0) return;

        const candidates = tasks
            .filter(t => t.classId === cId && t.priority > 1)
            .sort((a, b) => {
                const aIsPaired = (a.type === 'paired_internal' || a.type === 'paired_external');
                const bIsPaired = (b.type === 'paired_internal' || b.type === 'paired_external');
                if (a.priority !== b.priority) return b.priority - a.priority;
                if (aIsPaired !== bIsPaired) return aIsPaired ? 1 : -1;
                return 0;
            });

        for (const candidate of candidates) {
            if (excess <= 0) break;
            if (candidate.type === 'paired_internal' || candidate.type === 'paired_external') {
                const allNonPrio1 = candidate.items.every(it => getPriority(it.subject) > 1);
                if (!allNonPrio1) continue;
            }
            const idx = tasks.indexOf(candidate);
            if (idx !== -1) {
                tasks.splice(idx, 1);
                const cls = state.classes.find(c => c.id === cId);
                overflowTasks.push({
                    subject: candidate.items.map(it => it.subject).join(' / '),
                    teacher: candidate.items.map(it => {
                        const t = state.teachers.find(tt => tt.id === it.teacherId);
                        return t ? t.name : '?';
                    }).join(' / '),
                    className: cls ? cls.name : '?',
                    priority: candidate.priority,
                    type: candidate.type
                });
                excess--;
            }
        }
    });

    // ══════════════════════════════════════════════════════════
    // КРИТИЧНИЙ ФІКС #1: Сортування за дефіцитом вчителя
    // Вчителі з малою кількістю вільних слотів йдуть ПЕРШИМИ
    // ══════════════════════════════════════════════════════════
    tasks.sort((a, b) => {
        // Спочатку за дефіцитом вчителя (менше слотів = вищий пріоритет)
        const aSlots = Math.min(...a.items.map(it => countTeacherAvailableSlots(it.teacherId)));
        const bSlots = Math.min(...b.items.map(it => countTeacherAvailableSlots(it.teacherId)));
        if (aSlots !== bSlots) return aSlots - bSlots;
        
        // Потім труд/технологія
        const aIsLabor = isLaborSubject(a.items[0].subject);
        const bIsLabor = isLaborSubject(b.items[0].subject);
        if (aIsLabor !== bIsLabor) return aIsLabor ? -1 : 1;
        
        // Потім за пріоритетом предмета
        if (a.priority !== b.priority) return a.priority - b.priority;
        
        return (Math.random() - 0.5) * 0.3;
    });

    // Лічильник балансування
    const teacherDayCount = {};
    state.teachers.forEach(t => { teacherDayCount[t.id] = [0, 0, 0, 0, 0]; });
    tempSchedule.forEach(s => {
        if (teacherDayCount[s.teacherId] && s.slot >= 1 && s.slot <= 7) {
            teacherDayCount[s.teacherId][s.day]++;
        }
    });

    // Групуємо по класах
    const tasksByClass = {};
    classesIds.forEach(cId => { tasksByClass[cId] = []; });
    tasks.forEach(t => {
        if (!tasksByClass[t.classId]) tasksByClass[t.classId] = [];
        tasksByClass[t.classId].push(t);
    });

    const shuffledClassIds = [...classesIds].sort(() => Math.random() - 0.5);

    shuffledClassIds.forEach(cId => {
        const classTasks = tasksByClass[cId] || [];
        if (classTasks.length === 0) return;

        // ══════════════════════════════════════════════════════════
        // КРИТИЧНИЙ ФІКС #2: Сортування задач класу за дефіцитом
        // ══════════════════════════════════════════════════════════
        classTasks.sort((a, b) => {
            const aSlots = Math.min(...a.items.map(it => countTeacherAvailableSlots(it.teacherId)));
            const bSlots = Math.min(...b.items.map(it => countTeacherAvailableSlots(it.teacherId)));
            if (aSlots !== bSlots) return aSlots - bSlots;
            if (a.priority !== b.priority) return a.priority - b.priority;
            return 0;
        });

        const days = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);
        let pendingTasks = [...classTasks];

        days.forEach(d => {
            if (pendingTasks.length === 0) return;

            const getClassSlotsToday = () =>
                tempSchedule
                    .filter(ls => ls.day === d && ls.classId === cId && ls.slot >= 1 && ls.slot <= 7)
                    .map(ls => ls.slot)
                    .sort((a, b) => a - b);

            let remainInDay = [...pendingTasks];
            let slotCursor = 1;
            let attempts = 0;
            const maxAttemptsPerDay = remainInDay.length * 3 + 10;

            while (remainInDay.length > 0 && slotCursor <= 7 && attempts < maxAttemptsPerDay) {
                attempts++;

                const classSlots = getClassSlotsToday();
                const nextExpectedSlot = classSlots.length === 0 ? 1 : Math.max(...classSlots) + 1;

                if (slotCursor < nextExpectedSlot) {
                    slotCursor = nextExpectedSlot;
                    continue;
                }
                if (slotCursor > nextExpectedSlot && classSlots.length > 0) {
                    break;
                }

                let bestTaskIdx = -1;
                let bestPen = Infinity;

                for (let ti = 0; ti < remainInDay.length; ti++) {
                    const task = remainInDay[ti];
                    const item = task.items[0];

                    if (!canPlaceTaskAtSlot(task, item, d, slotCursor, tempSchedule)) continue;

                    const pen = calcPenalty(task, item, d, slotCursor, tempSchedule, teacherDayCount, false);
                    const withNoise = pen + Math.random() * 5;
                    if (withNoise < bestPen) {
                        bestPen = withNoise;
                        bestTaskIdx = ti;
                    }
                }

                if (bestTaskIdx >= 0) {
                    const task = remainInDay[bestTaskIdx];
                    commitTask(task, d, slotCursor, tempSchedule, teacherDayCount);
                    remainInDay.splice(bestTaskIdx, 1);
                    pendingTasks = pendingTasks.filter(t => t !== task);
                    slotCursor++;
                } else {
                    const swapped = tryLocalSwap(cId, d, slotCursor, remainInDay, tempSchedule, teacherDayCount);
                    if (swapped) {
                        const newSlots = getClassSlotsToday();
                        slotCursor = newSlots.length === 0 ? 1 : Math.max(...newSlots) + 1;
                    } else {
                        break;
                    }
                }
            }
        });

        // Fallback для залишків
        if (pendingTasks.length > 0) {
            pendingTasks.forEach(task => {
                const item = task.items[0];
                let placed = tryPlaceTask(task, item, task.priority, tempSchedule, teacherDayCount, false);
                if (!placed) placed = tryPlaceTask(task, item, task.priority, tempSchedule, teacherDayCount, true);
                if (!placed) {
                    const tObj = state.teachers.find(t => t.id === item.teacherId);
                    const clsObj = state.classes.find(c => c.id === item.classId);
                    unplaced.push(`${item.subject} (${tObj ? tObj.name : '?'}) — ${clsObj ? clsObj.name : '?'} кл`);
                }
            });
        }
    });

    return { schedule: tempSchedule, unplaced, unpairedAlternating, overflowTasks };
}

// =============================================================
// ПЕРЕВІРКА: чи можна поставити задачу на конкретний день/слот
// =============================================================
function canPlaceTaskAtSlot(task, firstItem, d, s, tempSchedule) {
    // НІКОЛИ не ставимо на слот 8 автоматично
    if (s === 8) return false;
    
    if (tempSchedule.some(ls => ls.day === d && ls.slot === s && ls.classId === firstItem.classId)) return false;
    if (task.items.some(it => tempSchedule.some(ls => ls.day === d && ls.slot === s && ls.teacherId === it.teacherId))) return false;
    if (task.items.some(it => getTeacherStatus(it.teacherId, d, s) === 2)) return false;

    // ══════════════════════════════════════════════════════════
    // КРИТИЧНИЙ ФІКС #3: Логіка пар для пріоритету 1
    // Дозволяємо пари коли уроків > доступних днів
    // ══════════════════════════════════════════════════════════
    if (task.priority === 1) {
        const existingToday = tempSchedule.filter(ls => 
            ls.day === d && ls.classId === firstItem.classId && ls.subject === firstItem.subject
        );
        
        if (existingToday.length > 0) {
            // Рахуємо скільки уроків цього предмета потрібно для цього класу
            const totalLessonsNeeded = state.workload
                .filter(w => w.classId === firstItem.classId && w.subject === firstItem.subject)
                .reduce((sum, w) => sum + Math.ceil(parseFloat(w.hours)), 0);
            
            // Скільки днів доступно для цього вчителя
            const availableDays = countTeacherAvailableDays(firstItem.teacherId);
            
            // Якщо уроків більше ніж днів - пари дозволені (pigeonhole principle)
            if (totalLessonsNeeded > availableDays) {
                // Перевіряємо чи це суміжний слот (пара підряд)
                const isAdjacent = existingToday.some(ls => Math.abs(ls.slot - s) === 1);
                if (!isAdjacent) return false; // Тільки підряд
            } else {
                return false; // Пари не потрібні
            }
        }
    }

    const myRoomType = getRoomType(firstItem.subject);
    const isHardRoom = myRoomType === 'computer' || myRoomType === 'gym';
    if (isHardRoom) {
        if (tempSchedule.some(ls =>
            ls.day === d && ls.slot === s && ls.classId !== firstItem.classId &&
            getRoomType(ls.subject) === myRoomType
        )) return false;
    }

    if (isLaborSubject(firstItem.subject)) {
        if (tempSchedule.some(ls =>
            ls.day === d && ls.slot === s && ls.classId !== firstItem.classId &&
            isLaborSubject(ls.subject)
        )) return false;
    }

    return true;
}

// =============================================================
// РОЗРАХУНОК ШТРАФУ
// =============================================================
function calcPenalty(task, firstItem, d, s, tempSchedule, teacherDayCount, relaxed) {
    let pen = 0;
    const priority = task.priority;

    const maxStatus = task.items.reduce((max, it) => Math.max(max, getTeacherStatus(it.teacherId, d, s)), 0);
    if (maxStatus === 1) pen += relaxed ? 500 : 1500;

    if (priority <= 2) {
        if (s === 6) pen += relaxed ? 50 : 100;
        if (s === 7) pen += relaxed ? 150 : 400;
    } else {
        if (s >= 6) pen -= 200;
    }

    const myRoomType = getRoomType(firstItem.subject);
    if (myRoomType === 'chemistry' || myRoomType === 'physics') {
        const roomConflict = tempSchedule.some(ls =>
            ls.day === d && ls.slot === s && ls.classId !== firstItem.classId &&
            getRoomType(ls.subject) === myRoomType
        );
        if (roomConflict) pen += 100000;
    }

    // Логіка пар
    const sameSubjectToday = tempSchedule.filter(ls =>
        ls.day === d && ls.classId === firstItem.classId && ls.subject === firstItem.subject
    );
    
    if (sameSubjectToday.length > 0) {
        const isAdj = sameSubjectToday.some(ls => Math.abs(ls.slot - s) === 1);
        if (priority === 1) {
            const totalLessons = state.workload
                .filter(w => w.classId === firstItem.classId && w.subject === firstItem.subject)
                .reduce((sum, w) => sum + Math.ceil(parseFloat(w.hours)), 0);
            const availDays = countTeacherAvailableDays(firstItem.teacherId);
            
            if (totalLessons > availDays) {
                pen += isAdj ? 50 : 5000;
            } else {
                pen += 8000;
            }
        } else {
            pen += isAdj ? (relaxed ? 200 : 500) : (relaxed ? 2000 : 8000);
        }
    }

    if (isLaborSubject(firstItem.subject)) {
        const laborToday = tempSchedule.filter(ls =>
            ls.day === d && ls.classId === firstItem.classId &&
            isLaborSubject(ls.subject) && ls.teacherId === firstItem.teacherId
        );
        if (laborToday.length === 1) {
            const prevSlot = laborToday[0].slot;
            if (Math.abs(prevSlot - s) === 1) {
                pen -= 500;
            } else {
                pen += 200;
            }
        } else if (laborToday.length > 1) {
            pen += 10000;
        }
    }

    if (!relaxed) {
        const teacherLessonsToday = tempSchedule.filter(ls =>
            ls.day === d && ls.teacherId === firstItem.teacherId && ls.slot >= 1 && ls.slot <= 7
        );
        if (teacherLessonsToday.length > 0) {
            const dists = teacherLessonsToday.map(ls => Math.abs(ls.slot - s));
            const minDist = Math.min(...dists);
            if (minDist === 1) pen -= 150;
            else if (minDist === 2) pen += 100;
            else pen += minDist * 150;
        } else {
            pen += (s - 1) * 80;
        }

        const teacherCountToday = (teacherDayCount[firstItem.teacherId] || [0,0,0,0,0])[d];
        if (teacherCountToday >= 6) pen += 2000;
        else if (teacherCountToday >= 5) pen += 400;
    }

    return pen;
}

// =============================================================
// COMMIT
// =============================================================
function commitTask(task, d, s, tempSchedule, teacherDayCount) {
    task.items.forEach(it => {
        tempSchedule.push({
            id: 'sch_' + Date.now() + Math.random(),
            teacherId: it.teacherId,
            classId: it.classId,
            subject: it.subject,
            day: d,
            slot: s,
            isAlternating: (it.currentHours === 0.5 && it.splitType === 'alternating'),
            pairType: task.type
        });
        if (teacherDayCount[it.teacherId]) teacherDayCount[it.teacherId][d]++;
    });
}

// =============================================================
// КРИТИЧНИЙ ФІКС #4: Покращений LOCAL SWAP
// =============================================================
function tryLocalSwap(classId, day, targetSlot, pendingTasks, tempSchedule, teacherDayCount) {
    const prevSlot = targetSlot - 1;
    if (prevSlot < 1) return false;

    const blockingLesson = tempSchedule.find(ls =>
        ls.day === day && ls.slot === prevSlot && ls.classId === classId && !ls.isManual
    );
    if (!blockingLesson) return false;

    // СПРОБА 1: Переставити в межах того ж дня (на пізніший слот)
    for (let laterSlot = targetSlot + 1; laterSlot <= 7; laterSlot++) {
        const teacherFreeAtLater = !tempSchedule.some(ls =>
            ls.day === day && ls.slot === laterSlot && ls.teacherId === blockingLesson.teacherId
        );
        const classFreeAtLater = !tempSchedule.some(ls =>
            ls.day === day && ls.slot === laterSlot && ls.classId === classId
        );
        const notRed = getTeacherStatus(blockingLesson.teacherId, day, laterSlot) !== 2;

        if (teacherFreeAtLater && classFreeAtLater && notRed) {
            // Переміщуємо blocking lesson на laterSlot
            const idx = tempSchedule.indexOf(blockingLesson);
            if (idx !== -1) {
                tempSchedule.splice(idx, 1);
                
                const movedLesson = {
                    ...blockingLesson,
                    id: 'sch_swap_' + Date.now() + Math.random(),
                    slot: laterSlot
                };
                tempSchedule.push(movedLesson);
                return true;
            }
        }
    }

    // СПРОБА 2: Перекинути на інший день
    const otherDays = [0, 1, 2, 3, 4].filter(d => d !== day).sort(() => Math.random() - 0.5);

    for (const altDay of otherDays) {
        const altClassSlots = tempSchedule
            .filter(ls => ls.day === altDay && ls.classId === classId && ls.slot >= 1 && ls.slot <= 7)
            .map(ls => ls.slot);
        const altNextSlot = altClassSlots.length === 0 ? 1 : Math.max(...altClassSlots) + 1;

        if (altNextSlot > 7) continue;

        const teacherFree = !tempSchedule.some(ls =>
            ls.day === altDay && ls.slot === altNextSlot && ls.teacherId === blockingLesson.teacherId
        );
        const redZone = getTeacherStatus(blockingLesson.teacherId, altDay, altNextSlot) === 2;

        if (!teacherFree || redZone) continue;

        const idx = tempSchedule.indexOf(blockingLesson);
        if (idx === -1) continue;

        tempSchedule.splice(idx, 1);
        if (teacherDayCount[blockingLesson.teacherId]) teacherDayCount[blockingLesson.teacherId][day]--;

        const classAfterRemoval = tempSchedule
            .filter(ls => ls.day === day && ls.classId === classId && ls.slot >= 1 && ls.slot <= 7)
            .map(ls => ls.slot);
        const expectedNext = classAfterRemoval.length === 0 ? 1 : Math.max(...classAfterRemoval) + 1;

        if (expectedNext !== targetSlot) {
            tempSchedule.splice(idx, 0, blockingLesson);
            if (teacherDayCount[blockingLesson.teacherId]) teacherDayCount[blockingLesson.teacherId][day]++;
            continue;
        }

        const movedLesson = {
            ...blockingLesson,
            id: 'sch_swap_' + Date.now() + Math.random(),
            day: altDay,
            slot: altNextSlot
        };
        tempSchedule.push(movedLesson);
        if (teacherDayCount[movedLesson.teacherId]) teacherDayCount[movedLesson.teacherId][altDay]++;

        return true;
    }

    return false;
}

function isLaborSubject(subject) {
    if (!subject) return false;
    const n = subject.toLowerCase();
    return n.includes('труд') || n.includes('технол');
}

// =============================================================
// FALLBACK tryPlaceTask з пріоритетом доступних днів
// =============================================================
function tryPlaceTask(task, firstItem, priority, tempSchedule, teacherDayCount, relaxed) {
    let bestSlot = null;
    let minPen = Infinity;

    // Пріоритет днів, де вчитель доступний
    const teacherAvailDays = getTeacherAvailableDaysList(firstItem.teacherId);
    const otherDays = [0, 1, 2, 3, 4].filter(d => !teacherAvailDays.includes(d));
    const sortedDays = [...teacherAvailDays.sort(() => Math.random() - 0.5), ...otherDays.sort(() => Math.random() - 0.5)];

    for (let d of sortedDays) {
        for (let s = 1; s <= 7; s++) { // НІКОЛИ не 8
            if (tempSchedule.some(ls => ls.day === d && ls.slot === s && ls.classId === firstItem.classId)) continue;
            if (task.items.some(it => tempSchedule.some(ls => ls.day === d && ls.slot === s && ls.teacherId === it.teacherId))) continue;
            if (task.items.some(it => getTeacherStatus(it.teacherId, d, s) === 2)) continue;
            
            // Пріоритет 1 і пари
            if (priority === 1) {
                const existing = tempSchedule.filter(ls => 
                    ls.day === d && ls.classId === firstItem.classId && ls.subject === firstItem.subject
                );
                if (existing.length > 0) {
                    const totalLessons = state.workload
                        .filter(w => w.classId === firstItem.classId && w.subject === firstItem.subject)
                        .reduce((sum, w) => sum + Math.ceil(parseFloat(w.hours)), 0);
                    const availDays = countTeacherAvailableDays(firstItem.teacherId);
                    
                    if (totalLessons <= availDays) continue;
                    const isAdj = existing.some(ls => Math.abs(ls.slot - s) === 1);
                    if (!isAdj) continue;
                }
            }

            if (!canPlaceTaskAtSlot(task, firstItem, d, s, tempSchedule)) continue;

            const createsGap = wouldCreateGap(d, s, firstItem.classId, tempSchedule);
            if (createsGap && !relaxed) continue;

            let pen = calcPenalty(task, firstItem, d, s, tempSchedule, teacherDayCount, relaxed);
            if (createsGap) pen += 50000;
            pen += Math.random() * 8;

            if (pen < minPen) {
                minPen = pen;
                bestSlot = { d, s };
            }
        }
    }

    if (bestSlot) {
        commitTask(task, bestSlot.d, bestSlot.s, tempSchedule, teacherDayCount);
        return true;
    }
    return false;
}

function wouldCreateGap(day, slot, classId, schedule) {
    const classLessonsToday = schedule
        .filter(ls => ls.day === day && ls.classId === classId && ls.slot >= 1 && ls.slot <= 7)
        .map(ls => ls.slot);

    if (classLessonsToday.length === 0) {
        return slot !== 1;
    }

    const maxSlot = Math.max(...classLessonsToday);
    return slot !== maxSlot + 1;
}

// =============================================================
// ДОПОМІЖНІ
// =============================================================
function getTeacherStatus(teacherId, day, slot) {
    const teacher = state.teachers.find(t => t.id === teacherId);
    if (!teacher || !teacher.availability || !teacher.availability[day]) return 0;
    const v = teacher.availability[day][slot];
    if (v === true) return 0;
    if (v === false) return 2;
    return v || 0;
}

function getPriority(subjectName) {
    if (!subjectName) return 100;
    const name = subjectName.toLowerCase();
    for (const [key, level] of Object.entries(subjectPriorities)) {
        if (name.includes(key)) return level;
    }
    return 10;
}

// =============================================================
// ЗВІТ ПІСЛЯ ГЕНЕРАЦІЇ
// =============================================================
function showGenerationReport(errors, unpairedAlternating, overflowTasks, attempts, time) {
    const output = document.getElementById('schedule-output');
    const existingReport = document.getElementById('gen-report');
    if (existingReport) existingReport.remove();

    const isSuccess = errors.length === 0;
    const hasUnpaired = unpairedAlternating && unpairedAlternating.length > 0;
    const hasOverflow = overflowTasks && overflowTasks.length > 0;

    let reportHtml = `<div id="gen-report" class="mt-4 space-y-3">`;

    reportHtml += `
        <div class="p-4 ${isSuccess ? 'bg-green-50 border-green-500' : 'bg-orange-50 border-orange-500'} border-l-4 rounded shadow-sm">
            <div class="flex justify-between items-center">
                <h3 class="font-bold ${isSuccess ? 'text-green-800' : 'text-orange-800'}">
                    ${isSuccess ? '✅ Ідеальний розклад!' : `⚠️ Майже готово — не вмістилось: ${errors.length} уроків`}
                </h3>
                <span class="text-[10px] text-gray-500">Спроб: ${attempts} | Час: ${time}с</span>
            </div>
            ${errors.length > 0 ? `
                <ul class="list-disc list-inside text-[11px] mt-2 text-orange-700 space-y-1">
                    ${errors.map(e => `<li>${e}</li>`).join('')}
                </ul>
                <p class="mt-2 text-[10px] italic text-orange-600">
                    💡 Ці уроки можна вручну розмістити на 0-й або 8-й урок як резерв.
                </p>
            ` : ''}
        </div>`;

    if (hasUnpaired) {
        reportHtml += `
        <div class="p-4 bg-purple-50 border-purple-400 border-l-4 rounded shadow-sm">
            <h3 class="font-bold text-purple-800 mb-2">🔔 Непарні чергування — не розміщено (${unpairedAlternating.length})</h3>
            <p class="text-[11px] text-purple-700 mb-3">
                Для цих предметів не знайшлась пара для чергування «Чисельник/Знаменник».
            </p>
            <div class="space-y-3">
                ${unpairedAlternating.map((u, idx) => `
                    <div class="bg-white rounded-lg border border-purple-200 p-3 text-[11px]">
                        <div class="font-bold text-slate-700 mb-2">
                            📚 ${u.subject} — <span class="text-blue-600">${u.className}</span> — ${u.teacher}
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <button onclick="addUnpairedToSlot(${idx}, 0)"
                                class="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-[10px] font-bold hover:bg-purple-700 transition">
                                📋 Додати на 0-й урок
                            </button>
                            <button onclick="addUnpairedToSlot(${idx}, 8)"
                                class="px-3 py-1.5 bg-slate-600 text-white rounded-lg text-[10px] font-bold hover:bg-slate-700 transition">
                                📋 Додати на 8-й урок
                            </button>
                            <button onclick="addUnpairedToSchedule(${idx})"
                                class="px-3 py-1.5 bg-green-600 text-white rounded-lg text-[10px] font-bold hover:bg-green-700 transition">
                                ✅ Додати в основний розклад
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>`;

        window._unpairedAlternating = unpairedAlternating;
    }

    if (hasOverflow) {
        const byClass = {};
        overflowTasks.forEach(ot => {
            if (!byClass[ot.className]) byClass[ot.className] = [];
            byClass[ot.className].push(ot);
        });

        reportHtml += `
        <div class="p-4 bg-red-50 border-red-500 border-l-4 rounded shadow-sm">
            <h3 class="font-bold text-red-800 mb-1">
                🚫 Перевищення ліміту 35 уроків — ${overflowTasks.length} урок(ів) не розміщено
            </h3>
            <div class="space-y-3">
                ${Object.entries(byClass).map(([className, items]) => `
                    <div class="bg-white rounded-lg border border-red-200 p-3">
                        <div class="font-bold text-red-700 mb-2 text-[12px]">
                            Клас ${className} — ${items.length} зайв. урок(ів):
                        </div>
                        <ul class="space-y-1">
                            ${items.map(ot => `
                                <li class="text-[11px] text-slate-700">
                                    <strong>${ot.subject}</strong> — ${ot.teacher}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
        </div>`;
    }

    reportHtml += `</div>`;
    output.insertAdjacentHTML('afterbegin', reportHtml);
}

function addUnpairedToSlot(idx, slot) {
    const item = window._unpairedAlternating && window._unpairedAlternating[idx];
    if (!item) return;
    for (let d = 0; d < 5; d++) {
        const teacherBusy = state.schedule.some(s => s.day === d && s.slot === slot && s.teacherId === item.teacherId);
        const classBusy = state.schedule.some(s => s.day === d && s.slot === slot && s.classId === item.classId);
        if (!teacherBusy && !classBusy) {
            state.schedule.push({
                id: 'sch_up_' + Date.now(),
                teacherId: item.teacherId,
                classId: item.classId,
                subject: item.subject,
                day: d,
                slot: slot,
                isAlternating: true,
                isManual: true
            });
            save();
            renderSchedule();
            alert(`✅ Урок "${item.subject}" додано на ${slot === 0 ? '0-й' : '8-й'} урок (${state.config.days[d]})`);
            return;
        }
    }
    alert('Не знайдено вільного слота.');
}

function addUnpairedToSchedule(idx) {
    const item = window._unpairedAlternating && window._unpairedAlternating[idx];
    if (!item) return;
    for (let d = 0; d < 5; d++) {
        for (let s = 1; s <= 7; s++) {
            const teacherBusy = state.schedule.some(ls => ls.day === d && ls.slot === s && ls.teacherId === item.teacherId);
            const classBusy = state.schedule.some(ls => ls.day === d && ls.slot === s && ls.classId === item.classId);
            const isRed = getTeacherStatus(item.teacherId, d, s) === 2;
            if (!teacherBusy && !classBusy && !isRed) {
                state.schedule.push({
                    id: 'sch_up_' + Date.now(),
                    teacherId: item.teacherId,
                    classId: item.classId,
                    subject: item.subject,
                    day: d,
                    slot: s,
                    isAlternating: true,
                    isManual: true
                });
                save();
                renderSchedule();
                alert(`✅ Урок "${item.subject}" додано: ${state.config.days[d]}, урок ${s}`);
                return;
            }
        }
    }
    alert('Не знайдено вільного слота.');
}

function dismissUnpaired(idx) {
    if (window._unpairedAlternating) {
        window._unpairedAlternating[idx] = null;
    }
}

// =============================================================
// РЕНДЕР
// =============================================================
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
