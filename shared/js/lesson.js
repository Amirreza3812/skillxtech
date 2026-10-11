// اسکریپت مشترک صفحه‌های درس و تمرین.
// چهار کار انجام می‌دهد:
//   1) ساختن فهرست کناری از روی تیترهای h2
//   2) تبدیل هر <div class="demo"> به کادر «کد قابل ویرایش + نتیجه‌ی زنده»
//   3) اضافه کردن دکمه‌ی «کپی» به بلوک‌های کد
//   4) خواندن data/courses.json برای درس قبل / بعد و نام دوره
//
// صفحه باید این ویژگی‌ها را روی <body> داشته باشد:
//   data-course="web"  data-lesson="01-html-basics"  data-root="../../../"

(function () {
  "use strict";

  const body = document.body;
  const root = body.dataset.root || "../../../";

  /* ---------- 1) فهرست کناری ---------- */

  function buildToc() {
    const list = document.getElementById("toc");
    const headings = document.querySelectorAll(".lesson > h2");
    if (!list || !headings.length) return;

    const links = [];
    headings.forEach((heading, index) => {
      if (!heading.id) heading.id = `section-${index + 1}`;
      const link = document.createElement("a");
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;
      const item = document.createElement("li");
      item.append(link);
      list.append(item);
      links.push({ heading, link });
    });

    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach(({ heading, link }) => {
            link.setAttribute("aria-current", String(heading === entry.target));
          });
        });
      },
      { rootMargin: "-10% 0px -75% 0px" }
    );
    links.forEach(({ heading }) => observer.observe(heading));
  }

  /* ---------- 2) کادرهای «امتحان کن» ---------- */

  function wrapDocument(code) {
    // اگر کد یک سند کامل است همان را نمایش بده
    if (/<!doctype/i.test(code) || /<html[\s>]/i.test(code)) return code;
    return (
      '<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="UTF-8">' +
      "<style>body{font-family:Vazirmatn,Tahoma,sans-serif;line-height:1.9;" +
      "margin:14px;color:#14263a}</style></head><body>" +
      code +
      "</body></html>"
    );
  }

  function initDemos() {
    document.querySelectorAll(".demo").forEach((demo) => {
      const textarea = demo.querySelector("textarea");
      if (!textarea) return;

      const original = textarea.value;
      textarea.classList.add("demo-code");
      textarea.spellcheck = false;
      textarea.setAttribute("aria-label", "کد قابل ویرایش");
      if (demo.dataset.height) {
        const h = `${demo.dataset.height}px`;
        textarea.style.minHeight = h;
      }

      const title = document.createElement("span");
      title.className = "demo-title";
      title.textContent = demo.dataset.title || "امتحان کن";

      const reset = document.createElement("button");
      reset.type = "button";
      reset.className = "demo-reset";
      reset.textContent = "برگرداندن کد اصلی";

      const bar = document.createElement("div");
      bar.className = "demo-bar";
      bar.append(title, reset);

      const frame = document.createElement("iframe");
      frame.className = "demo-result";
      frame.title = "نتیجه‌ی کد";
      // بدون allow-same-origin: کد دانشجوها به صفحه‌ی اصلی دسترسی ندارد
      frame.setAttribute("sandbox", "allow-scripts allow-popups");
      if (demo.dataset.height) frame.style.minHeight = `${demo.dataset.height}px`;

      const panes = document.createElement("div");
      panes.className = "demo-panes";

      demo.insertBefore(bar, textarea);
      textarea.before(panes);
      panes.append(textarea, frame);

      const update = () => {
        frame.srcdoc = wrapDocument(textarea.value);
      };

      let timer;
      textarea.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(update, 250);
      });

      reset.addEventListener("click", () => {
        textarea.value = original;
        update();
      });

      update();
    });
  }

  /* ---------- 3) دکمه‌ی کپی ---------- */

  function initCopyButtons() {
    document.querySelectorAll("pre.code").forEach((pre) => {
      const wrap = document.createElement("div");
      wrap.className = "codewrap";
      pre.before(wrap);
      wrap.append(pre);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "copy-btn";
      button.textContent = "کپی";
      button.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(pre.innerText);
          button.textContent = "کپی شد";
        } catch (error) {
          button.textContent = "کپی نشد";
        }
        setTimeout(() => (button.textContent = "کپی"), 1500);
      });
      wrap.append(button);
    });
  }

  /* ---------- 4) درس قبل / بعد از روی courses.json ---------- */

  function neighbour(lesson, label, className) {
    const small = document.createElement("small");
    small.textContent = label;
    const title = document.createElement("span");
    title.textContent = lesson.title;

    const node = document.createElement(lesson.status === "soon" ? "span" : "a");
    node.className = className;
    if (lesson.status === "soon") {
      node.classList.add("is-disabled");
      small.textContent = `${label} (به‌زودی)`;
    } else {
      // درس‌های هر دوره کنار هم هستند: courses/web/<lesson>/index.html
      node.href = `../${lesson.id}/index.html`;
    }
    node.append(small, title);
    return node;
  }

  async function loadNeighbours() {
    const courseId = body.dataset.course;
    const lessonId = body.dataset.lesson;
    const nav = document.getElementById("lesson-nav");
    if (!courseId || !lessonId) return;

    try {
      const response = await fetch(`${root}data/courses.json`);
      if (!response.ok) return;
      const data = await response.json();

      const course = data.courses.find((c) => c.id === courseId);
      if (!course) return;

      const crumb = document.getElementById("crumb-course");
      if (crumb) crumb.textContent = course.title;

      const index = course.lessons.findIndex((l) => l.id === lessonId);
      if (index === -1 || !nav) return;

      nav.replaceChildren();
      if (index > 0) nav.append(neighbour(course.lessons[index - 1], "درس قبل", "prev"));
      if (index < course.lessons.length - 1) {
        nav.append(neighbour(course.lessons[index + 1], "درس بعد", "next"));
      }
    } catch (error) {
      // اگر فایل خوانده نشد (مثلاً باز کردن با دابل‌کلیک) صفحه همچنان کار می‌کند
    }
  }

  buildToc();
  initDemos();
  initCopyButtons();
  loadNeighbours();
})();
