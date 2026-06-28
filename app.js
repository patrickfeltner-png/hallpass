const actualToday = new Date();
const actualISODate = toISODate(actualToday);
const isoToday = latestSchoolDate(actualToday);

const state = {
  role: "teacher",
  email: "",
  teacherAuthenticated: false,
  page: {
    name: "6th Grade ELA - Homeroom",
    code: "HART-ELA6",
    subject: "English Language Arts",
    grade: "6"
  },
  classes: [],
  activeClassId: "",
  selectedStandardCodes: [],
  standardsPickerVersion: 0,
  selectedDates: [isoToday],
  dateConfigs: {},
  calendarMonth: isoToday.slice(0, 7),
  generatedDrafts: {},
  ringers: {},
  ringersByClass: {},
  submissions: [],
  approvedTeachers: ["patrick.feltner@knott.kyschools.us"],
  pendingTeacherApprovals: [],
  students: [
    { name: "Avery Johnson", email: "avery.johnson@stu.fayette.kyschools.us" },
    { name: "Maya Chen", email: "maya.chen@stu.fayette.kyschools.us" },
    { name: "Jordan Smith", email: "jordan.smith@stu.fayette.kyschools.us" }
  ]
};

const teacherCredentials = {
  "patrick.feltner@knott.kyschools.us": "Smackdown!19",
  "ms.hart@fayette.kyschools.us": "BellRinger2026!",
  "teacher@school.edu": "BellRinger2026!"
};

const fallbackStandards = [
  ["KY.5.RI.2", "English Language Arts", "5", "Determine two or more main ideas of a text and explain how they are supported by key details."],
  ["KY.5.RL.1", "English Language Arts", "5", "Quote accurately from a text when explaining what the text says explicitly and when drawing inferences."],
  ["KY.5.NF.6", "Mathematics", "5", "Solve real world problems involving multiplication of fractions and mixed numbers."],
  ["KY.5.MD.1", "Mathematics", "5", "Convert among different-sized standard measurement units within a given measurement system."],
  ["KY.5-PS1-3", "Science", "5", "Make observations and measurements to identify materials based on their properties."],
  ["KY.SS.5.H.CH.1", "Social Studies", "5", "Explain how people and events influenced the development of the United States."],
  ["KY.6.RI.2", "English Language Arts", "6", "Determine a central idea of a text and how it is conveyed through particular details."],
  ["KY.6.RL.1", "English Language Arts", "6", "Cite textual evidence to support analysis of what the text says explicitly and inferences drawn from the text."],
  ["KY.6.NS.1", "Mathematics", "6", "Interpret and compute quotients of fractions, and solve word problems involving division of fractions by fractions."],
  ["KY.6.EE.6", "Mathematics", "6", "Use variables to represent numbers and write expressions when solving real-world problems."],
  ["KY.MS-PS1-2", "Science", "6", "Analyze and interpret data on the properties of substances before and after the substances interact."],
  ["KY.SS.6.G.KGE.1", "Social Studies", "6", "Use maps, charts, and graphs to explain how geography influences settlement and culture."],
  ["KY.7.W.2", "English Language Arts", "7", "Write informative or explanatory texts to examine a topic and convey ideas clearly."],
  ["KY.7.RI.8", "English Language Arts", "7", "Trace and evaluate the argument and specific claims in a text."],
  ["KY.7.RP.2", "Mathematics", "7", "Recognize and represent proportional relationships between quantities."],
  ["KY.7.EE.4", "Mathematics", "7", "Use variables to represent quantities in a real-world problem and construct equations or inequalities."],
  ["KY.MS-LS2-1", "Science", "7", "Analyze and interpret data to provide evidence for the effects of resource availability on organisms."],
  ["KY.SS.7.H.CH.1", "Social Studies", "7", "Explain how historical events and human choices shaped civilizations and societies."],
  ["KY.8.SL.4", "English Language Arts", "8", "Present claims and findings with relevant evidence, sound reasoning, and well-chosen details."],
  ["KY.8.RI.6", "English Language Arts", "8", "Determine an author's point of view or purpose and analyze how the author responds to conflicting evidence."],
  ["KY.8.EE.5", "Mathematics", "8", "Graph proportional relationships, interpreting the unit rate as the slope of the graph."],
  ["KY.8.F.4", "Mathematics", "8", "Construct a function to model a linear relationship between two quantities."],
  ["KY.MS-ESS2-2", "Science", "8", "Construct an explanation based on evidence for how geoscience processes have changed Earth's surface."],
  ["KY.SS.8.C.CP.2", "Social Studies", "8", "Analyze how the Constitution and civic principles affect rights and responsibilities."]
].map(([code, subject, grade, text]) => ({ code, subject, grade, text }));

const standards = Array.isArray(window.BELLRINGER_STANDARDS) && window.BELLRINGER_STANDARDS.length
  ? window.BELLRINGER_STANDARDS
  : fallbackStandards;

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  hydrate();
  migrateState();
  seedInitialData();
  bindEvents();
  populateSelects();
  renderAll();
  setView(state.role === "teacher" && state.teacherAuthenticated ? "teacher" : "student");
});

function cacheElements() {
  [
    "emailInput", "passwordField", "passwordInput", "signInButton", "signOutButton", "signinMessage", "activeUser", "activeRole", "todayPill", "pageTitle",
    "pageForm", "classSelect", "classList", "newClassButton", "pageName", "joinCode", "subjectSelect", "gradeSelect", "standardSearch", "standardsSelect", "standardsCount", "standardsList", "standardsMenuLabel", "classesMessage",
    "approvalList",
    "ringerForm", "dateStart", "dateEnd", "selectRangeButton", "dokSelect", "questionType", "teacherPrompt", "applyToAllButton", "dateSetupList", "questionText", "generateButton",
    "teacherMessage", "prevMonthButton", "nextMonthButton", "calendarMonthLabel", "teacherCalendar",
    "selectedStandardsList", "selectedDatesList", "studentDate", "calendarSummary", "assignmentMeta",
    "studentQuestion", "answerForm", "studentAnswer", "studentFeedback", "gradebookRange", "gradebookDate",
    "gradebookStats", "gradebookBody"
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function hydrate() {
  const saved = localStorage.getItem("bellringer-state");
  if (!saved) return;

  try {
    Object.assign(state, JSON.parse(saved));
  } catch {
    localStorage.removeItem("bellringer-state");
  }
}

function migrateState() {
  if (!Array.isArray(state.selectedStandardCodes)) state.selectedStandardCodes = [];
  state.selectedStandardCodes = state.selectedStandardCodes.filter((code) => standards.some((item) => item.code === code));
  if (state.standardsPickerVersion !== 4) {
    state.selectedStandardCodes = [];
    Object.values(state.dateConfigs || {}).forEach((config) => {
      config.standardCodes = [];
    });
    state.standardsPickerVersion = 4;
  }
  if (!Array.isArray(state.selectedDates) || !state.selectedDates.length) state.selectedDates = [isoToday];
  state.selectedDates = unique(state.selectedDates).filter((date) => isSchoolDay(date)).sort();
  if (!state.selectedDates.length) state.selectedDates = [isoToday];
  if (!state.generatedDrafts) state.generatedDrafts = {};
  if (!state.dateConfigs || typeof state.dateConfigs !== "object") state.dateConfigs = {};
  if (!Array.isArray(state.approvedTeachers)) state.approvedTeachers = ["patrick.feltner@knott.kyschools.us"];
  if (!Array.isArray(state.pendingTeacherApprovals)) state.pendingTeacherApprovals = [];
  delete state.approvedStudents;
  delete state.pendingApprovals;
  state.calendarMonth = actualISODate.slice(0, 7);
  if (!standards.some((item) => item.grade === state.page.grade)) state.page.grade = "6";
  if (!Array.isArray(state.classes) || !state.classes.length) {
    const firstClass = { id: "class-default", ...state.page };
    state.classes = [firstClass];
    state.activeClassId = firstClass.id;
  }
  if (!state.activeClassId || !state.classes.some((item) => item.id === state.activeClassId)) {
    state.activeClassId = state.classes[0].id;
  }
  const activeClass = state.classes.find((item) => item.id === state.activeClassId);
  state.page = { name: activeClass.name, code: activeClass.code, subject: activeClass.subject, grade: activeClass.grade };
  if (!state.ringersByClass || typeof state.ringersByClass !== "object") state.ringersByClass = {};
  if (!state.ringersByClass[state.activeClassId]) {
    state.ringersByClass[state.activeClassId] = state.ringers || {};
  }
  state.submissions = (state.submissions || []).map((submission) => ({
    ...submission,
    classId: submission.classId || state.activeClassId
  }));
}

function persist() {
  localStorage.setItem("bellringer-state", JSON.stringify(state));
}

function seedInitialData() {
  if (state.activeClassId !== "class-default") return;
  const ringers = activeRingers();

  if (!ringers[isoToday]) {
    const standard = standards.find((item) => item.code === "KY.6.RI.2");
    ringers[isoToday] = buildRinger(isoToday, [standard], "2", "KSA-style reading response", ksaPrompt({
      date: isoToday,
      subject: "English Language Arts",
      grade: "6",
      standards: [standard],
      dok: "2",
      questionType: "KSA-style reading response"
    }));
  }

  const previous = previousSchoolDay(isoToday);
  if (!ringers[previous]) {
    const standard = standards.find((item) => item.code === "KY.6.NS.1");
    ringers[previous] = buildRinger(previous, [standard], "2", "KSA-style math problem", ksaPrompt({
      date: previous,
      subject: "Mathematics",
      grade: "6",
      standards: [standard],
      dok: "2",
      questionType: "KSA-style math problem"
    }));
  }

  persist();
}

function bindEvents() {
  document.querySelectorAll("[data-role]").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.role !== button.dataset.role) {
        state.email = "";
        state.teacherAuthenticated = false;
      }
      state.role = button.dataset.role;
      renderAll();
      setView("student");
    });
  });

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  els.signInButton.addEventListener("click", signIn);
  if (els.signOutButton) els.signOutButton.addEventListener("click", signOut);
  if (els.classSelect) els.classSelect.addEventListener("change", () => switchClass(els.classSelect.value));
  if (els.newClassButton) els.newClassButton.addEventListener("click", createNewClass);
  els.standardSearch.addEventListener("input", renderStandards);
  if (els.standardsSelect) els.standardsSelect.addEventListener("change", handleStandardsSelectChange);
  els.studentDate.addEventListener("change", renderStudentAssignment);
  els.gradebookRange.addEventListener("change", renderGradebook);
  els.gradebookDate.addEventListener("change", renderGradebook);
  els.dokSelect.addEventListener("change", invalidateSelectedDrafts);
  els.questionType.addEventListener("change", invalidateSelectedDrafts);
  els.teacherPrompt.addEventListener("input", invalidateSelectedDrafts);
  els.applyToAllButton.addEventListener("click", applyWeeklySetupToAllDates);
  els.dateSetupList.addEventListener("input", handleDateConfigChange);
  els.dateSetupList.addEventListener("change", handleDateConfigChange);
  els.generateButton.addEventListener("click", generateQuestions);
  els.ringerForm.addEventListener("submit", publishRingers);
  els.answerForm.addEventListener("submit", submitAnswer);
  els.prevMonthButton.addEventListener("click", () => moveCalendar(-1));
  els.nextMonthButton.addEventListener("click", () => moveCalendar(1));

  els.selectRangeButton.addEventListener("click", selectDateRange);

  els.pageForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!requireTeacherAccess()) return;
    state.page.name = els.pageName.value.trim() || state.page.name;
    state.page.code = els.joinCode.value.trim() || state.page.code;
    state.page.subject = els.subjectSelect.value;
    state.page.grade = els.gradeSelect.value;
    saveActiveClassRecord();
    resetDateStandardsForClass();
    setMessage(els.classesMessage, "Class saved. It is ready to use in Teacher Studio.", "teacher-ok");
    persist();
    renderAll();
  });

  els.subjectSelect.addEventListener("change", () => {
    state.page.subject = els.subjectSelect.value;
    resetDateStandardsForClass();
    saveActiveClassRecord();
    invalidateSelectedDrafts();
    persist();
    renderStandards();
    renderDateSetupList();
  });

  els.gradeSelect.addEventListener("change", () => {
    state.page.grade = els.gradeSelect.value;
    resetDateStandardsForClass();
    saveActiveClassRecord();
    invalidateSelectedDrafts();
    persist();
    renderStandards();
    renderDateSetupList();
  });
}

function populateSelects() {
  const subjects = unique(standards.map((item) => item.subject));
  const grades = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
    .filter((grade) => standards.some((item) => item.grade === grade));

  els.subjectSelect.innerHTML = subjects.map((subject) => `<option>${subject}</option>`).join("");
  els.gradeSelect.innerHTML = grades.map((grade) => `<option>${grade}</option>`).join("");
  els.subjectSelect.value = state.page.subject;
  els.gradeSelect.value = state.page.grade;
}

function renderAll() {
  document.querySelectorAll("[data-role]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.role === state.role);
  });

  els.todayPill.textContent = actualISODate === isoToday
    ? `School day: ${formatLongDate(isoToday)}`
    : `Latest school day: ${formatLongDate(isoToday)}`;
  els.activeUser.textContent = state.email || "Not signed in";
  els.activeRole.textContent = state.email
    ? state.teacherAuthenticated ? "Teacher mode verified" : `${capitalize(state.role)} mode`
    : "Choose a role to begin";
  if (els.signOutButton) els.signOutButton.hidden = !state.email;
  els.passwordField.hidden = state.role !== "teacher";
  renderClassSelect();
  renderClassList();
  els.pageName.value = state.page.name;
  els.joinCode.value = state.page.code;
  els.subjectSelect.value = state.page.subject;
  els.gradeSelect.value = state.page.grade;
  els.studentDate.max = isoToday;
  els.gradebookDate.max = isoToday;
  els.dateStart.value = state.selectedDates[0] || isoToday;
  els.dateEnd.value = state.selectedDates[state.selectedDates.length - 1] || isoToday;
  els.studentDate.value ||= isoToday;
  els.gradebookDate.value ||= isoToday;

  renderStandards();
  renderApprovals();
  renderTeacherCalendar();
  renderSelectedSummaries();
  renderDateSetupList();
  renderDraftPreview();
  renderStudentAssignment();
  renderGradebook();
}

function setView(viewName) {
  if (!canOpenView(viewName)) {
    setMessage(els.signinMessage, "Teacher Studio and Gradebook require a teacher password.", "teacher-error");
    viewName = "student";
  }

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === viewName);
  });

  document.querySelectorAll(".view-panel").forEach((panel) => panel.classList.remove("is-visible"));
  document.getElementById(`${viewName}View`).classList.add("is-visible");
  els.pageTitle.textContent = {
    teacher: "Teacher Studio",
    classes: "Classes",
    student: "Student Bell",
    gradebook: "Gradebook"
  }[viewName];
}

function signIn() {
  const email = els.emailInput.value.trim().toLowerCase();
  const isSchoolEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !email.endsWith("@gmail.com") && !email.endsWith("@yahoo.com");

  if (!isSchoolEmail) {
    setMessage(els.signinMessage, "Use a school email address to continue.", "teacher-error");
    return;
  }

  if (state.role === "teacher" && !state.approvedTeachers.includes(email)) {
    requestTeacherApproval(email);
    state.email = "";
    state.teacherAuthenticated = false;
    setMessage(els.signinMessage, "Teacher account request sent for approval.", "teacher-ok");
    persist();
    renderAll();
    return;
  }

  if (state.role === "teacher" && !isValidTeacherLogin(email, els.passwordInput.value)) {
    state.email = "";
    state.teacherAuthenticated = false;
    setMessage(els.signinMessage, "That teacher email and password do not match.", "teacher-error");
    renderAll();
    return;
  }

  state.email = email;
  state.teacherAuthenticated = state.role === "teacher";

  if (state.role === "student") {
    if (!state.students.some((student) => student.email === email)) {
      state.students.push({ name: nameFromEmail(email), email });
    }
  }

  setMessage(els.signinMessage, `Welcome, ${nameFromEmail(email)}.`, "teacher-ok");
  persist();
  renderAll();
  setView(state.role === "teacher" ? "teacher" : "student");
}

function signOut() {
  state.email = "";
  state.teacherAuthenticated = false;
  els.passwordInput.value = "";
  persist();
  renderAll();
  setView("student");
  setMessage(els.signinMessage, "You have been signed out.", "teacher-ok");
}

function activeRingers() {
  if (!state.ringersByClass || typeof state.ringersByClass !== "object") state.ringersByClass = {};
  if (!state.ringersByClass[state.activeClassId]) state.ringersByClass[state.activeClassId] = {};
  return state.ringersByClass[state.activeClassId];
}

function renderClassSelect() {
  if (!els.classSelect) return;
  els.classSelect.innerHTML = state.classes
    .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)} — Grade ${escapeHtml(item.grade)} ${escapeHtml(item.subject)}</option>`)
    .join("");
  els.classSelect.value = state.activeClassId;
}

function renderClassList() {
  if (!els.classList) return;
  els.classList.innerHTML = state.classes.map((item) => `
    <button class="class-list-item ${item.id === state.activeClassId ? "is-active" : ""}" type="button" data-class-id="${escapeHtml(item.id)}">
      <strong>${escapeHtml(item.name)}</strong>
      <span>${escapeHtml(item.subject)} · Grade ${escapeHtml(item.grade)} · ${escapeHtml(item.code)}</span>
    </button>
  `).join("");
  els.classList.querySelectorAll("[data-class-id]").forEach((button) => {
    button.addEventListener("click", () => switchClass(button.dataset.classId));
  });
}

function saveActiveClassRecord() {
  const current = state.classes.find((item) => item.id === state.activeClassId);
  if (!current) return;
  Object.assign(current, {
    name: state.page.name,
    code: state.page.code,
    subject: state.page.subject,
    grade: state.page.grade
  });
}

function resetPlannerForClass() {
  state.selectedStandardCodes = [];
  state.selectedDates = [isoToday];
  state.dateConfigs = {};
  state.generatedDrafts = {};
  state.calendarMonth = isoToday.slice(0, 7);
  if (els.standardSearch) els.standardSearch.value = "";
}

function switchClass(classId) {
  if (!classId || classId === state.activeClassId) return;
  saveActiveClassRecord();
  const nextClass = state.classes.find((item) => item.id === classId);
  if (!nextClass) return;
  state.activeClassId = nextClass.id;
  state.page = {
    name: nextClass.name,
    code: nextClass.code,
    subject: nextClass.subject,
    grade: nextClass.grade
  };
  activeRingers();
  resetPlannerForClass();
  persist();
  renderAll();
  setMessage(els.teacherMessage, `${nextClass.name} is now active.`, "teacher-ok");
}

function createNewClass() {
  if (!requireTeacherAccess()) return;
  saveActiveClassRecord();
  const number = state.classes.length + 1;
  const newClass = {
    id: `class-${Date.now()}`,
    name: `New Class ${number}`,
    code: `CLASS-${String(Date.now()).slice(-4)}`,
    subject: state.page.subject,
    grade: state.page.grade
  };
  state.classes.push(newClass);
  state.activeClassId = newClass.id;
  state.page = { name: newClass.name, code: newClass.code, subject: newClass.subject, grade: newClass.grade };
  state.ringersByClass[newClass.id] = {};
  resetPlannerForClass();
  persist();
  renderAll();
  setView("classes");
  setMessage(els.classesMessage, "New class created. Add its name, subject, and grade, then click Save class.", "teacher-ok");
  els.pageName.focus();
  els.pageName.select();
}

function renderStandards() {
  const filtered = filteredStandards();
  const available = standardsForActiveClass();
  const optionHtml = filtered
    .map((standard) => `
      <option value="${standard.code}" ${state.selectedStandardCodes.includes(standard.code) ? "selected" : ""}>
        ${standard.code} - ${standard.text}
      </option>
    `)
    .join("");
  if (els.standardsSelect) {
    els.standardsSelect.innerHTML = optionHtml;
  }
  if (els.standardsCount) {
    const term = els.standardSearch ? els.standardSearch.value.trim() : "";
    els.standardsCount.textContent = term
      ? `Showing ${filtered.length} of ${available.length} standards for ${state.page.grade} ${state.page.subject}.`
      : `Showing all ${available.length} standards for ${state.page.grade} ${state.page.subject}.`;
  }

  const html = filtered
    .map((standard) => {
      const active = state.selectedStandardCodes.includes(standard.code);
      return `
        <label class="standard-option ${active ? "is-selected" : ""}">
          <input type="checkbox" data-standard="${standard.code}" ${active ? "checked" : ""}>
          <span>
            <strong>${standard.code}</strong>
            <small>${standard.text}</small>
          </span>
        </label>
      `;
    })
    .join("");

  els.standardsList.innerHTML = html || "<p>No standards match this search for the active class.</p>";
  els.standardsList.querySelectorAll("[data-standard]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => toggleStandard(checkbox.dataset.standard, checkbox.checked));
  });
  if (els.standardsMenuLabel) {
    const count = state.selectedStandardCodes.length;
    els.standardsMenuLabel.textContent = `Select Kentucky standards (${count} selected)`;
  }
  renderSelectedSummaries();
}

function handleStandardsSelectChange() {
  if (!requireTeacherAccess()) return;
  const selectedInDropdown = Array.from(els.standardsSelect.selectedOptions).map((option) => option.value);
  const visibleCodes = filteredStandards().map((standard) => standard.code);
  const hiddenSelected = state.selectedStandardCodes.filter((code) => !visibleCodes.includes(code));
  state.selectedStandardCodes = unique([...hiddenSelected, ...selectedInDropdown]);
  invalidateSelectedDrafts();
  persist();
  renderStandards();
  renderDraftPreview();
}

function renderApprovals() {
  if (!els.approvalList) return;

  if (!state.pendingTeacherApprovals.length) {
    els.approvalList.innerHTML = `<p class="empty-note">No pending teacher account requests.</p>`;
    return;
  }

  els.approvalList.innerHTML = state.pendingTeacherApprovals.map((request) => `
    <div class="approval-row">
      <div>
        <strong>${nameFromEmail(request.email)}</strong>
        <span>${request.email}</span>
      </div>
      <button class="secondary-button" type="button" data-approve-teacher="${request.email}">Approve</button>
    </div>
  `).join("");

  els.approvalList.querySelectorAll("[data-approve-teacher]").forEach((button) => {
    button.addEventListener("click", () => approveTeacher(button.dataset.approveTeacher));
  });
}

function requestTeacherApproval(email) {
  if (state.pendingTeacherApprovals.some((request) => request.email === email)) return;
  state.pendingTeacherApprovals.push({
    email,
    requestedAt: new Date().toISOString()
  });
}

function approveTeacher(email) {
  if (!requireTeacherAccess()) return;
  if (state.email !== "patrick.feltner@knott.kyschools.us") {
    setMessage(els.teacherMessage, "Only Patrick Feltner can approve teacher accounts.", "teacher-error");
    return;
  }
  if (!state.approvedTeachers.includes(email)) state.approvedTeachers.push(email);
  state.pendingTeacherApprovals = state.pendingTeacherApprovals.filter((request) => request.email !== email);
  persist();
  renderApprovals();
  setMessage(els.teacherMessage, `${email} is approved as a teacher.`, "teacher-ok");
}

function filteredStandards() {
  const term = els.standardSearch ? els.standardSearch.value.trim().toLowerCase() : "";
  return standardsForActiveClass().filter((standard) => {
    const searchable = `${standard.code} ${standard.text} ${standard.subject} ${standard.grade}`.toLowerCase();
    return !term || searchable.includes(term);
  });
}

function standardsForActiveClass() {
  return standards.filter((standard) => standard.subject === state.page.subject && standard.grade === state.page.grade);
}

function toggleStandard(code, checked) {
  if (!requireTeacherAccess()) return;

  if (checked && !state.selectedStandardCodes.includes(code)) {
    state.selectedStandardCodes.push(code);
  } else if (!checked) {
    state.selectedStandardCodes = state.selectedStandardCodes.filter((item) => item !== code);
  }

  invalidateSelectedDrafts();
  persist();
  renderStandards();
  renderDraftPreview();
}

function renderTeacherCalendar() {
  const ringers = activeRingers();
  const [year, month] = state.calendarMonth.split("-").map(Number);
  const first = new Date(year, month - 1, 1, 12);
  const last = new Date(year, month, 0, 12);
  els.calendarMonthLabel.textContent = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const days = [];
  for (let day = 1; day <= last.getDate(); day += 1) {
    const date = new Date(year, month - 1, day, 12);
    if (date.getDay() !== 0 && date.getDay() !== 6) days.push(toISODate(date));
  }

  els.teacherCalendar.innerHTML = days.map((date) => {
    const selected = state.selectedDates.includes(date);
    const disabled = false;
    const posted = Boolean(ringers[date]);
    return `
      <button class="${selected ? "is-selected" : ""} ${posted ? "is-posted" : ""}" type="button" data-date="${date}" ${disabled ? "disabled" : ""}>
        <span>${Number(date.slice(8, 10))}</span>
        <small>${posted ? "Posted" : selected ? "Plan" : ""}</small>
      </button>
    `;
  }).join("");

  els.teacherCalendar.querySelectorAll("[data-date]").forEach((button) => {
    button.addEventListener("click", () => toggleDate(button.dataset.date));
  });
}

function toggleDate(date) {
  if (!requireTeacherAccess()) return;

  if (state.selectedDates.includes(date)) {
    state.selectedDates = state.selectedDates.filter((item) => item !== date);
  } else if (isSchoolDay(date)) {
    state.selectedDates.push(date);
  }

  state.selectedDates = unique(state.selectedDates).sort();
  if (!state.selectedDates.length) state.selectedDates = [isoToday];
  ensureDateConfigs();
  persist();
  renderTeacherCalendar();
  renderSelectedSummaries();
  renderDateSetupList();
  renderDraftPreview();
}

function selectDateRange() {
  if (!requireTeacherAccess()) return;

  const start = els.dateStart.value;
  const end = els.dateEnd.value;
  if (!start || !end) return;

  state.selectedDates = datesBetween(start <= end ? start : end, start <= end ? end : start);
  if (!state.selectedDates.length) {
    setMessage(els.teacherMessage, "Pick a range with at least one school day.", "teacher-error");
    state.selectedDates = [isoToday];
  }
  ensureDateConfigs();
  state.calendarMonth = state.selectedDates[0].slice(0, 7);
  persist();
  renderTeacherCalendar();
  renderSelectedSummaries();
  renderDateSetupList();
  renderDraftPreview();
}

function moveCalendar(offset) {
  if (!requireTeacherAccess()) return;

  const [year, month] = state.calendarMonth.split("-").map(Number);
  const next = new Date(year, month - 1 + offset, 1, 12);
  state.calendarMonth = toISODate(next).slice(0, 7);
  persist();
  renderTeacherCalendar();
}

function renderSelectedSummaries() {
  const selectedStandards = getSelectedStandards();
  els.dateStart.value = state.selectedDates[0] || isoToday;
  els.dateEnd.value = state.selectedDates[state.selectedDates.length - 1] || isoToday;
  els.selectedStandardsList.innerHTML = selectedStandards.map((standard) => `
    <span class="selection-chip">${standard.code}</span>
  `).join("") || `<span class="empty-note">No standards selected yet.</span>`;

  els.selectedDatesList.innerHTML = state.selectedDates.map((date) => `
    <span class="selection-chip">${formatShortDate(date)}</span>
  `).join("");
}

function resetDateStandardsForClass() {
  state.selectedStandardCodes = [];
  state.selectedDates.forEach((date) => {
    if (!state.dateConfigs[date]) return;
    state.dateConfigs[date].standardCodes = [...state.selectedStandardCodes];
    delete state.generatedDrafts[date];
  });
}

function ensureDateConfigs() {
  state.selectedDates.forEach((date) => {
    if (state.dateConfigs[date]) return;
    state.dateConfigs[date] = {
      teacherPrompt: els.teacherPrompt.value.trim(),
      questionType: els.questionType.value,
      dok: els.dokSelect.value,
      standardCodes: [...state.selectedStandardCodes]
    };
  });
}

function applyWeeklySetupToAllDates() {
  if (!requireTeacherAccess()) return;
  state.selectedDates.forEach((date) => {
    state.dateConfigs[date] = {
      teacherPrompt: els.teacherPrompt.value.trim(),
      questionType: els.questionType.value,
      dok: els.dokSelect.value,
      standardCodes: [...state.selectedStandardCodes]
    };
    delete state.generatedDrafts[date];
  });
  persist();
  renderDateSetupList();
  renderDraftPreview();
  setMessage(els.teacherMessage, "Weekly setup applied. You can now adjust any individual date.", "teacher-ok");
}

function renderDateSetupList() {
  ensureDateConfigs();
  const ringers = activeRingers();
  const classStandards = standards.filter((standard) => {
    return standard.subject === state.page.subject && standard.grade === state.page.grade;
  });
  const questionTypes = Array.from(els.questionType.options).map((option) => option.value);
  const dokOptions = Array.from(els.dokSelect.options).map((option) => ({
    value: option.value,
    label: option.textContent
  }));

  els.dateSetupList.innerHTML = state.selectedDates.map((date, index) => {
    const config = state.dateConfigs[date];
    const selectedCount = config.standardCodes.length;
    return `
      <article class="date-setup-card">
        <div class="date-setup-header">
          <div>
            <span class="date-number">${index + 1}</span>
            <div>
              <h5>${formatLongDate(date)}</h5>
              <p>${ringers[date] ? "Previously published" : "Not published yet"}</p>
            </div>
          </div>
          <span class="status-tag ${state.generatedDrafts[date] ? "ready" : ""}" data-date-status="${date}">${state.generatedDrafts[date] ? "Generated" : "Needs generation"}</span>
        </div>

        <label>
          Topic or idea for this date
          <textarea rows="3" data-config-date="${date}" data-config-field="teacherPrompt" placeholder="What should this day's bell ringer be about?">${escapeHtml(config.teacherPrompt)}</textarea>
        </label>

        <div class="builder-row">
          <label>
            Question type
            <select data-config-date="${date}" data-config-field="questionType">
              ${questionTypes.map((type) => `<option ${type === config.questionType ? "selected" : ""}>${escapeHtml(type)}</option>`).join("")}
            </select>
          </label>
          <label>
            Depth of Knowledge
            <select data-config-date="${date}" data-config-field="dok">
              ${dokOptions.map((option) => `<option value="${option.value}" ${option.value === config.dok ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
            </select>
          </label>
        </div>

        <details class="standards-menu date-standards-menu">
          <summary data-standard-summary="${date}">${selectedCount} standard${selectedCount === 1 ? "" : "s"} selected</summary>
          <div class="date-standard-options">
            ${classStandards.map((standard) => `
              <label class="standard-check">
                <input type="checkbox" data-config-date="${date}" data-config-field="standardCodes" value="${standard.code}" ${config.standardCodes.includes(standard.code) ? "checked" : ""}>
                <span><strong>${standard.code}</strong>${standard.text}</span>
              </label>
            `).join("")}
          </div>
        </details>
      </article>
    `;
  }).join("");
}

function handleDateConfigChange(event) {
  const target = event.target;
  const date = target.dataset.configDate;
  const field = target.dataset.configField;
  if (!date || !field || !state.dateConfigs[date]) return;

  if (field === "standardCodes") {
    const checked = els.dateSetupList.querySelectorAll(`[data-config-date="${date}"][data-config-field="standardCodes"]:checked`);
    state.dateConfigs[date].standardCodes = Array.from(checked).map((input) => input.value);
    const summary = els.dateSetupList.querySelector(`[data-standard-summary="${date}"]`);
    const count = state.dateConfigs[date].standardCodes.length;
    if (summary) summary.textContent = `${count} standard${count === 1 ? "" : "s"} selected`;
  } else {
    state.dateConfigs[date][field] = target.value;
  }

  delete state.generatedDrafts[date];
  const status = els.dateSetupList.querySelector(`[data-date-status="${date}"]`);
  if (status) {
    status.textContent = "Needs generation";
    status.classList.remove("ready");
  }
  persist();
  renderDraftPreview();
  setMessage(els.teacherMessage, `${formatShortDate(date)} updated. Generate when ready.`, "teacher-ok");
}

async function generateQuestions() {
  if (!requireTeacherAccess()) return;

  ensureDateConfigs();
  const missingStandardsDate = state.selectedDates.find((date) => !state.dateConfigs[date].standardCodes.length);
  if (!state.selectedDates.length || missingStandardsDate) {
    setMessage(els.teacherMessage, missingStandardsDate
      ? `Choose at least one standard for ${formatShortDate(missingStandardsDate)}.`
      : "Select at least one school day.", "teacher-error");
    return;
  }

  setMessage(els.teacherMessage, "Asking ChatGPT for classroom-ready KSA-style items...", "teacher-ok");

  try {
    const result = await apiGenerateBellringers();
    result.items.forEach((item) => {
      state.generatedDrafts[item.date] = item.studentPrompt;
    });
    setMessage(els.teacherMessage, `Generated ${result.items.length} live ChatGPT bell ringer${result.items.length === 1 ? "" : "s"}.`, "teacher-ok");
  } catch (error) {
    state.selectedDates.forEach((date, index) => {
      const config = state.dateConfigs[date];
      const standardsForPrompt = config.standardCodes
        .map((code) => standards.find((standard) => standard.code === code))
        .filter(Boolean);
      state.generatedDrafts[date] = ksaPrompt({
        date,
        subject: state.page.subject,
        grade: state.page.grade,
        standards: standardsForPrompt,
        dok: config.dok,
        questionType: config.questionType,
        teacherPrompt: config.teacherPrompt,
        sequence: index + 1
      });
    });
    setMessage(els.teacherMessage, `ChatGPT is not connected yet, so I used the local demo generator. ${error.message}`, "teacher-error");
  }

  persist();
  renderDateSetupList();
  renderDraftPreview();
}

async function publishRingers(event) {
  event.preventDefault();
  if (!requireTeacherAccess()) return;

  ensureDateConfigs();
  if (!state.selectedDates.length) {
    setMessage(els.teacherMessage, "Select standards and dates before publishing.", "teacher-error");
    return;
  }

  if (!Object.keys(state.generatedDrafts).some((date) => state.selectedDates.includes(date))) {
    await generateQuestions();
  }

  const ringers = activeRingers();
  state.selectedDates.forEach((date, index) => {
    const config = state.dateConfigs[date];
    const standardsForPrompt = config.standardCodes
      .map((code) => standards.find((standard) => standard.code === code))
      .filter(Boolean);
    const question = state.generatedDrafts[date] || ksaPrompt({
      date,
      subject: state.page.subject,
      grade: state.page.grade,
      standards: standardsForPrompt,
      dok: config.dok,
      questionType: config.questionType,
      teacherPrompt: config.teacherPrompt,
      sequence: index + 1
    });
    ringers[date] = buildRinger(date, standardsForPrompt, config.dok, config.questionType, question, config.teacherPrompt);
  });

  persist();
  setMessage(els.teacherMessage, `Published ${state.selectedDates.length} bell ringer${state.selectedDates.length === 1 ? "" : "s"}.`, "teacher-ok");
  renderTeacherCalendar();
  renderStudentAssignment();
  renderGradebook();
}

function renderDraftPreview() {
  const drafts = state.selectedDates.map((date) => {
    const draft = state.generatedDrafts[date] || "";
    if (draft) return `${formatLongDate(date)}\n${draft}`;

    const config = state.dateConfigs[date] || {};
    const topic = config.teacherPrompt || "No topic entered yet";
    return [
      formatLongDate(date),
      "Ready to generate",
      `Topic: ${topic}`,
      `Question type: ${config.questionType || els.questionType.value}`,
      `DOK: ${config.dok || els.dokSelect.value}`,
      "Click Generate selected dates to create the full student item."
    ].join("\n");
  });
  els.questionText.value = drafts.join("\n\n---\n\n");
}

function invalidateSelectedDrafts() {
  state.selectedDates.forEach((date) => {
    delete state.generatedDrafts[date];
  });
  persist();
  renderDraftPreview();
  setMessage(els.teacherMessage, "Settings changed. Click Generate selected dates for a new preview.", "teacher-ok");
}

function renderStudentAssignment() {
  const date = els.studentDate.value || isoToday;
  const ringers = activeRingers();
  const ringer = ringers[date];
  const existing = currentStudentSubmission(date);

  els.calendarSummary.innerHTML = recentSchoolDays(8)
    .map((day) => {
      const status = day > isoToday ? "locked" : currentStudentSubmission(day) ? "done" : ringers[day] ? "ready" : "";
      const label = status === "done" ? "Done" : status === "ready" ? "Ready" : status === "locked" ? "Locked" : "No post";
      return `
        <div class="calendar-row">
          <span>${formatLongDate(day)}</span>
          <span class="status-tag ${status}">${label}</span>
        </div>
      `;
    })
    .join("");

  if (date > isoToday || !isSchoolDay(date)) {
    els.studentQuestion.textContent = "This date is locked because it is not an open school day.";
    els.assignmentMeta.innerHTML = "";
    els.studentAnswer.disabled = true;
    els.studentFeedback.textContent = "";
    return;
  }

  if (!ringer) {
    els.studentQuestion.textContent = "No bell ringer has been posted for this day.";
    els.assignmentMeta.innerHTML = "";
    els.studentAnswer.disabled = true;
    els.studentFeedback.textContent = "";
    return;
  }

  els.studentAnswer.disabled = false;
  els.studentQuestion.textContent = studentFacingQuestion(ringer);
  els.assignmentMeta.innerHTML = [
    ringer.subject,
    `Grade ${ringer.grade}`,
    `DOK ${ringer.dok}`,
    ringer.questionType
  ].map((item) => `<span class="meta-chip">${item}</span>`).join("");

  if (existing) {
    els.studentAnswer.value = existing.answer;
    els.studentFeedback.innerHTML = `<strong>${existing.score}/5 points</strong><br>${existing.feedback}`;
  } else {
    els.studentAnswer.value = "";
    els.studentFeedback.textContent = "Submit your response to see your score and feedback.";
  }
}

async function submitAnswer(event) {
  event.preventDefault();

  if (!state.email || state.role !== "student") {
    els.studentFeedback.innerHTML = `<span class="student-error">Sign in as a student first.</span>`;
    return;
  }

  const date = els.studentDate.value || isoToday;
  const ringer = activeRingers()[date];
  const answer = els.studentAnswer.value.trim();

  if (!ringer || date > isoToday || !isSchoolDay(date) || !answer) {
    els.studentFeedback.innerHTML = `<span class="student-error">Choose an open bell ringer and enter an answer.</span>`;
    return;
  }

  let grade;
  try {
    els.studentFeedback.innerHTML = "Grading with ChatGPT...";
    grade = await apiGradeSubmission(ringer, answer);
  } catch (error) {
    grade = mockChatGPTGrade(ringer, answer);
    grade.feedback = `${grade.feedback} ChatGPT grading is not connected yet, so this is demo feedback.`;
  }
  const existingIndex = state.submissions.findIndex((item) => item.classId === state.activeClassId && item.date === date && item.email === state.email);
  const submission = {
    classId: state.activeClassId,
    date,
    email: state.email,
    name: nameFromEmail(state.email),
    answer,
    score: grade.score,
    feedback: grade.feedback,
    gradedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    state.submissions[existingIndex] = submission;
  } else {
    state.submissions.push(submission);
  }

  persist();
  els.studentFeedback.innerHTML = `<strong>${grade.score}/5 points</strong><br>${grade.feedback}`;
  renderGradebook();
  renderStudentAssignment();
}

async function apiGenerateBellringers() {
  const datePlans = state.selectedDates.map((date) => {
    const config = state.dateConfigs[date];
    return {
      date,
      teacherPrompt: config.teacherPrompt,
      questionType: config.questionType,
      dok: config.dok,
      standards: config.standardCodes.map((code) => {
        const standard = standards.find((item) => item.code === code);
        return standard ? { code: standard.code, text: standard.text } : null;
      }).filter(Boolean)
    };
  });

  return postJson("/api/bellringers/generate", {
    subject: state.page.subject,
    grade: state.page.grade,
    dates: state.selectedDates,
    datePlans
  });
}

async function apiGradeSubmission(ringer, answer) {
  const result = await postJson("/api/submissions/grade", {
    question: studentFacingQuestion(ringer),
    answer,
    subject: ringer.subject,
    grade: ringer.grade,
    dok: ringer.dok,
    questionType: ringer.questionType,
    standards: (ringer.standardTexts || [ringer.standardText]).map((text, index) => ({
      code: (ringer.standardCodes || [ringer.standardCode])[index] || "",
      text
    }))
  });

  return {
    score: Math.max(0, Math.min(5, Number(result.score) || 0)),
    feedback: result.feedback || `What you did well: ${result.whatWentWell} Suggestion: ${result.suggestion}`
  };
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed with ${response.status}`);
  return data;
}

function renderGradebook() {
  const range = els.gradebookRange.value || "day";
  const anchor = els.gradebookDate.value || isoToday;
  const windowDates = datesForRange(anchor, range);
  const ringers = activeRingers();
  const submissions = state.submissions.filter((item) => item.classId === state.activeClassId && windowDates.includes(item.date));
  const possible = windowDates.filter((day) => Boolean(ringers[day])).length * 5;
  const rows = state.students.map((student) => {
    const mine = submissions.filter((item) => item.email === student.email);
    const total = mine.reduce((sum, item) => sum + item.score, 0);
    const avg = mine.length ? (total / mine.length).toFixed(1) : "0.0";
    const latest = mine.slice().sort((a, b) => b.gradedAt.localeCompare(a.gradedAt))[0];
    return { student, mine, total, avg, latest };
  });

  const classTotal = rows.reduce((sum, row) => sum + row.total, 0);
  const submissionCount = rows.reduce((sum, row) => sum + row.mine.length, 0);
  const avgScore = submissionCount ? (classTotal / submissionCount).toFixed(1) : "0.0";

  els.gradebookStats.innerHTML = [
    ["Posted days", windowDates.filter((day) => ringers[day]).length],
    ["Submissions", submissionCount],
    ["Class average", `${avgScore}/5`],
    ["Possible per student", possible]
  ].map(([label, value]) => `<div class="stat-card"><span>${label}</span><strong>${value}</strong></div>`).join("");

  els.gradebookBody.innerHTML = rows
    .map((row) => `
      <tr>
        <td>${row.student.name}</td>
        <td>${row.student.email}</td>
        <td>${row.mine.length}</td>
        <td>${row.total}</td>
        <td>${row.avg}/5</td>
        <td>${row.latest ? row.latest.feedback : "No submissions in this range."}</td>
      </tr>
    `)
    .join("");
}

function canOpenView(viewName) {
  return viewName === "student" || (state.role === "teacher" && state.email && state.teacherAuthenticated);
}

function requireTeacherAccess() {
  if (state.role === "teacher" && state.email && state.teacherAuthenticated) return true;
  setMessage(els.teacherMessage, "Please sign in with a teacher password before changing bell ringers or grades.", "teacher-error");
  setMessage(els.signinMessage, "Teacher access is locked until the password is verified.", "teacher-error");
  setView("student");
  return false;
}

function isValidTeacherLogin(email, password) {
  return teacherCredentials[email] === password;
}

function ksaPrompt({ date, subject, grade, standards, dok, questionType, teacherPrompt = "", sequence = 1 }) {
  const topic = standards.map((standard) => standard.text).join(" ");
  const gradeText = gradeLevelContent(grade);
  const dokDirections = {
    "1": "identify a key detail or accurate procedure",
    "2": "apply a skill and explain the reasoning",
    "3": "analyze evidence, justify a claim, or critique reasoning",
    "4": "synthesize multiple ideas and defend a conclusion"
  };
  const topicLine = teacherPrompt ? `\n\nTeacher topic: ${teacherPrompt}` : "";

  if (subject === "Mathematics") {
    return `Scenario: ${gradeText.mathScenario}${topicLine}\n\nQuestion type: ${questionType}\nQuestion: ${gradeText.mathQuestion} In your answer, ${dokDirections[dok]}, show your work, label the answer, and explain why your strategy makes sense.`;
  }

  if (subject === "Science") {
    return `Source: ${gradeText.scienceSource}${topicLine}\n\nQuestion type: ${questionType}\nQuestion: ${gradeText.scienceQuestion} Use evidence from the source in your answer, and explain how the evidence supports your thinking.`;
  }

  if (subject === "Social Studies") {
    return `Source: ${gradeText.socialStudiesSource}${topicLine}\n\nQuestion type: ${questionType}\nQuestion: ${gradeText.socialStudiesQuestion} Use evidence from the source and explain how that evidence supports your answer.`;
  }

  return `Passage: ${gradeText.readingPassage}${topicLine}\n\nQuestion type: ${questionType}\nQuestion: ${gradeText.readingQuestion} ${capitalize(dokDirections[dok])} using evidence from the passage.`;
}

function gradeLevelContent(grade) {
  const content = {
    "5": {
      readingPassage: "Mia's class planted lettuce in two garden boxes. At first, the plants near the door grew slowly because students forgot to water them. Mia made a chart and asked classmates to sign up for watering days. After two weeks, both boxes looked healthier, and more students wanted to help.",
      readingQuestion: "What is one main idea of the passage? Give two details that support it.",
      mathScenario: "A class is making trail mix. Each bag needs 2/3 cup of cereal. The class has 6 cups of cereal.",
      mathQuestion: "How many full bags of trail mix can the class make?",
      scienceSource: "A student tests three paper towels. Towel A holds 18 mL of water, Towel B holds 24 mL, and Towel C holds 15 mL. The student uses the same amount of water each time.",
      scienceQuestion: "Which paper towel is most absorbent, and what evidence supports your claim?",
      socialStudiesSource: "A diary entry from 1775 says that a family stored extra grain because travel to town had become difficult. The writer also says neighbors shared tools and news.",
      socialStudiesQuestion: "What does the source show about how people responded to a difficult time?"
    },
    "6": {
      readingPassage: "In the first week of school, Lena noticed that the quietest table in the library was also the one where students helped each other the most. When a new student could not find a book, three classmates paused their own work to search the shelves. By Friday, the table had become the first place students went when they needed calm support.",
      readingQuestion: "What central idea is developed in the passage? Use two details from the passage to support your answer.",
      mathScenario: "A recipe uses 3/4 cup of oats for one batch of snack bars. A student has 2 1/4 cups of oats.",
      mathQuestion: "How many batches can the student make?",
      scienceSource: "A class tests how three surfaces affect the distance a toy car travels. The car travels 82 cm on tile, 54 cm on cardboard, and 31 cm on carpet. Students repeat each trial three times and notice the same pattern.",
      scienceQuestion: "What claim can you make about surface type and motion?",
      socialStudiesSource: "A map shows that an early settlement was built near a river and a forest. A note beside the map says families used the river for travel and the forest for building materials.",
      socialStudiesQuestion: "How did geography affect where people settled?"
    },
    "7": {
      readingPassage: "The school board considered replacing printed announcements with a daily digital bulletin. Supporters argued that digital messages could be updated quickly and would reduce paper use. Others worried that students without reliable internet at home might miss information. The board decided to test both systems for one month before making a final decision.",
      readingQuestion: "Which claim is best supported by the passage? Explain how the author develops both sides of the issue.",
      mathScenario: "A store sells 5 notebooks for $7.50. Another store sells 8 notebooks for $11.60.",
      mathQuestion: "Which store has the lower unit price, and how do you know?",
      scienceSource: "Two ponds are observed during a dry month. Pond A has many shaded areas and its water level drops 4 cm. Pond B has little shade and its water level drops 11 cm. Both ponds are measured over the same number of days.",
      scienceQuestion: "What can the data suggest about environmental conditions and water loss?",
      socialStudiesSource: "A trade record shows that one city exported cloth and imported grain. A traveler's letter says merchants visited the city because several roads met near its market.",
      socialStudiesQuestion: "What does the source suggest about the city's economy?"
    },
    "8": {
      readingPassage: "The editorial praised the new community center for giving teenagers a safe place to study, exercise, and meet mentors. However, it also questioned whether the town had planned enough transportation for students who lived far away. The writer concluded that the center could succeed if leaders solved the access problem before opening day.",
      readingQuestion: "What is the author's point of view, and how does the author respond to a possible concern?",
      mathScenario: "A water tank drains at a constant rate. After 2 minutes, 44 gallons remain. After 6 minutes, 28 gallons remain.",
      mathQuestion: "Find the rate of change and explain what it means in this situation.",
      scienceSource: "Rock layers on a cliff contain seashell fossils near the bottom and plant fossils near the top. A nearby diagram shows the lower layers are older than the upper layers.",
      scienceQuestion: "What explanation can you construct about how the environment changed over time?",
      socialStudiesSource: "An excerpt from a civic speech argues that citizens protect democracy by voting, serving on juries, and speaking at public meetings. The speaker warns that rights are weaker when people do not participate.",
      socialStudiesQuestion: "How does the source connect civic participation with individual rights?"
    }
  };

  return content[grade] || content["6"];
}

function buildRinger(date, selectedStandards, dok, questionType, question, teacherPrompt = "") {
  return {
    date,
    pageCode: state.page.code,
    standardCodes: selectedStandards.map((standard) => standard.code),
    standardTexts: selectedStandards.map((standard) => standard.text),
    standardCode: selectedStandards[0].code,
    standardText: selectedStandards[0].text,
    subject: state.page.subject,
    grade: state.page.grade,
    dok,
    questionType,
    teacherPrompt,
    question
  };
}

function studentFacingQuestion(ringer) {
  return ringer.question
    .replace(/^KSA-style[\s\S]*?(Passage|Source|Scenario):/i, "$1:")
    .replace(/\s+and connect the answer to .*$/i, ".")
    .replace(/\bKY\.[A-Za-z0-9.-]+,?\s*/g, "")
    .trim();
}

function mockChatGPTGrade(ringer, answer) {
  const wordCount = answer.split(/\s+/).filter(Boolean).length;
  const hasEvidence = /\b(evidence|source|passage|data|because|for example|shows|according)\b/i.test(answer);
  const hasImprovement = /\b(improve|next time|more|another|specific|measure|explain)\b/i.test(answer);
  const mentionsTopic = (ringer.standardTexts || [ringer.standardText])
    .join(" ")
    .split(/\W+/)
    .filter((word) => word.length > 5)
    .some((word) => answer.toLowerCase().includes(word.toLowerCase()));

  let score = 1;
  if (wordCount >= 12) score += 1;
  if (wordCount >= 28) score += 1;
  if (hasEvidence || mentionsTopic) score += 1;
  if (hasImprovement) score += 1;
  score = Math.min(5, score);

  const strength = hasEvidence
    ? "You did a good job using evidence or reasoning from the prompt."
    : "You did a good job getting your thinking started and answering in your own words.";
  const nextStep = score >= 4
    ? "To make it even stronger, add one more precise detail and connect it directly to the standard."
    : score >= 3
      ? "To improve, add a clearer piece of evidence and explain how that evidence proves your answer."
      : "To improve, restate the question, include one exact detail from the prompt, and explain your reasoning in a complete sentence.";

  return { score, feedback: `What you did well: ${strength} Suggestion: ${nextStep}` };
}

function getSelectedStandards() {
  return state.selectedStandardCodes
    .map((code) => standards.find((standard) => standard.code === code))
    .filter(Boolean);
}

function defaultStandard() {
  return filteredStandards()[0] || standards.find((standard) => standard.grade === state.page.grade) || standards[0];
}

function currentStudentSubmission(date) {
  if (!state.email) return null;
  return state.submissions.find((item) => item.classId === state.activeClassId && item.date === date && item.email === state.email) || null;
}

function recentSchoolDays(count) {
  const days = [];
  let cursor = new Date(`${isoToday}T12:00:00`);
  while (days.length < count) {
    if (isSchoolDay(toISODate(cursor))) days.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return days;
}

function datesForRange(anchor, range) {
  const dates = [];
  const start = new Date(`${anchor}T12:00:00`);
  const end = new Date(start);

  if (range === "week") {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    end.setDate(start.getDate() + 4);
  } else if (range === "month") {
    start.setDate(1);
    end.setMonth(start.getMonth() + 1, 0);
  }

  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const date = toISODate(cursor);
    if (isSchoolDay(date)) dates.push(date);
    if (range === "day") break;
  }

  return dates;
}

function datesBetween(start, end) {
  const dates = [];
  const cursor = new Date(`${start}T12:00:00`);
  const stop = new Date(`${end}T12:00:00`);
  for (; cursor <= stop; cursor.setDate(cursor.getDate() + 1)) {
    const date = toISODate(cursor);
    if (isSchoolDay(date)) dates.push(date);
  }
  return dates;
}

function previousSchoolDay(date) {
  const cursor = new Date(`${date}T12:00:00`);
  do {
    cursor.setDate(cursor.getDate() - 1);
  } while (!isSchoolDay(toISODate(cursor)));
  return toISODate(cursor);
}

function latestSchoolDate(date) {
  const cursor = new Date(`${toISODate(date)}T12:00:00`);
  while (!isSchoolDay(toISODate(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  return toISODate(cursor);
}

function isSchoolDay(date) {
  const day = new Date(`${date}T12:00:00`).getDay();
  return day !== 0 && day !== 6;
}

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function formatLongDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatShortDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function unique(items) {
  return Array.from(new Set(items));
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function nameFromEmail(email) {
  const prefix = email.split("@")[0].replace(/[._-]+/g, " ");
  return prefix.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setMessage(element, text, className) {
  element.className = `form-note ${className}`;
  element.textContent = text;
}
