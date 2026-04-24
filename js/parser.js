// Parser Module - Enhanced to extract Request # from Task Name
const Parser = (() => {
  /**
   * Extract request number and clean task name
   * Patterns: "ITSR #1234 : SERVER PC" or "IT Service Request #5678 : LAPTOP REPAIR"
   */
  function extractRequestInfo(taskName) {
    const patterns = [
      /(IT\s*Service\s*Request\s*#\s*(\d+))\s*:\s*(.*)/i,
      /(ITSR\s*#\s*(\d+))\s*:\s*(.*)/i,
      /(Request\s*#\s*(\d+))\s*:\s*(.*)/i,
      /(REQ\s*#\s*(\d+))\s*:\s*(.*)/i,
      /(Ticket\s*#\s*(\d+))\s*:\s*(.*)/i,
    ];

    for (const pattern of patterns) {
      const match = taskName.match(pattern);
      if (match) {
        return {
          requestNumber: match[1].trim(),
          cleanTaskName: match[3].trim(),
        };
      }
    }

    // No match found
    return {
      requestNumber: '',
      cleanTaskName: taskName,
    };
  }

  function parseText(inputText) {
    if (!inputText || typeof inputText !== 'string') return [];
    
    const lines = inputText.split(/\r?\n/);
    if (lines.length === 0) return [];
    
    const firstLine = lines[0];
    let delimiter = '\t';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(',')) delimiter = ',';
    else delimiter = /\s{2,}|\t/;
    
    const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/\s+/g, ' '));
    
    // Column mapping
    const colMap = {
      taskName: findColumn(headers, ['task name', 'task', 'title', 'name']),
      project: findColumn(headers, ['project', 'bucket', 'category']),
      priority: findColumn(headers, ['priority', 'severity', 'urgency']),
      createdBy: findColumn(headers, ['created by', 'creator', 'reported by']),
      createdDate: findColumn(headers, ['created date', 'created', 'open date', 'reported date']),
      assignedTo: findColumn(headers, ['assigned to', 'assigned', 'assignee', 'owner']),
      startedDate: findColumn(headers, ['started date', 'start date', 'start']),
      dueDate: findColumn(headers, ['due date', 'deadline', 'target date']),
      completedDate: findColumn(headers, ['completed date', 'completion date', 'closed date', 'resolved date']),
      status: findColumn(headers, ['status', 'state', 'progress']),
    };

    const tasks = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = line.split(delimiter).map(c => c.trim());
      if (cols.length === 0) continue;
      
      const rawTaskName = getCol(cols, colMap.taskName, 0) || 'Unnamed';
      const { requestNumber, cleanTaskName } = extractRequestInfo(rawTaskName);
      
      const task = {
        requestNumber,
        taskName: cleanTaskName,
        project: getCol(cols, colMap.project, 1) || 'No Project',
        priority: getCol(cols, colMap.priority, 2) || 'Medium',
        createdBy: getCol(cols, colMap.createdBy, -1) || '',
        createdDate: getCol(cols, colMap.createdDate, -1) || '',
        assignedTo: getCol(cols, colMap.assignedTo, 3) || 'Unassigned',
        startedDate: getCol(cols, colMap.startedDate, -1) || '',
        dueDate: getCol(cols, colMap.dueDate, 4) || '',
        completedDate: getCol(cols, colMap.completedDate, -1) || '',
        status: getCol(cols, colMap.status, 5) || 'Not Started',
      };

      // Combine createdBy/createdDate
      if (task.createdBy && task.createdDate) {
        task.createdDisplay = `${task.createdBy} / ${task.createdDate}`;
      } else {
        task.createdDisplay = task.createdBy || task.createdDate || '';
      }

      // Combine startedDate/dueDate
      if (task.startedDate && task.dueDate) {
        task.dateDisplay = `${task.startedDate} / ${task.dueDate}`;
      } else {
        task.dateDisplay = task.startedDate || task.dueDate || '';
      }

      if (rawTaskName.toLowerCase() === 'task name') continue;
      
      tasks.push(task);
    }
    
    return tasks;
  }

  function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const csvData = XLSX.utils.sheet_to_csv(firstSheet);
          resolve(parseText(csvData));
        } catch (error) { reject(error); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  function findColumn(headers, possibleNames) {
    for (const name of possibleNames) {
      const idx = headers.findIndex(h => h.includes(name));
      if (idx !== -1) return idx;
    }
    return -1;
  }

  function getCol(cols, index, fallbackIndex) {
    if (index !== -1 && index < cols.length) return cols[index];
    if (fallbackIndex !== -1 && fallbackIndex < cols.length) return cols[fallbackIndex];
    return '';
  }

  return { parseText, parseExcelFile, extractRequestInfo };
})();