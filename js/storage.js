// Storage Module
const Storage = (() => {
  const STORAGE_KEY = 'planner_projects_v3';
  const DARK_MODE_KEY = 'darkMode';

  function getAllProjects() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  }

  function saveProject(name, tasks) {
    const projects = getAllProjects();
    projects[name] = { tasks, savedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }

  function loadProject(name) {
    const projects = getAllProjects();
    return projects[name]?.tasks || null;
  }

  function deleteProject(name) {
    const projects = getAllProjects();
    delete projects[name];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }

  function getProjectNames() {
    return Object.keys(getAllProjects());
  }

  function getDarkMode() {
    return localStorage.getItem(DARK_MODE_KEY) === 'true';
  }

  function setDarkMode(enabled) {
    localStorage.setItem(DARK_MODE_KEY, enabled);
  }

  return { saveProject, loadProject, deleteProject, getProjectNames, getAllProjects, getDarkMode, setDarkMode };
})();