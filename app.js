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
    // 1. Очистка
    state.schedule = [];
    
    // 2. Підготовка даних
    let items = (state.workload || []).map(item => ({ ...item }));
    items = items.sort(() => Math.random() - 0.5);

    // 3. Алгоритм
    items.forEach(item => {
        for (let h = 0; h < item.hours; h++) {
            let placed = false;
            const randomDays = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);
            
            for (let d of randomDays) {
                if (placed) break;
                for (let s = 0; s < 8; s++) {
                    const teacher = state.teachers.find(t => t.id == item.teacherId);
                    
                    // ==========================================
                    // БЛОК ПЕРЕВІРОК ТА ОБМЕЖЕНЬ (CONSTRAINTS)
                    // ==========================================
                    
                    // 1. ПЕРЕВІРКА ДОСТУПНОСТІ ВЧИТЕЛЯ (ВКЛАДКА "ВЧИТЕЛІ")
                    // Якщо клітинка в сітці доступності вчителя позначена як "Зайнятий" (false) — пропускаємо цей слот.
                    if (teacher?.availability?.[d]?.[s] === false) continue;
                    
                    // 2. ПЕРЕВІРКА ЗАЙНЯТОСТІ КЛАСУ
                    // Перевіряємо, чи немає вже в цього класу іншого уроку в цей же день і цей же час.
                    if (state.schedule.some(x => x.day === d && x.slot === s && x.classId == item.classId)) continue;
                    
                    // 3. ПЕРЕВІРКА ЗАЙНЯТОСТІ ВЧИТЕЛЯ (КОНФЛІКТ РОЗКЛАДУ)
                    // Перевіряємо, чи не викладає цей вчитель вже в іншому класі в цей же час.
                    if (state.schedule.some(x => x.day === d && x.slot === s && x.teacherId == item.teacherId)) continue;
                    
                    // 4. БАЛАНС: ОДИНАКОВІ ПРЕДМЕТИ В ОДИН ДЕНЬ
                    // Якщо предметів на тиждень мало (<=5), забороняємо ставити один і той самий предмет двічі на день.
                    const sameToday = state.schedule.some(x => x.day === d && x.classId == item.classId && x.subject === item.subject);
                    if (sameToday && item.hours <= 5) continue;
                    
                    // 5. СПЕЦІАЛЬНИЙ БАЛАНС: АЛГЕБРА ТА ГЕОМЕТРІЯ
                    // Якщо це математика і годин небагато, забороняємо ставити алгебру і геометрію в один день одному класу.
                    const maths = ['алгебра', 'геометрія', 'алг.', 'геом.'];
                    const currentSub = item.subject.toLowerCase();
                    
                    if (maths.includes(currentSub)) {
                        const hasOtherMathToday = state.schedule.some(x => {
                            const sSub = x.subject.toLowerCase();
                            return x.day === d && x.classId == item.classId && 
                                   maths.includes(sSub) && sSub !== currentSub;
                        });
                        
                        if (hasOtherMathToday && item.hours <= 5) continue;
                    }
                    
                    // Місце для майбутніх умов (наприклад, пункт 6: Перевірка максимальної к-сті уроків на день)

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

    // 4. Оновлення
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
    const output = document.getElementById('schedule-output');
    if (!output) return;

    if (!state.schedule || state.schedule.length === 0) {
        output.innerHTML = `
            <div class="p-10 text-center bg-white rounded-xl border-2 border-dashed border-gray-200">
                <p class="text-gray-400 font-medium">Розклад порожній. Натисніть "Запустити генерацію".</p>
            </div>`;
        return;
    }

    const daysNames = ["ПОНЕДІЛОК", "ВІВТОРОК", "СЕРЕДА", "ЧЕТВЕР", "П'ЯТНИЦЯ"];
    
    let html = `
        <div class="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
            <table class="w-full border-collapse text-[10px]">
                <thead>
                    <tr class="bg-slate-800 text-white">
                        <th class="border p-2 w-16">День/№</th>
                        ${state.teachers.map(t => `<th class="border p-2 min-w-[100px] text-center">${t.name}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;

    daysNames.forEach((dayName, dayIdx) => {
        for (let slotIdx = 0; slotIdx < 8; slotIdx++) {
            html += `<tr class="${slotIdx === 7 ? 'border-b-4 border-slate-100' : ''}">`;
            
            if (slotIdx === 0) {
                html += `<td rowspan="8" class="border p-1 font-bold bg-slate-50 text-center align-middle [writing-mode:vertical-lr] rotate-180 uppercase tracking-tighter text-slate-400 border-r-2">${dayName}</td>`;
            }
            
            html += `<td class="border p-1 text-center bg-gray-50 font-mono text-gray-400">${slotIdx + 1}</td>`;

            state.teachers.forEach(teacher => {
                const lesson = state.schedule.find(s => s.day === dayIdx && s.slot === slotIdx && s.teacherId == teacher.id);
                const cls = lesson ? (state.classes.find(c => c.id == lesson.classId)?.name || '?') : '';
                const isBlocked = !lesson && teacher.availability?.[dayIdx]?.[slotIdx] === false;

                html += `
                    <td class="border p-1 text-center h-10 ${lesson ? 'bg-blue-50/30' : (isBlocked ? 'bg-gray-100' : '')}">
                        ${lesson ? `
                            <div class="font-bold text-slate-800 leading-none">${cls}${getSubjectCode(lesson.subject)}</div>
                            <div class="text-[8px] text-blue-500 mt-0.5 truncate">${lesson.subject}</div>
                        ` : (isBlocked ? '<span class="text-gray-300">✕</span>' : '')}
                    </td>
                `;
            });
            html += `</tr>`;
        }
    });

    html += `</tbody></table></div>`;
    output.innerHTML = html;
}

// --- ВІЗУАЛІЗАЦІЯ ТА ДРУК ---
function printSchedule() {
    if (!state.schedule || Object.keys(state.schedule).length === 0) {
        alert("Спочатку згенеруйте розклад!");
        return;
    }

    const printWindow = window.open('', '_blank');
    const dateStr = new Date().toLocaleDateString('uk-UA');

    // Прізвище першим + Ініціали
    const teacherHeaders = state.teachers.map(t => {
        const p = t.name.split(' ');
        const shortName = p[0] + (p[1] ? ` ${p[1][0]}.` : '') + (p[2] ? `${p[2][0]}.` : '');
        return `<th class="t-col"><div class="t-rotate"><span>${shortName}</span></div></th>`;
    }).join('');

    let bodyRows = '';
    state.config.days.forEach((day, dIdx) => {
        for (let lIdx = 0; lIdx < state.config.maxLessons; lIdx++) {
            let row = `<tr class="l-row">`;
            if (lIdx === 0) {
                row += `<td rowspan="${state.config.maxLessons}" class="day-cell"><div class="day-rotate">${day}</div></td>`;
            }
            row += `<td class="num-cell">${lIdx + 1}</td>`;

            state.teachers.forEach(teacher => {
                let cellContent = "";
                state.classes.forEach(cls => {
                    const lesson = state.schedule[cls.id] ? state.schedule[cls.id][dIdx][lIdx] : null;
                    if (lesson && lesson.teacherId === teacher.id) {
                        const shortCls = cls.name.replace(/клас|класу/gi, '').trim();
                        const subCode = getSubjectCode(lesson.subject);
                        cellContent = `${shortCls}${subCode}`; // Виведе "7А-АЛ"
                    }
                });
                
                // МАКСИМАЛЬНО СУВОРА ПЕРЕВІРКА
                // Клітинка вважається заблокованою (isBlocked), якщо там немає уроку 
                // І в налаштуваннях вчителя на цей час НЕ стоїть чітке "true"
                let isBlocked = false;
                if (!cellContent) {
                    if (teacher.availability && teacher.availability[dIdx]) {
                        const val = teacher.availability[dIdx][lIdx];
                        // Якщо там false, 0, null або undefined — ставимо хрестик
                        if (val !== true && val !== 1) {
                            isBlocked = true;
                        }
                    } else {
                        // Якщо даних про доступність взагалі немає для цього дня — теж ставимо хрестик
                        isBlocked = true;
                    }
                }

                const displayValue = cellContent || '';
                const clsName = cellContent ? 'lesson-active' : (isBlocked ? 'cell-blocked' : '');
                
                row += `<td class="content-cell ${clsName}">${displayValue}</td>`;
            });
            row += `</tr>`;
            bodyRows += row;
        }
        bodyRows += `<tr class="day-divider"><td colspan="${state.teachers.length + 2}"></td></tr>`;
    });

    printWindow.document.write(`
        <html>
        <head>
            <title>Розклад - ${dateStr}</title>
            <style>
                @media print { 
                    @page { size: A4 portrait; margin: 3mm; } 
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
                body { font-family: "Arial Narrow", Arial, sans-serif; margin: 0; padding: 0; background: white; }
                table { border-collapse: collapse; width: 100%; table-layout: fixed; border: 2px solid black !important; }
                th, td { border: 1px solid black !important; text-align: center; padding: 0 !important; }
                .day-cell { width: 20px !important; background: #f0f0f0 !important; font-weight: bold; }
                .num-cell { width: 18px !important; font-weight: bold; font-size: 9px; }
                .t-col { height: 90px; position: relative; }
                .t-rotate { position: absolute; bottom: 0; left: 0; right: 0; height: 90px; }
                .t-rotate span { 
                    transform: rotate(-90deg); transform-origin: left bottom; 
                    white-space: nowrap; display: block; font-weight: bold; font-size: 9px;
                    position: absolute; bottom: 3px; left: 55%; width: 85px; text-align: left;
                }
                .day-rotate { transform: rotate(-90deg); white-space: nowrap; text-transform: uppercase; font-size: 8px; font-weight: bold; }
                tr.l-row { height: 18px; }
                .content-cell { font-size: 10px; height: 18px; }
                .lesson-active { background-color: #f1f5f9 !important; font-weight: 900; }
                .cell-blocked { color: #aaa !important; font-size: 9px; font-weight: normal; }
                .day-divider { height: 2px; background: black !important; }
                h2 { font-size: 12px; margin: 5px; text-align: center; text-transform: uppercase; }
            </style>
        </head>
        <body>
            <h2>ЗВЕДЕНИЙ РОЗКЛАД (на ${dateStr})</h2>
            <table>
                <thead>
                    <tr><th colspan="2" style="height:20px; font-size:8px;">ДН/№</th>${teacherHeaders}</tr>
                </thead>
                <tbody>${bodyRows}</tbody>
            </table>
        </body>
        </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
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
