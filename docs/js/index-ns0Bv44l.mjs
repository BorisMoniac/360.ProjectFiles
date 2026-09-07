var d = /* @__PURE__ */ ((e) => (e[e.Hidden = 1] = "Hidden", e[e.Loading = 2] = "Loading", e[e.Loaded = 3] = "Loaded", e[e.Error = 4] = "Error", e))(d || {});
const $ = [
  {
    name: "Модели и чертежи",
    extensions: ["smdx", "ifc", "ifcxml", "ifczip", "dwg", "dxf", "xml", "land", "gltf", "glb", "obj", "las", "laz", "txt", "csv"]
  },
  { name: "Топоматик 360 (*.smdx)", extensions: ["smdx"] },
  { name: "IFC (*.ifc, *.ifcxml, *.ifczip)", extensions: ["ifc", "ifcxml", "ifczip"] },
  { name: "Чертежи AutoCAD (*.dwg, *.dxf)", extensions: ["dwg", "dxf"] },
  { name: "Все файлы", extensions: ["*"] }
];
function l(e) {
  const t = e.root?.title;
  if (t) return t;
  const i = (e.origin ?? "").split(/[\/\\]/).pop() ?? "";
  return decodeURIComponent(i) || "Без имени";
}
function b(e) {
  const t = l(e), n = t.lastIndexOf(".");
  return n > 0 ? t.slice(0, n) : t;
}
async function v(e) {
  try {
    const t = await e.bookmark?.();
    if (t) return t;
  } catch {
  }
  return e.origin;
}
async function h(e, t) {
  const n = await e.openDialog({
    multiSelections: !0,
    buttonLabel: "Выбрать",
    message: t,
    filters: $
  });
  return n ? (Array.isArray(n) ? n : [n]).filter((a) => !!a) : [];
}
function m(e) {
  const t = /* @__PURE__ */ new Set(), n = [];
  for (const i of e) {
    const a = (i.origin ?? "") + "|" + l(i);
    t.has(a) || (t.add(a), n.push(i));
  }
  return n;
}
function f(e) {
  if (!e) return;
  const t = e.model;
  if (!(!t || typeof t != "object" || !("attachments" in t)))
    return t.project ?? t;
}
function g(e) {
  return f(e.app) ?? f(e.manager.activeApp);
}
function k(e) {
  if (!e) return "проект";
  const t = e.workspace?.root?.title;
  return t || (e.windows[0]?.title ?? "проект");
}
async function M(e, t = 12e4) {
  const n = Date.now() + t;
  for (; ; ) {
    const i = f(e);
    if (i) return i;
    if (Date.now() > n) return;
    await F(100);
  }
}
async function j(e, t) {
  const n = e.layers.itemByName(t);
  if (n) return n;
  try {
    return await e.layers.add({ name: t });
  } catch {
    return e.layers.layer0;
  }
}
function E(e, t, n) {
  return e.attachments.find((i) => i.uri === t || !!i.name && i.name === n);
}
async function P(e, t, n) {
  const i = b(t), a = l(t);
  try {
    const s = await v(t);
    if (!s)
      return n.appendLine(`✗ ${a}: не удалось определить адрес файла`), { name: a, status: "failed", message: "нет адреса файла" };
    const r = E(e, s, i);
    if (r)
      return n.appendLine(`= ${a}: уже подключён к проекту`), r.state !== d.Loaded && await r.show(), { name: a, status: "exists" };
    const c = await j(e, i), o = await e.attachments.add({ name: i, uri: s, layer: c });
    return await o.show(), o.state === d.Error ? (n.appendLine(`✗ ${a}: загрузка завершилась ошибкой`), { name: a, status: "failed", message: "ошибка загрузки" }) : (n.appendLine(`+ ${a}: подключён`), { name: a, status: "added" });
  } catch (s) {
    const r = s?.message ?? String(s);
    return n.appendLine(`✗ ${a}: ${r}`), { name: a, status: "failed", message: r };
  }
}
async function L(e, t, n, i) {
  const a = [], s = e.beginProgress();
  s.indeterminate = !1, s.label = "Подключение файлов к проекту";
  try {
    for (let r = 0; r < n.length; r++)
      s.details = l(n[r]), s.percents = Math.round(r / n.length * 100), a.push(await P(t, n[r], i));
    s.percents = 100;
  } finally {
    e.endProgress(s);
  }
  return a;
}
function y(e) {
  const t = e.filter((s) => s.status === "added").length, n = e.filter((s) => s.status === "exists").length, i = e.filter((s) => s.status === "failed"), a = [`Подключено файлов: ${t}`];
  return n && a.push(`уже было в проекте: ${n}`), i.length && a.push(`не удалось: ${i.length} (${i.map((s) => s.name).join(", ")})`), a.join(". ") + ".";
}
function F(e) {
  return new Promise((t) => setTimeout(t, e));
}
const z = "Создание проекта";
function p(e) {
  return e.createOutputChannel(z);
}
async function C(e) {
  const t = m(await h(e, "Выберите файлы, которые нужно открыть в одном проекте"));
  if (!t.length) return;
  const n = p(e);
  n.clear(), n.show(!0), n.appendLine(`Выбрано файлов: ${t.length}`);
  for (const o of t) n.appendLine(`  · ${l(o)}`);
  const i = e.manager.activeApp;
  let a = f(i), s = t;
  if (a) {
    const o = await e.showQuickPick(
      [
        { label: "Новый проект", description: `на основе файла «${l(t[0])}»`, value: "new" },
        { label: "Текущий проект", description: k(i), value: "current" }
      ],
      { title: "Создание проекта", placeHolder: "Куда добавить выбранные файлы" }
    );
    if (!o) {
      n.appendLine("Отменено пользователем.");
      return;
    }
    o.value === "new" && (a = void 0);
  }
  if (!a) {
    const o = t[0];
    n.appendLine(`Открываю проект: ${l(o)}`);
    const u = await e.manager.openWorkspace(o);
    if (a = await M(u), !a) {
      n.appendLine("✗ Не удалось получить модель проекта. Формат первого файла не поддерживается как проект."), await e.showMessage(
        `Файл «${l(o)}» не открылся как проект. Выберите первым файл проекта или откройте проект вручную.`,
        "error"
      );
      return;
    }
    s = t.slice(1);
  }
  if (!s.length) {
    n.appendLine("Дополнительных файлов нет."), await e.showMessage("Проект открыт. Дополнительных файлов для подключения не выбрано.", "info");
    return;
  }
  const r = await L(e, a, s, n), c = y(r);
  n.appendLine(c), await e.showMessage(c, r.some((o) => o.status === "failed") ? "warning" : "info");
}
async function H(e) {
  const t = g(e);
  if (!t) {
    await e.showMessage("Нет открытого проекта. Используйте команду «Создать проект».", "warning");
    return;
  }
  const n = m(await h(e, "Выберите файлы для добавления в проект"));
  if (!n.length) return;
  const i = p(e);
  i.show(!0), i.appendLine(`Добавление файлов в проект: ${n.length}`);
  const a = await L(e, t, n, i), s = y(a);
  i.appendLine(s), await e.showMessage(s, a.some((r) => r.status === "failed") ? "warning" : "info");
}
async function I(e) {
  const t = g(e);
  if (!t) {
    await e.showMessage("Нет открытого проекта.", "warning");
    return;
  }
  const n = [];
  if (t.attachments.forEach((c) => {
    n.push(c);
  }), !n.length) {
    await e.showMessage("В проекте нет вложений.", "info");
    return;
  }
  const i = p(e);
  i.show(!0), i.appendLine(`Обновление вложений: ${n.length}`);
  let a = 0;
  const s = e.beginProgress();
  s.indeterminate = !1, s.label = "Обновление вложений";
  try {
    for (let c = 0; c < n.length; c++) {
      const o = n[c], u = o.name ?? o.uri ?? "вложение";
      s.details = u, s.percents = Math.round(c / n.length * 100);
      try {
        await o.show(), i.appendLine(`+ ${u}`);
      } catch (w) {
        a++, i.appendLine(`✗ ${u}: ${w?.message ?? String(w)}`);
      }
    }
    s.percents = 100;
  } finally {
    e.endProgress(s);
  }
  const r = a ? `Обновлено вложений: ${n.length - a}. Не удалось: ${a}.` : `Обновлено вложений: ${n.length}.`;
  i.appendLine(r), await e.showMessage(r, a ? "warning" : "info");
}
async function N(e) {
  const t = g(e);
  if (!t) {
    await e.showMessage("Нет открытого проекта.", "warning");
    return;
  }
  const n = p(e);
  n.clear(), n.show(), n.appendLine("Состав проекта"), n.appendLine("─".repeat(48));
  let i = 0;
  t.attachments.forEach((a) => {
    i++, n.appendLine(`${i}. ${a.name ?? "без имени"} — ${_(a.state)}`), a.uri && n.appendLine(`   ${a.uri}`);
  }), n.appendLine("─".repeat(48)), n.appendLine(i ? `Всего вложений: ${i}` : "Вложений нет.");
}
function _(e) {
  switch (e) {
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
const D = {
  create_project: C,
  add_files: H,
  reload_attachments: I,
  list_attachments: N
};
export {
  D as default
};
