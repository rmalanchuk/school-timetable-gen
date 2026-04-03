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
        <div class="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full border-collapse text-[11px] table-fixed min-w-[800px]">
                    <thead>
                        <tr class="bg-slate-800 text-white">
                            <th class="border border-slate-700 p-2 w-20 sticky left-0 z-20 bg-slate-800">День / №</th>
                            ${state.teachers.map(t => `
                                <th class="border border-slate-700 p-2 text-center min-w-[100px]">
                                    ${t.name}
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
    `;

    // Цикл по днях
    state.config.days.forEach((day, dIdx) => {
        // Цикл по уроках (рядки)
        for (let lIdx = 0; lIdx < state.config.maxLessons; lIdx++) {
            html += `<tr class="hover:bg-slate-50 transition-colors">`;
            
            // Перша колонка: День та номер уроку
            if (lIdx === 0) {
                html += `
                    <td rowspan="${state.config.maxLessons}" class="border border-slate-300 bg-slate-100 p-2 font-bold text-slate-700 sticky left-0 z-10 text-center align-middle border-b-4 border-b-slate-400">
                        <div class="rotate-180 [writing-mode:vertical-lr] inline-block mb-1 uppercase tracking-widest text-[10px]">${day}</div>
                    </td>
                `;
            }

            // Колонки для кожного вчителя
            state.teachers.forEach(teacher => {
                // Шукаємо урок вчителя у всіх класах
                let assignedClass = "";
                state.classes.forEach(cls => {
                    const lesson = state.schedule[cls.id] ? state.schedule[cls.id][dIdx][lIdx] : null;
                    if (lesson && lesson.teacherId === teacher.id) {
                        assignedClass = cls.name;
                    }
                });

                const isBlocked = teacher.availability && !teacher.availability[dIdx][lIdx];
                let cellClass = isBlocked ? 'bg-gray-100 text-gray-400' : '';
                if (assignedClass) cellClass = 'bg-indigo-600 text-white font-bold shadow-inner';
                
                // Додаємо жирну лінію знизу, якщо це останній урок дня
                const isLastLesson = lIdx === state.config.maxLessons - 1;
                const borderBottom = isLastLesson ? 'border-b-4 border-b-slate-300' : '';

                html += `
                    <td class="border p-1 text-center h-10 ${cellClass} ${borderBottom}">
                        ${assignedClass || (isBlocked ? '✕' : '')}
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
        <div class="mt-6 flex flex-wrap gap-6 text-xs p-4 bg-white rounded-lg shadow-sm border">
            <div class="flex items-center gap-2"><span class="w-4 h-4 bg-indigo-600 rounded"></span> <span class="font-bold text-slate-700">Проведений урок (Клас)</span></div>
            <div class="flex items-center gap-2"><span class="w-4 h-4 bg-gray-100 border text-gray-400 flex items-center justify-center text-[10px]">✕</span> <span class="text-slate-500 font-medium">Недоступно (Метод. день тощо)</span></div>
            <div class="flex items-center gap-2"><span class="w-4 h-4 border border-slate-200"></span> <span class="text-slate-500 font-medium">Вільна година (Вікно)</span></div>
        </div>
    `;

    container.innerHTML = html;
}

// ОНОВИ ЦЮ ФУНКЦІЮ у себе:
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

// Ініціалізація
window.onload = init;
