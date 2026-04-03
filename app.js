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
    const saved = localStorage.getItem('school_schedule_data');
    if (saved) {
        state = JSON.parse(saved);
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
                        <span class="block truncate">${assignedClass || (isBlocked ? '✕' : '')}</span>
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

    if (state.teachers.length === 0 || state.classes.length === 0) {
        container.innerHTML = '<div class="p-10 text-center text-gray-400">Додайте вчителів та класи для формування матриці.</div>';
        return;
    }

    let html = `
        <table class="w-full border-collapse">
            <thead>
                <tr class="bg-slate-100 text-slate-700">
                    <th class="border p-3 text-left">Вчитель</th>
                    ${state.classes.map(c => `<th class="border p-3 text-center w-24">${c.name}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;

    state.teachers.forEach(teacher => {
        html += `
            <tr class="hover:bg-blue-50 transition">
                <td class="border p-3 font-semibold text-slate-800 bg-gray-50">${teacher.name}</td>
                ${state.classes.map(cls => {
                    const work = teacher.workload.find(w => w.classId === cls.id);
                    const hours = work ? work.hours : '';
                    return `
                        <td class="border p-0">
                            <input type="number" min="0" max="40" 
                                value="${hours}" 
                                onchange="updateWorkload('${teacher.id}', '${cls.id}', this.value)"
                                placeholder="0"
                                class="w-full text-center py-3 px-2 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition appearance-none">
                        </td>
                    `;
                }).join('')}
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function updateWorkload(teacherId, classId, value) {
    const teacher = state.teachers.find(t => t.id === teacherId);
    if (!teacher) return;

    const hours = parseInt(value) || 0;
    const workIndex = teacher.workload.findIndex(w => w.classId === classId);

    if (workIndex > -1) {
        if (hours === 0) teacher.workload.splice(workIndex, 1);
        else teacher.workload[workIndex].hours = hours;
    } else if (hours > 0) {
        teacher.workload.push({ classId, hours });
    }

    save();
    // Не викликаємо renderAll(), щоб не "стрибав" фокус з інпуту при введенні
}

// --- ВІЗУАЛІЗАЦІЯ ТА ДРУК ---
function printSchedule() {
    if (!state.schedule || Object.keys(state.schedule).length === 0) {
        alert("Спочатку згенеруйте розклад!");
        return;
    }

    const printWindow = window.open('', '_blank');
    const dateStr = new Date().toLocaleDateString('uk-UA');

    const teacherHeaders = state.teachers.map(t => {
        const p = t.name.split(' ');
        const shortName = p[0] + (p[1] ? ` ${p[1][0]}.` : '') + (p[2] ? `${p[2][0]}.` : '');
        return `<th class="t-col"><div class="t-rotate"><span>${shortName}</span></div></th>`;
    }).join('');

    let bodyRows = '';
    state.config.days.forEach((day, dIdx) => {
        for (let lIdx = 0; lIdx < state.config.maxLessons; lIdx++) {
            let row = `<tr>`;
            if (lIdx === 0) {
                row += `<td rowspan="${state.config.maxLessons}" class="day-cell"><div class="day-rotate">${day}</div></td>`;
            }
            row += `<td class="num-cell">${lIdx + 1}</td>`;

            state.teachers.forEach(teacher => {
                let cellContent = "";
                state.classes.forEach(cls => {
                    const lesson = state.schedule[cls.id] ? state.schedule[cls.id][dIdx][lIdx] : null;
                    if (lesson && lesson.teacherId === teacher.id) {
                        const match = cls.name.match(/\d+/);
                        cellContent = match ? match[0] : cls.name;
                    }
                });
                
                // Перевірка доступності (хрестики)
                const isBlocked = teacher.availability && !teacher.availability[dIdx][lIdx];
                const clsName = cellContent ? 'lesson-active' : (isBlocked ? 'cell-blocked' : '');
                
                // Додаємо ✕ тільки якщо вчитель недоступний і там немає уроку
                const displayValue = cellContent || (isBlocked ? '✕' : '');
                
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
            <title>Розклад ${dateStr}</title>
            <style>
                @media print { 
                    @page { size: A4 landscape; margin: 3mm; } 
                    body { -webkit-print-color-adjust: exact; }
                }
                body { font-family: "Arial Narrow", Arial, sans-serif; margin: 0; padding: 5px; background: white; }
                
                /* ЗАФІКСОВАНА ШИРИНА ТАБЛИЦІ (прибираємо 100%) */
                table { 
                    border-collapse: collapse; 
                    table-layout: fixed; 
                    border: 1.5px solid #000; 
                    width: auto; /* Тепер таблиця не розтягується на всю сторінку */
                    margin: 0;
                }
                
                /* КОНТРОЛЬ ШИРИНИ ПЕРШИХ КОЛОНОК */
                .day-cell { width: 22px !important; background: #f0f0f0 !important; border: 1px solid #000; }
                .num-cell { width: 18px !important; font-weight: bold; border: 1px solid #000; font-size: 10px; background: white !important; }
                
                /* КОЛОНКИ ВЧИТЕЛІВ */
                .t-col { 
                    width: 25px !important; 
                    height: 100px; 
                    position: relative; 
                    border: 1px solid #000; 
                    background: white !important;
                    vertical-align: bottom;
                }
                
                /* ЦЕНТРУВАННЯ ПРІЗВИЩ */
                .t-rotate { 
                    position: absolute; 
                    bottom: 0; 
                    left: 0;
                    right: 0;
                    height: 100px;
                }
                .t-rotate span { 
                    transform: rotate(-90deg); 
                    transform-origin: left bottom; 
                    white-space: nowrap; 
                    display: block; 
                    font-weight: bold; 
                    font-size: 10px;
                    position: absolute;
                    bottom: 5px; /* Відступ від сітки */
                    left: 55%; /* Центрування по горизонталі вузької колонки */
                    width: 100px;
                    text-align: left;
                }

                .day-rotate { transform: rotate(-90deg); white-space: nowrap; text-transform: uppercase; font-size: 8px; font-weight: bold; }
                
                td { border: 1px solid #000; text-align: center; height: 18px; font-size: 11px; padding: 0 !important; overflow: hidden; }
                
                .lesson-active { background-color: #f1f5f9 !important; font-weight: 900; -webkit-print-color-adjust: exact; }
                .cell-blocked { color: #ccc !important; font-size: 9px; }
                
                .day-divider { height: 2px; background: #000 !important; }
                .day-divider td { border: none; height: 2px; }
                
                h2 { font-size: 14px; margin: 0 0 5px 5px; text-align: left; }
            </style>
        </head>
        <body>
            <h2>ЗВЕДЕНИЙ РОЗКЛАД (на ${dateStr})</h2>
            <table>
                <thead>
                    <tr>
                        <th colspan="2" style="width: 40px; height:20px; font-size:9px; border:1px solid #000;">ДН/№</th>
                        ${teacherHeaders}
                    </tr>
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
