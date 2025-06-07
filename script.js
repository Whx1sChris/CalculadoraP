// Almacenamiento de tareas
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentView = 'month';
let currentDate = new Date();

// Elementos DOM
const calendar = document.getElementById('calendar');
const monthYear = document.getElementById('monthYear');
const taskModal = document.getElementById('taskModal');
const taskForm = document.getElementById('taskForm');
const taskList = document.getElementById('taskList');
const timeGreeting = document.getElementById('timeGreeting');
const searchTask = document.getElementById('searchTask');
const categoryFilter = document.getElementById('categoryFilter');
const statusFilter = document.getElementById('statusFilter');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    updateCalendar();
    updateTaskList();
    updateGreeting();
    updateStats();
    setupEventListeners();
    setInterval(updateGreeting, 60000); // Actualizar saludo cada minuto
});

// Configuración de event listeners
function setupEventListeners() {
    document.getElementById('prevMonth').addEventListener('click', () => navigateMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => navigateMonth(1));
    document.getElementById('monthView').addEventListener('click', () => switchView('month'));
    document.getElementById('weekView').addEventListener('click', () => switchView('week'));
    document.getElementById('addTaskBtn').addEventListener('click', openTaskModal);
    document.querySelector('.close').addEventListener('click', closeTaskModal);
    taskForm.addEventListener('submit', handleTaskSubmit);
    document.getElementById('addSubtask').addEventListener('click', addSubtaskField);
    
    // Filtros
    searchTask.addEventListener('input', updateTaskList);
    categoryFilter.addEventListener('change', updateTaskList);
    statusFilter.addEventListener('change', updateTaskList);
    
    // Exportación
    document.getElementById('exportPDF').addEventListener('click', exportToPDF);
    document.getElementById('exportExcel').addEventListener('click', exportToExcel);
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target === taskModal) closeTaskModal();
    });
    
    // Drag and Drop
    setupDragAndDrop();
}

// Funciones del calendario
function updateCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    monthYear.textContent = new Date(year, month).toLocaleDateString('es', {
        month: 'long',
        year: 'numeric'
    });
    
    calendar.innerHTML = '';
    
    if (currentView === 'month') {
        renderMonthView(year, month);
    } else {
        renderWeekView(currentDate);
    }
}

function renderMonthView(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    
    // Días de la semana
    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    weekDays.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day week-day';
        dayElement.textContent = day;
        calendar.appendChild(dayElement);
    });
    
    // Días vacíos antes del primer día
    for (let i = 0; i < startDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendar.appendChild(emptyDay);
    }
    
    // Días del mes
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasTask = tasks.some(task => task.date.startsWith(currentDateStr));
        
        if (hasTask) {
            dayElement.classList.add('has-tasks');
        }
        
        if (isToday(year, month, day)) {
            dayElement.classList.add('today');
        }
        
        dayElement.addEventListener('click', () => selectDate(year, month, day));
        dayElement.setAttribute('data-date', currentDateStr);
        calendar.appendChild(dayElement);
    }
}

function renderWeekView(date) {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    
    // Días de la semana con horas
    for (let i = 0; i < 7; i++) {
        const dayColumn = document.createElement('div');
        dayColumn.className = 'week-day-column';
        
        const currentDay = new Date(startOfWeek);
        currentDay.setDate(startOfWeek.getDate() + i);
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'week-day-header';
        dayHeader.textContent = currentDay.toLocaleDateString('es', {
            weekday: 'short',
            day: 'numeric'
        });
        
        dayColumn.appendChild(dayHeader);
        
        // Horas del día
        for (let hour = 0; hour < 24; hour++) {
            const hourCell = document.createElement('div');
            hourCell.className = 'hour-cell';
            hourCell.textContent = `${hour}:00`;
            
            const dateStr = currentDay.toISOString().split('T')[0];
            const tasksAtHour = tasks.filter(task => {
                const taskDate = new Date(task.date);
                return taskDate.toISOString().split('T')[0] === dateStr &&
                       taskDate.getHours() === hour;
            });
            
            if (tasksAtHour.length > 0) {
                hourCell.classList.add('has-tasks');
                const taskIndicator = document.createElement('div');
                taskIndicator.className = 'task-indicator';
                taskIndicator.textContent = `${tasksAtHour.length} tarea(s)`;
                hourCell.appendChild(taskIndicator);
            }
            
            dayColumn.appendChild(hourCell);
        }
        
        calendar.appendChild(dayColumn);
    }
}

// Funciones de tareas
function openTaskModal(editTask = null) {
    taskModal.style.display = 'block';
    if (editTask) {
        // Rellenar el formulario con los datos de la tarea a editar
        document.getElementById('taskTitle').value = editTask.title;
        document.getElementById('taskDescription').value = editTask.description;
        document.getElementById('taskDateTime').value = editTask.date;
        document.getElementById('taskCategory').value = editTask.category;
        document.getElementById('taskPriority').value = editTask.priority;
        taskForm.dataset.editId = editTask.id;
    } else {
        taskForm.reset();
        delete taskForm.dataset.editId;
    }
}

function closeTaskModal() {
    taskModal.style.display = 'none';
    taskForm.reset();
    delete taskForm.dataset.editId;
}

function handleTaskSubmit(e) {
    e.preventDefault();
    
    const taskData = {
        id: taskForm.dataset.editId || Date.now().toString(),
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        date: document.getElementById('taskDateTime').value,
        category: document.getElementById('taskCategory').value,
        priority: document.getElementById('taskPriority').value,
        completed: false,
        subtasks: getSubtasks()
    };
    
    if (taskForm.dataset.editId) {
        const index = tasks.findIndex(t => t.id === taskForm.dataset.editId);
        tasks[index] = { ...tasks[index], ...taskData };
    } else {
        tasks.push(taskData);
    }
    
    saveTasks();
    closeTaskModal();
    updateCalendar();
    updateTaskList();
    updateStats();
}

function getSubtasks() {
    const subtasks = [];
    document.querySelectorAll('.subtask-input').forEach(input => {
        if (input.value.trim()) {
            subtasks.push({
                id: input.dataset.id || Date.now().toString(),
                text: input.value,
                completed: false
            });
        }
    });
    return subtasks;
}

function addSubtaskField() {
    const subtasksList = document.getElementById('subtasksList');
    const subtaskDiv = document.createElement('div');
    subtaskDiv.className = 'subtask-item';
    subtaskDiv.innerHTML = `
        <input type="text" class="subtask-input" data-id="${Date.now()}" placeholder="Nueva subtarea">
        <button type="button" class="remove-subtask">&times;</button>
    `;
    
    subtaskDiv.querySelector('.remove-subtask').addEventListener('click', () => {
        subtaskDiv.remove();
    });
    
    subtasksList.appendChild(subtaskDiv);
}

// Funciones de utilidad
function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = '';
    
    if (hour >= 5 && hour < 12) {
        greeting = 'Buenos días';
        document.body.className = 'morning-theme';
    } else if (hour >= 12 && hour < 18) {
        greeting = 'Buenas tardes';
        document.body.className = 'afternoon-theme';
    } else {
        greeting = 'Buenas noches';
        document.body.className = 'night-theme';
    }
    
    timeGreeting.textContent = `${greeting}, ${new Date().toLocaleTimeString('es')}`;
}

function updateStats() {
    const stats = {
        total: tasks.length,
        completed: tasks.filter(t => t.completed).length,
        pending: tasks.filter(t => !t.completed).length
    };
    
    const completion = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
    
    document.getElementById('taskStats').innerHTML = `
        <div class="stat-item">
            <span>Total de tareas:</span> ${stats.total}
        </div>
        <div class="stat-item">
            <span>Completadas:</span> ${stats.completed}
        </div>
        <div class="stat-item">
            <span>Pendientes:</span> ${stats.pending}
        </div>
        <div class="stat-item">
            <span>Porcentaje completado:</span> ${completion}%
        </div>
    `;
}

function updateTaskList() {
    const searchTerm = searchTask.value.toLowerCase();
    const categoryValue = categoryFilter.value;
    const statusValue = statusFilter.value;
    
    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchTerm) ||
                            task.description.toLowerCase().includes(searchTerm);
        const matchesCategory = categoryValue === 'all' || task.category === categoryValue;
        const matchesStatus = statusValue === 'all' ||
                            (statusValue === 'completed' && task.completed) ||
                            (statusValue === 'pending' && !task.completed);
        
        return matchesSearch && matchesCategory && matchesStatus;
    });
    
    renderTaskList(filteredTasks);
}

function renderTaskList(filteredTasks) {
    taskList.innerHTML = '';
    
    filteredTasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${task.completed ? 'completed' : ''} task-priority-${task.priority}`;
        taskElement.draggable = true;
        taskElement.dataset.taskId = task.id;
        
        taskElement.innerHTML = `
            <div class="task-header">
                <h3 class="task-title">${task.title}</h3>
                <div class="task-actions">
                    <button class="edit-task">✏️</button>
                    <button class="delete-task">🗑️</button>
                    <button class="complete-task">${task.completed ? '↩️' : '✓'}</button>
                </div>
            </div>
            <div class="task-details">
                <p>${task.description}</p>
                <div class="task-meta">
                    <span class="task-date">📅 ${new Date(task.date).toLocaleString('es')}</span>
                    <span class="task-category">📌 ${task.category}</span>
                </div>
            </div>
        `;
        
        if (task.subtasks && task.subtasks.length > 0) {
            const subtasksList = document.createElement('div');
            subtasksList.className = 'subtasks-list';
            task.subtasks.forEach(subtask => {
                const subtaskElement = document.createElement('div');
                subtaskElement.className = `subtask ${subtask.completed ? 'completed' : ''}`;
                subtaskElement.innerHTML = `
                    <input type="checkbox" ${subtask.completed ? 'checked' : ''}>
                    <span>${subtask.text}</span>
                `;
                subtaskElement.querySelector('input').addEventListener('change', (e) => {
                    toggleSubtaskComplete(task.id, subtask.id, e.target.checked);
                });
                subtasksList.appendChild(subtaskElement);
            });
            taskElement.appendChild(subtasksList);
        }
        
        setupTaskEventListeners(taskElement, task);
        taskList.appendChild(taskElement);
    });
}

function setupTaskEventListeners(taskElement, task) {
    taskElement.querySelector('.edit-task').addEventListener('click', () => {
        openTaskModal(task);
    });
    
    taskElement.querySelector('.delete-task').addEventListener('click', () => {
        if (confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
            deleteTask(task.id);
        }
    });
    
    taskElement.querySelector('.complete-task').addEventListener('click', () => {
        toggleTaskComplete(task.id);
    });
}

function toggleTaskComplete(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        updateTaskList();
        updateStats();
    }
}

function toggleSubtaskComplete(taskId, subtaskId, completed) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        const subtask = task.subtasks.find(s => s.id === subtaskId);
        if (subtask) {
            subtask.completed = completed;
            saveTasks();
            updateStats();
        }
    }
}

function deleteTask(taskId) {
    tasks = tasks.filter(t => t.id !== taskId);
    saveTasks();
    updateCalendar();
    updateTaskList();
    updateStats();
}

// Drag and Drop
function setupDragAndDrop() {
    document.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('task-item')) {
            e.target.classList.add('dragging');
            e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
        }
    });
    
    document.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('task-item')) {
            e.target.classList.remove('dragging');
        }
    });
    
    calendar.addEventListener('dragover', (e) => {
        e.preventDefault();
        const calendarDay = e.target.closest('.calendar-day');
        if (calendarDay) {
            calendarDay.classList.add('drag-over');
        }
    });
    
    calendar.addEventListener('dragleave', (e) => {
        const calendarDay = e.target.closest('.calendar-day');
        if (calendarDay) {
            calendarDay.classList.remove('drag-over');
        }
    });
    
    calendar.addEventListener('drop', (e) => {
        e.preventDefault();
        const calendarDay = e.target.closest('.calendar-day');
        if (calendarDay) {
            const taskId = e.dataTransfer.getData('text/plain');
            const newDate = calendarDay.dataset.date;
            updateTaskDate(taskId, newDate);
            calendarDay.classList.remove('drag-over');
        }
    });
}

function updateTaskDate(taskId, newDate) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        const oldDate = new Date(task.date);
        const [year, month, day] = newDate.split('-');
        const updatedDate = new Date(year, month - 1, day, oldDate.getHours(), oldDate.getMinutes());
        task.date = updatedDate.toISOString().slice(0, 16);
        saveTasks();
        updateCalendar();
        updateTaskList();
    }
}

// Exportación
function exportToPDF() {
    const content = generateExportContent();
    // Aquí iría la lógica para convertir el contenido a PDF
    // Como estamos trabajando sin librerías, podríamos abrir una nueva ventana
    // con el contenido formateado para imprimir
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Agenda Personal - Exportar</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .task-item { margin-bottom: 20px; border-bottom: 1px solid #ccc; }
                    .task-title { font-weight: bold; }
                    @media print {
                        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                ${content}
                <script>
                    window.onload = () => window.print();
                </script>
            </body>
        </html>
    `);
}

function exportToExcel() {
    const content = generateExportContent();
    const csvContent = tasks.map(task => {
        return `"${task.title}","${task.description}","${task.date}","${task.category}","${task.priority}","${task.completed ? 'Completada' : 'Pendiente'}"`;
    }).join('\n');
    
    const header = '"Título","Descripción","Fecha","Categoría","Prioridad","Estado"\n';
    const blob = new Blob([header + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'agenda_personal.csv';
    link.click();
}

function generateExportContent() {
    return `
        <h1>Agenda Personal</h1>
        <h2>Tareas</h2>
        ${tasks.map(task => `
            <div class="task-item">
                <div class="task-title">${task.title}</div>
                <div class="task-description">${task.description}</div>
                <div class="task-meta">
                    Fecha: ${new Date(task.date).toLocaleString('es')}<br>
                    Categoría: ${task.category}<br>
                    Prioridad: ${task.priority}<br>
                    Estado: ${task.completed ? 'Completada' : 'Pendiente'}
                </div>
                ${task.subtasks && task.subtasks.length ? `
                    <div class="subtasks">
                        <h4>Subtareas:</h4>
                        <ul>
                            ${task.subtasks.map(subtask => `
                                <li>${subtask.text} - ${subtask.completed ? 'Completada' : 'Pendiente'}</li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `).join('')}
    `;
}

// Funciones auxiliares
function isToday(year, month, day) {
    const today = new Date();
    return today.getFullYear() === year &&
           today.getMonth() === month &&
           today.getDate() === day;
}

function navigateMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    updateCalendar();
}

function switchView(view) {
    currentView = view;
    document.getElementById('monthView').classList.toggle('active', view === 'month');
    document.getElementById('weekView').classList.toggle('active', view === 'week');
    updateCalendar();
}

function selectDate(year, month, day) {
    const selectedDate = new Date(year, month, day);
    document.getElementById('taskDateTime').value = selectedDate.toISOString().slice(0, 16);
    openTaskModal();
}

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

let previousOperand = '';
let currentOperand = '0';
let memory = 0;
let lastOperation = '';

// Elementos del DOM
const previousOperandElement = document.querySelector('.previous-operand');
const currentOperandElement = document.querySelector('.current-operand');

// Funciones de memoria
function clearMemory() {
    memory = 0;
}

function memoryRecall() {
    currentOperand = memory.toString();
    updateDisplay();
}

function memoryAdd() {
    memory += parseFloat(currentOperand);
}

function memorySubtract() {
    memory -= parseFloat(currentOperand);
}

// Funciones básicas
function clearAll() {
    previousOperand = '';
    currentOperand = '0';
    updateDisplay();
}

function addToExpression(value) {
    if (currentOperand === '0' && value !== '.') {
        currentOperand = value;
    } else {
        currentOperand += value;
    }
    updateDisplay();
}

// Funciones científicas
function calculate(operation) {
    const num = parseFloat(currentOperand);
    let result;

    switch (operation) {
        case 'sin':
            result = Math.sin(num * Math.PI / 180);
            break;
        case 'cos':
            result = Math.cos(num * Math.PI / 180);
            break;
        case 'tan':
            result = Math.tan(num * Math.PI / 180);
            break;
        case 'sqrt':
            result = Math.sqrt(num);
            break;
        case 'pow':
            result = Math.pow(num, 2);
            break;
        case 'exp':
            result = Math.exp(num);
            break;
        case 'log':
            result = Math.log10(num);
            break;
        case 'ln':
            result = Math.log(num);
            break;
        case 'percent':
            result = num / 100;
            break;
        case '1/x':
            result = 1 / num;
            break;
        case 'pi':
            result = Math.PI;
            break;
        case 'e':
            result = Math.E;
            break;
        case '=':
            result = evaluateExpression();
            currentOperand = formatResult(result);
            updateDisplay();
            // Redirigir a la página de Matemáticas Profe Alex después de mostrar el resultado
            setTimeout(() => {
                window.location.href = 'https://matematicasprofealex.wordpress.com/'
            }, 200); // Espera 0.2 segundos para que el usuario pueda ver el resultado
            break;
    }

    if (result !== undefined) {
        previousOperand = currentOperand;
        currentOperand = formatResult(result);
        updateDisplay();
    }
}

// Función para evaluar expresiones matemáticas
function evaluateExpression() {
    try {
        // Reemplazar × por * y otras sustituciones necesarias
        const expression = currentOperand
            .replace(/×/g, '*')
            .replace(/÷/g, '/');
        return Function(`'use strict'; return (${expression})`)();
    } catch (error) {
        return 'Error';
    }
}

// Función para formatear resultados
function formatResult(number) {
    if (isNaN(number)) return 'Error';
    if (!isFinite(number)) return 'Infinity';
    
    // Convertir a string con máximo 10 decimales
    const result = number.toPrecision(10);
    
    // Eliminar ceros finales después del punto decimal
    return parseFloat(result).toString();
}

// Actualizar la pantalla
function updateDisplay() {
    previousOperandElement.textContent = previousOperand;
    currentOperandElement.textContent = currentOperand;
}

// Manejo de entrada por teclado
document.addEventListener('keydown', (event) => {
    if (event.key >= '0' && event.key <= '9' || event.key === '.') {
        addToExpression(event.key);
    } else if (event.key === '+' || event.key === '-' || event.key === '*' || event.key === '/') {
        addToExpression(event.key);
    } else if (event.key === 'Enter' || event.key === '=') {
        calculate('=');
    } else if (event.key === 'Escape') {
        clearAll();
    } else if (event.key === 'Backspace') {
        currentOperand = currentOperand.slice(0, -1);
        if (currentOperand === '') currentOperand = '0';
        updateDisplay();
    }
}); 