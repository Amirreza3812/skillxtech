// داشبورد کلاس: همه‌ی محتوا از data/courses.json خوانده می‌شود.
// برای اضافه کردن درس جدید فقط همان فایل JSON را ویرایش کن.

const DATA_URL = "data/courses.json";
const PROJECTS_VIEW = "projects";

const state = {
  data: null,
  view: null,      // شناسه‌ی دوره یا "projects"
  query: "",
  today: null      // { course, lesson } یا null
};

const faNumber = new Intl.NumberFormat("fa-IR");

/* ---------- کمک‌ها ---------- */

function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text) node.textContent = options.text;
  if (options.href) node.href = options.href;
  if (options.type) node.type = options.type;
  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      node.setAttribute(key, value);
    }
  }
  if (options.onClick) node.addEventListener("click", options.onClick);
  for (const child of children) node.append(child);
  return node;
}

function $(id) {
  return document.getElementById(id);
}

function lessonUrl(course, lesson) {
  return `courses/${course.id}/${lesson.id}/index.html`;
}

function exerciseUrl(course, lesson) {
  return `courses/${course.id}/${lesson.id}/exercise.html`;
}

function projectUrl(project) {
  return `projects/${project.id}/index.html`;
}

function isReady(item) {
  return item.status !== "soon";
}

function hasExercise(lesson) {
  return lesson.exercise !== false;
}

function matches(item) {
  const q = state.query.trim().toLowerCase();
  if (!q) return true;
  return `${item.title} ${item.summary || ""}`.toLowerCase().includes(q);
}

/* ---------- درس امروز ---------- */

function findToday(data) {
  // اول: مقدار "today" در JSON، به شکل "web/02-css-display"
  if (data.today) {
    const [courseId, lessonId] = data.today.split("/");
    const course = data.courses.find((c) => c.id === courseId);
    const lesson = course && course.lessons.find((l) => l.id === lessonId);
    if (course && lesson) return { course, lesson, fromJson: true };
  }
  // اگر تنظیم نشده بود: اولین درس آماده
  for (const course of data.courses) {
    const lesson = course.lessons.find(isReady);
    if (lesson) return { course, lesson, fromJson: false };
  }
  return null;
}

function renderToday() {
  const box = $("today");
  box.replaceChildren();

  const found = findToday(state.data);
  state.today = found;
  if (!found) {
    box.hidden = true;
    return;
  }

  const { course, lesson, fromJson } = found;

  const info = el("div", {}, [
    el("p", { className: "today-label", text: fromJson ? "درس امروز" : "اولین درس" }),
    el("h2", { className: "today-title", text: lesson.title }),
    el("p", { className: "today-meta", text: course.title })
  ]);

  const actions = el("div", { className: "today-actions" }, [
    el("a", { className: "btn btn-chalk", href: lessonUrl(course, lesson), text: "شروع درس" })
  ]);
  if (hasExercise(lesson)) {
    actions.append(
      el("a", {
        className: "btn btn-outline-light",
        href: exerciseUrl(course, lesson),
        text: "تمرین این درس"
      })
    );
  }

  box.append(info, actions);
  box.hidden = false;
}

/* ---------- منوی دوره‌ها ---------- */

function renderNav() {
  const nav = $("nav");
  nav.replaceChildren();

  for (const course of state.data.courses) {
    nav.append(navButton(course.id, course.title, course.lessons.length, course.color));
  }

  const projects = state.data.projects || [];
  if (projects.length) {
    nav.append(el("div", { className: "nav-divider" }));
    nav.append(navButton(PROJECTS_VIEW, "پروژه‌ها", projects.length, "#14263a"));
  }
}

function navButton(id, title, count, color) {
  const button = el(
    "button",
    {
      className: "nav-item",
      type: "button",
      attrs: { "aria-current": String(state.view === id) },
      onClick: () => {
        state.view = id;
        state.query = "";
        $("search").value = "";
        render();
      }
    },
    [
      el("span", { text: title }),
      el("span", { className: "nav-count", text: `${faNumber.format(count)} مورد` })
    ]
  );
  if (color) button.style.setProperty("--course-color", color);
  return button;
}

/* ---------- لیست درس‌ها و پروژه‌ها ---------- */

function renderList() {
  const list = $("list");
  list.replaceChildren();

  let rows = [];

  if (state.view === PROJECTS_VIEW) {
    $("view-title").textContent = "پروژه‌ها";
    $("view-description").textContent = "پروژه‌هایی که چند درس را با هم ترکیب می‌کنند";
    rows = (state.data.projects || []).map((project, index) => ({
      item: project,
      index,
      color: "#14263a",
      links: isReady(project)
        ? [{ label: "باز کردن پروژه", href: projectUrl(project), primary: true }]
        : [],
      isToday: false
    }));
  } else {
    const course = state.data.courses.find((c) => c.id === state.view);
    $("view-title").textContent = course.title;
    $("view-description").textContent = course.description || "";
    rows = course.lessons.map((lesson, index) => {
      const links = [];
      if (isReady(lesson)) {
        links.push({ label: "درس", href: lessonUrl(course, lesson), primary: true });
        if (hasExercise(lesson)) {
          links.push({ label: "تمرین", href: exerciseUrl(course, lesson), primary: false });
        }
      }
      const isToday =
        state.today &&
        state.today.fromJson &&
        state.today.course.id === course.id &&
        state.today.lesson.id === lesson.id;
      return { item: lesson, index, color: course.color, links, isToday };
    });
  }

  rows = rows.filter((row) => matches(row.item));

  if (!rows.length) {
    list.append(
      el("li", {
        className: "empty",
        text: state.query ? "درسی با این عبارت پیدا نشد." : "هنوز چیزی اینجا اضافه نشده."
      })
    );
    return;
  }

  for (const row of rows) list.append(renderRow(row));
}

function renderRow({ item, index, color, links, isToday }) {
  const soon = !isReady(item);
  const classes = ["row"];
  if (soon) classes.push("is-soon");
  if (isToday) classes.push("is-today");

  const actions = el("div", { className: "row-actions" });
  if (isToday) actions.append(el("span", { className: "badge badge-today", text: "درس امروز" }));
  if (soon) actions.append(el("span", { className: "badge", text: "به‌زودی" }));
  for (const link of links) {
    actions.append(
      el("a", {
        className: `btn btn-small ${link.primary ? "btn-primary" : "btn-outline"}`,
        href: link.href,
        text: link.label
      })
    );
  }

  const number = el("span", { className: "row-number", text: faNumber.format(index + 1) });
  number.style.setProperty("--course-color", color);

  const text = el("div", {}, [
    el("h3", { className: "row-title", text: item.title }),
    el("p", { className: "row-summary", text: item.summary || "" })
  ]);

  return el("li", { className: classes.join(" ") }, [number, text, actions]);
}

/* ---------- رندر کلی ---------- */

function render() {
  renderNav();
  renderList();
}

function showMessage(html) {
  const box = $("message");
  box.innerHTML = html;
  box.hidden = false;
}

async function init() {
  $("search").addEventListener("input", (event) => {
    state.query = event.target.value;
    renderList();
  });

  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.data = await response.json();
  } catch (error) {
    const isLocalFile = location.protocol === "file:";
    showMessage(
      isLocalFile
        ? "<strong>فایل درس‌ها خوانده نشد.</strong><br>" +
          "مرورگر اجازه نمی‌دهد صفحه‌ای که با دابل‌کلیک باز شده فایل JSON را بخواند. " +
          "یکی از این دو راه را امتحان کن: در VS Code افزونه‌ی Live Server را اجرا کن، " +
          "یا در پوشه‌ی پروژه دستور <code>python -m http.server</code> را بزن و " +
          "آدرس <code>http://localhost:8000</code> را باز کن."
        : "<strong>فایل درس‌ها خوانده نشد.</strong><br>" +
          "بررسی کن که فایل <code>data/courses.json</code> وجود داشته باشد و " +
          "ساختار JSON آن درست باشد (کاما یا گیومه‌ی جا افتاده زیاد پیش می‌آید)."
    );
    console.error(error);
    return;
  }

  const data = state.data;
  document.title = data.site?.SiteTitle || "داشبورد کلاس";
  $("site-title").innerHTML = data.site?.title || "داشبورد کلاس";
  $("site-subtitle").textContent = data.site?.subtitle || "";

  renderToday();

  // نمای اولیه: دوره‌ی درس امروز، وگرنه اولین دوره
  state.view = state.today ? state.today.course.id : data.courses[0]?.id || PROJECTS_VIEW;

  $("layout").hidden = false;
  render();
}

init();
