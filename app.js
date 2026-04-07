const subjectPriorities = {
    // 1 - ВИСОКА СКЛАДНІСТЬ
    'алгебр': 1, 'геометр': 1, 'матем': 1, 
    'іноземн': 1, 'англійськ': 1, 'нім': 1, 'мов': 1, 

    // 2 - СЕРЕДНЯ СКЛАДНІСТЬ
    'літ': 2, 'історі': 2, 'біолог': 2, 'географ': 2, 
    'право': 2, 'громад': 2, 'етик': 2, 'захист': 2, 'природ': 2, 'інформ': 2, 'фізик': 2, 'хімі': 2,

    // 3 - НИЖЧА СКЛАДНІСТЬ
    'фінанс': 3, 'технолог': 3, 'трудов': 3, 'фізкульт': 3, 'мистец': 3, 
    'музик': 3, 'малюв': 3, 'основ': 3, 'добробут': 3, 'stem': 3, 'стеm': 3, 'фізичн': 3
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
            
            if (parsed && typeof parsed === 'object') {
                // Використовуємо деструктуризацію, щоб зберегти структуру state, 
                // навіть якщо в збережених даних чогось не вистачає
                state = {
                    ...state, // початкові значення (пусті масиви)
                    ...parsed  // те, що завантажили з пам'яті
                };
                
                // Перевіряємо, чи є в завантажених даних масив розкладу
                if (!state.schedule) state.schedule = [];
                
                console.log("Дані успішно завантажено");
            }
        }
    } catch (e) {
        console.error("Помилка при читанні з localStorage:", e);
    }
    
    // ВАЖЛИВО: Оновлюємо інтерфейс після завантаження
    renderAll();
}

function saveData() {
    // Зберігаємо весь об'єкт state (там і вчителі, і класи, і розклад)
    localStorage.setItem('school_schedule_data', JSON.stringify(state));
    console.log("Дані збережено!"); 
}

// --- Навігація (тут теж міняємо виклик) ---

function showTab(tabName) {
    state.activeTab = tabName;
    
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    const activeSection = document.getElementById(`tab-${tabName}`);
    if (activeSection) activeSection.classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.id === `btn-${tabName}`) btn.classList.add('active');
    });
    
    // Викликаємо оновлену назву
    saveData(); 
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

// Головна функція, яка запускає серію спроб
// 1. Головна функція керування спробами
function generateSchedule() {
    const startTime = Date.now();
    const maxDuration = 25000; // 25 секунд
    const maxAttempts = 500;
    
    let bestAttempt = {
        schedule: [],
        unplacedCount: Infinity,
        unplacedList: []
    };

    let attempt = 0;
    console.log("🚀 Запуск інтелектуальної генерації (спроба знайти ідеал)...");

    while (attempt < maxAttempts && (Date.now() - startTime) < maxDuration) {
        attempt++;
        const result = runSingleGeneration();

        if (result.unplaced.length < bestAttempt.unplacedCount) {
            bestAttempt = {
                schedule: JSON.parse(JSON.stringify(result.schedule)),
                unplacedCount: result.unplaced.length,
                unplacedList: result.unplaced
            };
        }

        if (bestAttempt.unplacedCount === 0) break;
    }

    state.schedule = bestAttempt.schedule;
    saveData();
    renderSchedule();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    showGenerationReport(bestAttempt.unplacedList, attempt, duration);
}

// 2. Логіка однієї конкретної спроби
function runSingleGeneration() {
    let tempSchedule = state.schedule.filter(s => s.slot === 0 || s.slot === 8);
    let unplaced = [];
    
    const flatWorkload = [];
    state.workload.forEach(item => {
        let h = parseFloat(item.hours);
        while (h >= 1) {
            flatWorkload.push({ ...item, currentHours: 1, used: false });
            h -= 1;
        }
        if (h === 0.5) {
            flatWorkload.push({ ...item, currentHours: 0.5, used: false });
        }
    });

    const tasks = [];
    const classesIds = [...new Set(state.classes.map(c => c.id))];
    
    classesIds.forEach(cId => {
        const cls = state.classes.find(c => c.id === cId);
        let classAltSuffixes = flatWorkload.filter(w => 
            w.classId === cId && w.currentHours === 0.5 && w.splitType === 'alternating' && !w.used
        );
        
        // --- ЕТАП А: Внутрішнє чергування ---
        const teacherIds = [...new Set(classAltSuffixes.map(s => s.teacherId))];
        teacherIds.forEach(tId => {
            let tSuffixes = classAltSuffixes.filter(s => s.teacherId === tId && !s.used);
            while (tSuffixes.length >= 2) {
                const i1 = tSuffixes.shift(); const i2 = tSuffixes.shift();
                i1.used = true; i2.used = true;
                tasks.push({ type: 'paired', items: [i1, i2], priority: Math.min(getPriority(i1.subject), getPriority(i2.subject)) });
            }
        });

        // --- ЕТАП Б: Зовнішнє чергування ---
        classAltSuffixes = classAltSuffixes.filter(s => !s.used);
        while (classAltSuffixes.length >= 2) {
            const i1 = classAltSuffixes.shift(); const i2 = classAltSuffixes.shift();
            i1.used = true; i2.used = true;
            tasks.push({ type: 'paired', items: [i1, i2], priority: Math.min(getPriority(i1.subject), getPriority(i2.subject)) });
        }

        classAltSuffixes.filter(s => !s.used).forEach(item => {
            item.used = true; 
            unplaced.push(`⚠️ Немає пари для чергування: ${item.subject} (${cls.name})`);
        });
    });

    flatWorkload.filter(w => !w.used).forEach(item => {
        item.used = true;
        tasks.push({ type: 'single', items: [item], priority: getPriority(item.subject), hours: item.currentHours });
    });

    // Рандомізація в межах пріоритетів
    const shuffledTasks = tasks.sort(() => Math.random() - 0.5);
    shuffledTasks.sort((a, b) => a.priority - b.priority);

    // 3. РОЗСТАНОВКА
    shuffledTasks.forEach(task => {
        const item = task.items[0];
        const cls = state.classes.find(c => c.id === item.classId);
        const className = cls ? cls.name : "Клас";
        const priority = task.priority;

        let bestSlot = null;
        let minPen = Infinity;
        const dayOffset = Math.floor(Math.random() * 5);

        for (let d_raw = 0; d_raw < 5; d_raw++) {
            let d = (d_raw + dayOffset) % 5;
            for (let s = 1; s <= 7; s++) { // Тільки до 7 уроку
                
                // Базові конфлікти (вчитель або клас зайняті)
                const isClassBusy = tempSchedule.some(ls => ls.day === d && ls.slot === s && ls.classId === item.classId);
                let isTeacherBusy = false;
                
                if (task.type === 'paired') {
                    isTeacherBusy = tempSchedule.some(ls => ls.day === d && ls.slot === s && (ls.teacherId === task.items[0].teacherId || ls.teacherId === task.items[1].teacherId));
                } else {
                    isTeacherBusy = tempSchedule.some(ls => ls.day === d && ls.slot === s && ls.teacherId === item.teacherId);
                }

                if (isClassBusy || isTeacherBusy) continue;

                // --- ПЕРЕВІРКА ПОВТОРІВ ПРЕДМЕТА В ДЕНЬ ---
                const countToday = tempSchedule.filter(ls => ls.day === d && ls.classId === item.classId && ls.subject === item.subject).length;
                
                if (countToday > 0) {
                    // Якщо пріоритет 1 (Математика і тд) - КАТЕГОРИЧНА заборона другого уроку в день
                    if (priority === 1) continue;
                    
                    // Якщо пріоритет 2 або 3 - дозволяємо, але ТІЛЬКИ ПІДРЯД (спарені)
                    const isAdjacent = tempSchedule.some(ls => ls.day === d && ls.classId === item.classId && ls.subject === item.subject && Math.abs(ls.slot - s) === 1);
                    if (!isAdjacent) continue; // Не дозволяємо розривні однакові уроки (напр. 2-й та 5-й)
                }

                // Розрахунок штрафів
                let penalty = 0;
                if (task.type === 'paired') {
                    penalty = calculatePenalty(task.items[0], d, s, tempSchedule, priority) + 
                              calculatePenalty(task.items[1], d, s, tempSchedule, priority);
                } else {
                    penalty = calculatePenalty(item, d, s, tempSchedule, priority);
                }
                
                penalty += Math.random() * 10; // Більше рандому для гнучкості

                if (penalty < minPen) {
                    minPen = penalty;
                    bestSlot = { d, s };
                }
            }
        }

        if (bestSlot) {
            task.items.forEach(it => {
                tempSchedule.push({ 
                    teacherId: it.teacherId, classId: it.classId, subject: it.subject, 
                    day: bestSlot.d, slot: bestSlot.s, 
                    isAlternating: (it.currentHours === 0.5 && it.splitType === 'alternating')
                });
            });
        } else {
            unplaced.push(`${task.type === 'paired' ? 'Чергування: ' + task.items[0].subject + '/' + task.items[1].subject : item.subject} - ${className}`);
        }
    });

    return { schedule: tempSchedule, unplaced: unplaced };
}

// 3. Універсальний калькулятор штрафів
function calculatePenalty(item, d, s, tempSchedule, priority) {
    const teacher = state.teachers.find(t => t.id === item.teacherId);
    if (!teacher) return 0;
    
    // 0 - ок, 1 - небажано (жовтий), 2 - бан (червоний)
    const status = (teacher.availability && teacher.availability[d] && teacher.availability[d][s]) || 0;

    if (status === 2) return 1000000; // КАТЕГОРИЧНО НЕ МОЖНА

    let p = 0;
    if (status === 1) p += (priority === 1) ? 400 : 2000; // Жовтий легше пробити важливому предмету

    const tLessonsToday = tempSchedule.filter(ls => ls.day === d && ls.teacherId === teacher.id).length;
    if (tLessonsToday >= 6) p += (priority === 1) ? 20 : 150;

    const hasNeighbor = tempSchedule.some(ls => ls.day === d && ls.teacherId === teacher.id && Math.abs(ls.slot - s) === 1);
    if (!hasNeighbor && tLessonsToday > 0) p += (priority === 1) ? 10 : 100;

    return p;
}

// Оновлений звіт
function showGenerationReport(errors, attempts, time) {
    const output = document.getElementById('schedule-output');
    const existingReport = document.getElementById('gen-report');
    if (existingReport) existingReport.remove();

    const isSuccess = errors.length === 0;
    const reportHtml = `
        <div id="gen-report" class="mt-4 p-4 ${isSuccess ? 'bg-green-50 border-green-500' : 'bg-orange-50 border-orange-500'} border-l-4 rounded shadow-sm">
            <div class="flex justify-between items-center">
                <h3 class="font-bold ${isSuccess ? 'text-green-800' : 'text-orange-800'}">
                    ${isSuccess ? '✅ Ідеальний розклад!' : `⚠️ Майже готово (не влізло: ${errors.length})`}
                </h3>
                <span class="text-[10px] text-gray-500">Спроб: ${attempts} | Час: ${time}с</span>
            </div>
            ${errors.length > 0 ? `
                <ul class="list-disc list-inside text-[11px] mt-2 text-orange-700">
                    ${errors.map(e => `<li>${e}</li>`).join('')}
                </ul>
            ` : ''}
        </div>
    `;
    output.insertAdjacentHTML('afterbegin', reportHtml);
}

function showGenerationReport(errors) {
    const output = document.getElementById('schedule-output');
    if (errors.length > 0) {
        const reportHtml = `
            <div class="mt-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                <h3 class="font-bold mb-2">⚠️ Не вдалося розмістити ${errors.length} предметів:</h3>
                <ul class="list-disc list-inside text-xs">
                    ${errors.map(e => `<li>${e}</li>`).join('')}
                </ul>
                <p class="mt-2 text-[10px] italic">Спробуйте додати 0-й або 8-й уроки вручну або перевірте накладки в побажаннях вчителів.</p>
            </div>
        `;
        output.insertAdjacentHTML('afterbegin', reportHtml);
    } else {
        alert("✅ Розклад згенеровано успішно! Всі уроки на місцях.");
    }
}

function getPriority(subjectName) {
    if (!subjectName) return 100; // Для порожніх назв найнижчий пріоритет
    
    const name = subjectName.toLowerCase();
    
    // Шукаємо, чи містить назва предмета хоча б один ключ із нашого списку
    for (const [key, level] of Object.entries(subjectPriorities)) {
        if (name.includes(key)) {
            return level; // Повертаємо 1, 2 або 3
        }
    }
    
    return 10; // Якщо предмета немає в списку, він отримує низький пріоритет (напр. 10)
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
                // Знаходимо ВСІ уроки вчителя в цьому слоті
                const teacherLessons = currentSchedule.filter(s => s.day == dayIdx && s.slot == slotIdx && s.teacherId == teacher.id);
                
                let cellContent = '';
                
                if (teacherLessons.length > 0) {
                    const cls = state.classes.find(c => c.id == teacherLessons[0].classId);
                    const isInternalAlt = teacherLessons.length > 1; // Більше одного предмета у одного вчителя
                    const isExternalAlt = teacherLessons.length === 1 && teacherLessons[0].isAlternating;

                    // Визначаємо клас маркера
                    let markerClass = '';
                    if (isInternalAlt) markerClass = 'marker-internal'; // Фіолетовий (сам із собою)
                    else if (isExternalAlt) markerClass = 'marker-external'; // Синій (з колегою)

                    const altMarker = (isInternalAlt || isExternalAlt) ? `<span class="alt-circle ${markerClass}">○</span>` : '';
                    
                    // Виводимо назву предмета (якщо їх два - через слеш)
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
