import { firebaseConfig, firestoreSettings } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const DAILY_LIMIT = 3;
const CLASS_OUT_LIMIT = 2;
const LONG_ABSENCE_MINUTES = 10;
const STORAGE_KEY = "hallpass-demo-state-v3";
const LEGACY_MIGRATION_KEY = "hallpass-legacy-students-migrated-v1";
const TEACHER_CODE = "6767";
const CLASS_PERIOD_MINUTES = 75;
const SCHOOL_DAY_MINUTES = 450;

const grades = ["5", "6", "7", "8"];

let teacherUnlocked = false;
let teacherSubtab = "overview";

const teachers = [
  { id: "t-1", name: "", room: "Classroom 1" },
  { id: "t-2", name: "", room: "Classroom 2" },
  { id: "t-3", name: "", room: "Classroom 3" },
  { id: "t-4", name: "", room: "Classroom 4" },
  { id: "t-deb", name: "Mrs. Deb", room: "Student Support" }
];

const baseStudents = [];

const destinations = [
  "Restroom",
  "Nurse",
  "Office",
  "Mrs. Deb's Office",
  "Another Teacher's Room",
  "Water Break"
];

const defaultState = {
  selectedTeacherId: teachers[0].id,
  selectedTeacherGrade: "5",
  selectedDisplayTeacherId: teachers[0].id,
  selectedDisplayGrade: "5",
  teacherNames: Object.fromEntries(teachers.map((teacher) => [teacher.id, teacher.name])),
  extraStudents: [],
  archivedStudentIds: [],
  medicalNotes: Object.fromEntries(baseStudents.map((student) => [student.id, student.medicalNote])),
  settings: {
    privacyMode: false,
    longAbsenceMinutes: LONG_ABSENCE_MINUTES,
    alertContacts: []
  },
  trips: []
};

let state = loadState();
let students = getAllStudents();
let selectedReportStudentIdValue = "all";
let firestoreDb = null;
let firestoreStateRef = null;
let isApplyingRemoteState = false;
let legacyStudentsToMigrate = [];

const els = {
  tabs: document.querySelectorAll(".tab"),
  views: {
    teacher: document.querySelector("#teacherView"),
    display: document.querySelector("#displayView")
  },
  teacherSubtabs: document.querySelectorAll(".teacher-subtab"),
  teacherOverviewPanels: document.querySelectorAll(".teacher-overview-panel"),
  teacherLock: document.querySelector("#teacherLock"),
  teacherContent: document.querySelector("#teacherContent"),
  teacherCodeForm: document.querySelector("#teacherCodeForm"),
  teacherCodeInput: document.querySelector("#teacherCodeInput"),
  teacherCodeMessage: document.querySelector("#teacherCodeMessage"),
  teacherSelect: document.querySelector("#teacherSelect"),
  teacherTitle: document.querySelector("#teacherTitle"),
  teacherSummary: document.querySelector("#teacherSummary"),
  otherClassesCount: document.querySelector("#otherClassesCount"),
  otherClassesList: document.querySelector("#otherClassesList"),
  classCapacity: document.querySelector("#classCapacity"),
  teacherGradeSelect: document.querySelector("#teacherGradeSelect"),
  studentSelect: document.querySelector("#studentSelect"),
  destinationSelect: document.querySelector("#destinationSelect"),
  teacherDestinationField: document.querySelector("#teacherDestinationField"),
  destinationTeacherSelect: document.querySelector("#destinationTeacherSelect"),
  selectedStudentInfo: document.querySelector("#selectedStudentInfo"),
  overrideCheck: document.querySelector("#overrideCheck"),
  overrideReasonField: document.querySelector("#overrideReasonField"),
  overrideReason: document.querySelector("#overrideReason"),
  signoutForm: document.querySelector("#signoutForm"),
  signoutButton: document.querySelector("#signoutButton"),
  signoutMessage: document.querySelector("#signoutMessage"),
  currentOutList: document.querySelector("#currentOutList"),
  outWarning: document.querySelector("#outWarning"),
  teacherNameForm: document.querySelector("#teacherNameForm"),
  teacherNameInput: document.querySelector("#teacherNameInput"),
  addStudentForm: document.querySelector("#addStudentForm"),
  addStudentGradeSelect: document.querySelector("#addStudentGradeSelect"),
  newStudentNameInput: document.querySelector("#newStudentNameInput"),
  manageMessage: document.querySelector("#manageMessage"),
  todayCounts: document.querySelector("#todayCounts"),
  resetDayButton: document.querySelector("#resetDayButton"),
  settingsContent: document.querySelector("#settingsContent"),
  privacyModeCheck: document.querySelector("#privacyModeCheck"),
  alertMinutesInput: document.querySelector("#alertMinutesInput"),
  alertContactsInput: document.querySelector("#alertContactsInput"),
  saveSettingsButton: document.querySelector("#saveSettingsButton"),
  settingsMessage: document.querySelector("#settingsMessage"),
  bulkImportGradeSelect: document.querySelector("#bulkImportGradeSelect"),
  bulkStudentInput: document.querySelector("#bulkStudentInput"),
  bulkImportButton: document.querySelector("#bulkImportButton"),
  downloadRosterButton: document.querySelector("#downloadRosterButton"),
  bulkImportMessage: document.querySelector("#bulkImportMessage"),
  displayTotalOut: document.querySelector("#displayTotalOut"),
  displayCapacity: document.querySelector("#displayCapacity"),
  displaySignoutForm: document.querySelector("#displaySignoutForm"),
  displayTeacherSelect: document.querySelector("#displayTeacherSelect"),
  displayGradeSelect: document.querySelector("#displayGradeSelect"),
  displayStudentSelect: document.querySelector("#displayStudentSelect"),
  displayDestinationSelect: document.querySelector("#displayDestinationSelect"),
  displayTeacherDestinationField: document.querySelector("#displayTeacherDestinationField"),
  displayDestinationTeacherSelect: document.querySelector("#displayDestinationTeacherSelect"),
  displaySignoutButton: document.querySelector("#displaySignoutButton"),
  displaySignoutMessage: document.querySelector("#displaySignoutMessage"),
  capacityAlert: document.querySelector("#capacityAlert"),
  displayCards: document.querySelector("#displayCards"),
  dataContent: document.querySelector("#dataContent"),
  reportStudentSearch: document.querySelector("#reportStudentSearch"),
  reportStudentResults: document.querySelector("#reportStudentResults"),
  selectedStudentBanner: document.querySelector("#selectedStudentBanner"),
  reportRangeSelect: document.querySelector("#reportRangeSelect"),
  reportStartField: document.querySelector("#reportStartField"),
  reportEndField: document.querySelector("#reportEndField"),
  reportStartDate: document.querySelector("#reportStartDate"),
  reportEndDate: document.querySelector("#reportEndDate"),
  reportDestinationSelect: document.querySelector("#reportDestinationSelect"),
  reportTeacherSelect: document.querySelector("#reportTeacherSelect"),
  reportScopeSelect: document.querySelector("#reportScopeSelect"),
  reportPieTeacherChecks: document.querySelector("#reportPieTeacherChecks"),
  reportSummary: document.querySelector("#reportSummary"),
  studentPieLabel: document.querySelector("#studentPieLabel"),
  studentPieChart: document.querySelector("#studentPieChart"),
  destinationBreakdownLabel: document.querySelector("#destinationBreakdownLabel"),
  destinationBreakdown: document.querySelector("#destinationBreakdown"),
  tripCountLabel: document.querySelector("#tripCountLabel"),
  tripTable: document.querySelector("#tripTable"),
  exportTripsButton: document.querySelector("#exportTripsButton"),
  teacherTripNote: document.querySelector("#teacherTripNote")
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(defaultState);
  try {
    return normalizeState(JSON.parse(saved));
  } catch {
    return structuredClone(defaultState);
  }
}

function normalizeState(nextState) {
  return {
    ...structuredClone(defaultState),
    ...nextState,
    teacherNames: { ...defaultState.teacherNames, ...nextState?.teacherNames },
    extraStudents: Array.isArray(nextState?.extraStudents) ? nextState.extraStudents : [],
    archivedStudentIds: Array.isArray(nextState?.archivedStudentIds) ? nextState.archivedStudentIds : [],
    trips: Array.isArray(nextState?.trips) ? nextState.trips : [],
    medicalNotes: { ...defaultState.medicalNotes, ...nextState?.medicalNotes },
    settings: {
      ...defaultState.settings,
      ...(nextState?.settings || {}),
      alertContacts: Array.isArray(nextState?.settings?.alertContacts) ? nextState.settings.alertContacts : []
    }
  };
}

function getAllStudents() {
  return [...baseStudents, ...(state.extraStudents || [])];
}

function refreshStudents() {
  students = getAllStudents();
}

function isArchivedStudent(studentId) {
  return state.archivedStudentIds.includes(studentId);
}

function activeStudents() {
  return students.filter((student) => !isArchivedStudent(student.id));
}

function displayStudentName(student) {
  if (!student) return "Student";
  if (!state.settings.privacyMode) return student.name;
  const parts = student.name.trim().split(/\s+/);
  if (parts.length < 2) return student.name;
  return `${parts[0]} ${parts.at(-1).slice(0, 1)}.`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function teacherName(teacherOrId) {
  const teacher = typeof teacherOrId === "string" ? teacherById(teacherOrId) : teacherOrId;
  if (!teacher) return "";
  return state.teacherNames[teacher.id]?.trim() || teacher.name || teacher.room;
}

function savedTeacherName(teacherOrId) {
  const teacher = typeof teacherOrId === "string" ? teacherById(teacherOrId) : teacherOrId;
  if (!teacher) return "";
  return state.teacherNames[teacher.id]?.trim() || teacher.name || "";
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (!firestoreStateRef || isApplyingRemoteState) return;
  setDoc(firestoreStateRef, {
    ...state,
    updatedAt: serverTimestamp()
  }, { merge: true }).catch((error) => {
    console.warn("Could not save HallPass state to Firestore. Local fallback is still saved.", error);
  });
}

function readLegacyStudentsForMigration() {
  if (localStorage.getItem(LEGACY_MIGRATION_KEY) === "done") return [];
  const legacyKeys = [
    "hallpass-demo-state-v1",
    "hallpass-demo-state-v2",
    "hallpass-demo-state-v3"
  ];
  const found = [];
  legacyKeys.forEach((key) => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "{}");
      if (!Array.isArray(saved.extraStudents)) return;
      saved.extraStudents.forEach((student) => {
        if (!student?.name || !student?.grade) return;
        found.push({
          id: `s-migrated-${crypto.randomUUID()}`,
          name: student.name,
          grade: String(student.grade),
          medicalNote: Boolean(student.medicalNote)
        });
      });
    } catch {
      // Ignore malformed old prototype data.
    }
  });
  return found;
}

function mergeLegacyStudents() {
  if (!legacyStudentsToMigrate.length) return false;
  const existing = new Set((state.extraStudents || []).map((student) => `${student.name.trim().toLowerCase()}|${student.grade}`));
  const additions = legacyStudentsToMigrate.filter((student) => {
    const key = `${student.name.trim().toLowerCase()}|${student.grade}`;
    if (existing.has(key)) return false;
    existing.add(key);
    return true;
  });
  if (!additions.length) {
    localStorage.setItem(LEGACY_MIGRATION_KEY, "done");
    return false;
  }
  additions.forEach((student) => {
    state.extraStudents.push(student);
    state.medicalNotes[student.id] = Boolean(student.medicalNote);
  });
  localStorage.setItem(LEGACY_MIGRATION_KEY, "done");
  refreshStudents();
  saveState();
  console.info(`Migrated ${additions.length} legacy HallPass students into Firestore.`);
  return true;
}

function hasFirebaseConfig() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

async function initializeSharedData() {
  if (!hasFirebaseConfig()) {
    console.info("HallPass is running in local-only mode. Add Firebase config in firebase-config.js to share data.");
    return;
  }

  try {
    legacyStudentsToMigrate = readLegacyStudentsForMigration();
    const firebaseApp = initializeApp(firebaseConfig);
    firestoreDb = getFirestore(firebaseApp);
    firestoreStateRef = doc(
      firestoreDb,
      "schools",
      firestoreSettings.schoolId,
      "apps",
      firestoreSettings.appStateDocument
    );

    const snapshot = await getDoc(firestoreStateRef);
    if (!snapshot.exists()) {
      await setDoc(firestoreStateRef, {
        ...state,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    onSnapshot(firestoreStateRef, (remoteSnapshot) => {
      if (!remoteSnapshot.exists()) return;
      isApplyingRemoteState = true;
      state = normalizeState(remoteSnapshot.data());
      refreshStudents();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      isApplyingRemoteState = false;
      const migrated = mergeLegacyStudents();
      populateSelects();
      render();
      if (migrated) return;
    }, (error) => {
      console.warn("Could not subscribe to shared HallPass data. Local fallback is still available.", error);
    });
  } catch (error) {
    console.warn("Could not initialize Firebase. HallPass is running in local-only mode.", error);
  }
}

function todayTrips() {
  const today = new Date().toDateString();
  return state.trips.filter((trip) => new Date(trip.leftAt).toDateString() === today);
}

function activeTrips() {
  return state.trips.filter((trip) => !trip.returnedAt);
}

function teacherClasses() {
  return teachers.filter((teacher) => teacher.id !== "t-deb");
}

function studentsForClass(teacherId, grade) {
  return activeStudents().filter((student) => student.grade === grade);
}

function studentById(id) {
  return students.find((student) => student.id === id);
}

function studentNameForTrip(trip, options = {}) {
  const student = studentById(trip.studentId);
  return options.privateDisplay ? displayStudentName(student) : student?.name || "Student";
}

function teacherById(id) {
  return teachers.find((teacher) => teacher.id === id);
}

function gradeLabel(grade) {
  return `${grade}th Grade`.replace("5th", "5th").replace("6th", "6th").replace("7th", "7th").replace("8th", "8th");
}

function formatDestination(trip) {
  if (trip.destination === "Another Teacher's Room" && trip.destinationTeacherId) {
    return `${trip.destination}: ${teacherName(trip.destinationTeacherId) || "Teacher"}`;
  }
  return trip.destination;
}

function countTripsForStudent(studentId) {
  return todayTrips().filter((trip) => trip.studentId === studentId).length;
}

function totalTimeForStudent(studentId) {
  const now = Date.now();
  return todayTrips()
    .filter((trip) => trip.studentId === studentId)
    .reduce((total, trip) => total + ((trip.returnedAt || now) - trip.leftAt), 0);
}

function elapsedLabel(startMs, endMs = Date.now()) {
  const totalMinutes = Math.max(0, Math.floor((endMs - startMs) / 60000));
  if (totalMinutes < 1) return "under 1 min";
  if (totalMinutes === 1) return "1 min";
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} hr ${minutes} min`;
}

function minutesLabel(minutes) {
  const rounded = Math.round(minutes);
  if (rounded < 1) return "under 1 min";
  if (rounded === 1) return "1 min";
  if (rounded < 60) return `${rounded} min`;
  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return `${hours} hr ${remainder} min`;
}

function tripMinutes(trip) {
  return Math.max(0, ((trip.returnedAt || Date.now()) - trip.leftAt) / 60000);
}

function dateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function rangeBounds() {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  if (els.reportRangeSelect.value === "day") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (els.reportRangeSelect.value === "week") {
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (els.reportRangeSelect.value === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else {
    start = els.reportStartDate.value ? new Date(`${els.reportStartDate.value}T00:00:00`) : new Date(0);
    end = els.reportEndDate.value ? new Date(`${els.reportEndDate.value}T23:59:59`) : new Date();
  }

  return { start, end };
}

function filteredTrips() {
  const { start, end } = rangeBounds();
  const selectedStudent = selectedReportStudentId();
  return state.trips.filter((trip) => {
    const leftAt = new Date(trip.leftAt);
    if (leftAt < start || leftAt > end) return false;
    if (els.reportDestinationSelect.value !== "all" && trip.destination !== els.reportDestinationSelect.value) return false;
    if (els.reportTeacherSelect.value !== "all" && trip.teacherId !== els.reportTeacherSelect.value) return false;
    if (selectedStudent !== "all" && trip.studentId !== selectedStudent) return false;
    return true;
  });
}

function selectedPieTeacherIds() {
  const selected = Array.from(els.reportPieTeacherChecks.querySelectorAll("input:checked")).map((input) => input.value);
  return selected.length ? selected : teacherClasses().map((teacher) => teacher.id);
}

function selectedReportStudentId() {
  return selectedReportStudentIdValue;
}

function reportStudentLabel(student) {
  return `${student.name} - ${gradeLabel(student.grade)}`;
}

function populateSelects() {
  els.teacherSelect.innerHTML = teacherClasses()
    .map((teacher) => `<option value="${teacher.id}">${escapeHtml(teacherName(teacher))}</option>`)
    .join("");
  els.teacherGradeSelect.innerHTML = grades.map((grade) => `<option value="${grade}">${gradeLabel(grade)}</option>`).join("");
  els.addStudentGradeSelect.innerHTML = grades.map((grade) => `<option value="${grade}">${gradeLabel(grade)}</option>`).join("");
  els.bulkImportGradeSelect.innerHTML = grades.map((grade) => `<option value="${grade}">${gradeLabel(grade)}</option>`).join("");
  els.destinationSelect.innerHTML = destinations.map((destination) => `<option value="${destination}">${destination}</option>`).join("");
  els.destinationTeacherSelect.innerHTML = teachers.map((teacher) => `<option value="${teacher.id}">${escapeHtml(teacherName(teacher))} - ${teacher.room}</option>`).join("");
  els.displayTeacherSelect.innerHTML = teacherClasses()
    .map((teacher) => `<option value="${teacher.id}">${escapeHtml(teacherName(teacher))}</option>`)
    .join("");
  els.displayGradeSelect.innerHTML = grades.map((grade) => `<option value="${grade}">${gradeLabel(grade)}</option>`).join("");
  els.displayDestinationSelect.innerHTML = destinations.map((destination) => `<option value="${destination}">${destination}</option>`).join("");
  els.displayDestinationTeacherSelect.innerHTML = teachers.map((teacher) => `<option value="${teacher.id}">${escapeHtml(teacherName(teacher))} - ${teacher.room}</option>`).join("");
  populateReportOptions();
  els.teacherSelect.value = state.selectedTeacherId;
  els.teacherGradeSelect.value = state.selectedTeacherGrade;
  els.addStudentGradeSelect.value = state.selectedTeacherGrade;
  els.bulkImportGradeSelect.value = state.selectedTeacherGrade;
  els.displayTeacherSelect.value = state.selectedDisplayTeacherId;
  els.displayGradeSelect.value = state.selectedDisplayGrade;
  populateTeacherStudentSelect();
  populateDisplayStudentSelect();
}

function populateReportOptions() {
  const selectedDestination = els.reportDestinationSelect.value || "all";
  const selectedTeacher = els.reportTeacherSelect.value || "all";
  const selectedPieTeachers = new Set(Array.from(els.reportPieTeacherChecks.querySelectorAll("input:checked")).map((input) => input.value));

  els.reportDestinationSelect.innerHTML = [
    '<option value="all">All destinations</option>',
    ...destinations.map((destination) => `<option value="${escapeHtml(destination)}">${escapeHtml(destination)}</option>`)
  ].join("");
  els.reportTeacherSelect.innerHTML = [
    '<option value="all">All classes</option>',
    ...teacherClasses().map((teacher) => `<option value="${teacher.id}">${escapeHtml(teacherName(teacher))}</option>`)
  ].join("");
  els.reportPieTeacherChecks.innerHTML = teacherClasses()
    .map((teacher) => `
      <label class="check-row">
        <input type="checkbox" value="${teacher.id}" ${selectedPieTeachers.size && !selectedPieTeachers.has(teacher.id) ? "" : "checked"}>
        ${escapeHtml(teacherName(teacher))}
      </label>
    `)
    .join("");

  els.reportDestinationSelect.value = [...els.reportDestinationSelect.options].some((option) => option.value === selectedDestination) ? selectedDestination : "all";
  els.reportTeacherSelect.value = [...els.reportTeacherSelect.options].some((option) => option.value === selectedTeacher) ? selectedTeacher : "all";
}

function populateTeacherStudentSelect() {
  const options = studentsForClass(state.selectedTeacherId, state.selectedTeacherGrade)
    .map((student) => `<option value="${student.id}">${escapeHtml(student.name)}</option>`)
    .join("");
  els.studentSelect.innerHTML = options;
}

function populateDisplayStudentSelect() {
  const options = studentsForClass(state.selectedDisplayTeacherId, state.selectedDisplayGrade)
    .map((student) => `<option value="${student.id}">${escapeHtml(student.name)}</option>`)
    .join("");
  els.displayStudentSelect.innerHTML = options;
}

function switchView(viewName) {
  if (viewName === "display") {
    teacherUnlocked = false;
    teacherSubtab = "overview";
  }
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewName));
  Object.entries(els.views).forEach(([name, view]) => view.classList.toggle("active", name === viewName));
  if (viewName === "teacher" && !teacherUnlocked) {
    els.teacherCodeInput.value = "";
    els.teacherCodeMessage.textContent = "";
    setTimeout(() => els.teacherCodeInput.focus(), 0);
  }
  render();
}

function renderTeacherAccess() {
  els.teacherLock.classList.toggle("hidden", teacherUnlocked);
  els.teacherContent.classList.toggle("hidden", !teacherUnlocked);
}

function canStudentSignOut(studentId, teacherId, wantsOverride) {
  if (!studentId) return { allowed: false, reason: "Add a student to this class first." };
  const active = activeTrips();
  const classOut = active.filter((trip) => trip.teacherId === teacherId);
  const alreadyOut = active.find((trip) => trip.studentId === studentId);
  const used = countTripsForStudent(studentId);
  const hasMedicalNote = Boolean(state.medicalNotes[studentId]);

  if (alreadyOut) return { allowed: false, reason: "You are already signed out." };
  if (classOut.length >= CLASS_OUT_LIMIT) return { allowed: false, reason: "Two students are already out from this class." };
  if (used >= DAILY_LIMIT && !hasMedicalNote && !wantsOverride) return { allowed: false, reason: "Daily limit reached. Ask your teacher." };
  if (used >= DAILY_LIMIT && hasMedicalNote) return { allowed: true, allowedBy: "doctor's note exemption" };
  if (used >= DAILY_LIMIT && wantsOverride) return { allowed: true, allowedBy: "teacher override" };
  return { allowed: true, allowedBy: "standard" };
}

function renderTeacherView() {
  const teacher = teacherById(state.selectedTeacherId);
  const active = activeTrips();
  const classOut = active.filter((trip) => trip.teacherId === teacher.id);
  const otherOut = active.filter((trip) => trip.teacherId !== teacher.id);
  const destinationNeedsTeacher = els.destinationSelect.value === "Another Teacher's Room";

  els.teacherTitle.textContent = `${teacherName(teacher)}'s page`;
  els.teacherSummary.textContent = `${teacher.room} has ${classOut.length} of ${CLASS_OUT_LIMIT} hall passes in use.`;
  if (document.activeElement !== els.teacherNameInput) {
    els.teacherNameInput.value = savedTeacherName(teacher);
  }
  els.classCapacity.textContent = `${classOut.length} / ${CLASS_OUT_LIMIT} out`;
  els.outWarning.textContent = classOut.length >= CLASS_OUT_LIMIT ? "Full" : "Open";
  els.outWarning.style.color = classOut.length >= CLASS_OUT_LIMIT ? "var(--red)" : "var(--green)";
  els.teacherDestinationField.classList.toggle("hidden", !destinationNeedsTeacher);
  els.overrideReasonField.classList.toggle("hidden", !els.overrideCheck.checked);
  els.otherClassesCount.textContent = `${otherOut.length} out`;

  renderStudentInfo();
  renderOtherClasses(otherOut);
  renderCurrentOut(classOut, els.currentOutList);
  renderRosterForTeacher(teacher, state.selectedTeacherGrade);
  updateTeacherSignoutButton();
}

function renderStudentInfo() {
  const studentId = els.studentSelect.value;
  const student = studentById(studentId);
  if (!student) {
    els.selectedStudentInfo.textContent = "No students are assigned to this class.";
    return;
  }
  const used = countTripsForStudent(studentId);
  const timeOut = totalTimeForStudent(studentId);
  const hasMedicalNote = Boolean(state.medicalNotes[studentId]);
  const limitLabel = used >= DAILY_LIMIT ? "limit reached" : `${DAILY_LIMIT - used} left`;
  els.selectedStudentInfo.innerHTML = `
    <strong>${escapeHtml(student.name)}</strong>
    <div class="meta">${gradeLabel(student.grade)} - ${used} sign-outs today, ${elapsedLabel(0, timeOut)} total time out</div>
    <span class="pill ${used >= DAILY_LIMIT ? "warning" : ""}">${limitLabel}</span>
    ${hasMedicalNote ? '<span class="pill medical">doctor note on file</span>' : ""}
  `;
}

function renderOtherClasses(trips) {
  if (!trips.length) {
    els.otherClassesList.classList.add("empty");
    els.otherClassesList.textContent = "No students are currently out in other classes.";
    return;
  }
  els.otherClassesList.classList.remove("empty");
  els.otherClassesList.innerHTML = trips
    .map((trip) => `
      <article class="status-item">
        <strong>${escapeHtml(studentById(trip.studentId)?.name || "Student")}</strong>
        <div class="meta">${escapeHtml(formatDestination(trip))} - ${escapeHtml(teacherName(trip.teacherId))}</div>
        <span class="pill">${elapsedLabel(trip.leftAt)}</span>
      </article>
    `)
    .join("");
}

function renderCurrentOut(trips, container) {
  if (!trips.length) {
    container.innerHTML = '<p class="empty">No one is signed out from this class.</p>';
    return;
  }
  const alertMinutes = Number(state.settings.longAbsenceMinutes) || LONG_ABSENCE_MINUTES;
  container.innerHTML = trips
    .map((trip) => {
      const minutesOut = tripMinutes(trip);
      const needsAlert = minutesOut >= alertMinutes;
      return `
      <article class="out-card ${needsAlert ? "alert-card" : ""}">
        <div>
          <h3>${escapeHtml(studentNameForTrip(trip))}</h3>
          <p class="meta">${escapeHtml(formatDestination(trip))} - out ${elapsedLabel(trip.leftAt)}</p>
          ${trip.note ? `<p class="meta">Note: ${escapeHtml(trip.note)}</p>` : ""}
          <span class="pill">${escapeHtml(trip.allowedBy)}</span>
          ${needsAlert ? `<span class="pill danger">over ${alertMinutes} min</span>` : ""}
        </div>
        <button class="return-button" type="button" data-return-id="${trip.id}">Sign Back In</button>
      </article>
    `;
    })
    .join("");
}

function renderRosterForTeacher(teacher, grade) {
  const roster = studentsForClass(teacher.id, grade);
  if (!roster.length) {
    els.todayCounts.innerHTML = `<p class="empty">No students have been added to the shared ${gradeLabel(grade)} roster yet.</p>`;
    return;
  }
  els.todayCounts.innerHTML = roster
    .map((student) => {
      const used = countTripsForStudent(student.id);
      const hasMedicalNote = Boolean(state.medicalNotes[student.id]);
      const locked = used >= DAILY_LIMIT && !hasMedicalNote;
      return `
        <article class="count-row roster-row">
          <div>
            <strong>${escapeHtml(student.name)}</strong>
            <span class="meta">${used}/${DAILY_LIMIT} sign-outs today - ${elapsedLabel(0, totalTimeForStudent(student.id))} total</span>
          </div>
          <label class="switch">
            <input type="checkbox" data-medical-id="${student.id}" ${hasMedicalNote ? "checked" : ""}>
            Doctor's note
          </label>
          <span class="pill ${locked ? "danger" : ""}">${locked ? "locked" : "active"}</span>
          <button class="delete-button" type="button" data-delete-student-id="${student.id}">Remove</button>
        </article>
      `;
    })
    .join("");
}

function renderDisplayView() {
  const active = activeTrips();
  const displayTeacher = teacherById(state.selectedDisplayTeacherId);
  const displayClassOut = active.filter((trip) => trip.teacherId === displayTeacher.id);
  const destinationNeedsTeacher = els.displayDestinationSelect.value === "Another Teacher's Room";

  els.displayTotalOut.textContent = active.length;
  els.displayCapacity.textContent = `${displayClassOut.length} / ${CLASS_OUT_LIMIT} out`;
  els.displayTeacherDestinationField.classList.toggle("hidden", !destinationNeedsTeacher);
  updateDisplaySignoutButton();

  const fullClasses = teacherClasses()
    .map((teacher) => ({ teacher, trips: active.filter((trip) => trip.teacherId === teacher.id) }))
    .filter((item) => item.trips.length >= CLASS_OUT_LIMIT);

  els.capacityAlert.classList.toggle("hidden", !fullClasses.length);
  els.capacityAlert.innerHTML = fullClasses.length
    ? `<strong>Capacity reached:</strong> ${fullClasses.map((item) => escapeHtml(teacherName(item.teacher))).join(", ")} must wait for someone to sign back in.`
    : "";

  els.displayCards.innerHTML = teacherClasses()
    .map((teacher) => {
      const trips = active.filter((trip) => trip.teacherId === teacher.id);
      const alertMinutes = Number(state.settings.longAbsenceMinutes) || LONG_ABSENCE_MINUTES;
      return `
        <article class="display-card">
          <header>
            <div>
              <h2>${escapeHtml(teacherName(teacher))}</h2>
              <span class="meta">${teacher.room}</span>
            </div>
            <span class="pill ${trips.length >= CLASS_OUT_LIMIT ? "danger" : ""}">${trips.length}/${CLASS_OUT_LIMIT}</span>
          </header>
          ${
            trips.length
              ? `<ul>${trips.map((trip) => `
                  <li class="${tripMinutes(trip) >= alertMinutes ? "alert-list-item" : ""}">
                    <strong>${escapeHtml(studentNameForTrip(trip, { privateDisplay: true }))}</strong>
                    <div class="meta">${gradeLabel(studentById(trip.studentId)?.grade || "")} - ${escapeHtml(formatDestination(trip))}</div>
                    <div class="timer">${elapsedLabel(trip.leftAt)}</div>
                    ${tripMinutes(trip) >= alertMinutes ? `<div class="meta danger-text">Please check in with the teacher.</div>` : ""}
                    <button class="return-button" type="button" data-return-id="${trip.id}">Sign Back In</button>
                  </li>
                `).join("")}</ul>`
              : '<p class="empty">All students are in class.</p>'
          }
        </article>
      `;
    })
    .join("");
}

function renderTeacherSubtabs() {
  els.teacherSubtabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.teacherTab === teacherSubtab));
  els.teacherOverviewPanels.forEach((panel) => panel.classList.toggle("hidden", teacherSubtab !== "overview"));
  els.dataContent.classList.toggle("hidden", teacherSubtab !== "data");
  els.settingsContent.classList.toggle("hidden", teacherSubtab !== "settings");
}

function renderDataCenter() {
  if (!teacherUnlocked || teacherSubtab !== "data") return;
  populateReportOptions();
  renderStudentSearchResults();
  renderSelectedStudentBanner();
  const isCustom = els.reportRangeSelect.value === "custom";
  els.reportStartField.classList.toggle("hidden", !isCustom);
  els.reportEndField.classList.toggle("hidden", !isCustom);
  if (!els.reportStartDate.value) els.reportStartDate.value = dateInputValue(new Date());
  if (!els.reportEndDate.value) els.reportEndDate.value = dateInputValue(new Date());

  const trips = filteredTrips();
  const totalMinutes = trips.reduce((sum, trip) => sum + tripMinutes(trip), 0);
  const averageMinutes = trips.length ? totalMinutes / trips.length : 0;
  const uniqueStudents = new Set(trips.map((trip) => trip.studentId)).size;

  els.reportSummary.innerHTML = `
    <article class="summary-card">
      <span>Total trips</span>
      <strong>${trips.length}</strong>
    </article>
    <article class="summary-card">
      <span>Students</span>
      <strong>${uniqueStudents}</strong>
    </article>
    <article class="summary-card">
      <span>Total time out</span>
      <strong>${minutesLabel(totalMinutes)}</strong>
    </article>
    <article class="summary-card">
      <span>Average trip</span>
      <strong>${minutesLabel(averageMinutes)}</strong>
    </article>
  `;

  renderDestinationBreakdown(trips);
  renderStudentPie(trips);
  renderTripTable(trips);
}

function renderSettings() {
  if (!teacherUnlocked || teacherSubtab !== "settings") return;
  els.privacyModeCheck.checked = Boolean(state.settings.privacyMode);
  if (document.activeElement !== els.alertMinutesInput) {
    els.alertMinutesInput.value = Number(state.settings.longAbsenceMinutes) || LONG_ABSENCE_MINUTES;
  }
  if (document.activeElement !== els.alertContactsInput) {
    els.alertContactsInput.value = (state.settings.alertContacts || []).join("\n");
  }
  if (!els.bulkImportGradeSelect.value) {
    els.bulkImportGradeSelect.value = state.selectedTeacherGrade;
  }
}

function renderStudentSearchResults() {
  const query = els.reportStudentSearch.value.trim().toLowerCase();
  if (!query) {
    els.reportStudentResults.classList.add("hidden");
    els.reportStudentResults.innerHTML = "";
    return;
  }
  const matches = activeStudents()
    .filter((student) => student.name.toLowerCase().includes(query))
    .sort((a, b) => a.grade.localeCompare(b.grade) || a.name.localeCompare(b.name))
    .slice(0, 8);

  if (!matches.length) {
    els.reportStudentResults.classList.remove("hidden");
    els.reportStudentResults.innerHTML = '<p class="empty">No matching students.</p>';
    return;
  }

  els.reportStudentResults.classList.remove("hidden");
  els.reportStudentResults.innerHTML = matches
    .map((student) => `
      <button class="student-result" type="button" data-report-student-id="${student.id}">
        <strong>${escapeHtml(student.name)}</strong>
        <span>${gradeLabel(student.grade)}</span>
      </button>
    `)
    .join("");
}

function renderSelectedStudentBanner() {
  const student = selectedReportStudentIdValue === "all" ? null : studentById(selectedReportStudentIdValue);
  els.selectedStudentBanner.classList.toggle("hidden", !student);
  els.selectedStudentBanner.innerHTML = student
    ? `<span>Selected student</span><strong>${escapeHtml(student.name)}</strong><button type="button" data-clear-report-student>Clear</button>`
    : "";
}

function renderDestinationBreakdown(trips) {
  const byDestination = new Map();
  trips.forEach((trip) => {
    const key = trip.destination;
    const current = byDestination.get(key) || { count: 0, minutes: 0 };
    current.count += 1;
    current.minutes += tripMinutes(trip);
    byDestination.set(key, current);
  });

  els.destinationBreakdownLabel.textContent = els.reportDestinationSelect.value === "all"
    ? "All destinations"
    : els.reportDestinationSelect.value;

  if (!byDestination.size) {
    els.destinationBreakdown.innerHTML = '<p class="empty">No trips match these filters.</p>';
    return;
  }

  els.destinationBreakdown.innerHTML = Array.from(byDestination.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([destination, item]) => `
      <article class="status-item">
        <strong>${escapeHtml(destination)}</strong>
        <div class="meta">${item.count} trips - ${minutesLabel(item.minutes)} total</div>
        <span class="pill">${minutesLabel(item.minutes / item.count)} avg</span>
      </article>
    `)
    .join("");
}

function renderStudentPie(trips) {
  const studentId = selectedReportStudentId();
  if (studentId === "all") {
    els.studentPieLabel.textContent = "Choose a student";
    els.studentPieChart.innerHTML = '<p class="empty">Select one student to see their time-out percentage.</p>';
    return;
  }

  const student = studentById(studentId);
  const teacherIds = selectedPieTeacherIds();
  const studentTrips = trips.filter((trip) => trip.studentId === studentId && teacherIds.includes(trip.teacherId));
  const minutesOut = studentTrips.reduce((sum, trip) => sum + tripMinutes(trip), 0);
  const possibleMinutes = els.reportScopeSelect.value === "period" ? CLASS_PERIOD_MINUTES : SCHOOL_DAY_MINUTES;
  const cappedPercent = Math.min(100, possibleMinutes ? (minutesOut / possibleMinutes) * 100 : 0);
  const dash = `${cappedPercent} ${100 - cappedPercent}`;

  els.studentPieLabel.textContent = student ? student.name : "Selected student";
  els.studentPieChart.innerHTML = `
    <svg viewBox="0 0 42 42" role="img" aria-label="${Math.round(cappedPercent)} percent out of class">
      <circle class="pie-bg" cx="21" cy="21" r="15.915"></circle>
      <circle class="pie-slice" cx="21" cy="21" r="15.915" stroke-dasharray="${dash}" stroke-dashoffset="25"></circle>
      <text x="21" y="20" text-anchor="middle">${Math.round(cappedPercent)}%</text>
      <text x="21" y="25" text-anchor="middle">out</text>
    </svg>
    <div>
      <strong>${minutesLabel(minutesOut)}</strong>
      <span class="meta">out of ${minutesLabel(possibleMinutes)} ${els.reportScopeSelect.value === "period" ? "class period" : "school day"}</span>
    </div>
    <div class="teacher-compare">
      ${renderTeacherComparison(studentTrips)}
    </div>
  `;
}

function renderTeacherComparison(studentTrips) {
  const selectedIds = selectedPieTeacherIds();
  return selectedIds
    .map((teacherId) => {
      const teacherTrips = studentTrips.filter((trip) => trip.teacherId === teacherId);
      const minutes = teacherTrips.reduce((sum, trip) => sum + tripMinutes(trip), 0);
      return `
        <article class="compare-row">
          <strong>${escapeHtml(teacherName(teacherId))}</strong>
          <span>${teacherTrips.length} trips</span>
          <span>${minutesLabel(minutes)}</span>
        </article>
      `;
    })
    .join("");
}

function renderTripTable(trips) {
  els.tripCountLabel.textContent = `${trips.length} ${trips.length === 1 ? "trip" : "trips"}`;
  if (!trips.length) {
    els.tripTable.innerHTML = '<p class="empty">No trip details match these filters.</p>';
    return;
  }
  els.tripTable.innerHTML = `
    <div class="trip-row trip-header">
      <span>Student</span>
      <span>Class</span>
      <span>Destination</span>
      <span>Date</span>
      <span>Time gone</span>
      <span>Note</span>
    </div>
    ${trips.map((trip) => {
      const student = studentById(trip.studentId);
      return `
        <div class="trip-row">
          <span>${escapeHtml(student?.name || "Student")}</span>
          <span>${escapeHtml(teacherName(trip.teacherId))}</span>
          <span>${escapeHtml(formatDestination(trip))}</span>
          <span>${new Date(trip.leftAt).toLocaleDateString()}</span>
          <span>${minutesLabel(tripMinutes(trip))}</span>
          <span>${escapeHtml(trip.note || trip.overrideReason || "")}</span>
        </div>
      `;
    }).join("")}
  `;
}

function updateTeacherSignoutButton() {
  const result = canStudentSignOut(els.studentSelect.value, state.selectedTeacherId, els.overrideCheck.checked);
  els.signoutButton.disabled = !result.allowed;
  els.signoutMessage.textContent = result.allowed ? `Allowed by ${result.allowedBy}.` : result.reason;
}

function updateDisplaySignoutButton() {
  const teacher = teacherById(state.selectedDisplayTeacherId);
  const result = canStudentSignOut(els.displayStudentSelect.value, teacher.id, false);
  els.displaySignoutButton.disabled = !result.allowed;
  els.displaySignoutMessage.textContent = result.allowed ? "Ready to sign out." : result.reason;
}

function createTrip({ studentId, teacherId, destination, destinationTeacherId, allowedBy, overrideReason = "", note = "" }) {
  state.trips.unshift({
    id: crypto.randomUUID(),
    studentId,
    teacherId,
    destination,
    destinationTeacherId,
    leftAt: Date.now(),
    returnedAt: null,
    allowedBy,
    overrideReason,
    note
  });
  saveState();
}

function teacherSignOut(event) {
  event.preventDefault();
  const studentId = els.studentSelect.value;
  const destination = els.destinationSelect.value;
  const wantsOverride = els.overrideCheck.checked;
  const check = canStudentSignOut(studentId, state.selectedTeacherId, wantsOverride);

  if (!check.allowed) {
    els.signoutMessage.textContent = check.reason;
    return;
  }
  if (wantsOverride && !els.overrideReason.value.trim()) {
    els.signoutMessage.textContent = "Add an override reason before signing out.";
    els.overrideReason.focus();
    return;
  }

  createTrip({
    studentId,
    teacherId: state.selectedTeacherId,
    destination,
    destinationTeacherId: destination === "Another Teacher's Room" ? els.destinationTeacherSelect.value : "",
    allowedBy: check.allowedBy,
    overrideReason: wantsOverride ? els.overrideReason.value.trim() : "",
    note: els.teacherTripNote.value.trim()
  });
  els.overrideCheck.checked = false;
  els.overrideReason.value = "";
  els.teacherTripNote.value = "";
  render();
}

function displaySignOut(event) {
  event.preventDefault();
  const teacher = teacherById(state.selectedDisplayTeacherId);
  const studentId = els.displayStudentSelect.value;
  const destination = els.displayDestinationSelect.value;
  const check = canStudentSignOut(studentId, teacher.id, false);

  if (!check.allowed) {
    els.displaySignoutMessage.textContent = check.reason;
    return;
  }

  createTrip({
    studentId,
    teacherId: teacher.id,
    destination,
    destinationTeacherId: destination === "Another Teacher's Room" ? els.displayDestinationTeacherSelect.value : "",
    allowedBy: check.allowedBy
  });
  render();
}

function returnStudent(tripId) {
  state.trips = state.trips.map((trip) => (
    trip.id === tripId ? { ...trip, returnedAt: Date.now() } : trip
  ));
  saveState();
  render();
}

function deleteStudent(studentId) {
  const student = studentById(studentId);
  if (!student) return;
  if (!state.archivedStudentIds.includes(studentId)) {
    state.archivedStudentIds.push(studentId);
  }
  refreshStudents();
  saveState();
  populateTeacherStudentSelect();
  populateDisplayStudentSelect();
  els.manageMessage.textContent = `${student.name} removed from the active roster. Their history is still in Data Center.`;
  render();
}

function resetDay() {
  const today = new Date().toDateString();
  state.trips = state.trips.filter((trip) => new Date(trip.leftAt).toDateString() !== today);
  refreshStudents();
  saveState();
  populateSelects();
  render();
}

function unlockTeacherPage(event) {
  event.preventDefault();
  if (els.teacherCodeInput.value.trim() !== TEACHER_CODE) {
    els.teacherCodeMessage.textContent = "Incorrect code.";
    els.teacherCodeInput.select();
    return;
  }
  teacherUnlocked = true;
  els.teacherCodeMessage.textContent = "";
  render();
}

function saveTeacherName(event) {
  event.preventDefault();
  const teacher = teacherById(state.selectedTeacherId);
  const nextName = els.teacherNameInput.value.trim();
  if (!nextName) {
    els.manageMessage.textContent = "Teacher name cannot be blank.";
    return;
  }
  state.teacherNames[teacher.id] = nextName;
  saveState();
  populateSelects();
  els.teacherSelect.value = teacher.id;
  els.manageMessage.textContent = "Teacher name saved.";
  render();
}

function addStudent(event) {
  event.preventDefault();
  const teacher = teacherById(state.selectedTeacherId);
  const grade = els.addStudentGradeSelect.value;
  const name = els.newStudentNameInput.value.trim();
  if (!name) {
    els.manageMessage.textContent = "Enter a student name first.";
    return;
  }
  const newStudent = {
    id: `s-custom-${crypto.randomUUID()}`,
    name,
    grade,
    medicalNote: false
  };
  state.extraStudents.push(newStudent);
  state.medicalNotes[newStudent.id] = false;
  state.selectedTeacherGrade = grade;
  refreshStudents();
  saveState();
  populateSelects();
  els.teacherSelect.value = teacher.id;
  els.teacherGradeSelect.value = grade;
  els.studentSelect.value = newStudent.id;
  if (state.selectedDisplayGrade === grade) {
    els.displayStudentSelect.value = newStudent.id;
  }
  els.newStudentNameInput.value = "";
  els.manageMessage.textContent = `${name} added to ${gradeLabel(grade)}.`;
  render();
}

function saveSettings() {
  const minutes = Math.max(1, Math.min(60, Number(els.alertMinutesInput.value) || LONG_ABSENCE_MINUTES));
  state.settings = {
    ...state.settings,
    privacyMode: els.privacyModeCheck.checked,
    longAbsenceMinutes: minutes,
    alertContacts: els.alertContactsInput.value
      .split(/\r?\n/)
      .map((contact) => contact.trim())
      .filter(Boolean)
  };
  saveState();
  els.settingsMessage.textContent = "Settings saved.";
  render();
}

function bulkImportStudents() {
  const grade = els.bulkImportGradeSelect.value;
  const names = els.bulkStudentInput.value
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);

  if (!names.length) {
    els.bulkImportMessage.textContent = "Paste at least one student name first.";
    return;
  }

  const existing = new Set(activeStudents().map((student) => `${student.name.trim().toLowerCase()}|${student.grade}`));
  const additions = [];
  names.forEach((name) => {
    const key = `${name.toLowerCase()}|${grade}`;
    if (existing.has(key)) return;
    existing.add(key);
    additions.push({
      id: `s-custom-${crypto.randomUUID()}`,
      name,
      grade,
      medicalNote: false
    });
  });

  additions.forEach((student) => {
    state.extraStudents.push(student);
    state.medicalNotes[student.id] = false;
  });
  state.selectedTeacherGrade = grade;
  refreshStudents();
  saveState();
  populateSelects();
  els.bulkStudentInput.value = "";
  els.bulkImportMessage.textContent = additions.length
    ? `${additions.length} students imported to ${gradeLabel(grade)}.`
    : "Those students were already on the active roster.";
  render();
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportFilteredTrips() {
  const rows = [[
    "Student",
    "Grade",
    "Class",
    "Destination",
    "Date",
    "Left",
    "Returned",
    "Minutes",
    "Allowed By",
    "Note"
  ]];
  filteredTrips().forEach((trip) => {
    const student = studentById(trip.studentId);
    rows.push([
      student?.name || "Student",
      student?.grade || "",
      teacherName(trip.teacherId),
      formatDestination(trip),
      new Date(trip.leftAt).toLocaleDateString(),
      new Date(trip.leftAt).toLocaleTimeString(),
      trip.returnedAt ? new Date(trip.returnedAt).toLocaleTimeString() : "Still out",
      Math.round(tripMinutes(trip)),
      trip.allowedBy,
      trip.note || trip.overrideReason || ""
    ]);
  });
  downloadCsv(`hallpass-trips-${dateInputValue(new Date())}.csv`, rows);
}

function downloadRosterCsv() {
  const rows = [["Name", "Grade", "Doctor Note", "Active"]];
  students
    .slice()
    .sort((a, b) => a.grade.localeCompare(b.grade) || a.name.localeCompare(b.name))
    .forEach((student) => {
      rows.push([
        student.name,
        gradeLabel(student.grade),
        state.medicalNotes[student.id] ? "Yes" : "No",
        isArchivedStudent(student.id) ? "No" : "Yes"
      ]);
    });
  downloadCsv(`hallpass-roster-${dateInputValue(new Date())}.csv`, rows);
}

function bindEvents() {
  els.tabs.forEach((tab) => tab.addEventListener("click", () => switchView(tab.dataset.view)));
  els.teacherSubtabs.forEach((tab) => tab.addEventListener("click", () => {
    teacherSubtab = tab.dataset.teacherTab;
    render();
  }));
  els.teacherCodeForm.addEventListener("submit", unlockTeacherPage);
  els.teacherSelect.addEventListener("change", () => {
    state.selectedTeacherId = els.teacherSelect.value;
    saveState();
    populateTeacherStudentSelect();
    render();
  });
  els.teacherGradeSelect.addEventListener("change", () => {
    state.selectedTeacherGrade = els.teacherGradeSelect.value;
    els.addStudentGradeSelect.value = state.selectedTeacherGrade;
    saveState();
    populateTeacherStudentSelect();
    render();
  });
  els.addStudentGradeSelect.addEventListener("change", () => {
    state.selectedTeacherGrade = els.addStudentGradeSelect.value;
    els.teacherGradeSelect.value = state.selectedTeacherGrade;
    saveState();
    populateTeacherStudentSelect();
    render();
  });
  els.studentSelect.addEventListener("change", render);
  els.destinationSelect.addEventListener("change", render);
  els.overrideCheck.addEventListener("change", render);
  els.signoutForm.addEventListener("submit", teacherSignOut);
  els.displayGradeSelect.addEventListener("change", () => {
    state.selectedDisplayGrade = els.displayGradeSelect.value;
    saveState();
    populateDisplayStudentSelect();
    render();
  });
  els.displayTeacherSelect.addEventListener("change", () => {
    state.selectedDisplayTeacherId = els.displayTeacherSelect.value;
    saveState();
    populateDisplayStudentSelect();
    render();
  });
  els.displayStudentSelect.addEventListener("change", render);
  els.displayDestinationSelect.addEventListener("change", render);
  els.displaySignoutForm.addEventListener("submit", displaySignOut);
  [
    els.reportRangeSelect,
    els.reportStartDate,
    els.reportEndDate,
    els.reportDestinationSelect,
    els.reportTeacherSelect,
    els.reportScopeSelect
  ].forEach((control) => control.addEventListener("change", render));
  els.reportStudentSearch.addEventListener("input", render);
  els.reportPieTeacherChecks.addEventListener("change", render);
  els.reportStudentResults.addEventListener("click", (event) => {
    const button = event.target.closest("[data-report-student-id]");
    if (!button) return;
    selectedReportStudentIdValue = button.dataset.reportStudentId;
    const student = studentById(selectedReportStudentIdValue);
    els.reportStudentSearch.value = student?.name || "";
    els.reportStudentResults.classList.add("hidden");
    render();
  });
  els.selectedStudentBanner.addEventListener("click", (event) => {
    if (!event.target.closest("[data-clear-report-student]")) return;
    selectedReportStudentIdValue = "all";
    els.reportStudentSearch.value = "";
    render();
  });
  els.teacherNameForm.addEventListener("submit", saveTeacherName);
  els.addStudentForm.addEventListener("submit", addStudent);
  els.saveSettingsButton.addEventListener("click", saveSettings);
  els.bulkImportButton.addEventListener("click", bulkImportStudents);
  els.downloadRosterButton.addEventListener("click", downloadRosterCsv);
  els.exportTripsButton.addEventListener("click", exportFilteredTrips);
  els.resetDayButton.addEventListener("click", resetDay);
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-return-id]");
    if (button) returnStudent(button.dataset.returnId);
  });
  els.todayCounts.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-student-id]");
    if (!button) return;
    deleteStudent(button.dataset.deleteStudentId);
  });
  els.todayCounts.addEventListener("change", (event) => {
    const input = event.target.closest("[data-medical-id]");
    if (!input) return;
    state.medicalNotes[input.dataset.medicalId] = input.checked;
    saveState();
    render();
  });
}

function render() {
  renderTeacherAccess();
  renderTeacherSubtabs();
  renderTeacherView();
  renderDisplayView();
  renderDataCenter();
  renderSettings();
}

populateSelects();
bindEvents();
render();
initializeSharedData();
setInterval(render, 1000);
