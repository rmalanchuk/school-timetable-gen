// =============================================================================
// SCHOOL SCHEDULE PRO — app.js
// Повністю переписана логіка генерації (v2.0)
// =============================================================================

// --- СЛОВНИК ПРІОРИТЕТІВ ПРЕДМЕТІВ ---
const subjectPriorities = {
    // 1 — НАЙВИЩА СКЛАДНІСТЬ (мови, точні науки)
    'алгебр': 1, 'геометр': 1, 'матем': 1,
    'фізик': 1, 'хімі': 1,
    'англійськ': 1, 'нім': 1, 'іноземн': 1,
    'укр. мов': 1, 'укр мов': 1,

    // 2 — СЕРЕДНЯ СКЛАДНІСТЬ (гуманітарні, природничі)
    'літ': 2, 'історі': 2, 'біолог': 2, 'географ': 2,
    'право': 2, 'громад': 2, 'етик': 2, 'захист': 2,
    'природ': 2, 'інформ': 2, 'stem': 2, 'стем': 2,
    'мов': 2, // загальне "мова" — тут, щоб не перебивати укр. мов

    // 3 — НИЖЧА СКЛАДНІСТЬ (мистецтво, спорт, праця)
    'фізкульт': 3, 'фізичн': 3,
    'технолог': 3, 'трудов': 3,
    'мистец': 3, 'музик': 3, 'малюв': 3,
    'добробут': 3, 'основ': 3, 'фінанс': 3
};

// Предмети, що використовують спеціалізовані кабінети (не можуть збігатися в слот)
const SPECIAL_ROOM_SUBJECTS = ['інформ', 'фізкульт', 'фізичн', 'хімі', 'фізик'];

// --- СТАН ДОДАТКУ ---
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

// Прапор активної генерації (для зупинки з UI)
let generationRunning = false;

// =============================================================================
// ЗБЕРЕЖЕННЯ / ЗАВАНТАЖЕННЯ
// =============================================================================

function save() { saveData(); }

function saveData() {
    try {
        localStorage.setItem('school_schedule_data', JSON.stringify(state));
    } catch (e) {
        console.error("Помилка збереження:", e);
    }
}

function init() {
    try {
        const saved = localStorage.getItem('school_schedule_data');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') {
                state = { ...state, ...parsed };
                if (!state.schedule)  state.schedule  = [];
                if (!state.workload)  state.workload  = [];
                if (!state.teachers)  state.teachers  = [];
                if (!state.classes)   state.classes   = [];
            }
        }
    } catch (e) {
        console.error("Помилка читання localStorage:", e);
    }
    renderAll();
}

// =============================================================================
// НАВІГАЦІЯ
// =============================================================================

function showTab(tabName) {
    state.activeTab = tabName;
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    const section = document.getElementById(`tab-${tabName}`);
    if (section) section.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.id === `btn-${tabName}`) btn.classList.add('active');
    });
    saveData();
    renderAll();
}

// =============================================================================
// ЕКСПОРТ / ІМПОРТ
// =============================================================================

function exportData() {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `schedule_backup_${new Date().toISOString().split('T')[0]}.json`;
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
                const imported = JSON.parse(event.target.result);
                if (imported.teachers && imported.classes) {
                    if (confirm('Поточні дані будуть замінені. Продовжити?')) {
                        state = imported;
                        if (!state.schedule) state.schedule = [];
                        if (!state.workload) state.workload = [];
                        saveData();
                        renderAll();
                        alert('Дані успішно імпортовані!');
                    }
                } else {
                    alert('Помилка: неправильна структура файлу.');
                }
            } catch (err) {
                alert('Помилка читання файлу: ' + err.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// =============================================================================
// ВЧИТЕЛІ
// =============================================================================

function addTeacher() {
    const nameInput = document.getElementById('teacher-name');
    const name = nameInput.value.trim();
    if (!name) return;
    state.teachers.push({
        id: 't_' + Date.now(),
        name: name,
        // availability[день][слот]: 0=вільний, 1=бажано вікно, 2=НЕ МОЖНА
        availability: Array(5).fill(null).map(() => Array(9).fill(0))
    });
    nameInput.value = '';
    saveData();
    renderAll();
}

function deleteTeacher(id) {
    if (!confirm('Видалити вчителя та все його навантаження?')) return;
    state.teachers = state.teachers.filter(t => t.id !== id);
    state.workload  = state.workload.filter(w => w.teacherId !== id);
    saveData();
    renderAll();
}

// =============================================================================
// КЛАСИ
// =============================================================================

function addClass() {
    const nameInput = document.getElementById('class-name');
    const name = nameInput.value.trim();
    if (!name) return;
    state.classes.push({ id: 'c_' + Date.now(), name: name });
    nameInput.value = '';
    saveData();
    renderAll();
}

function deleteClass(id) {
    if (!confirm('Видалити клас та все пов\'язане навантаження?')) return;
    state.classes  = state.classes.filter(c => c.id !== id);
    state.workload = state.workload.filter(w => w.classId !== id);
    saveData();
    renderAll();
}

// =============================================================================
// ДОСТУПНІСТЬ ВЧИТЕЛЯ (МОДАЛЬНЕ ВІКНО)
// =============================================================================

let currentEditingTeacherId = null;

function openAvailability(id) {
    currentEditingTeacherId = id;
    const teacher = state.teachers.find(t => t.id === id);
    if (!teacher) return;
    if (!teacher.availability) {
        teacher.availability = Array(5).fill(null).map(() => Array(9).fill(0));
    }
    document.getElementById('modal-teacher-name').innerText = `Доступність: ${teacher.name}`;
    renderAvailabilityGrid(teacher);
    document.getElementById('modal-availability').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-availability').classList.add('hidden');
    currentEditingTeacherId = null;
    saveData();
}

function renderAvailabilityGrid(teacher) {
    const container = document.getElementById('availability-grid');
    const days = state.config.days;

    let html = `<table class="w-full border-collapse text-sm">
        <thead><tr><th class="p-1 border bg-gray-100">Урок</th>`;
    days.forEach(d => html += `<th class="border p-2 bg-gray-100 font-bold">${d}</th>`);
    html += `</tr></thead><tbody>`;

    for (let l = 0; l <= 8; l++) {
        const rowLabel = l === 0 ? '0 (рез.)' : l === 8 ? '8 (рез.)' : String(l);
        html += `<tr><td class="border p-2 font-bold bg-gray-50 text-center text-xs">${rowLabel}</td>`;
        for (let d = 0; d < 5; d++) {
            const status = (teacher.availability && teacher.availability[d])
                ? (teacher.availability[d][l] || 0) : 0;
            const colors = [
                'bg-green-100 text-green-700 hover:bg-green-200',
                'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
                'bg-red-100 text-red-700 hover:bg-red-200'
            ];
            const labels = ['Вільний', 'Бажано вікно', 'НЕ МОЖНА'];
            html += `<td onclick="toggleAvailability(${d}, ${l})"
                class="border p-2 cursor-pointer text-[10px] text-center font-medium transition select-none ${colors[status]}">
                ${labels[status]}
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
    if (!teacher.availability[dayIndex]) teacher.availability[dayIndex] = Array(9).fill(0);
    const cur = teacher.availability[dayIndex][lessonIndex] || 0;
    teacher.availability[dayIndex][lessonIndex] = (cur + 1) % 3;
    renderAvailabilityGrid(teacher);
}

// =============================================================================
// НАВАНТАЖЕННЯ
// =============================================================================

function addWorkloadInline(teacherId) {
    const tId = String(teacherId);
    const classSelect  = document.getElementById(`sel-cls-${tId}`);
    const hourInput    = document.getElementById(`hrs-${tId}`);
    const subjectInput = document.getElementById(`sub-${tId}`);

    if (!classSelect || !hourInput || !subjectInput) return;

    const classId = classSelect.value;
    const hours   = parseFloat(hourInput.value);
    const subject = subjectInput.value.trim();

    if (!subject || isNaN(hours) || hours <= 0) {
        alert("Вкажіть назву предмета та кількість годин.");
        return;
    }

    let splitType = 'none';
    let semesterPriority = 'none';

    if (hours % 1 !== 0) {
        const isAlt = confirm(
            `Години дробові (${hours}).\n\nОК — Чергування тижнів (Чисельник/Знаменник)\nСкасувати — Розподіл по семестрах`
        );
        if (isAlt) {
            splitType = 'alternating';
        } else {
            splitType = 'semester';
            semesterPriority = confirm(
                "Більше годин у ПЕРШОМУ семестрі?\n(ОК — так, Скасувати — більше у другому)"
            ) ? 'first' : 'second';
        }
    }

    if (!state.workload) state.workload = [];
    state.workload.push({
        id: String(Date.now()),
        teacherId: tId,
        classId: String(classId),
        subject: subject,
        hours: hours,
        splitType: splitType,
        semesterPriority: semesterPriority
    });

    subjectInput.value = '';
    saveData();
    renderAll();
}

function deleteWorkload(id) {
    if (!confirm('Видалити цей запис навантаження?')) return;
    state.workload = state.workload.filter(w => String(w.id) !== String(id));
    saveData();
    renderAll();
}

// =============================================================================
// ДОПОМІЖНІ ФУНКЦІЇ ДЛЯ ГЕНЕРАЦІЇ
// =============================================================================

function getPriority(subjectName) {
    if (!subjectName) return 10;
    const name = subjectName.toLowerCase();
    // Перевіряємо більш специфічні ключі першими
    const keys = Object.keys(subjectPriorities).sort((a, b) => b.length - a.length);
    for (const key of keys) {
        if (name.includes(key)) return subjectPriorities[key];
    }
    return 10;
}

function getTeacherAvailStatus(teacherId, day, slot) {
    const teacher = state.teachers.find(t => String(t.id) === String(teacherId));
    if (!teacher || !teacher.availability || !teacher.availability[day]) return 0;
    return teacher.availability[day][slot] || 0;
}

function isSpecialRoomSubject(subjectName) {
    if (!subjectName) return false;
    const name = subjectName.toLowerCase();
    return SPECIAL_ROOM_SUBJECTS.some(k => name.includes(k));
}

// Скільки вільних слотів має вчитель (для сортування "найбільш обмежені — першими")
function countFreeSlots(teacherId) {
    const teacher = state.teachers.find(t => String(t.id) === String(teacherId));
    if (!teacher || !teacher.availability) return 35;
    let count = 0;
    for (let d = 0; d < 5; d++) {
        for (let s = 1; s <= 7; s++) {
            if ((teacher.availability[d] ? teacher.availability[d][s] : 0) !== 2) count++;
        }
    }
    return count;
}

// =============================================================================
// ГОЛОВНА ФУНКЦІЯ ГЕНЕРАЦІЇ (асинхронна, з UI-прогресом)
// =============================================================================

async function generateSchedule() {
    if (generationRunning) {
        generationRunning = false;
        return;
    }

    // Перевірка наявності даних
    if (!state.workload || state.workload.length === 0) {
        alert("Немає навантаження для генерації!");
        return;
    }

    generationRunning = true;

    // Перемикаємо кнопку
    const btn = document.querySelector('button[onclick="generateSchedule()"]');
    if (btn) {
        btn.textContent = '⏹ ЗУПИНИТИ';
        btn.classList.replace('bg-blue-600', 'bg-red-600');
        btn.classList.replace('hover:bg-blue-700', 'hover:bg-red-700');
    }

    const maxDuration = 20 * 60 * 1000; // 20 хвилин
    const startTime   = Date.now();

    let best = { schedule: [], unplacedCount: Infinity, unplacedList: [] };
    let attempt = 0;

    // Показуємо прогрес-бар
    showProgressUI(0, 0, Infinity);

    // Готуємо список задач (один раз — він незмінний між спробами)
    const tasks = buildTaskList();

    // Рахуємо "жорсткий мінімум" — скільки задач теоретично можна розмістити
    // (потрібно для відображення прогресу)
    const totalTasks = tasks.length;

    while (generationRunning && (Date.now() - startTime) < maxDuration) {
        attempt++;

        // Даємо браузеру "подихати" кожні 5 спроб
        if (attempt % 5 === 0) {
            await new Promise(r => setTimeout(r, 0));
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            showProgressUI(attempt, elapsed, best.unplacedCount);
            if (!generationRunning) break;
        }

        const result = runSingleGeneration(tasks);

        if (result.unplaced.length < best.unplacedCount) {
            best = {
                schedule: JSON.parse(JSON.stringify(result.schedule)),
                unplacedCount: result.unplaced.length,
                unplacedList: result.unplaced
            };
            // Одразу зберігаємо найкращий результат
            state.schedule = best.schedule;
            saveData();

            // Ідеальний результат — зупиняємось
            if (best.unplacedCount === 0) break;
        }
    }

    generationRunning = false;

    // Відновлюємо кнопку
    if (btn) {
        btn.textContent = '⚡ ЗГЕНЕРУВАТИ';
        btn.classList.replace('bg-red-600', 'bg-blue-600');
        btn.classList.replace('hover:bg-red-700', 'hover:bg-blue-700');
    }

    state.schedule = best.schedule;
    saveData();
    renderSchedule();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    showGenerationReport(best.unplacedList, attempt, duration);
}

// Показує прогрес під час генерації
function showProgressUI(attempt, elapsed, unplaced) {
    const output = document.getElementById('schedule-output');
    if (!output) return;

    const unplacedText = unplaced === Infinity ? '...' : String(unplaced);
    const existingBar = document.getElementById('progress-bar-container');

    if (!existingBar) {
        output.insertAdjacentHTML('afterbegin', `
            <div id="progress-bar-container" class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-bold text-blue-800 text-sm">🔄 Генерація розкладу...</span>
                    <span class="text-xs text-blue-600" id="progress-stop-hint">Натисніть ⏹ ЗУПИНИТИ щоб зафіксувати поточний результат</span>
                </div>
                <div class="w-full bg-blue-100 rounded-full h-2 mb-2">
                    <div id="progress-bar" class="bg-blue-500 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                </div>
                <div class="flex justify-between text-xs text-blue-700">
                    <span>Спроба: <b id="prog-attempt">0</b></span>
                    <span>Час: <b id="prog-time">0</b>с</span>
                    <span>Не влізло: <b id="prog-unplaced">...</b></span>
                </div>
            </div>
        `);
    }

    const bar = document.getElementById('progress-bar');
    const progAttempt  = document.getElementById('prog-attempt');
    const progTime     = document.getElementById('prog-time');
    const progUnplaced = document.getElementById('prog-unplaced');

    if (bar) {
        // Ширина бару — умовно відображає "якість": чим менше unplaced, тим повніше
        const totalTasks = (state.workload || []).reduce((s, w) => s + Math.ceil(w.hours), 0);
        const placed = Math.max(0, totalTasks - (unplaced === Infinity ? totalTasks : unplaced));
        const pct = totalTasks > 0 ? Math.round((placed / totalTasks) * 100) : 0;
        bar.style.width = pct + '%';
    }
    if (progAttempt)  progAttempt.textContent  = attempt;
    if (progTime)     progTime.textContent      = elapsed;
    if (progUnplaced) progUnplaced.textContent  = unplacedText;
}

// =============================================================================
// ПІДГОТОВКА СПИСКУ ЗАДАЧ (один раз перед генерацією)
// =============================================================================

function buildTaskList() {
    const flatWorkload = [];

    state.workload.forEach(item => {
        let h = parseFloat(item.hours);
        // Ціла частина — повні уроки
        const full = Math.floor(h);
        for (let i = 0; i < full; i++) {
            flatWorkload.push({ ...item, currentHours: 1, used: false });
        }
        // Дробова частина — 0.5 (чергування або семестр)
        const frac = Math.round((h - full) * 10) / 10;
        if (frac >= 0.5) {
            flatWorkload.push({ ...item, currentHours: 0.5, used: false });
        }
    });

    const tasks = [];

    // --- КРОК 1: СПАРЮВАННЯ ЧЕРГУВАНЬ ---
    // Групуємо 0.5-годинні елементи по класах
    const classIds = [...new Set(state.classes.map(c => c.id))];
    classIds.forEach(cId => {
        // Спочатку намагаємось спарити предмети ОДНОГО вчителя (фіолетовий кружечок)
        const teachers = [...new Set(
            flatWorkload.filter(w => w.classId === cId && w.currentHours === 0.5 && w.splitType === 'alternating' && !w.used)
                        .map(w => w.teacherId)
        )];

        teachers.forEach(tId => {
            const items = flatWorkload.filter(
                w => w.classId === cId && w.teacherId === tId && w.currentHours === 0.5 && w.splitType === 'alternating' && !w.used
            );
            while (items.length >= 2) {
                const i1 = items.shift(); const i2 = items.shift();
                i1.used = true; i2.used = true;
                tasks.push({
                    type: 'paired_internal', // один вчитель, фіолетовий
                    items: [i1, i2],
                    priority: Math.min(getPriority(i1.subject), getPriority(i2.subject)),
                    classId: cId
                });
            }
        });

        // Потім — спарюємо залишки між різними вчителями (синій кружечок)
        let remaining = flatWorkload.filter(
            w => w.classId === cId && w.currentHours === 0.5 && w.splitType === 'alternating' && !w.used
        );
        while (remaining.length >= 2) {
            const i1 = remaining.shift(); const i2 = remaining.shift();
            i1.used = true; i2.used = true;
            tasks.push({
                type: 'paired_external', // різні вчителі, синій
                items: [i1, i2],
                priority: Math.min(getPriority(i1.subject), getPriority(i2.subject)),
                classId: cId
            });
            remaining = flatWorkload.filter(
                w => w.classId === cId && w.currentHours === 0.5 && w.splitType === 'alternating' && !w.used
            );
        }
    });

    // --- КРОК 2: ВСІ ЗВИЧАЙНІ УРОКИ ---
    flatWorkload.filter(w => !w.used).forEach(item => {
        item.used = true;
        tasks.push({
            type: 'single',
            items: [item],
            priority: getPriority(item.subject),
            classId: item.classId
        });
    });

    // --- СОРТУВАННЯ: найбільш обмежені — першими ---
    tasks.sort((a, b) => {
        // 1. За пріоритетом предмету (1 — найважливіший, йде першим)
        if (a.priority !== b.priority) return a.priority - b.priority;

        // 2. Серед однакового пріоритету — ті, у кого менше вільних слотів
        const slotsA = countFreeSlots(a.items[0].teacherId);
        const slotsB = countFreeSlots(b.items[0].teacherId);
        if (slotsA !== slotsB) return slotsA - slotsB;

        // 3. Tie-breaker — випадковий (щоб кожна спроба була різною)
        return 0; // не перемішуємо тут — перемішуємо при кожній спробі нижче
    });

    return tasks;
}

// =============================================================================
// ОДНА СПРОБА ГЕНЕРАЦІЇ
// =============================================================================

function runSingleGeneration(tasks) {
    // Беремо вже розміщені вручну уроки (0-й та 8-й слоти, або ручні правки)
    // Вони позначені флагом isManual або знаходяться в слотах 0 та 8
    let tempSchedule = state.schedule.filter(s => s.isManual || s.slot === 0 || s.slot === 8);

    const unplaced = [];

    // Перемішуємо задачі всередині кожного пріоритетного рівня
    // (але не між рівнями — це зберігає ієрархію пріоритетів)
    const shuffledTasks = shuffleWithinPriority(tasks);

    // --- ДВОПРОХІДНИЙ АЛГОРИТМ ---
    // Прохід 1: розміщуємо всі "першi" уроки предметів (по 1 на день)
    // Прохід 2: розміщуємо "другі" уроки поруч з першими

    // Виділяємо задачі, де може бути 2+ уроки одного предмету в день (пріо 2/3)
    // і ті, де точно 1 (пріо 1)
    const pass1Tasks = []; // Всі задачі пріоритету 1, і перший примірник кожного предмету пріо 2/3
    const pass2Tasks = []; // Другі та подальші уроки пріо 2/3 (потрібно ставити поруч)

    // Відстежуємо: скільки разів предмет зустрічається для класу
    const subjectCount = {}; // ключ: `${classId}__${subject}__${teacherId}`

    shuffledTasks.forEach(task => {
        const item = task.items[0];
        const key = `${item.classId}__${item.subject}__${item.teacherId}`;

        if (task.priority === 1) {
            pass1Tasks.push(task);
        } else {
            subjectCount[key] = (subjectCount[key] || 0) + 1;
            if (subjectCount[key] === 1) {
                pass1Tasks.push(task);
            } else {
                pass2Tasks.push(task);
            }
        }
    });

    // --- ПРОХІД 1 ---
    pass1Tasks.forEach(task => {
        const result = placeTask(task, tempSchedule, false);
        if (result) {
            result.forEach(entry => tempSchedule.push(entry));
        } else {
            recordUnplaced(task, unplaced);
        }
    });

    // --- ПРОХІД 2: шукаємо сусідній слот до вже розміщеного уроку ---
    pass2Tasks.forEach(task => {
        const item = task.items[0];
        // Знаходимо вже розміщений урок цього предмету в цьому класі
        const existing = tempSchedule.filter(
            ls => String(ls.classId) === String(item.classId) &&
                  ls.subject === item.subject &&
                  String(ls.teacherId) === String(item.teacherId)
        );

        if (existing.length > 0) {
            // Намагаємось поставити ПОРУЧ з одним із вже розміщених
            const result = placeTaskAdjacent(task, existing, tempSchedule);
            if (result) {
                result.forEach(entry => tempSchedule.push(entry));
                return;
            }
        }

        // Якщо не вдалось поруч — стандартне розміщення
        const result = placeTask(task, tempSchedule, true);
        if (result) {
            result.forEach(entry => tempSchedule.push(entry));
        } else {
            recordUnplaced(task, unplaced);
        }
    });

    return { schedule: tempSchedule, unplaced };
}

// Перемішування всередині груп пріоритету
function shuffleWithinPriority(tasks) {
    const groups = {};
    tasks.forEach(t => {
        const p = t.priority;
        if (!groups[p]) groups[p] = [];
        groups[p].push(t);
    });
    const result = [];
    Object.keys(groups).sort((a, b) => Number(a) - Number(b)).forEach(p => {
        const arr = groups[p];
        // Fisher-Yates всередині групи
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        arr.forEach(t => result.push(t));
    });
    return result;
}

function recordUnplaced(task, unplaced) {
    const item = task.items[0];
    const tObj = state.teachers.find(t => String(t.id) === String(item.teacherId));
    const cObj = state.classes.find(c => String(c.id) === String(item.classId));
    unplaced.push(`${item.subject} — ${tObj ? tObj.name : '?'} (${cObj ? cObj.name : '?'} кл.)`);
}

// =============================================================================
// РОЗМІЩЕННЯ ЗАДАЧІ В КРАЩИЙ СЛОТ
// =============================================================================

function placeTask(task, schedule, allowLate) {
    const item = task.items[0];
    const isPaired = task.type === 'paired_internal' || task.type === 'paired_external';

    let bestSlot = null;
    let minPen   = Infinity;

    // Перемішуємо дні для різноманіття між спробами
    const days = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);

    for (const d of days) {
        for (let s = 1; s <= 7; s++) {
            const pen = evaluateSlot(task, d, s, schedule, allowLate);
            if (pen === null) continue; // заборонений слот

            if (pen < minPen) {
                minPen   = pen;
                bestSlot = { d, s };
            }
        }
    }

    if (!bestSlot) return null;

    return buildEntries(task, bestSlot.d, bestSlot.s);
}

// Спроба поставити задачу ПОРУЧ з одним із вже існуючих уроків
function placeTaskAdjacent(task, existingLessons, schedule) {
    const item = task.items[0];

    let bestSlot = null;
    let minPen   = Infinity;

    for (const existing of existingLessons) {
        // Перевіряємо слоти ±1 від вже розміщеного
        for (const adjSlot of [existing.slot - 1, existing.slot + 1]) {
            if (adjSlot < 1 || adjSlot > 7) continue;

            const pen = evaluateSlot(task, existing.day, adjSlot, schedule, true);
            if (pen === null) continue;

            // Бонус за суміжний слот — суттєво знижуємо штраф
            const adjPen = pen - 50000;

            if (adjPen < minPen) {
                minPen   = adjPen;
                bestSlot = { d: existing.day, s: adjSlot };
            }
        }
    }

    if (!bestSlot) return null;
    return buildEntries(task, bestSlot.d, bestSlot.s);
}

// =============================================================================
// ОЦІНКА СЛОТУ (повертає штраф або null якщо заборонено)
// =============================================================================

function evaluateSlot(task, d, s, schedule, allowSameDayDouble) {
    const item    = task.items[0];
    const priority = task.priority;
    const isPaired = task.type === 'paired_internal' || task.type === 'paired_external';

    // === ЖОРСТКІ ЗАБОРОНИ ===

    // 1. Клас вже зайнятий у цей слот
    const classConflict = schedule.some(ls =>
        ls.day === d && ls.slot === s && String(ls.classId) === String(item.classId)
    );
    if (classConflict) return null;

    // 2. Для зовнішньої пари — обидва вчителі мають бути вільні
    for (const it of task.items) {
        const teacherBusy = schedule.some(ls =>
            ls.day === d && ls.slot === s && String(ls.teacherId) === String(it.teacherId)
        );
        if (teacherBusy) return null;

        // 3. Червона зона — вчитель не може
        if (getTeacherAvailStatus(it.teacherId, d, s) === 2) return null;
    }

    // 4. Заборона дублювання складних предметів (пріоритет 1)
    if (priority === 1) {
        const alreadyToday = schedule.some(ls =>
            ls.day === d &&
            String(ls.classId) === String(item.classId) &&
            ls.subject === item.subject
        );
        if (alreadyToday) return null;
    }

    // 5. Спецкабінет: не більше одного уроку-спецпредмету в слот
    if (isSpecialRoomSubject(item.subject)) {
        const sameRoomConflict = schedule.some(ls =>
            ls.day === d && ls.slot === s && isSpecialRoomSubject(ls.subject)
        );
        if (sameRoomConflict) return null;
    }

    // === РОЗРАХУНОК ШТРАФУ ===
    let pen = 0;

    // Жовта зона (бажано вікно)
    for (const it of task.items) {
        if (getTeacherAvailStatus(it.teacherId, d, s) === 1) pen += 1500;
    }

    // Штраф за пізні уроки (лише для пріо 1 та 2)
    if (priority <= 2) {
        if (s === 6) pen += 100;
        if (s === 7) pen += 400;
    } else {
        // Пріо 3 — навпаки, легкі предмети краще в кінці дня
        if (s >= 6) pen -= 300;
    }

    // Баланс навантаження вчителя (магніт до вже розміщених уроків вчителя)
    const teacherDayLessons = schedule.filter(ls =>
        ls.day === d && String(ls.teacherId) === String(item.teacherId)
    );

    if (teacherDayLessons.length > 0) {
        const minDist = Math.min(...teacherDayLessons.map(ls => Math.abs(ls.slot - s)));
        if (minDist === 0) return null; // не може — вже зайнятий (зайве, але для безпеки)
        if (minDist === 1) pen -= 8000;       // бонус за суміжний урок
        else pen += minDist * 2000;            // штраф за вікна
    } else {
        // Перший урок вчителя в день — тягнемо до ранку
        pen += s * 800;
    }

    // Баланс вчителя між днями
    const totalWeekLessons = schedule.filter(ls => String(ls.teacherId) === String(item.teacherId)).length;
    const dayCount = schedule.filter(ls => ls.day === d && String(ls.teacherId) === String(item.teacherId)).length;
    const avgPerDay = totalWeekLessons / 5;
    if (dayCount > avgPerDay + 1) pen += (dayCount - avgPerDay) * 500; // штраф за перевантажений день

    // Мінімальний шум (tie-breaker між рівнозначними слотами)
    pen += Math.random() * 3;

    return pen;
}

// Формує записи для tempSchedule
function buildEntries(task, d, s) {
    return task.items.map(it => ({
        id: 'sch_' + Date.now() + '_' + Math.random(),
        teacherId: String(it.teacherId),
        classId: String(it.classId),
        subject: it.subject,
        day: d,
        slot: s,
        isAlternating: (it.currentHours === 0.5 && it.splitType === 'alternating'),
        altType: task.type === 'paired_internal' ? 'internal' :
                 task.type === 'paired_external' ? 'external' : 'none',
        isManual: false
    }));
}

// =============================================================================
// ЗВІТ ПІСЛЯ ГЕНЕРАЦІЇ
// =============================================================================

function showGenerationReport(errors, attempts, time) {
    // Видаляємо прогрес-бар
    const bar = document.getElementById('progress-bar-container');
    if (bar) bar.remove();

    const output = document.getElementById('schedule-output');
    const isSuccess = errors.length === 0;

    output.insertAdjacentHTML('afterbegin', `
        <div id="gen-report" class="mt-0 mb-4 p-4 ${isSuccess ? 'bg-green-50 border-green-500' : 'bg-orange-50 border-orange-500'} border-l-4 rounded-xl shadow-sm">
            <div class="flex justify-between items-center flex-wrap gap-2">
                <h3 class="font-bold text-lg ${isSuccess ? 'text-green-800' : 'text-orange-800'}">
                    ${isSuccess ? '✅ Ідеальний розклад!' : `⚠️ Не розміщено: ${errors.length} уроків`}
                </h3>
                <span class="text-xs text-gray-500 bg-white px-2 py-1 rounded-lg border">
                    Спроб: ${attempts} | Час: ${time}с
                </span>
            </div>
            ${errors.length > 0 ? `
                <div class="mt-3">
                    <p class="text-xs font-bold text-orange-700 mb-1 uppercase tracking-wide">Не вдалось розмістити:</p>
                    <ul class="list-disc list-inside text-xs text-orange-700 columns-2 gap-4">
                        ${errors.map(e => `<li>${e}</li>`).join('')}
                    </ul>
                    <p class="mt-2 text-[10px] text-gray-500 italic">
                        💡 Спробуйте: збільшити тривалість генерації, перевірити заборони вчителів, або розмістити ці уроки вручну в 0-й чи 8-й слот.
                    </p>
                </div>
            ` : ''}
        </div>
    `);
}

// =============================================================================
// РУЧНЕ РЕДАГУВАННЯ РОЗКЛАДУ
// =============================================================================

function updateManualLesson(teacherId, day, slot, element) {
    const text  = element.innerText.trim();
    const tId   = String(teacherId);

    // Видаляємо старий запис
    state.schedule = state.schedule.filter(s =>
        !(String(s.teacherId) === tId && s.day == day && s.slot == slot)
    );

    if (text) {
        const parts     = text.split(' ');
        const className = parts[0];
        const subjName  = parts.slice(1).join(' ') || 'урок';

        let cls = state.classes.find(c => c.name.toLowerCase() === className.toLowerCase());
        if (!cls) {
            cls = { id: 'c_man_' + Date.now(), name: className };
            state.classes.push(cls);
        }

        state.schedule.push({
            id: 'sch_m_' + Date.now() + Math.random(),
            teacherId: tId,
            day: parseInt(day),
            slot: parseInt(slot),
            classId: String(cls.id),
            subject: subjName,
            isManual: true,
            altType: 'none',
            isAlternating: false
        });
    }
    saveData();
}

// =============================================================================
// РЕНДЕРИНГ
// =============================================================================

function renderAll() {
    renderTeachers();
    renderClasses();
    renderWorkload();
    renderSchedule();
}

function renderTeachers() {
    const container = document.getElementById('list-teachers');
    if (!container) return;
    if (state.teachers.length === 0) {
        container.innerHTML = `<div class="col-span-4 p-10 text-center text-gray-400 bg-white rounded-xl border-2 border-dashed border-gray-200">Вчителів ще немає. Додайте першого!</div>`;
        return;
    }
    container.innerHTML = state.teachers.map(t => `
        <div class="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center border-l-4 border-blue-500">
            <span onclick="openAvailability('${t.id}')" class="font-medium text-slate-700 cursor-pointer hover:text-blue-600 transition underline decoration-dotted">
                ${t.name}
            </span>
            <button onclick="deleteTeacher('${t.id}')" class="text-red-400 hover:text-red-600 text-sm font-bold">Видалити</button>
        </div>
    `).join('');
}

function renderClasses() {
    const container = document.getElementById('list-classes');
    if (!container) return;
    if (state.classes.length === 0) {
        container.innerHTML = `<div class="p-10 text-center text-gray-400 bg-white rounded-xl border-2 border-dashed border-gray-200 w-full">Класів ще немає. Додайте перший!</div>`;
        return;
    }
    container.innerHTML = state.classes.map(c => `
        <div class="bg-white px-4 py-2 rounded-xl shadow-sm flex items-center gap-4 border border-gray-200">
            <span class="font-bold text-slate-700">${c.name}</span>
            <button onclick="deleteClass('${c.id}')" class="text-gray-400 hover:text-red-500 text-sm">✕</button>
        </div>
    `).join('');
}

function renderWorkload() {
    const container = document.getElementById('workload-container');
    if (!container) return;

    if (!state.teachers || state.teachers.length === 0 || !state.classes || state.classes.length === 0) {
        container.innerHTML = `<div class="p-10 text-center bg-white rounded-xl border-2 border-dashed border-gray-200">
            <p class="text-gray-400 font-medium">Спочатку додайте вчителів та класи.</p>
        </div>`;
        return;
    }

    let html = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">`;

    state.teachers.forEach(teacher => {
        const teacherWorkload = (state.workload || []).filter(w => String(w.teacherId) === String(teacher.id));
        teacherWorkload.sort((a, b) => {
            const ca = state.classes.find(c => c.id == a.classId)?.name || "";
            const cb = state.classes.find(c => c.id == b.classId)?.name || "";
            const cc = ca.localeCompare(cb, undefined, { numeric: true });
            return cc !== 0 ? cc : a.subject.localeCompare(b.subject);
        });
        const totalHours = teacherWorkload.reduce((s, w) => s + (parseFloat(w.hours) || 0), 0);

        // Визначаємо колір для splitType
        const splitBadge = (w) => {
            if (w.splitType === 'alternating') return `<span class="ml-1 text-purple-600 text-[9px] font-bold">↔W</span>`;
            if (w.splitType === 'semester') return `<span class="ml-1 text-blue-500 text-[9px] font-bold">↔S(${w.semesterPriority === 'first' ? 'I' : 'II'})</span>`;
            return '';
        };

        html += `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                <div class="p-4 bg-slate-50 border-b border-gray-100 flex justify-between items-center">
                    <h3 class="font-bold text-slate-800 truncate pr-2 text-sm">${teacher.name}</h3>
                    <span class="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap">${totalHours.toFixed(1)} год</span>
                </div>
                <div class="p-3 space-y-1.5 overflow-y-auto flex-1" style="max-height:220px; min-height:50px;">
                    ${teacherWorkload.length > 0 ? teacherWorkload.map(w => {
                        const cls = state.classes.find(c => String(c.id) === String(w.classId));
                        return `
                            <div class="flex items-center justify-between p-1.5 bg-gray-50 rounded-lg border border-gray-100 text-xs">
                                <div class="truncate">
                                    <span class="font-bold text-blue-600">${cls ? cls.name : '?'}</span>
                                    <span class="text-gray-500 ml-1">${w.subject}</span>
                                    ${splitBadge(w)}
                                </div>
                                <div class="flex items-center gap-2 ml-2 shrink-0">
                                    <span class="font-bold text-slate-700">${w.hours}г</span>
                                    <button onclick="deleteWorkload('${w.id}')" class="text-gray-300 hover:text-red-500 text-lg font-light leading-none">&times;</button>
                                </div>
                            </div>`;
                    }).join('') : '<p class="text-center text-gray-300 text-xs py-4 italic">Навантаження не додано</p>'}
                </div>
                <div class="p-3 bg-gray-50 border-t border-gray-100 space-y-2">
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1">Клас</label>
                            <select id="sel-cls-${teacher.id}" class="w-full text-xs border rounded-lg p-1.5 bg-white outline-none focus:border-blue-500">
                                ${state.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1">Години</label>
                            <input type="number" id="hrs-${teacher.id}" value="2" min="0.5" max="20" step="0.5"
                                class="w-full text-xs border rounded-lg p-1.5 bg-white outline-none focus:border-blue-500">
                        </div>
                    </div>
                    <div>
                        <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1">Назва предмета</label>
                        <input type="text" id="sub-${teacher.id}" 
                            class="w-full text-xs border rounded-lg p-1.5 bg-white outline-none focus:border-blue-500" 
                            placeholder="напр. Математика"
                            onkeydown="if(event.key==='Enter') addWorkloadInline('${teacher.id}')">
                    </div>
                    <button onclick="addWorkloadInline('${teacher.id}')"
                        class="w-full py-2 bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-100 active:scale-[0.98]">
                        + Додати навантаження
                    </button>
                </div>
            </div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}

// =============================================================================
// РЕНДЕРИНГ РОЗКЛАДУ
// =============================================================================

function renderSchedule() {
    const container = document.getElementById('schedule-output');
    if (!container) return;

    const currentSchedule = state.schedule || [];

    const formatName = (fullName) => {
        if (!fullName) return "";
        const parts = fullName.trim().split(/\s+/);
        return parts[0] + (parts[1] ? ` ${parts[1][0]}.` : '') + (parts[2] ? `${parts[2][0]}.` : '');
    };

    const formatNameForTable = (fullName) => {
        if (!fullName) return "";
        const parts = fullName.trim().split(/\s+/);
        const last = parts[0] || '';
        const fi   = parts[1] ? ` ${parts[1][0]}.` : '';
        const mi   = parts[2] ? `${parts[2][0]}.` : '';
        return `${last}<span class="initials">${fi}${mi}</span>`;
    };

    const daysNames = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця"];

    // Видаляємо звіт, якщо є — він буде доданий знову після renderSchedule()
    const existingReport = document.getElementById('gen-report');

    let html = `<div class="overflow-x-auto bg-white rounded-xl shadow-md border border-gray-200">
        <table class="w-full border-collapse text-[10px]">
            <thead>
                <tr class="bg-slate-100 text-slate-700 uppercase">
                    <th class="w-12 border-b border-r p-2 text-[9px]">День</th>
                    <th class="w-8 border-b border-r p-2 text-[9px]">№</th>
                    ${state.teachers.map(t => `
                        <th class="border-b border-r vertical-th bg-slate-50 text-slate-700 font-bold">
                            ${formatNameForTable(t.name)}
                        </th>`).join('')}
                </tr>
            </thead>
            <tbody>`;

    daysNames.forEach((dayName, dayIdx) => {
        for (let slotIdx = 0; slotIdx <= 8; slotIdx++) {
            const isReserve = slotIdx === 0 || slotIdx === 8;
            html += `<tr class="${slotIdx === 8 ? 'border-b-2 border-b-slate-300' : 'border-b border-gray-100'} hover:bg-blue-50/30 ${isReserve ? 'bg-orange-50/40' : ''}">`;

            if (slotIdx === 0) {
                html += `<td rowspan="9" class="bg-slate-50 border-r text-center font-bold text-slate-500 uppercase [writing-mode:vertical-lr] rotate-180 p-2 text-[9px]">${dayName}</td>`;
            }

            html += `<td class="text-center border-r p-1 ${isReserve ? 'text-orange-500 font-bold bg-orange-50' : 'text-gray-400'} text-[9px]">${slotIdx}</td>`;

            state.teachers.forEach(teacher => {
                const teacherLessons = currentSchedule.filter(s =>
                    s.day == dayIdx && s.slot == slotIdx && String(s.teacherId) === String(teacher.id)
                );

                let cellContent = '';

                if (teacherLessons.length > 0) {
                    const cls = state.classes.find(c => String(c.id) === String(teacherLessons[0].classId));
                    const isInternalAlt = teacherLessons.length > 1 || teacherLessons[0].altType === 'internal';
                    const isExternalAlt = teacherLessons[0].altType === 'external';

                    let markerClass = '';
                    if (isInternalAlt) markerClass = 'marker-internal';
                    else if (isExternalAlt) markerClass = 'marker-external';

                    const altMarker = (isInternalAlt || isExternalAlt)
                        ? `<span class="alt-circle ${markerClass}">●</span>` : '';

                    const subjectsText = teacherLessons.map(l => getSubjectCode(l.subject)).join('/');
                    const fullSubjects = teacherLessons.map(l => l.subject).join(' / ');

                    cellContent = `
                        <div class="w-full h-full flex flex-col justify-center items-center bg-blue-50 py-1 relative" title="${fullSubjects}">
                            <span class="block text-blue-900 font-bold leading-none text-[11px]">
                                ${cls?.name || '?'}${altMarker}
                            </span>
                            <span class="text-blue-700 text-[8px] truncate max-w-[45px] mt-0.5">
                                ${subjectsText}
                            </span>
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

    // Повертаємо звіт, якщо він був
    if (existingReport) {
        container.insertAdjacentElement('afterbegin', existingReport);
    }
}

// =============================================================================
// ДРУК
// =============================================================================

function printSchedule() {
    if (!state.schedule || state.schedule.length === 0) {
        alert("Розклад порожній!");
        return;
    }

    const printWindow = window.open('', '_blank');
    const daysNames   = ["ПОНЕДІЛОК", "ВІВТОРОК", "СЕРЕДА", "ЧЕТВЕР", "П'ЯТНИЦЯ"];
    const dateStr     = new Date().toLocaleDateString('uk-UA');

    const totalWidth  = 199;
    const sideWidth   = 20;
    const colWidth    = ((totalWidth - sideWidth) / state.teachers.length).toFixed(2);

    const fmtName = (n) => {
        if (!n) return "";
        const p = n.trim().split(/\s+/);
        return p[0] + (p[1] ? ` ${p[1][0]}.` : '') + (p[2] ? `${p[2][0]}.` : '');
    };

    let html = `<!DOCTYPE html><html><head>
        <meta charset="UTF-8">
        <style>
            @page { size: A4 portrait; margin: 5mm; }
            body { margin:0; padding:0; font-family:"Arial Narrow",Arial,sans-serif; -webkit-print-color-adjust:exact; }
            .page-wrapper { width:200mm; margin:0 auto; }
            table { width:${totalWidth}mm; border-collapse:collapse; table-layout:fixed; border:0.5mm solid black; margin-left:0.5mm; }
            th, td { border:0.1mm solid black; text-align:center; padding:0; height:4.5mm; overflow:hidden; font-size:8pt; box-sizing:border-box; }
            thead th { border-bottom:0.7mm solid black !important; }
            .day-boundary td { border-top:0.7mm solid black !important; }
            .col-day { width:12mm; font-weight:bold; font-size:7pt; }
            .col-num { width:8mm; background-color:#f0f0f0 !important; font-weight:bold; }
            .col-teacher { width:${colWidth}mm; }
            .day-text { writing-mode:vertical-lr; transform:rotate(180deg); white-space:nowrap; }
            .teacher-name-cell { height:25mm; writing-mode:vertical-lr; transform:rotate(180deg); font-weight:bold; font-size:8.5pt; text-align:left; padding:1mm 0; }
            .lesson-box { line-height:1.1; display:flex; flex-direction:column; justify-content:center; height:100%; }
            .class-name { font-weight:bold; font-size:8.5pt; display:block; }
            .subject-code { font-size:6pt; display:block; }
            .slot-0 { background-color:#fff9e6 !important; }
            .slot-8 { background-color:#fff9e6 !important; }
            h2 { text-align:center; font-size:11pt; margin:1mm 0; }
        </style>
    </head><body>
    <div class="page-wrapper">
        <h2>ЗВЕДЕНИЙ РОЗКЛАД (${dateStr})</h2>
        <table>
            <thead>
                <tr>
                    <th class="col-day">ДН</th>
                    <th class="col-num">№</th>
                    ${state.teachers.map(t => `<th class="col-teacher teacher-name-cell">${fmtName(t.name)}</th>`).join('')}
                </tr>
            </thead>
            <tbody>`;

    daysNames.forEach((dayName, dayIdx) => {
        const dayLessons = state.schedule.filter(s => s.day === dayIdx);
        const slots  = dayLessons.map(s => s.slot);
        const minSlt = Math.min(...slots, 1);
        const maxSlt = Math.max(...slots, 7);
        const rows   = maxSlt - minSlt + 1;

        for (let slotIdx = minSlt; slotIdx <= maxSlt; slotIdx++) {
            const isFirst    = slotIdx === minSlt;
            const isBoundary = isFirst && dayIdx > 0;
            const slotCls    = (slotIdx === 0 || slotIdx === 8) ? 'slot-0' : '';

            html += `<tr class="${isBoundary ? 'day-boundary' : ''}">`;
            if (isFirst) html += `<td rowspan="${rows}" class="col-day"><span class="day-text">${dayName}</span></td>`;
            html += `<td class="col-num ${slotCls}">${slotIdx}</td>`;

            state.teachers.forEach(teacher => {
                const lesson = state.schedule.find(s =>
                    s.day === dayIdx && s.slot === slotIdx && String(s.teacherId) === String(teacher.id)
                );
                if (lesson) {
                    const clsName = state.classes.find(c => String(c.id) === String(lesson.classId))?.name || '';
                    const code    = getSubjectCode(lesson.subject);
                    const altMark = lesson.isAlternating ? ' ○' : '';
                    html += `<td class="${slotCls}">
                        <div class="lesson-box">
                            <span class="class-name">${clsName}${altMark}</span>
                            <span class="subject-code">${code}</span>
                        </div>
                    </td>`;
                } else {
                    html += `<td class="${slotCls}"></td>`;
                }
            });
            html += `</tr>`;
        }
    });

    html += `</tbody></table></div>
    <script>window.onload=function(){setTimeout(()=>{window.print();window.close();},500);};<\/script>
    </body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
}

// =============================================================================
// ДОПОМІЖНІ
// =============================================================================

function getSubjectCode(subject) {
    if (!subject) return "";
    const words = subject.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return subject.substring(0, 2).toUpperCase();
}

// Запуск при завантаженні сторінки
window.onload = init;
