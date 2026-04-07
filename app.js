const subjectPriorities = {
    // 1 - ВИСОКА СКЛАДНІСТЬ
    'алгебр': 1, 'геометр': 1, 'матем': 1, 'фізик': 1, 'хімі': 1, 
    'іноземн': 1, 'англійськ': 1, 'нім': 1,

    // 2 - СЕРЕДНЯ СКЛАДНІСТЬ
    'укр': 2, 'мов': 2, 'літ': 2, 'історі': 2, 'біолог': 2, 'географ': 2, 
    'право': 2, 'громад': 2, 'етик': 2, 'захист': 2, 'природ': 2, 'інформ': 2,

    // 3 - НИЖЧА СКЛАДНІСТЬ
    'фінанс': 3, 'технолог': 3, 'трудов': 3, 'фізкульт': 3, 'мистец': 3, 
    'музик': 3, 'малюв': 3, 'основ': 3, 'добробут': 3, 'stem': 3, 'стеm': 3
};

// Поточний стан додатку
let state = {
    activeTab: 'teachers',
    teachers: [],
    classes: [],
    workload: [], // Додай порожній масив
    schedule: [], // Додай порожній масив
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
            // Мінімальна перевірка, що дані валідні
            if (parsed && typeof parsed === 'object') {
                state = parsed;
                console.log("Дані успішно завантажено");
            }
        }
    } catch (e) {
        console.error("Помилка при читанні з localStorage:", e);
        // Якщо дані биті, ми їх не перетираємо одразу, 
        // щоб ти міг спробувати витягнути їх через консоль
    }
    renderAll();
}

function save() {
    localStorage.setItem('school_schedule_data', JSON.stringify(state));
}

// --- Навігація ---

function showTab(tabName) {
    state.activeTab = tabName;
    
    // Ховаємо весь контент
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    // Показуємо потрібний
    const activeSection = document.getElementById(`tab-${tabName}`);
    if (activeSection) activeSection.classList.add('active');
    
    // Оновлюємо стилі кнопок
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.id === `btn-${tabName}`) btn.classList.add('active');
    });
    
    save();
    renderAll();
}

function exportData() {
    // Готуємо об'єкт із усіма даними
    const dataStr = JSON.stringify(state, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    // Створюємо тимчасову кнопку для скачування
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

                // Мінімальна перевірка, чи це наш файл
                if (importedState.teachers && importedState.classes) {
                    if (confirm('Ви впевнені? Поточні дані будуть замінені даними з файлу.')) {
                        state = importedState;
                        save();      // Зберігаємо в LocalStorage
                        renderAll(); // Оновлюємо інтерфейс
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
        workload: [] // { classId: string, hours: number }
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

    const newClass = {
        id: 'c_' + Date.now(),
        name: name
    };

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

// --- Модуль Доступності (Модальне вікно) ---

let currentEditingTeacherId = null;

function openAvailability(id) {
    currentEditingTeacherId = id;
    const teacher = state.teachers.find(t => t.id === id);
    if (!teacher) return;

    // Якщо раніше не було масиву доступності, створюємо його
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
    const lessons = state.config.maxLessons;

    let html = `<table class="w-full border-collapse text-sm">
        <thead><tr><th class="p-1"></th>`;
    days.forEach(d => html += `<th class="border p-2 bg-gray-100 font-bold">${d}</th>`);
    html += `</tr></thead><tbody>`;

    for (let l = 0; l < lessons; l++) {
        html += `<tr><td class="border p-2 font-bold bg-gray-50 text-center">${l + 1}</td>`;
        for (let d = 0; d < 5; d++) {
            const isAvailable = teacher.availability[d][l];
            const colorClass = isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
            const statusText = isAvailable ? 'Вільний' : 'Зайнятий';
            
            html += `
                <td onclick="toggleAvailability(${d}, ${l})" 
                    class="border p-2 cursor-pointer text-center font-medium transition ${colorClass} hover:brightness-95 select-none">
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
        teacher.availability[dayIndex][lessonIndex] = !teacher.availability[dayIndex][lessonIndex];
        renderAvailabilityGrid(teacher);
    }
}

// --- ГЕНЕРАТОР РОЗКЛАДУ ---

function generateSchedule() {
    const hasSemesterSplit = (state.workload || []).some(w => w.splitType === 'semester');

    if (hasSemesterSplit) {
        state.schedule_sem1 = runGenerationAlgorithm(1);
        state.schedule_sem2 = runGenerationAlgorithm(2);
        // За замовчуванням після генерації показуємо 1-й семестр
        state.schedule = state.schedule_sem1; 
        alert("Згенеровано два варіанти (посеместрово). Показано 1-й семестр.");
    } else {
        state.schedule = runGenerationAlgorithm(0);
    }

    save();
    renderAll(); // Важливо: спочатку зберегти, потім перемалювати
}

// Виносимо логіку генерації в окрему функцію, щоб викликати її двічі
function runGenerationAlgorithm(targetSemester) {
    let localSchedule = [];
    let items = (state.workload || []).map(item => {
        let actualHours = item.hours;
        
        // Коригуємо години для посеместрового режиму
        if (item.splitType === 'semester') {
            if (targetSemester === 1) {
                actualHours = (item.semesterPriority === 'first') ? Math.ceil(item.hours) : Math.floor(item.hours);
            } else if (targetSemester === 2) {
                actualHours = (item.semesterPriority === 'second') ? Math.ceil(item.hours) : Math.floor(item.hours);
            }
        } else {
            // Для чергування тижнів беремо Math.ceil (напр. 1.5 год -> 2 слоти, один з яких буде маркований Ч/З)
            actualHours = Math.ceil(item.hours);
        }
        
        return { ...item, actualHours };
    });

    items.sort((a, b) => getPriority(a.subject) - getPriority(b.subject));

    items.forEach(item => {
        for (let h = 0; h < item.actualHours; h++) {
            let bestSlot = null;
            let minConflict = Infinity;

            for (let d = 0; d < 5; d++) {
                // ВАЖЛИВО: s = 1; s <= 7. Нульовий та восьмий ігноруються алгоритмом.
                for (let s = 1; s <= 7; s++) { 
                    const teacher = state.teachers.find(t => t.id == item.teacherId);
                    
                    // 1. Перевірка доступності вчителя (червоні клітинки в модалці)
                    // Якщо вчитель "зайнятий" (false) — пропускаємо слот
                    if (teacher && teacher.availability && teacher.availability[d] && teacher.availability[d][s] === false) {
                        continue; 
                    }

                    // 2. Перевірка накладок (чи не зайнятий вчитель або клас у цей час саме в цьому семестрі)
                    const teacherBusy = localSchedule.some(sch => sch.day === d && sch.slot === s && sch.teacherId == item.teacherId);
                    const classBusy = localSchedule.some(sch => sch.day === d && sch.slot === s && sch.classId == item.classId);

                    if (teacherBusy || classBusy) continue;

                    // Оцінка слота: чим раніше урок (s), тим він пріоритетніший для заповнення
                    let score = s; 
                    if (score < minConflict) {
                        minConflict = score;
                        bestSlot = { d, s };
                    }
                }
            }

            if (bestSlot) {
                localSchedule.push({
                    id: 'sch_' + Date.now() + Math.random(),
                    teacherId: String(item.teacherId),
                    classId: String(item.classId),
                    subject: item.subject,
                    day: bestSlot.d,
                    slot: bestSlot.s,
                    // Тут твоя логіка з кружечком
                    isAlternating: (item.splitType === 'alternating' && h === Math.floor(item.hours)) 
                });
            }
        }
    });
    return localSchedule;
}

function getPriority(subjectName) {
    const sub = subjectName.toLowerCase().trim();
    for (let key in (subjectPriorities || {})) {
        if (sub.includes(key)) return subjectPriorities[key];
    }
    return 2;
}

function renderAll() {
    renderTeachers();
    renderClasses();
    renderWorkload();
    renderSchedule(); // Додано тут
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

    // Якщо немає вчителів або класів — показуємо заглушку
    if (!state.teachers || state.teachers.length === 0 || !state.classes || state.classes.length === 0) {
        container.innerHTML = `
            <div class="p-10 text-center bg-white rounded-xl border-2 border-dashed border-gray-200">
                <p class="text-gray-400 font-medium">Спочатку додайте вчителів та класи у відповідних вкладках.</p>
            </div>`;
        return;
    }

    let html = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">`;

    // Виводимо вчителів у тому ж порядку, в якому вони додані (без примусового сортування)
    state.teachers.forEach(teacher => {
        const currentWorkload = state.workload || [];
        const teacherWorkload = currentWorkload.filter(w => w.teacherId == teacher.id);
        
        // Сортуємо предмети всередині картки (спочатку за класом, потім за назвою)
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
                            <input type="number" id="hrs-${teacher.id}" value="2" min="1" max="20" class="w-full text-sm border rounded-lg p-2 bg-white outline-none focus:border-blue-500 shadow-sm transition-all">
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

// Функція для обробки натискання кнопки в картці
function addWorkloadInline(teacherId) {
    const tIdStr = String(teacherId);
    const classSelect = document.getElementById(`sel-cls-${tIdStr}`);
    const hourInput = document.getElementById(`hrs-${tIdStr}`);
    const subjectInput = document.getElementById(`sub-${tIdStr}`);

    const classId = classSelect.value;
    const hours = parseFloat(hourInput.value); // Використовуємо parseFloat для дробових чисел
    const subject = subjectInput.value.trim();

    if (!subject || isNaN(hours)) {
        alert("Будь ласка, вкажіть назву предмета та кількість годин.");
        return;
    }

    let splitType = 'none';
    let semesterPriority = 'none';

    // Якщо години дробові (напр. 1.5 або 0.5)
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
                    <button onclick="removeWorkload('${teacher.id}', ${idx})" class="text-red-300 hover:text-red-600 transition">
                        ✕
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function deleteWorkload(id) {
    // Підтвердження видалення (опціонально, але корисно)
    if (!confirm('Видалити цей запис навантаження?')) return;

    // Фільтруємо масив, залишаючи всі записи, крім того, що видаляємо
    // Використовуємо != для гнучкості типів (рядок/число)
    state.workload = state.workload.filter(w => w.id != id);

    // Обов'язково викликаємо перемальовування та збереження
    renderAll();
    save();
}

function updateManualLesson(teacherId, day, slot, element) {
    const text = element.innerText.trim();
    const tIdStr = String(teacherId); // Примусово до рядка
    
    // Видаляємо старий запис (String порівняння)
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
            subject: subjectName
        });
    }
    save();
}

function renderSchedule() {
    const container = document.getElementById('schedule-output');
    if (!container) return;

    // Визначаємо, який масив даних використовувати
    // Якщо у нас є посеместровий поділ, тут пізніше додамо перемикач, 
    // а поки беремо основний розклад
    const currentSchedule = state.schedule || [];

    const formatNameForTable = (fullName) => {
        if (!fullName) return "";
        const parts = fullName.trim().split(/\s+/);
        return parts[0].toUpperCase();
    };

    const daysNames = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця"];
    let html = `<div class="overflow-x-auto bg-white rounded-xl shadow-md border border-gray-200">
        <table class="w-full border-collapse table-fixed text-[10px]">
            <thead>
                <tr class="bg-slate-100 text-slate-700 uppercase">
                    <th class="w-12 border-b border-r p-2">День</th>
                    <th class="w-10 border-b border-r p-2">№</th>
                    ${state.teachers.map(t => `<th class="border-b border-r p-2 truncate">${formatNameForTable(t.name)}</th>`).join('')}
                </tr>
            </thead>
            <tbody>`;

    daysNames.forEach((dayName, dayIdx) => {
        for (let slotIdx = 0; slotIdx <= 8; slotIdx++) {
            html += `<tr class="${slotIdx === 8 ? 'border-b-2 border-b-slate-300' : 'border-b border-gray-100'} hover:bg-blue-50/30">`;

            if (slotIdx === 0) {
                html += `<td rowspan="9" class="bg-slate-50 border-r text-center font-bold text-slate-500 uppercase [writing-mode:vertical-lr] rotate-180">${dayName}</td>`;
            }

            html += `<td class="text-center border-r p-2 ${slotIdx === 0 ? 'text-orange-600 font-bold bg-orange-50/50' : 'text-gray-400'}">${slotIdx}</td>`;

            state.teachers.forEach(teacher => {
                const lesson = currentSchedule.find(s => s.day == dayIdx && s.slot == slotIdx && s.teacherId == teacher.id);
                const cls = lesson ? state.classes.find(c => c.id == lesson.classId) : null;
                
                // Текст для пустих клітинок (щоб можна було вписати руками)
                const cellValue = lesson ? `${cls?.name || ''} ${lesson.subject}`.trim() : '';

                // МІТКА КРУЖЕЧКА: якщо урок чергується, додаємо червоне "○"
                const altMarker = lesson?.isAlternating ? '<span class="text-red-600 ml-1 font-bold">○</span>' : '';

                html += `
                    <td class="p-1 border-r border-gray-100">
                        <div contenteditable="true" 
                             onblur="updateManualLesson('${teacher.id}', ${dayIdx}, ${slotIdx}, this)"
                             class="min-h-[35px] p-1 rounded text-center outline-none focus:bg-yellow-50 transition-colors">
                            ${lesson ? `
                                <div class="bg-blue-100 border border-blue-200 rounded py-1 shadow-sm pointer-events-none">
                                    <span class="block text-blue-900 font-bold leading-none">${cls?.name || ''}${altMarker}</span>
                                    <span class="text-blue-700 text-[9px] lowercase">${lesson.subject}</span>
                                </div>
                            ` : cellValue}
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
                    /* ЗБІЛЬШЕНО ВИСОТУ: тепер текст не тисне на межі */
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
                    line-height: 1.1; /* Трохи вільніший інтервал */
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
                    
                    // ДОДАЄМО КРУЖЕЧОК ДЛЯ ДРУКУ
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
        // Укр мова -> УМ, Фіз вих -> ФВ
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    // Алгебра -> АЛ, Фізика -> ФІ
    return subject.substring(0, 2).toUpperCase();
}

// Запуск при завантаженні
window.onload = init;
