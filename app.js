const subjectPriorities = {
    // 1 - НАЙВИЩА СКЛАДНІСТЬ (Точні науки та мови)
    // Ці предмети КАТЕГОРИЧНО не можуть бути спарені (2 в день)
    'алгебр': 1, 'геометр': 1, 'матем': 1, 
    'фізик': 1, 'хімі': 1,
    'англійськ': 1, 'нім': 1, 'іноземн': 1, 
    'укр. мов': 1, 'мов': 1,

    // 2 - СЕРЕДНЯ СКЛАДНІСТЬ (Гуманітарні та природничі науки)
    'літ': 2, 'історі': 2, 'біолог': 2, 'географ': 2, 
    'право': 2, 'громад': 2, 'етик': 2, 'захист': 2, 
    'природ': 2, 'інформ': 2, 'stem': 2, 'стеm': 2,

    // 3 - НИЖЧА СКЛАДНІСТЬ (Мистецтво, спорт, праця)
    'фізкульт': 3, 'фізичн': 3,
    'технолог': 3, 'трудов': 3, 
    'мистец': 3, 'музик': 3, 'малюв': 3, 
    'добробут': 3, 'основ': 3, 'фінанс': 3
};

// Предмети, що потребують спеціалізованого кабінету
// Два різні класи не можуть мати ці предмети одночасно
const ROOM_CONFLICT_SUBJECTS = ['інформ', 'фізкульт', 'фізичн', 'хімі'];
// Фізика — окремо, бо слово "фізичн" вже покриває фізкультуру
// Перевірка робиться через першу значущу частину назви

function needsSpecialRoom(subject) {
    if (!subject) return false;
    const name = subject.toLowerCase();
    return ROOM_CONFLICT_SUBJECTS.some(k => name.includes(k));
}

// Допоміжна: отримати "тип" кабінету (щоб не плутати фізику з фізкультурою)
function getRoomType(subject) {
    if (!subject) return null;
    const name = subject.toLowerCase();
    if (name.includes('інформ')) return 'computer';
    if (name.includes('фізкульт') || name.includes('фізичн')) return 'gym';
    if (name.includes('хімі')) return 'chemistry';
    if (name.includes('фізик') && !name.includes('фізкульт') && !name.includes('фізичн')) return 'physics';
    return null;
}

// Поточний стан додатку
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

// --- Ініціалізація та збереження ---

function init() {
    try {
        const saved = localStorage.getItem('school_schedule_data');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') {
                state = { ...state, ...parsed };
                if (!state.schedule) state.schedule = [];
                console.log("Дані успішно завантажено");
            }
        }
    } catch (e) {
        console.error("Помилка при читанні з localStorage:", e);
    }
    renderAll();
}

function saveData() {
    localStorage.setItem('school_schedule_data', JSON.stringify(state));
    console.log("Дані збережено!");
}

// Псевдонім для сумісності (в коді є і save() і saveData())
function save() { saveData(); }

// --- Навігація ---

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

// --- Керування вчителями ---

function addTeacher() {
    const nameInput = document.getElementById('teacher-name');
    const name = nameInput.value.trim();
    if (!name) return;
    const newTeacher = {
        id: 't_' + Date.now(),
        name: name,
        availability: Array(5).fill().map(() => Array(state.config.maxLessons).fill(true)),
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

// --- Керування класами ---

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

// --- Модуль Доступності ---

let currentEditingTeacherId = null;

function openAvailability(id) {
    currentEditingTeacherId = id;
    const teacher = state.teachers.find(t => t.id === id);
    if (!teacher) return;
    if (!teacher.availability) {
        teacher.availability = Array(5).fill().map(() => Array(9).fill(true));
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
        <thead><tr><th class="p-1"></th>`;
    days.forEach(d => html += `<th class="border p-2 bg-gray-100 font-bold">${d}</th>`);
    html += `</tr></thead><tbody>`;

    for (let l = 0; l <= 7; l++) {
        html += `<tr><td class="border p-2 font-bold bg-gray-50 text-center">${l}</td>`;
        for (let d = 0; d < 5; d++) {
            const status = (teacher.availability && teacher.availability[d]) ? teacher.availability[d][l] : 0;
            let colorClass = 'bg-green-100 text-green-700';
            let statusText = 'Вільний';
            if (status === 1) {
                colorClass = 'bg-yellow-100 text-yellow-700';
                statusText = 'Бажано вікно';
            } else if (status === 2) {
                colorClass = 'bg-red-100 text-red-700';
                statusText = 'НЕ МОЖНА';
            }
            html += `
                <td onclick="toggleAvailability(${d}, ${l})" 
                    class="border p-2 cursor-pointer text-[10px] text-center font-medium transition ${colorClass} hover:brightness-95 select-none">
                    ${statusText}
                </td>`;
        }
        html += `</tr>`;
    }
    html += `</tbody></table>`;
    container.innerHTML = html;
}

function toggleAvailability(dayIndex, lessonIndex) {
    const teacher = state.teachers.find(t => t.id === currentEditingTeacherId);
    if (teacher) {
        if (!teacher.availability[dayIndex]) teacher.availability[dayIndex] = [];
        let currentStatus = teacher.availability[dayIndex][lessonIndex] || 0;
        teacher.availability[dayIndex][lessonIndex] = (currentStatus + 1) % 3;
        renderAvailabilityGrid(teacher);
    }
}

// =============================================================
// --- ГЕНЕРАТОР РОЗКЛАДУ (оновлено) ---
// =============================================================

// 1. Головна функція керування спробами
function generateSchedule() {
    const startTime = Date.now();
    const maxDuration = 25000; // 25 секунд
    const maxAttempts = 500;

    let bestAttempt = {
        schedule: [],
        unplacedCount: Infinity,
        unplacedList: [],
        unpairedAlternating: []
    };

    let attempt = 0;
    console.log("🚀 Генерація розпочата...");

    while (attempt < maxAttempts && (Date.now() - startTime) < maxDuration) {
        attempt++;
        const result = runSingleGeneration();

        if (result.unplaced.length < bestAttempt.unplacedCount) {
            bestAttempt = {
                schedule: JSON.parse(JSON.stringify(result.schedule)),
                unplacedCount: result.unplaced.length,
                unplacedList: result.unplaced,
                unpairedAlternating: result.unpairedAlternating
            };
            if (bestAttempt.unplacedCount === 0) break;
        }
    }

    state.schedule = bestAttempt.schedule;
    saveData();
    renderSchedule();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    showGenerationReport(bestAttempt.unplacedList, bestAttempt.unpairedAlternating, attempt, duration);
}

// 2. Логіка однієї конкретної спроби
function runSingleGeneration() {
    // Зберігаємо лише вручну виставлені уроки (0-й та 8-й слоти або позначені як ручні)
    let tempSchedule = state.schedule.filter(s => s.slot === 0 || s.slot === 8 || s.isManual);
    let unplaced = [];
    let unpairedAlternating = []; // Предмети з 0.5 год, яким не знайшлась пара

    // --- ПІДГОТОВКА НАВАНТАЖЕННЯ ---
    const flatWorkload = [];
    state.workload.forEach(item => {
        let h = parseFloat(item.hours);
        while (h >= 1) {
            flatWorkload.push({ ...item, currentHours: 1, used: false });
            h -= 1;
        }
        if (Math.abs(h - 0.5) < 0.01) {
            flatWorkload.push({ ...item, currentHours: 0.5, used: false });
        }
    });

    const tasks = [];
    const classesIds = [...new Set(state.classes.map(c => c.id))];

    // --- СПАРОВУВАННЯ ЧЕРГУВАНЬ ---
    // Для кожного класу знаходимо 0.5-годинні предмети і спаровуємо їх
    classesIds.forEach(cId => {
        // КРОК 1: Спочатку спаровуємо предмети ОДНОГО вчителя в цьому класі
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
                    type: 'paired_internal', // Фіолетовий маркер
                    items: [i1, i2],
                    priority: Math.min(getPriority(i1.subject), getPriority(i2.subject)),
                    classId: cId
                });
            }
        });

        // КРОК 2: Залишки — спаровуємо між РІЗНИМИ вчителями (синій маркер)
        let remainingAlts = flatWorkload.filter(w =>
            w.classId === cId && w.currentHours === 0.5 &&
            w.splitType === 'alternating' && !w.used
        );
        while (remainingAlts.length >= 2) {
            const i1 = remainingAlts.shift();
            // Шукаємо пару від іншого вчителя
            const i2 = remainingAlts.find(w => w.teacherId !== i1.teacherId);
            if (!i2) {
                // Єдиний залишок від одного вчителя — нема пари
                // Залишаємо його, він виявиться непарним нижче
                break;
            }
            remainingAlts.splice(remainingAlts.indexOf(i2), 1);
            i1.used = true; i2.used = true;
            tasks.push({
                type: 'paired_external', // Синій маркер
                items: [i1, i2],
                priority: Math.min(getPriority(i1.subject), getPriority(i2.subject)),
                classId: cId
            });
        }

        // КРОК 3: Усі хто залишився непарними — фіксуємо як попередження
        const unpaired = flatWorkload.filter(w =>
            w.classId === cId && w.currentHours === 0.5 &&
            w.splitType === 'alternating' && !w.used
        );
        unpaired.forEach(item => {
            item.used = true;
            const tObj = state.teachers.find(t => t.id === item.teacherId);
            const clsObj = state.classes.find(c => c.id === item.classId);
            unpairedAlternating.push({
                subject: item.subject,
                teacher: tObj ? tObj.name : '?',
                className: clsObj ? clsObj.name : '?'
            });
            // Все одно додаємо як одиночну задачу, щоб урок не пропав
            tasks.push({
                type: 'single',
                items: [item],
                priority: getPriority(item.subject),
                classId: item.classId
            });
        });
    });

    // --- ОДИНОЧНІ ЗАДАЧІ ---
    flatWorkload.filter(w => !w.used).forEach(item => {
        item.used = true;
        tasks.push({
            type: 'single',
            items: [item],
            priority: getPriority(item.subject),
            classId: item.classId
        });
    });

    // --- СОРТУВАННЯ ЗАДАЧ ---
    // Найважливіші предмети йдуть першими.
    // Серед рівних — мінімальний рандом (не ламає логіку, але дає різноманіття між спробами)
    tasks.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return (Math.random() - 0.5) * 0.2; // Дуже маленький рандом
    });

    // --- ЛІЧИЛЬНИК БАЛАНСУВАННЯ ---
    // Скільки уроків у кожного вчителя в кожний день (для рівномірного розподілу)
    const teacherDayCount = {};
    state.teachers.forEach(t => { teacherDayCount[t.id] = [0, 0, 0, 0, 0]; });
    // Ініціалізуємо з ручних уроків
    tempSchedule.forEach(s => {
        if (teacherDayCount[s.teacherId] && s.slot >= 1 && s.slot <= 7) {
            teacherDayCount[s.teacherId][s.day]++;
        }
    });

    // --- ГОЛОВНИЙ ЦИКЛ РОЗСТАНОВКИ ---
    tasks.forEach(task => {
        const firstItem = task.items[0];
        const priority = task.priority;
        let bestSlot = null;
        let minPen = Infinity;

        // Перемішуємо дні — кожна спроба дає інший порядок
        const days = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);

        for (let d of days) {
            for (let s = 1; s <= 7; s++) {

                // =============================================
                // ЖОРСТКІ ЗАБОРОНИ (continue = цей слот недоступний)
                // =============================================

                // 1. Клас вже зайнятий у цей слот будь-яким предметом
                if (tempSchedule.some(ls => ls.day === d && ls.slot === s && ls.classId === firstItem.classId)) continue;

                // 2. Будь-який вчитель задачі вже зайнятий у цей слот
                const isTBusy = task.items.some(it =>
                    tempSchedule.some(ls => ls.day === d && ls.slot === s && ls.teacherId === it.teacherId)
                );
                if (isTBusy) continue;

                // 3. Червона зона у будь-якого вчителя задачі
                const isRed = task.items.some(it => getTeacherStatus(it.teacherId, d, s) === 2);
                if (isRed) continue;

                // 4. Для пріоритету 1 — строга заборона на другий урок цього предмета в той самий день
                if (priority === 1) {
                    const alreadyToday = tempSchedule.some(ls =>
                        ls.day === d && ls.classId === firstItem.classId &&
                        ls.subject === firstItem.subject
                    );
                    if (alreadyToday) continue;
                }

                // 5. Конфлікт спеціалізованого кабінету
                // Якщо в цей слот вже є урок у СПЕЦІАЛЬНОМУ кабінеті того ж типу — заборона
                const myRoomType = getRoomType(firstItem.subject);
                if (myRoomType) {
                    const roomBusy = tempSchedule.some(ls =>
                        ls.day === d && ls.slot === s && ls.classId !== firstItem.classId &&
                        getRoomType(ls.subject) === myRoomType
                    );
                    if (roomBusy) continue;
                }

                // =============================================
                // ШТРАФИ (чим менше — тим кращий слот)
                // =============================================
                let pen = 0;

                // Жовта зона (бажано вікно у вчителя)
                const maxStatus = task.items.reduce((max, it) =>
                    Math.max(max, getTeacherStatus(it.teacherId, d, s)), 0
                );
                if (maxStatus === 1) pen += 1500;

                // Штраф за пізні уроки (залежить від пріоритету предмета)
                if (priority <= 2) {
                    // Складні й середні предмети — краще вранці
                    if (s === 6) pen += 100;
                    if (s === 7) pen += 400;
                } else {
                    // Легкі предмети (фізкультура, музика тощо) — навпаки, краще ввечері
                    // Це звільняє ранкові слоти для важливих предметів
                    if (s >= 6) pen -= 200;
                }

                // Штраф за дублювання предмета в один день (для пріоритету 2-3)
                const countToday = tempSchedule.filter(ls =>
                    ls.day === d && ls.classId === firstItem.classId &&
                    ls.subject === firstItem.subject
                ).length;

                if (countToday > 0) {
                    // Якщо пара йде підряд — терпимо (пари типу фізкультура×2)
                    const isAdj = tempSchedule.some(ls =>
                        ls.day === d && ls.classId === firstItem.classId &&
                        ls.subject === firstItem.subject && Math.abs(ls.slot - s) === 1
                    );
                    pen += isAdj ? 500 : 8000; // З розривом — дуже погано
                }

                // МАГНІТ ВЧИТЕЛЯ — заохочуємо щільне пакування уроків,
                // але М'ЯКО: великі відстані не блокують, просто дають штраф
                const teacherLessonsToday = tempSchedule.filter(ls =>
                    ls.day === d && ls.teacherId === firstItem.teacherId &&
                    ls.slot >= 1 && ls.slot <= 7
                );

                if (teacherLessonsToday.length > 0) {
                    const dists = teacherLessonsToday.map(ls => Math.abs(ls.slot - s));
                    const minDist = Math.min(...dists);
                    if (minDist === 1) pen -= 300;       // Сусідній урок — бонус
                    else if (minDist === 2) pen += 200;  // Вікно 1 урок — терпимо
                    else pen += minDist * 400;            // Більше вікон — гірше, але НЕ заблоковано
                } else {
                    // Перший урок вчителя в цей день — тягнемо до ранку
                    pen += (s - 1) * 250;
                }

                // Балансування: якщо вчитель вже дуже завантажений у цей день
                const teacherCountToday = (teacherDayCount[firstItem.teacherId] || [0,0,0,0,0])[d];
                if (teacherCountToday >= 6) pen += 2500; // Перевантаження
                else if (teacherCountToday >= 5) pen += 600;

                // Мікро-рандом (дуже малий, лише щоб уникнути повних дублікатів між спробами)
                pen += Math.random() * 10;

                if (pen < minPen) {
                    minPen = pen;
                    bestSlot = { d, s };
                }
            }
        }

        // Розміщуємо урок у найкращий знайдений слот
        if (bestSlot) {
            task.items.forEach(it => {
                tempSchedule.push({
                    id: 'sch_' + Date.now() + Math.random(),
                    teacherId: it.teacherId,
                    classId: it.classId,
                    subject: it.subject,
                    day: bestSlot.d,
                    slot: bestSlot.s,
                    isAlternating: (it.currentHours === 0.5 && it.splitType === 'alternating')
                });
            });
            // Оновлюємо лічильники балансування
            task.items.forEach(it => {
                if (teacherDayCount[it.teacherId]) {
                    teacherDayCount[it.teacherId][bestSlot.d]++;
                }
            });
        } else {
            // Не знайшли жодного слота — урок іде в список незрозміщених
            const tObj = state.teachers.find(t => t.id === firstItem.teacherId);
            const clsObj = state.classes.find(c => c.id === firstItem.classId);
            unplaced.push(`${firstItem.subject} (${tObj ? tObj.name : '?'}) — ${clsObj ? clsObj.name : '?'} кл`);
        }
    });

    return { schedule: tempSchedule, unplaced, unpairedAlternating };
}

// 3. Допоміжна: статус доступності вчителя
function getTeacherStatus(teacherId, day, slot) {
    const teacher = state.teachers.find(t => t.id === teacherId);
    if (!teacher || !teacher.availability || !teacher.availability[day]) return 0;
    return teacher.availability[day][slot] || 0;
}

// 4. Звіт після генерації (оновлено: показує і незрозміщені, і непарні чергування)
function showGenerationReport(errors, unpairedAlternating, attempts, time) {
    const output = document.getElementById('schedule-output');
    const existingReport = document.getElementById('gen-report');
    if (existingReport) existingReport.remove();

    const isSuccess = errors.length === 0;
    const hasUnpaired = unpairedAlternating && unpairedAlternating.length > 0;

    let reportHtml = `
        <div id="gen-report" class="mt-4 space-y-3">
    `;

    // Блок успіху/помилок розміщення
    reportHtml += `
        <div class="p-4 ${isSuccess ? 'bg-green-50 border-green-500' : 'bg-orange-50 border-orange-500'} border-l-4 rounded shadow-sm">
            <div class="flex justify-between items-center">
                <h3 class="font-bold ${isSuccess ? 'text-green-800' : 'text-orange-800'}">
                    ${isSuccess ? '✅ Ідеальний розклад!' : `⚠️ Майже готово — не вмістилось: ${errors.length} уроків`}
                </h3>
                <span class="text-[10px] text-gray-500">Спроб: ${attempts} | Час: ${time}с</span>
            </div>
            ${errors.length > 0 ? `
                <ul class="list-disc list-inside text-[11px] mt-2 text-orange-700">
                    ${errors.map(e => `<li>${e}</li>`).join('')}
                </ul>
                <p class="mt-2 text-[10px] italic text-orange-600">
                    💡 Підказка: ці уроки можна вручну розмістити на 0-й або 8-й урок як резерв.
                </p>
            ` : ''}
        </div>
    `;

    // Блок попереджень про непарні чергування
    if (hasUnpaired) {
        reportHtml += `
        <div class="p-4 bg-purple-50 border-purple-400 border-l-4 rounded shadow-sm">
            <h3 class="font-bold text-purple-800 mb-1">
                🔔 Непарні чергування (${unpairedAlternating.length})
            </h3>
            <p class="text-[11px] text-purple-700 mb-2">
                Для цих предметів не знайшлась пара для чергування «Чисельник/Знаменник».
                Вони будуть поставлені як звичайний урок. Рекомендується вручну перевірити або
                поставити їх на <strong>0-й урок</strong>.
            </p>
            <ul class="list-disc list-inside text-[11px] text-purple-700 space-y-1">
                ${unpairedAlternating.map(u => `
                    <li>
                        <strong>${u.subject}</strong> — ${u.teacher} — ${u.className} кл
                    </li>
                `).join('')}
            </ul>
        </div>
        `;
    }

    reportHtml += `</div>`;
    output.insertAdjacentHTML('afterbegin', reportHtml);
}

function getPriority(subjectName) {
    if (!subjectName) return 100;
    const name = subjectName.toLowerCase();
    for (const [key, level] of Object.entries(subjectPriorities)) {
        if (name.includes(key)) return level;
    }
    return 10;
}

// --- renderAll та допоміжні ---

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
            <span onclick="openAvailability('${t.id}')" class="font-medium text-slate-700 cursor-pointer hover:text-blue-600 transition underline decoration-dotted">
                ${t.name}
            </span>
            <button onclick="deleteTeacher('${t.id}')" class="text-red-400 hover:text-red-600 text-sm font-bold">
                Видалити
            </button>
        </div>
    `).join('');
}

function renderClasses() {
    const container = document.getElementById('list-classes');
    if (!container) return;
    container.innerHTML = state.classes.map(c => `
        <div class="bg-white px-4 py-2 rounded shadow flex items-center gap-4 border border-gray-200">
            <span class="font-bold">${c.name}</span>
            <button onclick="deleteClass('${c.id}')" class="text-gray-400 hover:text-red-500 text-sm">✕</button>
        </div>
    `).join('');
}

// --- Модуль Навантаження ---

function renderWorkload() {
    const container = document.getElementById('workload-container');
    if (!container) return;

    if (!state.teachers || state.teachers.length === 0 || !state.classes || state.classes.length === 0) {
        container.innerHTML = `
            <div class="p-10 text-center bg-white rounded-xl border-2 border-dashed border-gray-200">
                <p class="text-gray-400 font-medium">Спочатку додайте вчителів та класи у відповідних вкладках.</p>
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
            const classComp = classA.localeCompare(classB, undefined, {numeric: true});
            return classComp !== 0 ? classComp : a.subject.localeCompare(b.subject);
        });

        const totalHours = teacherWorkload.reduce((sum, w) => sum + w.hours, 0);

        html += `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                <div class="p-4 bg-slate-50 border-b border-gray-100 flex justify-between items-center">
                    <h3 class="font-bold text-slate-800 truncate pr-2">${teacher.name}</h3>
                    <span class="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap">${totalHours} год</span>
                </div>
                
                <div class="p-4 space-y-2 overflow-y-auto" style="max-height: 200px; min-height: 60px;">
                    ${teacherWorkload.length > 0 ? teacherWorkload.map(w => {
                        const cls = state.classes.find(c => c.id == w.classId);
                        return `
                            <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100 text-sm">
                                <div class="truncate">
                                    <span class="font-bold text-blue-600">${cls ? cls.name : '?'}</span>
                                    <span class="text-gray-500 ml-1">${w.subject}</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="font-bold">${w.hours}г</span>
                                    <button onclick="deleteWorkload('${w.id}')" class="text-gray-300 hover:text-red-500 text-xl font-light">&times;</button>
                                </div>
                            </div>
                        `;
                    }).join('') : '<p class="text-center text-gray-300 text-xs py-4 italic">Навантаження не додано</p>'}
                </div>

                <div class="p-4 bg-gray-50 border-t border-gray-100 space-y-3">
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Клас</label>
                            <select id="sel-cls-${teacher.id}" class="w-full text-sm border rounded-lg p-2 bg-white outline-none focus:border-blue-500 shadow-sm transition-all">
                                ${state.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Години</label>
                            <input type="number" id="hrs-${teacher.id}" value="2" min="0.5" step="0.5" max="20" class="w-full text-sm border rounded-lg p-2 bg-white outline-none focus:border-blue-500 shadow-sm transition-all">
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Назва предмета</label>
                        <input type="text" id="sub-${teacher.id}" class="w-full text-sm border rounded-lg p-2 bg-white outline-none focus:border-blue-500 shadow-sm transition-all" placeholder="напр. Математика">
                    </div>
                    
                    <button onclick="addWorkloadInline('${teacher.id}')" class="w-full py-2.5 bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-100 active:scale-[0.98]">
                        Додати навантаження
                    </button>
                </div>
            </div>
        `;
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

    if (!subject || isNaN(hours)) {
        alert("Будь ласка, вкажіть назву предмета та кількість годин.");
        return;
    }

    let splitType = 'none';
    let semesterPriority = 'none';

    if (hours % 1 !== 0) {
        const isAlternating = confirm(`Години дробові (${hours}).\n\nОК — Чергування тижнів (Чисельник/Знаменник)\nСкасувати — Розподіл по семестрах`);
        if (isAlternating) {
            splitType = 'alternating';
        } else {
            splitType = 'semester';
            semesterPriority = confirm("Більше годин у ПЕРШОМУ семестрі?\n(ОК — Так, Скасувати — Ні, більше у другому)") ? 'first' : 'second';
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

function renderWorkloadItems(teacher) {
    if (!teacher.workload || teacher.workload.length === 0) {
        return `<p class="text-gray-400 text-[11px] italic text-center py-2">Навантаження не задано</p>`;
    }
    return teacher.workload.map((item, idx) => {
        const cls = state.classes.find(c => c.id === item.classId);
        return `
            <div class="flex justify-between items-center bg-white border border-slate-100 p-2 rounded-lg shadow-sm text-xs">
                <div class="flex flex-col">
                    <span class="font-bold text-blue-700">${cls ? cls.name : '???'}</span>
                    <span class="text-slate-500">${item.subject}</span>
                </div>
                <div class="flex items-center gap-3">
                    <span class="font-black text-slate-700">${item.hours}г</span>
                    <button onclick="removeWorkload('${teacher.id}', ${idx})" class="text-red-300 hover:text-red-600 transition">✕</button>
                </div>
            </div>
        `;
    }).join('');
}

function deleteWorkload(id) {
    if (!confirm('Видалити цей запис навантаження?')) return;
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
                const teacherLessons = currentSchedule.filter(s => s.day == dayIdx && s.slot == slotIdx && s.teacherId == teacher.id);

                let cellContent = '';

                if (teacherLessons.length > 0) {
                    const cls = state.classes.find(c => c.id == teacherLessons[0].classId);
                    const isInternalAlt = teacherLessons.length > 1;
                    const isExternalAlt = teacherLessons.length === 1 && teacherLessons[0].isAlternating;

                    let markerClass = '';
                    if (isInternalAlt) markerClass = 'marker-internal';
                    else if (isExternalAlt) markerClass = 'marker-external';

                    const altMarker = (isInternalAlt || isExternalAlt) ? `<span class="alt-circle ${markerClass}">○</span>` : '';
                    const subjectsText = teacherLessons.map(l => l.subject).join(' / ');

                    cellContent = `
                        <div class="w-full h-full flex flex-col justify-center items-center bg-blue-50 py-1 relative">
                            <span class="block text-blue-900 font-bold leading-none text-[11px]">
                                ${cls?.name || ''}${altMarker}
                            </span>
                            <span class="text-blue-700 text-[8px] truncate max-w-[45px] mt-0.5" title="${subjectsText}">
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
}

// --- ВІЗУАЛІЗАЦІЯ ТА ДРУК ---
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
                body { 
                    margin: 0; padding: 0; 
                    font-family: "Arial Narrow", Arial, sans-serif; 
                    -webkit-print-color-adjust: exact;
                }
                .page-wrapper { width: 200mm; margin: 0 auto; }
                table { 
                    width: ${totalWidth}mm; 
                    border-collapse: collapse; 
                    table-layout: fixed;
                    border: 0.5mm solid black;
                    margin-left: 0.5mm;
                }
                th, td { 
                    border: 0.1mm solid black; 
                    text-align: center; 
                    padding: 0;
                    height: 4.5mm; 
                    overflow: hidden;
                    font-size: 8pt;
                    box-sizing: border-box;
                }
                thead th { border-bottom: 0.7mm solid black !important; }
                .day-boundary td { border-top: 0.7mm solid black !important; }
                .col-day { width: 12mm; font-weight: bold; font-size: 7pt; }
                .col-num { width: 8mm; background-color: #f0f0f0 !important; font-weight: bold; }
                .col-teacher { width: ${colWidth}mm; }
                .day-text { writing-mode: vertical-lr; transform: rotate(180deg); white-space: nowrap; }
                .teacher-name-cell {
                    height: 25mm; 
                    writing-mode: vertical-lr;
                    transform: rotate(180deg);
                    font-weight: bold; font-size: 8.5pt;
                    text-align: left; padding: 1mm 0;
                }
                .lesson-box { 
                    line-height: 1.1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    height: 100%;
                }
                .class-name { font-weight: bold; font-size: 8.5pt; display: block; }
                .subject-code { font-size: 6pt; display: block; }
                .slot-0 { background-color: #fff9e6 !important; }
                h2 { text-align: center; font-size: 11pt; margin: 1mm 0; }
                .notes-area { margin-top: 4mm; padding-left: 2mm; font-weight: bold; font-size: 10pt; }
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
                    <tbody>
    `;

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
                    const rawCode = typeof getSubjectCode === 'function' ? getSubjectCode(lesson.subject) : lesson.subject;
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

    html += `</tbody></table>
            <div class="notes-area">Нотатки:</div>
        </div>
        <script>
            window.onload = function() {
                setTimeout(() => { window.print(); window.close(); }, 500);
            };
        </script>
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

// Запуск при завантаженні
window.onload = init;
