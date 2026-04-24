// UI Module - Table rendering with dropdown filters
const UI = (() => {
  let currentTasks = [];
  let activeFilters = {}; // { column: selectedValue }

  const elements = {};
  
  function init() {
    // Cache all DOM elements
    cacheElements();
    setupEventListeners();
    loadSampleData();
    loadSavedProjectsList();
    
    if (Storage.getDarkMode()) {
      document.body.classList.add('dark-mode');
    }
  }

  function cacheElements() {
    const ids = [
      'textarea','arrangeBtn','sampleBtn','clearBtn','outputContainer',
      'statsBar','searchInput','viewButtons','darkModeToggle',
      'pasteTab','uploadTab','pasteMode','uploadMode',
      'dropZone','fileInput','fileName','saveProjectBtn',
      'savedProjectsList','exportCsvBtn','exportPdfBtn',
      'tableBody','filterDropdown',
    ];
    ids.forEach(id => {
      // Use getElementById or querySelector
      const el = document.getElementById(id);
      if (el) elements[id] = el;
    });
    // Fix: textarea is excelInput
    elements.textarea = document.getElementById('excelInput');
    elements.tableBody = document.getElementById('tableBody');
    elements.filterDropdown = document.getElementById('filterDropdown');
  }

  const sampleData = `Task Name	Project	Priority	Created by	Created Date	Assigned to	Started date	Due Date	Completed Date	Status
ITSR #1234 : SERVER PC MAINTENANCE	IT Support	High	John Doe	2025-01-10	Jane Smith	2025-01-12	2025-01-20	2025-01-18	Completed
IT Service Request #5678 : LAPTOP REPAIR	Hardware	Medium	Alice Brown	2025-02-01	Bob Wilson	2025-02-05	2025-02-15		In Progress
ITSR #9012 : NETWORK UPGRADE	Infrastructure	High	Charlie Davis	2025-03-01	Jane Smith	2025-03-05	2025-03-25		In Progress
Request #3456 : EMAIL SETUP	IT Support	Low	John Doe	2025-01-15	Alice Brown	2025-01-16	2025-01-17	2025-01-17	Completed
REQ #7890 : PRINTER INSTALL	Hardware	Medium	Bob Wilson	2025-02-20	Charlie Davis	2025-02-22	2025-02-28	2025-02-27	Completed
Ticket #1111 : VPN ACCESS	Security	High	Jane Smith	2025-04-01	John Doe	2025-04-02	2025-04-10		Not Started
DATABASE BACKUP	Infrastructure	Low	Alice Brown	2025-03-10	Bob Wilson	2025-03-11	2025-03-12	2025-03-12	Completed
ITSR #2222 : FIREWALL CONFIG	Security	High	Charlie Davis	2025-04-05	Jane Smith	2025-04-06	2025-04-15		Blocked`;

  function loadSampleData() {
    elements.textarea.value = sampleData;
    handleArrange();
  }

  function setupEventListeners() {
    elements.arrangeBtn.addEventListener('click', handleArrange);
    elements.sampleBtn.addEventListener('click', loadSampleData);
    elements.clearBtn.addEventListener('click', clearAll);
    elements.searchInput.addEventListener('input', () => renderTable());
    elements.darkModeToggle.addEventListener('click', toggleDarkMode);
    elements.pasteTab.addEventListener('click', () => switchInputMode('paste'));
    elements.uploadTab.addEventListener('click', () => switchInputMode('upload'));
    elements.saveProjectBtn.addEventListener('click', saveCurrentProject);
    elements.exportCsvBtn.addEventListener('click', exportCSV);
    elements.exportPdfBtn.addEventListener('click', () => window.print());
    
    // File upload
    elements.dropZone.addEventListener('click', () => elements.fileInput.click());
    elements.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); });
    elements.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    });
    elements.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleFileUpload(file);
    });

    // Table header click for filters
    document.querySelector('#taskTable thead').addEventListener('click', (e) => {
      const th = e.target.closest('th');
      if (!th) return;
      const column = th.dataset.column;
      if (column) showFilterDropdown(column, th);
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!elements.filterDropdown.contains(e.target) && !e.target.closest('th')) {
        elements.filterDropdown.classList.add('hidden');
      }
    });

    elements.textarea.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleArrange(); }
    });
  }

  function handleArrange() {
    currentTasks = Parser.parseText(elements.textarea.value);
    activeFilters = {};
    renderTable();
  }

  async function handleFileUpload(file) {
    elements.fileName.textContent = `📄 ${file.name}`;
    try {
      currentTasks = await Parser.parseExcelFile(file);
      activeFilters = {};
      renderTable();
    } catch (error) {
      alert('Error reading file: ' + error.message);
    }
  }

  function renderTable() {
    const searchTerm = elements.searchInput?.value || '';
    let tasks = Grouper.filterTasks(currentTasks, searchTerm);

    // Apply column filters
    Object.entries(activeFilters).forEach(([column, value]) => {
      if (value) {
        tasks = tasks.filter(t => t[column] === value);
      }
    });

    const stats = Grouper.getStats(currentTasks);
    updateStats(stats, tasks.length);

    if (tasks.length === 0) {
      elements.tableBody.innerHTML = `
        <tr><td colspan="9" class="empty-state">
          <span class="empty-icon">📭</span>
          <p>No tasks match your filters</p>
        </td></tr>`;
      return;
    }

    let html = '';
    tasks.forEach(task => {
      html += `
        <tr>
          <td class="request-cell">${task.requestNumber || '—'}</td>
          <td class="task-name-cell">${esc(task.taskName)}</td>
          <td>${esc(task.project)}</td>
          <td>${renderPriorityBadge(task.priority)}</td>
          <td>${esc(task.createdDisplay || '—')}</td>
          <td>${esc(task.assignedTo)}</td>
          <td>${esc(task.dateDisplay || '—')}</td>
          <td>${esc(task.completedDate || '—')}</td>
          <td>${renderStatusBadge(task.status)}</td>
        </tr>`;
    });

    elements.tableBody.innerHTML = html;
    
    // Update header active states
    document.querySelectorAll('#taskTable th').forEach(th => {
      const col = th.dataset.column;
      if (activeFilters[col]) {
        th.classList.add('active-filter');
      } else {
        th.classList.remove('active-filter');
      }
    });
  }

  function showFilterDropdown(column, thElement) {
    const values = Grouper.getUniqueValues(currentTasks, column);
    
    let html = `<div class="filter-option filter-option-all" data-value="">
      <span class="check">${!activeFilters[column] ? '✓' : ''}</span> All
    </div>`;
    
    values.forEach(val => {
      const isSelected = activeFilters[column] === val;
      html += `<div class="filter-option${isSelected ? ' selected' : ''}" data-value="${esc(val)}">
        <span class="check">${isSelected ? '✓' : ''}</span> ${esc(val)}
      </div>`;
    });

    html += `<div class="filter-clear" data-column="${column}">Clear Filter</div>`;
    
    elements.filterDropdown.innerHTML = html;
    
    // Position dropdown
    const rect = thElement.getBoundingClientRect();
    elements.filterDropdown.style.top = `${rect.bottom + 5}px`;
    elements.filterDropdown.style.left = `${rect.left}px`;
    elements.filterDropdown.classList.remove('hidden');

    // Filter option clicks
    elements.filterDropdown.querySelectorAll('.filter-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = opt.dataset.value;
        if (value === '') {
          delete activeFilters[column];
        } else {
          activeFilters[column] = value;
        }
        elements.filterDropdown.classList.add('hidden');
        renderTable();
      });
    });

    // Clear filter
    elements.filterDropdown.querySelector('.filter-clear').addEventListener('click', (e) => {
      e.stopPropagation();
      delete activeFilters[column];
      elements.filterDropdown.classList.add('hidden');
      renderTable();
    });
  }

  function renderPriorityBadge(priority) {
    const p = (priority || 'medium').toLowerCase();
    let cls = 'priority-medium';
    if (p.includes('high') || p.includes('critical')) cls = 'priority-high';
    else if (p.includes('low')) cls = 'priority-low';
    return `<span class="priority-badge ${cls}">${esc(priority)}</span>`;
  }

  function renderStatusBadge(status) {
    const s = (status || 'not started').toLowerCase();
    let cls = 'status-not-started';
    if (s.includes('complete') || s.includes('done')) cls = 'status-completed';
    else if (s.includes('progress')) cls = 'status-in-progress';
    else if (s.includes('block')) cls = 'status-blocked';
    return `<span class="status-badge ${cls}">${esc(status)}</span>`;
  }

  function updateStats(stats, filteredCount) {
    elements.statsBar.innerHTML = `
      <div class="stat-item">📋 Total: <strong>${stats.total}</strong></div>
      <div class="stat-item">✅ Completed: <strong>${stats.completed}</strong></div>
      <div class="stat-item">🔄 In Progress: <strong>${stats.inProgress}</strong></div>
      <div class="stat-item">⏳ Not Started: <strong>${stats.notStarted}</strong></div>
      ${filteredCount !== stats.total ? `<div class="stat-item">🔍 Showing: <strong>${filteredCount}</strong></div>` : ''}
    `;
  }

  function switchInputMode(mode) {
    elements.pasteMode.classList.toggle('hidden', mode !== 'paste');
    elements.uploadMode.classList.toggle('hidden', mode !== 'upload');
    elements.pasteTab.classList.toggle('active', mode === 'paste');
    elements.uploadTab.classList.toggle('active', mode === 'upload');
  }

  function clearAll() {
    elements.textarea.value = '';
    currentTasks = [];
    activeFilters = {};
    elements.tableBody.innerHTML = `<tr><td colspan="9" class="empty-state"><span class="empty-icon">🚀</span><p>Ready to arrange</p></td></tr>`;
    elements.statsBar.innerHTML = '';
    elements.searchInput.value = '';
  }

  function saveCurrentProject() {
    if (currentTasks.length === 0) return alert('No tasks to save!');
    const name = prompt('Project name:');
    if (name) {
      Storage.saveProject(name, currentTasks);
      loadSavedProjectsList();
    }
  }

  function loadSavedProjectsList() {
    const projects = Storage.getAllProjects();
    const names = Object.keys(projects);
    if (names.length === 0) {
      elements.savedProjectsList.innerHTML = '<p class="empty-text">No saved projects yet</p>';
      return;
    }
    let html = '';
    names.forEach(name => {
      html += `<div class="saved-item" data-name="${esc(name)}">
        <span>📁 ${esc(name)}</span>
        <div>
          <button class="btn btn-sm btn-outline load-proj">📂 Load</button>
          <button class="btn btn-sm btn-outline del-proj">🗑️</button>
        </div>
      </div>`;
    });
    elements.savedProjectsList.innerHTML = html;
    
    elements.savedProjectsList.querySelectorAll('.load-proj').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const name = e.target.closest('.saved-item').dataset.name;
        const tasks = Storage.loadProject(name);
        if (tasks) {
          currentTasks = tasks;
          activeFilters = {};
          renderTable();
        }
      });
    });
    elements.savedProjectsList.querySelectorAll('.del-proj').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const name = e.target.closest('.saved-item').dataset.name;
        if (confirm(`Delete "${name}"?`)) {
          Storage.deleteProject(name);
          loadSavedProjectsList();
        }
      });
    });
  }

  function exportCSV() {
    if (currentTasks.length === 0) return alert('No tasks to export!');
    const headers = ['Request #','Task Name','Project','Priority','Created by/Created Date','Assigned to','Started/Due Date','Completed Date','Status'];
    const rows = currentTasks.map(t => [
      t.requestNumber, t.taskName, t.project, t.priority,
      t.createdDisplay, t.assignedTo, t.dateDisplay,
      t.completedDate, t.status
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'planner-tasks.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    Storage.setDarkMode(document.body.classList.contains('dark-mode'));
  }

  function esc(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => UI.init());