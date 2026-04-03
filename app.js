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

// --- Рендеринг інтерфейсу ---

function renderAll() {
    renderTeachers();
    renderClasses();
    renderWorkload();
}

function renderTeachers() {
    const container = document.getElementById('list-teachers');
    if (!container) return;
    
    container.innerHTML = state.teachers.map(t => `
        <div class="bg-white p-4 rounded shadow flex justify-between items-center border-l-4 border-blue-500">
            <span class="font-medium">${t.name}</span>
            <button onclick="deleteTeacher('${t.id}')" class="text-red-500 hover:text-red-700">
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
