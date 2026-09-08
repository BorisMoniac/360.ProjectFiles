var d = /* @__PURE__ */ ((n) => (n[n.Hidden = 1] = "Hidden", n[n.Loading = 2] = "Loading", n[n.Loaded = 3] = "Loaded", n[n.Error = 4] = "Error", n))(d || {});
const D = [
  { name: "Модели и чертежи", extensions: ["smdx", "ifc", "dwg", "dxf", "xml"] }
];
function k(n) {
  const e = [];
  for (const i of n.manager.extensions) {
    const a = i.manifest?.albatros?.importers ?? [];
    for (const r of a) {
      if (r.target !== "wdx") continue;
      const t = r.filenamePattern.endsWith("/") ? r.filenamePattern.slice(0, -1) : r.filenamePattern, s = t.startsWith(".") ? t.substring(1) : t;
      s && e.push({ name: r.description, extensions: [s] });
    }
  }
  return e.length ? (e.unshift({ name: "Все поддерживаемые форматы", extensions: e.map((i) => i.extensions[0]) }), e) : D;
}
function l(n) {
  const e = n.root?.title;
  if (e) return e;
  const a = (n.origin ?? "").split(/[\/\\]/).pop() ?? "";
  return decodeURIComponent(a) || "Без имени";
}
function A(n) {
  return n ? (Array.isArray(n) ? n : [n]).filter((i) => !!i) : [];
}
async function b(n, e, i) {
  const a = k(n);
  i.appendLine(`Форматов в фильтре: ${a.length}`);
  const r = [
    {
      name: "диалог открытия",
      run: () => n.openDialog({ multiSelections: !0, buttonLabel: "Выбрать", message: e, filters: a })
    },
    {
      name: "диалог открытия без фильтров",
      run: () => n.openDialog({ multiSelections: !0 })
    },
    {
      name: "обозреватель хранилищ",
      run: () => n.openStorageFiles({
        id: "nashepo.projectfiles.picker",
        title: e,
        canPickMany: !0,
        allowLocal: !0,
        filters: a
      })
    }
  ], t = [];
  for (const s of r) {
    const o = Date.now();
    try {
      const c = A(await s.run()), p = Date.now() - o;
      if (c.length)
        return i.appendLine(`Выбор файлов: ${s.name}, выбрано ${c.length}`), c;
      if (p >= 400)
        return i.appendLine(`Выбор файлов отменён пользователем (${s.name}).`), [];
      i.appendLine(`Способ «${s.name}» не открыл окно (${p} мс), пробую следующий.`), t.push(`${s.name}: окно не открылось`);
    } catch (c) {
      const p = c?.message ?? String(c);
      i.appendLine(`Способ «${s.name}» завершился ошибкой: ${p}`), t.push(`${s.name}: ${p}`);
    }
  }
  return i.appendLine("Ни один способ выбора файлов не сработал."), i.show(), await n.showMessage(["Не удалось открыть окно выбора файлов.", ...t], "error"), [];
}
function v(n) {
  const e = /* @__PURE__ */ new Set(), i = [];
  for (const a of n) {
    const r = (a.origin ?? "") + "|" + l(a);
    e.has(r) || (e.add(r), i.push(a));
  }
  return i;
}
const C = "ru.albatros.wdx/attachment:add:workspace";
function L(n) {
  if (!n) return;
  const e = n.model;
  if (!(!e || typeof e != "object" || !("attachments" in e)))
    return e.project ?? e;
}
function f(n) {
  return L(n.app) ?? L(n.manager.activeApp);
}
function h(n) {
  if (!n) return "проект";
  const e = n.workspace?.root?.title;
  return e || (n.windows[0]?.title ?? "проект");
}
async function $(n, e = 12e4) {
  const i = Date.now() + e;
  for (; ; ) {
    const a = L(n);
    if (a) return a;
    if (Date.now() > i) return;
    await M(100);
  }
}
async function u(n, e, i = 6e4) {
  const a = Date.now() + i;
  for (; ; ) {
    const r = e.windows.find((t) => t.context !== void 0);
    if (r && (n.manager.activeWindow = r, r.context?.layer))
      return !0;
    if (Date.now() > a) return !1;
    await M(100);
  }
}
function W(n, e) {
  return !!n.attachments.find((i) => i.name === e);
}
async function j(n, e, i, a) {
  const r = [];
  for (let t = 0; t < i.length; t++) {
    const s = i[t], o = l(s);
    if (W(e, o)) {
      a.appendLine(`= ${o}: уже подключён к проекту`), r.push({ name: o, status: "exists" });
      continue;
    }
    try {
      a.appendLine(`… ${o}: подключаю (${t + 1} из ${i.length})`), await n.manager.eval(C, { workspace: s }), a.appendLine(`+ ${o}: подключён`), r.push({ name: o, status: "added" });
    } catch (c) {
      const p = F(c, o);
      a.appendLine(`- ${o}: ${p}`), r.push({ name: o, status: "failed", message: p });
    }
  }
  return r;
}
function F(n, e) {
  const i = n?.message;
  if (i) return i;
  const a = e.lastIndexOf("."), r = a > 0 ? e.slice(a) : "";
  return r ? `платформа отклонила файл. Проверьте, что формат ${r} поддерживается импортёром и открыт вид проекта` : "платформа отклонила файл";
}
function H(n) {
  const e = n.filter((t) => t.status === "added").length, i = n.filter((t) => t.status === "exists").length, a = n.filter((t) => t.status === "failed"), r = [`Подключено файлов: ${e}`];
  return i && r.push(`уже было в проекте: ${i}`), a.length && r.push(`не удалось: ${a.length} (${a.map((t) => t.name).join(", ")})`), r.join(". ") + ".";
}
function M(n) {
  return new Promise((e) => setTimeout(e, n));
}
const y = "-".repeat(56);
async function S(n, e) {
  e.clear(), e.show(), e.appendLine("ДИАГНОСТИКА НашеПО · Создание проекта"), e.appendLine(y), _(n, e), N(n, e), O(n, e), T(n, e), await I(n, e), e.appendLine(y), e.appendLine("Отчёт готов. Скопируйте его целиком.");
}
function _(n, e) {
  e.appendLine("1. Активное приложение");
  const i = n.manager.activeApp;
  if (!i) {
    e.appendLine("   приложение не открыто");
    return;
  }
  e.appendLine(`   tag: ${i.tag}`), e.appendLine(`   окон: ${i.windows.length}`);
  const a = i.workspace;
  e.appendLine(`   workspace.origin: ${a?.origin ?? "нет"}`), e.appendLine(`   workspace.root.title: ${a?.root?.title ?? "нет"}`), e.appendLine(`   workspace.inmemory: ${a?.inmemory}`), e.appendLine(`   модель проекта найдена: ${f(n) ? "да" : "нет"}`);
}
function N(n, e) {
  e.appendLine("2. Вложения проекта");
  const i = f(n);
  if (!i) {
    e.appendLine("   проект не открыт");
    return;
  }
  let a = 0;
  i.attachments.forEach((r) => {
    a++, e.appendLine(`   ${a}. ${r.name ?? "без имени"} | ${z(r.state)}`), e.appendLine(`      uri:   ${r.uri ?? "нет"}`), e.appendLine(`      etag:  ${r.etag ?? "нет"}`), e.appendLine(`      sha1:  ${r.sha1 ?? "нет"}`), e.appendLine(`      слой:  ${r.layer?.name ?? "нет"}`);
  }), a || e.appendLine("   вложений нет");
}
function O(n, e) {
  e.appendLine("3. История открытых файлов");
  const i = n.manager.mruWorkspaces?.items ?? [];
  if (!i.length) {
    e.appendLine("   история пуста");
    return;
  }
  for (const a of i.slice(0, 15))
    e.appendLine(`   ${a.title}`), e.appendLine(`      ${a.uri}`);
}
function T(n, e) {
  e.appendLine("4. Расширения и действия");
  for (const i of n.manager.extensions) {
    const a = i.manifest?.name ?? "без имени", r = Object.keys(i.actions ?? {});
    e.appendLine(`   ${a} (${i.manifest?.version ?? "без версии"}), действий: ${r.length}`);
    for (const t of r) {
      const s = i.actions[t];
      e.appendLine(`      ${t} | ${s?.label ?? ""} | cmd: ${s?.cmd ?? ""}`);
    }
  }
}
async function I(n, e) {
  e.appendLine("5. Проба файла"), e.appendLine("   Сейчас откроется выбор файла. Выберите любой файл модели.");
  let i;
  try {
    i = await n.openDialog({ buttonLabel: "Проверить", filters: k(n) });
  } catch (a) {
    e.appendLine(`   диалог не открылся: ${a?.message ?? String(a)}`);
    return;
  }
  if (!i) {
    e.appendLine("   выбор отменён");
    return;
  }
  if (e.appendLine(`   root.title:    ${i.root?.title}`), e.appendLine(`   root.mimeType: ${i.root?.mimeType}`), e.appendLine(`   root.size:     ${i.root?.size}`), e.appendLine(`   root.id:       ${i.root?.id ?? "нет"}`), e.appendLine(`   origin:        ${i.origin ?? "нет"}`), e.appendLine(`   inmemory:      ${i.inmemory}`), e.appendLine(`   есть bookmark: ${typeof i.bookmark == "function" ? "да" : "нет"}`), typeof i.bookmark == "function")
    try {
      const a = await i.bookmark();
      e.appendLine(`   bookmark():    ${a ?? "undefined"}`);
    } catch (a) {
      e.appendLine(`   bookmark() ошибка: ${a?.message ?? String(a)}`);
    }
  try {
    const a = await i.root.get();
    e.appendLine(`   чтение файла:  ${a?.byteLength ?? 0} байт`);
  } catch (a) {
    e.appendLine(`   чтение файла ошибка: ${a?.message ?? String(a)}`);
  }
}
function z(n) {
  switch (n) {
    case d.Loaded:
      return "загружено";
    case d.Loading:
      return "загружается";
    case d.Hidden:
      return "скрыто";
    case d.Error:
      return "ошибка загрузки";
    default:
      return "состояние неизвестно";
  }
}
const R = "Создание проекта";
function g(n) {
  return n.createOutputChannel(R);
}
function E(n) {
  const e = (n?.message ?? String(n)).toLowerCase();
  return e === "canceled" || e === "cancelled" || e.includes("отмен");
}
async function w(n, e, i) {
  const a = g(n);
  a.appendLine(`— ${e} —`);
  try {
    await i(a);
  } catch (r) {
    if (E(r)) {
      a.appendLine("Отменено пользователем.");
      return;
    }
    const t = r?.message ?? String(r);
    a.appendLine(`Ошибка: ${t}`);
    const s = r?.stack;
    s && a.appendLine(s), a.show(), await n.showMessage([`${e}: ${t}`, "Подробности в канале вывода «Создание проекта»."], "error");
  }
}
function q(n) {
  const e = g(n);
  return w(n, "Создание проекта", async () => {
    const i = v(await b(n, "Выберите файлы, которые нужно открыть в одном проекте", e));
    if (!i.length) return;
    e.appendLine(`Выбрано файлов: ${i.length}`);
    for (const s of i) e.appendLine(`  · ${l(s)}`);
    const a = n.manager.activeApp;
    let r = L(a);
    if (r) {
      const s = await n.showQuickPick(
        [
          { label: "Новый проект", description: "создать пустой проект и вложить в него все файлы", value: "new" },
          { label: "Текущий проект", description: h(a), value: "current" }
        ],
        { title: "Создание проекта", placeHolder: "Куда добавить выбранные файлы" }
      );
      if (!s) {
        e.appendLine("Отменено пользователем.");
        return;
      }
      s.value === "new" && (r = void 0);
    }
    let t = i;
    if (!r) {
      const s = await n.showQuickPick(
        [
          {
            label: "Быстрый проект",
            description: "без сохранения на диск, ни одного лишнего вопроса",
            detail: "Первый файл становится основой проекта, остальные подключаются вложениями",
            value: "quick"
          },
          {
            label: "Проект в папке",
            description: "указать папку и имя, проект сохраняется",
            detail: "Все файлы, включая первый, становятся обычными вложениями",
            value: "folder"
          }
        ],
        { title: "Создание проекта", placeHolder: "Какой проект создать" }
      );
      if (!s) {
        e.appendLine("Отменено пользователем.");
        return;
      }
      if (s.value === "quick") {
        const o = i[0];
        e.appendLine(`Быстрый проект на основе файла: ${l(o)}`);
        const c = await n.manager.openWorkspace(o);
        if (r = await $(c), t = i.slice(1), await u(n, c) || e.appendLine("Вид проекта не готов, подключение файлов может не сработать."), !r) {
          e.appendLine("Не удалось получить модель проекта из первого файла."), e.show(), await n.showMessage(`Файл «${l(o)}» не открылся как проект.`, "error");
          return;
        }
        e.appendLine("Первый файл лежит в теле проекта, а не в списке вложений. Это плата за скорость.");
      } else {
        e.appendLine("Создаю пустой проект. Укажите, где его разместить.");
        const o = await K(n, e);
        if (!o) {
          e.appendLine("Создание проекта отменено.");
          return;
        }
        if (r = await $(o), await u(n, o) || e.appendLine("Вид проекта не готов, подключение файлов может не сработать."), !r) {
          e.appendLine("Не удалось получить модель нового проекта."), e.show(), await n.showMessage("Новый проект создан, но его модель недоступна. Подключите файлы командой «Добавить файлы».", "error");
          return;
        }
        e.appendLine("Проект создан: " + h(o));
      }
    }
    if (!t.length) {
      e.appendLine("Дополнительных файлов нет."), await n.showMessage("Проект открыт. Дополнительных файлов для подключения не выбрано.", "info");
      return;
    }
    await P(n, e, await j(n, r, t, e));
  });
}
async function K(n, e) {
  try {
    const r = await n.saveDialog({
      folder: !0,
      suggestedName: "Проект.wdx",
      buttonLabel: "Создать проект"
    }), t = r?.root?.title ?? "";
    if (r && t.toLowerCase().endsWith(".wdx"))
      return await n.manager.openWorkspace(r);
    r && e.appendLine(`Имя «${t}» не оканчивается на .wdx, поэтому папка проектом не станет.`);
  } catch (r) {
    if (E(r)) return;
    e.appendLine("Диалог создания папки недоступен: " + (r?.message ?? String(r)));
  }
  e.appendLine("Перехожу к штатному созданию проекта.");
  const a = await n.manager.eval("ru.albatros.wdx/project:create");
  return a && typeof a == "object" && "workspace" in a ? a : n.manager.activeApp;
}
function Q(n) {
  const e = g(n);
  return w(n, "Добавление файлов", async () => {
    const i = f(n);
    if (!i) {
      await n.showMessage("Нет открытого проекта. Используйте команду «Создать проект».", "warning");
      return;
    }
    const a = v(await b(n, "Выберите файлы для добавления в проект", e));
    a.length && (e.appendLine(`Добавление файлов в проект: ${a.length}`), await P(n, e, await j(n, i, a, e)));
  });
}
async function P(n, e, i) {
  const a = H(i);
  e.appendLine(a);
  const r = i.some((t) => t.status === "failed");
  r && e.show(), await n.showMessage(a, r ? "warning" : "info");
}
function B(n) {
  return w(n, "Обновление вложений", async (e) => {
    const i = f(n);
    if (!i) {
      await n.showMessage("Нет открытого проекта.", "warning");
      return;
    }
    const a = [];
    if (i.attachments.forEach((o) => {
      a.push(o);
    }), !a.length) {
      await n.showMessage("В проекте нет вложений.", "info");
      return;
    }
    e.show(!0), e.appendLine(`Обновление вложений: ${a.length}`);
    let r = 0;
    const t = n.beginProgress();
    t.indeterminate = !1, t.label = "Обновление вложений";
    try {
      for (let o = 0; o < a.length; o++) {
        const c = a[o], p = c.name ?? c.uri ?? "вложение";
        t.details = p, t.percents = Math.round(o / a.length * 100);
        try {
          await c.show(), e.appendLine(`+ ${p}`);
        } catch (m) {
          r++, e.appendLine(`- ${p}: ${m?.message ?? String(m)}`);
        }
      }
      t.percents = 100;
    } finally {
      n.endProgress(t);
    }
    const s = r ? `Обновлено вложений: ${a.length - r}. Не удалось: ${r}.` : `Обновлено вложений: ${a.length}.`;
    e.appendLine(s), await n.showMessage(s, r ? "warning" : "info");
  });
}
function U(n) {
  return w(n, "Состав проекта", async (e) => {
    e.show();
    const i = f(n);
    if (!i) {
      e.appendLine("Нет открытого проекта."), await n.showMessage("Нет открытого проекта.", "warning");
      return;
    }
    let a = 0;
    i.attachments.forEach((r) => {
      a++, e.appendLine(`${a}. ${r.name ?? "без имени"} — ${V(r.state)}`), r.uri && e.appendLine(`   ${r.uri}`);
    }), e.appendLine(a ? `Всего вложений: ${a}` : "Вложений нет.");
  });
}
function V(n) {
  switch (n) {
    case d.Loaded:
      return "загружено";
    case d.Loading:
      return "загружается";
    case d.Hidden:
      return "скрыто";
    case d.Error:
      return "ошибка загрузки";
    default:
      return "состояние неизвестно";
  }
}
function G(n) {
  return w(n, "Диагностика", (e) => S(n, e));
}
const J = {
  create_project: q,
  add_files: Q,
  reload_attachments: B,
  list_attachments: U,
  diagnose: G
};
export {
  J as default
};
