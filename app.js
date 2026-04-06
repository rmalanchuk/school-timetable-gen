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
    // Створюємо порожню сітку для кожного класу
    const schedule = {};
    state.classes.forEach(cls => {
        schedule[cls.id] = Array(5).fill(null).map(() => Array(state.config.maxLessons).fill(null));
    });

    // Формуємо плоский список усіх занять, які треба поставити
    let itemsToPlace = [];
    state.teachers.forEach(t => {
        t.workload.forEach(w => {
            for (let i = 0; i < w.hours; i++) {
                itemsToPlace.push({
                    teacherId: t.id,
                    teacherName: t.name,
                    classId: w.classId
                });
            }
        });
    });

    // Сортуємо: спочатку ті класи, де більше всього годин (жадібний підхід)
    itemsToPlace.sort((a, b) => {
        const countA = itemsToPlace.filter(x => x.classId === a.classId).length;
        const countB = itemsToPlace.filter(x => x.classId === b.classId).length;
        return countB - countA;
    });

    // Проходимо по кожному заняттю і шукаємо йому місце
    itemsToPlace.forEach(item => {
        let placed = false;
        for (let day = 0; day < 5; day++) {
            if (placed) break;
            for (let lesson = 0; lesson < state.config.maxLessons; lesson++) {
                if (placed) break;

                // Перевірка 1: Чи вільний клас?
                if (schedule[item.classId][day][lesson] !== null) continue;

                // Перевірка 2: Чи вільний вчитель (не в іншому класі)?
                const teacherBusy = Object.values(schedule).some(s => 
                    s[day][lesson] && s[day][lesson].teacherId === item.teacherId
                );
                if (teacherBusy) continue;

                // Перевірка 3: Чи доступний вчитель за графіком?
                const teacher = state.teachers.find(t => t.id === item.teacherId);
                if (teacher.availability && !teacher.availability[day][lesson]) continue;

                // Якщо все ок — ставимо
                schedule[item.classId][day][lesson] = {
                    teacherName: item.teacherName,
                    teacherId: item.teacherId
                };
                placed = true;
            }
        }
    });

    state.schedule = schedule;
    save();
    renderAll(); // Перемальовуємо все, включаючи нову вкладку розкладу
}

function renderSchedule() {
    const container = document.getElementById('schedule-output');
    if (!container) return;

    if (!state.schedule || Object.keys(state.schedule).length === 0) {
        container.innerHTML = '<div class="p-10 text-center text-gray-400">Натисніть "Запустити генерацію", щоб отримати зведену таблицю.</div>';
        return;
    }

    let html = `
        <div class="relative bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div class="overflow-x-auto overflow-y-auto max-h-[80vh]">
                <table class="w-full border-separate border-spacing-0 text-[11px]">
                    <thead>
                        <tr>
                            <th class="sticky left-0 top-0 z-40 bg-slate-800 text-white border-r border-b border-slate-700 p-2 w-16 min-w-[64px]">
                                День / №
                            </th>
                            ${state.teachers.map(t => `
                                <th class="sticky top-0 z-30 bg-slate-800 text-white border-r border-b border-slate-700 p-2 min-w-[100px] max-w-[100px] vertical-align-top text-center leading-tight h-16">
                                    <div class="line-clamp-3 break-words whitespace-normal px-1">
                                        ${t.name}
                                    </div>
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
    `;

    state.config.days.forEach((day, dIdx) => {
        for (let lIdx = 0; lIdx < state.config.maxLessons; lIdx++) {
            const isLastLesson = lIdx === state.config.maxLessons - 1;
            const dayBorder = isLastLesson ? 'border-b-4 border-b-slate-400' : 'border-b border-slate-200';

            html += `<tr class="hover:bg-slate-50 transition-colors">`;
            
            // Фіксована ліва колонка (День + Номер)
            if (lIdx === 0) {
                html += `
                    <td rowspan="${state.config.maxLessons}" class="sticky left-0 z-20 bg-slate-100 border-r border-slate-300 font-bold text-slate-700 text-center align-middle ${dayBorder}">
                         <div class="rotate-180 [writing-mode:vertical-lr] py-2 uppercase tracking-tighter text-[9px]">
                            ${day}
                         </div>
                    </td>
                `;
            }

            // Окремий стовпчик для номера уроку (теж фіксований поруч з днем, якщо потрібно, але поки об'єднаємо для економії)
            // Додаємо номер уроку в кожному рядку, але він має бути sticky поруч з днем
            // Щоб не ускладнювати, зробимо номер уроку частиною комірки вчителя або окремою тонкою колонкою
            // Давай додамо номер уроку як маленьку sticky колонку:

            state.teachers.forEach(teacher => {
                let assignedClass = "";
                state.classes.forEach(cls => {
                    const lesson = state.schedule[cls.id] ? state.schedule[cls.id][dIdx][lIdx] : null;
                    if (lesson && lesson.teacherId === teacher.id) {
                        assignedClass = cls.name;
                    }
                });

                const isBlocked = teacher.availability && !teacher.availability[dIdx][lIdx];
                let cellStyle = isBlocked ? 'bg-slate-100 text-slate-300' : '';
                if (assignedClass) cellStyle = 'bg-blue-600 text-white font-black shadow-[inset_0_0_10px_rgba(0,0,0,0.1)]';

                // Додаємо індикатор номера уроку для зручності в кожну 5-ту клітинку або на початку
                const lessonIndicator = `<span class="absolute top-0.5 left-0.5 text-[8px] opacity-30">${lIdx + 1}</span>`;

                html += `
                    <td class="relative border-r border-slate-200 p-1 text-center h-12 min-w-[100px] max-w-[100px] ${cellStyle} ${dayBorder}">
                        ${lessonIndicator}
                        <span class="block truncate">${assignedClass || ''}</span>
                    </td>
                `;
            });

            html += `</tr>`;
        }
    });

    html += `
                    </tbody>
                </table>
            </div>
        </div>
        <div class="mt-4 p-4 bg-slate-50 rounded-lg flex flex-wrap gap-4 text-[10px] text-slate-600">
            <div class="flex items-center gap-1"><div class="w-3 h-3 bg-blue-600 rounded"></div> Урок призначено</div>
            <div class="flex items-center gap-1"><div class="w-3 h-3 bg-slate-100 border text-slate-300 flex items-center justify-center text-[8px]">✕</div> Недоступно</div>
            <div class="flex items-center gap-1 text-slate-400 italic">* Використовуйте Shift + коліщатко миші для горизонтального скролу</div>
        </div>
    `;

    container.innerHTML = html;
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

    // Перевіряємо, чи є вчителі та класи
    if (state.teachers.length === 0 || state.classes.length === 0) {
        container.innerHTML = `
            <div class="p-10 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <p class="text-slate-400">Спочатку додайте вчителів та класи у відповідних вкладках.</p>
            </div>`;
        return;
    }

    let html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">';

    state.teachers.forEach(teacher => {
        // Рахуємо загальну кількість годин для бейджа
        const totalHours = (teacher.workload || []).reduce((sum, w) => sum + Number(w.hours), 0);

        html += `
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div class="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 class="font-bold text-slate-800 truncate mr-2">${teacher.name}</h3>
                    <span class="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">
                        ${totalHours} год
                    </span>
                </div>
                
                <div class="p-4 flex-grow space-y-2 min-h-[50px]">
                    ${renderWorkloadItems(teacher)}
                </div>

                <div class="p-4 bg-slate-50 border-t border-slate-200">
                    <div class="grid grid-cols-1 gap-2">
                        <select id="sel-cls-${teacher.id}" class="w-full text-xs p-2 rounded border border-slate-300">
                            ${state.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                        </select>
                        <div class="flex gap-2">
                            <input type="text" id="inp-sub-${teacher.id}" placeholder="Предмет" 
                                class="flex-grow text-xs p-2 rounded border border-slate-300 outline-none focus:border-blue-500">
                            <input type="number" id="inp-hrs-${teacher.id}" placeholder="Год" 
                                class="w-14 text-xs p-2 rounded border border-slate-300">
                            <button onclick="addWorkload('${teacher.id}')" 
                                class="bg-blue-600 text-white px-3 rounded-lg hover:bg-blue-700 transition font-bold">
                                +
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
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
    const classId = document.getElementById(`sel-cls-${teacherId}`).value;
    const subject = document.getElementById(`inp-sub-${teacherId}`).value.trim();
    const hours = parseInt(document.getElementById(`inp-hrs-${teacherId}`).value);

    if (!subject || isNaN(hours) || hours <= 0) {
        alert("Введіть назву предмета та кількість годин");
        return;
    }

    const teacher = state.teachers.find(t => t.id === teacherId);
    if (!teacher.workload) teacher.workload = [];

    teacher.workload.push({ classId, subject, hours });
    
    save();
    renderWorkload(); // Оновлюємо тільки цю вкладку
}

function removeWorkload(teacherId, index) {
    const teacher = state.teachers.find(t => t.id === teacherId);
    if (teacher && teacher.workload) {
        teacher.workload.splice(index, 1);
        save();
        renderWorkload();
    }
}

function addSubjectToWorkload(teacherId) {
    // Отримуємо значення з нових інпутів
    const classId = document.getElementById(`select-class-${teacherId}`).value;
    const subject = document.getElementById(`input-subject-${teacherId}`).value.trim();
    const hours = parseInt(document.getElementById(`input-hours-${teacherId}`).value);

    // Перевірка
    if (!subject || isNaN(hours)) return;

    const teacher = state.teachers.find(t => t.id === teacherId);
    
    // ОСЬ ТУТ МІНЯЄТЬСЯ СТРУКТУРА:
    // Раніше ми могли робити push({classId, hours}), 
    // а тепер додаємо subject:
    teacher.workload.push({
        classId: classId,
        subject: subject,
        hours: hours
    });

    save();
    renderWorkload(); // Перемальовуємо інтерфейс навантаження
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
                        cellContent = cls.name.replace(/клас|класу/gi, '').trim();
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

// Запуск при завантаженні
window.onload = init;
