// Grouper Module - Filtering and grouping
const Grouper = (() => {
  function filterTasks(tasks, searchTerm) {
    if (!searchTerm.trim()) return tasks;
    const term = searchTerm.toLowerCase();
    return tasks.filter(t => 
      t.requestNumber.toLowerCase().includes(term) ||
      t.taskName.toLowerCase().includes(term) ||
      t.project.toLowerCase().includes(term) ||
      t.assignedTo.toLowerCase().includes(term) ||
      t.status.toLowerCase().includes(term) ||
      t.priority.toLowerCase().includes(term) ||
      t.createdBy.toLowerCase().includes(term)
    );
  }

  function getUniqueValues(tasks, column) {
    const values = new Set();
    tasks.forEach(t => {
      const val = t[column];
      if (val) values.add(val);
    });
    return Array.from(values).sort();
  }

  function getStats(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(t => 
      t.status.toLowerCase().includes('complete') || t.status.toLowerCase() === 'done'
    ).length;
    const inProgress = tasks.filter(t => 
      t.status.toLowerCase().includes('progress') || t.status.toLowerCase() === 'in progress'
    ).length;
    const notStarted = tasks.filter(t => 
      t.status.toLowerCase().includes('not started') || t.status.toLowerCase() === 'pending'
    ).length;

    return { total, completed, inProgress, notStarted };
  }

  return { filterTasks, getUniqueValues, getStats };
})();