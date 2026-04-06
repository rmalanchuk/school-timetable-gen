const subjectPriorities = {
    // 1 - ВИСОКА СКЛАДНІСТЬ (Ідеально: 2-4 уроки)
    'алгебр': 1, 'геометр': 1, 'матем': 1, 'фізик': 1, 'хімі': 1, 
    'іноземн': 1, 'англійськ': 1, 'нім': 1,

    // 2 - СЕРЕДНЯ СКЛАДНІСТЬ (Ідеально: 1-5 уроки)
    'укр': 2, 'мов': 2, 'літ': 2, 'історі': 2, 'біолог': 2, 'географ': 2, 
    'право': 2, 'громад': 2, 'етик': 2, 'захист': 2, 'природ': 2, 'інформ': 1,

    // 3 - НИЖЧА СКЛАДНІСТЬ / РОЗВАНТАЖЕННЯ (Ідеально: 1 або 5-8 уроки)
    'фінанс': 3, 'технолог': 3, 'трудов': 3, 'фізкульт': 3, 'мистец': 3, 
    'музик': 3, 'малюв': 3, 'основ': 3, 'добробут': 3, 'stem': 3, 'стеm': 3
};

// Поточний стан додатку
let state = {
    activeTab: 'teachers',
    teachers: [],
    classes: [],
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
        teacher.availability = Array(5).fill().map(() => Array(state.config.maxLessons).fill(true));
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
    // 1. Очистка попереднього розкладу
    state.schedule = [];
    
    // 2. Підготовка та перемішування даних навантаження
    let items = (state.workload || []).map(item => ({ ...item }));
    items = items.sort(() => Math.random() - 0.5);

    // 3. Основний алгоритм генерації
    items.forEach(item => {
        const subNameLower = item.subject.toLowerCase().trim();
        
        // Визначаємо пріоритет предмета (пошук за ключовими словами)
        let priority = 2; // за замовчуванням середній
        for (let key in subjectPriorities) {
            if (subNameLower.includes(key)) {
                priority = subjectPriorities[key];
                break;
            }
        }

        for (let h = 0; h < item.hours; h++) {
            let placed = false;
            // Перемішуємо дні для рівномірного розподілу
            const randomDays = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);
            
            for (let d of randomDays) {
                if (placed) break;
                
                for (let s = 0; s < 8; s++) {
                    const teacher = state.teachers.find(t => t.id == item.teacherId);
                    
                    // ==========================================
                    // БЛОК ПЕРЕВІРОК ТА ОБМЕЖЕНЬ (CONSTRAINTS)
                    // ==========================================

                    // 1. ПРІОРИТЕТНІСТЬ (М'ЯКА УМОВА)
                    // Складні (1) намагаємось не ставити пізно, легкі (3) намагаємось не ставити рано
                    if (priority === 1 && s > 3 && Math.random() > 0.3) continue;
                    if (priority === 3 && s < 3 && Math.random() > 0.3) continue;

                    // 2. ДОСТУПНІСТЬ ВЧИТЕЛЯ (ВКЛАДКА "ВЧИТЕЛІ")
                    if (teacher?.availability?.[d]?.[s] === false) continue;
                    
                    // 3. ЗАЙНЯТОСТІ КЛАСУ
                    if (state.schedule.some(x => x.day === d && x.slot === s && x.classId == item.classId)) continue;
                    
                    // 4. ЗАЙНЯТОСТІ ВЧИТЕЛЯ (КОНФЛІКТ)
                    if (state.schedule.some(x => x.day === d && x.slot === s && x.teacherId == item.teacherId)) continue;
                    
                    // 5. БАЛАНС: ОДИНАКОВІ ПРЕДМЕТИ В ОДИН ДЕНЬ
                    const sameToday = state.schedule.some(x => x.day === d && x.classId == item.classId && x.subject.toLowerCase().trim() === subNameLower);
                    if (sameToday && item.hours <= 5) continue;
                    
                    // 6. СПЕЦІАЛЬНИЙ БАЛАНС: АЛГЕБРА ТА ГЕОМЕТРІЯ
                    const maths = ['алгебр', 'геометр', 'матем'];
                    const isCurrentMath = maths.some(m => subNameLower.includes(m));
                    
                    if (isCurrentMath) {
                        const hasOtherMathToday = state.schedule.some(x => {
                            const otherSub = x.subject.toLowerCase().trim();
                            const isOtherMath = maths.some(m => otherSub.includes(m));
                            return x.day === d && x.classId == item.classId && isOtherMath && otherSub !== subNameLower;
                        });
                        
                        if (hasOtherMathToday && item.hours <= 5) continue;
                    }

                    // 7. МІСЦЕ ДЛЯ МАЙБУТНІХ УМОВ (наприклад, вікна або кабінети)

                    // Якщо всі умови пройдено — додаємо урок
                    state.schedule.push({
                        id: Date.now() + Math.random(),
                        ...item,
                        day: d,
                        slot: s
                    });
                    placed = true;
                    break;
                }
            }
        }
    });

    // 4. Оновлення інтерфейсу та збереження
    renderAll(); 
    save();
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
    // Примусово робимо ID рядком для пошуку в DOM
    const tIdStr = String(teacherId);
    
    const classSelect = document.getElementById(`sel-cls-${tIdStr}`);
    const hourInput = document.getElementById(`hrs-${tIdStr}`);
    const subjectInput = document.getElementById(`sub-${tIdStr}`);

    if (!classSelect || !hourInput || !subjectInput) {
        console.error("Не вдалося знайти поля вводу для вчителя:", tIdStr);
        return;
    }

    const classId = classSelect.value;
    const hours = parseInt(hourInput.value);
    const subject = subjectInput.value.trim();

    if (!subject || isNaN(hours)) {
        alert("Будь ласка, вкажіть назву предмета та кількість годин.");
        return;
    }

    const newItem = {
        id: Date.now().toString(), // ID як рядок
        teacherId: tIdStr,
        classId: classId,
        subject: subject,
        hours: hours
    };

    if (!state.workload) state.workload = [];
    state.workload.push(newItem);
    
    // Очищуємо поле предмета після додавання
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

function addWorkload(teacherId) {
    const classSelect = document.getElementById(`sel-cls-${teacherId}`);
    const subjectInput = document.getElementById(`inp-sub-${teacherId}`);
    const hoursInput = document.getElementById(`inp-hrs-${teacherId}`);

    const classId = classSelect.value;
    const subject = subjectInput.value.trim();
    const hours = parseInt(hoursInput.value);

    if (!subject || isNaN(hours) || hours <= 0) {
        alert("Введіть назву предмета та кількість годин");
        return;
    }

    const teacher = state.teachers.find(t => t.id === teacherId);
    
    // Гарантуємо, що workload — це масив
    if (!Array.isArray(teacher.workload)) {
        teacher.workload = [];
    }

    teacher.workload.push({ 
        classId: classId, 
        subject: subject, 
        hours: hours 
    });
    
    // Очищуємо інпути після додавання
    subjectInput.value = '';
    hoursInput.value = '';

    save();
    renderWorkload();
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

function renderSchedule() {
    const container = document.getElementById('schedule-output');
    if (!container) return;

    if (!state.schedule || state.schedule.length === 0) {
        container.innerHTML = `
            <div class="p-10 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                Розклад ще не згенеровано. Натисніть "Запустити генерацію".
            </div>`;
        return;
    }

    // Функція для форматування: "Маланчук Роман Степанович" -> "МАЛАНЧУК Р. С."
    const formatNameForTable = (fullName) => {
        if (!fullName) return "";
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].toUpperCase();
        const surname = parts[0].toUpperCase();
        const initials = parts.slice(1).map(p => p[0].toUpperCase() + ".").join(" ");
        return `${surname} ${initials}`;
    };

    const daysNames = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця"];
    
    let html = `
        <div class="overflow-x-auto bg-white rounded-xl shadow-md border border-gray-200">
            <table class="w-full border-collapse min-w-[800px] table-fixed">
                <thead>
                    <tr class="bg-slate-100 text-slate-700 text-[10px] uppercase tracking-wider">
                        <th class="w-12 border-b border-r p-2">День</th>
                        <th class="w-10 border-b border-r p-2">№</th>
                        ${state.teachers.map(t => `
                            <th class="border-b border-r p-2 text-center truncate" title="${t.name}">
                                ${formatNameForTable(t.name)}
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
    `;

    daysNames.forEach((dayName, dayIdx) => {
        for (let slotIdx = 0; slotIdx < 8; slotIdx++) {
            const isFirstSlot = slotIdx === 0;
            html += `<tr class="${slotIdx === 7 ? 'border-b-2 border-b-slate-300' : 'border-b border-gray-100'} hover:bg-blue-50/30 transition">`;

            if (isFirstSlot) {
                html += `
                    <td rowspan="8" class="bg-slate-50 border-r border-gray-200 text-center font-bold text-slate-500 text-[10px] uppercase tracking-widest [writing-mode:vertical-lr] rotate-180">
                        ${dayName}
                    </td>`;
            }

            html += `<td class="text-center text-gray-400 font-medium text-xs border-r border-gray-100 p-2">${slotIdx + 1}</td>`;

            state.teachers.forEach(teacher => {
                const lesson = state.schedule.find(s => s.day === dayIdx && s.slot === slotIdx && s.teacherId == teacher.id);
                
                if (lesson) {
                    const cls = state.classes.find(c => c.id == lesson.classId);
                    const rawCode = typeof getSubjectCode === 'function' ? getSubjectCode(lesson.subject) : lesson.subject;
                    const code = rawCode.toLowerCase();

                    html += `
                        <td class="p-1 border-r border-gray-100">
                            <div class="bg-blue-100 border border-blue-200 rounded p-1 text-center shadow-sm">
                                <span class="block text-blue-900 font-bold text-[11px] leading-none">${cls?.name || ''}</span>
                                <span class="text-blue-700 text-[9px] font-medium lowercase">${code}</span>
                            </div>
                        </td>`;
                } else {
                    html += `<td class="p-1 border-r border-gray-100"></td>`;
                }
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

    const formatName = (fullName) => {
        if (!fullName) return "";
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 1) return parts[0];
        const surname = parts[0];
        const initials = parts.slice(1).map(p => p[0].toUpperCase() + ".").join(" ");
        return `${surname} ${initials}`;
    };

    let html = `
        <html>
        <head>
            <title>Друк розкладу</title>
            <style>
                @page { 
                    size: A4 portrait; 
                    margin: 5mm; 
                }
                body { 
                    font-family: 'Segoe UI', sans-serif; 
                    margin: 0; padding: 0; 
                    -webkit-print-color-adjust: exact; 
                    print-color-adjust: exact;
                }
                h2 { text-align: center; font-size: 11px; margin: 2mm 0; }
                
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    table-layout: fixed; 
                    /* Додаємо зовнішню межу для всієї таблиці */
                    border: 1px solid #000;
                }
                
                th, td { 
                    /* Використовуємо ціле значення 1px для стабільності меж */
                    border: 1px solid #000; 
                    text-align: center; 
                    height: 16px; 
                    padding: 0; 
                    box-sizing: border-box;
                }
                
                .col-day { width: 18px; }
                .col-num { width: 22px; }
            
                th.teacher-name {
                    height: 110px;
                    writing-mode: vertical-lr;
                    transform: rotate(180deg);
                    white-space: nowrap;
                    font-size: 9px;
                    font-weight: bold;
                    background-color: #f8fafc !important; /* Важливо для друку */
                    text-align: left;
                    padding: 4px 2px;
                }
            
                .day-cell { 
                    font-weight: bold; 
                    writing-mode: vertical-lr; 
                    transform: rotate(180deg); 
                    font-size: 8px;
                    background-color: #f1f5f9 !important;
                }
            
                .slot-num { 
                    font-size: 8px; 
                    font-weight: bold;
                    background-color: #fff !important;
                }
            
                .lesson-box { 
                    font-size: 8.5px; 
                    font-weight: 700; 
                    line-height: 1; 
                    width: 100%;
                    display: block;
                }
            
                .sub-code { 
                    font-size: 7.5px; 
                    font-weight: 400; 
                    text-transform: lowercase; 
                }
            </style>
        </head>
        <body>
            <h2>ЗВЕДЕНИЙ РОЗКЛАД (СТАНОМ НА ${dateStr})</h2>
            <table>
                <thead>
                    <tr>
                        <th colspan="2" style="width: 30px; height: 95px;">ДН/№</th>
                        ${state.teachers.map(t => `<th class="teacher-name">${formatName(t.name)}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;

    daysNames.forEach((dayName, dayIdx) => {
        for (let slotIdx = 0; slotIdx < 8; slotIdx++) {
            html += `<tr>`;
            if (slotIdx === 0) html += `<td rowspan="8" class="day-cell">${dayName}</td>`;
            html += `<td class="slot-num">${slotIdx + 1}</td>`;

            state.teachers.forEach(teacher => {
                const lesson = state.schedule.find(s => s.day === dayIdx && s.slot === slotIdx && s.teacherId == teacher.id);
                if (lesson) {
                    const clsName = state.classes.find(c => c.id == lesson.classId)?.name || '';
                    const code = typeof getSubjectCode === 'function' ? getSubjectCode(lesson.subject) : lesson.subject;
                    
                    // Виділяємо номер класу жирним, а предмет — малими буквами
                    html += `<td>
                        <div class="lesson-box">
                            ${clsName}<span class="sub-code">${code}</span>
                        </div>
                    </td>`;
                } else {
                    html += `<td></td>`;
                }
            });
            html += `</tr>`;
        }
    });

    html += `</tbody></table>
            <script>
                window.onload = function() { 
                    setTimeout(() => { window.print(); window.close(); }, 300); 
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
