var p = /* @__PURE__ */ ((n) => (n[n.Hidden = 1] = "Hidden", n[n.Loading = 2] = "Loading", n[n.Loaded = 3] = "Loaded", n[n.Error = 4] = "Error", n))(p || {});
const v = [
  { name: "Модели и чертежи", extensions: ["smdx", "ifc", "dwg", "dxf", "xml"] }
];
function $(n) {
  const e = [];
  for (const i of n.manager.extensions) {
    const a = i.manifest?.albatros?.importers ?? [];
    for (const r of a) {
      if (r.target !== "wdx") continue;
      const t = r.filenamePattern.endsWith("/") ? r.filenamePattern.slice(0, -1) : r.filenamePattern, s = t.startsWith(".") ? t.substring(1) : t;
      s && e.push({ name: r.description, extensions: [s] });
    }
  }
  return e.length ? (e.unshift({ name: "Все поддерживаемые форматы", extensions: e.map((i) => i.extensions[0]) }), e) : v;
}
function f(n) {
  const e = n.root?.title;
  if (e) return e;
  const a = (n.origin ?? "").split(/[\/\\]/).pop() ?? "";
  return decodeURIComponent(a) || "Без имени";
}
function M(n) {
  return n ? (Array.isArray(n) ? n : [n]).filter((i) => !!i) : [];
}
async function y(n, e, i) {
  const a = $(n);
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
      const c = M(await s.run()), d = Date.now() - o;
      if (c.length)
        return i.appendLine(`Выбор файлов: ${s.name}, выбрано ${c.length}`), c;
      if (d >= 400)
        return i.appendLine(`Выбор файлов отменён пользователем (${s.name}).`), [];
      i.appendLine(`Способ «${s.name}» не открыл окно (${d} мс), пробую следующий.`), t.push(`${s.name}: окно не открылось`);
    } catch (c) {
      const d = c?.message ?? String(c);
      i.appendLine(`Способ «${s.name}» завершился ошибкой: ${d}`), t.push(`${s.name}: ${d}`);
    }
  }
  return i.appendLine("Ни один способ выбора файлов не сработал."), i.show(), await n.showMessage(["Не удалось открыть окно выбора файлов.", ...t], "error"), [];
}
function u(n) {
  const e = /* @__PURE__ */ new Set(), i = [];
  for (const a of n) {
    const r = (a.origin ?? "") + "|" + f(a);
    e.has(r) || (e.add(r), i.push(a));
  }
  return i;
}
const E = "ru.albatros.wdx/attachment:add:workspace";
function g(n) {
  if (!n) return;
  const e = n.model;
  if (!(!e || typeof e != "object" || !("attachments" in e)))
    return e.project ?? e;
}
function l(n) {
  return g(n.app) ?? g(n.manager.activeApp);
}
function D(n) {
  if (!n) return "проект";
  const e = n.workspace?.root?.title;
  return e || (n.windows[0]?.title ?? "проект");
}
async function P(n, e = 12e4) {
  const i = Date.now() + e;
  for (; ; ) {
    const a = g(n);
    if (a) return a;
    if (Date.now() > i) return;
    await b(100);
  }
}
async function A(n, e, i = 6e4) {
  const a = Date.now() + i;
  for (; ; ) {
    const r = e.windows.find((t) => t.context !== void 0);
    if (r && (n.manager.activeWindow = r, r.context?.layer))
      return !0;
    if (Date.now() > a) return !1;
    await b(100);
  }
}
function F(n, e) {
  return !!n.attachments.find((i) => i.name === e);
}
async function k(n, e, i, a) {
  const r = [];
  for (let t = 0; t < i.length; t++) {
    const s = i[t], o = f(s);
    if (F(e, o)) {
      a.appendLine(`= ${o}: уже подключён к проекту`), r.push({ name: o, status: "exists" });
      continue;
    }
    try {
      a.appendLine(`… ${o}: подключаю (${t + 1} из ${i.length})`), await n.manager.eval(E, { workspace: s }), a.appendLine(`+ ${o}: подключён`), r.push({ name: o, status: "added" });
    } catch (c) {
      const d = H(c, o);
      a.appendLine(`- ${o}: ${d}`), r.push({ name: o, status: "failed", message: d });
    }
  }
  return r;
}
function H(n, e) {
  const i = n?.message;
  if (i) return i;
  const a = e.lastIndexOf("."), r = a > 0 ? e.slice(a) : "";
  return r ? `платформа отклонила файл. Проверьте, что формат ${r} поддерживается импортёром и открыт вид проекта` : "платформа отклонила файл";
}
function W(n) {
  const e = n.filter((t) => t.status === "added").length, i = n.filter((t) => t.status === "exists").length, a = n.filter((t) => t.status === "failed"), r = [`Подключено файлов: ${e}`];
  return i && r.push(`уже было в проекте: ${i}`), a.length && r.push(`не удалось: ${a.length} (${a.map((t) => t.name).join(", ")})`), r.join(". ") + ".";
}
function b(n) {
  return new Promise((e) => setTimeout(e, n));
}
const h = "-".repeat(56);
async function _(n, e) {
  e.clear(), e.show(), e.appendLine("ДИАГНОСТИКА НашеПО · Создание проекта"), e.appendLine(h), C(n, e), O(n, e), S(n, e), T(n, e), await I(n, e), e.appendLine(h), e.appendLine("Отчёт готов. Скопируйте его целиком.");
}
function C(n, e) {
  e.appendLine("1. Активное приложение");
  const i = n.manager.activeApp;
  if (!i) {
    e.appendLine("   приложение не открыто");
    return;
  }
  e.appendLine(`   tag: ${i.tag}`), e.appendLine(`   окон: ${i.windows.length}`);
  const a = i.workspace;
  e.appendLine(`   workspace.origin: ${a?.origin ?? "нет"}`), e.appendLine(`   workspace.root.title: ${a?.root?.title ?? "нет"}`), e.appendLine(`   workspace.inmemory: ${a?.inmemory}`), e.appendLine(`   модель проекта найдена: ${l(n) ? "да" : "нет"}`);
}
function O(n, e) {
  e.appendLine("2. Вложения проекта");
  const i = l(n);
  if (!i) {
    e.appendLine("   проект не открыт");
    return;
  }
  let a = 0;
  i.attachments.forEach((r) => {
    a++, e.appendLine(`   ${a}. ${r.name ?? "без имени"} | ${N(r.state)}`), e.appendLine(`      uri:   ${r.uri ?? "нет"}`), e.appendLine(`      etag:  ${r.etag ?? "нет"}`), e.appendLine(`      sha1:  ${r.sha1 ?? "нет"}`), e.appendLine(`      слой:  ${r.layer?.name ?? "нет"}`);
  }), a || e.appendLine("   вложений нет");
}
function S(n, e) {
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
    i = await n.openDialog({ buttonLabel: "Проверить", filters: $(n) });
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
function N(n) {
  switch (n) {
    case p.Loaded:
      return "загружено";
    case p.Loading:
      return "загружается";
    case p.Hidden:
      return "скрыто";
    case p.Error:
      return "ошибка загрузки";
    default:
      return "состояние неизвестно";
  }
}
const z = "Создание проекта";
function w(n) {
  return n.createOutputChannel(z);
}
async function m(n, e, i) {
  const a = w(n);
  a.appendLine(`— ${e} —`);
  try {
    await i(a);
  } catch (r) {
    const t = r?.message ?? String(r);
    a.appendLine(`Ошибка: ${t}`);
    const s = r?.stack;
    s && a.appendLine(s), a.show(), await n.showMessage([`${e}: ${t}`, "Подробности в канале вывода «Создание проекта»."], "error");
  }
}
function R(n) {
  const e = w(n);
  return m(n, "Создание проекта", async () => {
    const i = u(await y(n, "Выберите файлы, которые нужно открыть в одном проекте", e));
    if (!i.length) return;
    e.appendLine(`Выбрано файлов: ${i.length}`);
    for (const s of i) e.appendLine(`  · ${f(s)}`);
    const a = n.manager.activeApp;
    let r = g(a), t = i;
    if (r) {
      const s = await n.showQuickPick(
        [
          { label: "Новый проект", description: `на основе файла «${f(i[0])}»`, value: "new" },
          { label: "Текущий проект", description: D(a), value: "current" }
        ],
        { title: "Создание проекта", placeHolder: "Куда добавить выбранные файлы" }
      );
      if (!s) {
        e.appendLine("Отменено пользователем.");
        return;
      }
      s.value === "new" && (r = void 0);
    }
    if (!r) {
      const s = i[0];
      e.appendLine(`Открываю проект: ${f(s)}`);
      const o = await n.manager.openWorkspace(s);
      if (r = await P(o), await A(n, o) || e.appendLine("Вид проекта не готов, подключение файлов может не сработать."), !r) {
        e.appendLine("Не удалось получить модель проекта. Формат первого файла не поддерживается как проект."), e.show(), await n.showMessage(
          `Файл «${f(s)}» не открылся как проект. Выберите первым файл проекта или откройте проект вручную.`,
          "error"
        );
        return;
      }
      t = i.slice(1);
    }
    if (!t.length) {
      e.appendLine("Дополнительных файлов нет."), await n.showMessage("Проект открыт. Дополнительных файлов для подключения не выбрано.", "info");
      return;
    }
    await j(n, e, await k(n, r, t, e));
  });
}
function K(n) {
  const e = w(n);
  return m(n, "Добавление файлов", async () => {
    const i = l(n);
    if (!i) {
      await n.showMessage("Нет открытого проекта. Используйте команду «Создать проект».", "warning");
      return;
    }
    const a = u(await y(n, "Выберите файлы для добавления в проект", e));
    a.length && (e.appendLine(`Добавление файлов в проект: ${a.length}`), await j(n, e, await k(n, i, a, e)));
  });
}
async function j(n, e, i) {
  const a = W(i);
  e.appendLine(a);
  const r = i.some((t) => t.status === "failed");
  r && e.show(), await n.showMessage(a, r ? "warning" : "info");
}
function B(n) {
  return m(n, "Обновление вложений", async (e) => {
    const i = l(n);
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
        const c = a[o], d = c.name ?? c.uri ?? "вложение";
        t.details = d, t.percents = Math.round(o / a.length * 100);
        try {
          await c.show(), e.appendLine(`+ ${d}`);
        } catch (L) {
          r++, e.appendLine(`- ${d}: ${L?.message ?? String(L)}`);
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
function Q(n) {
  return m(n, "Состав проекта", async (e) => {
    e.show();
    const i = l(n);
    if (!i) {
      e.appendLine("Нет открытого проекта."), await n.showMessage("Нет открытого проекта.", "warning");
      return;
    }
    let a = 0;
    i.attachments.forEach((r) => {
      a++, e.appendLine(`${a}. ${r.name ?? "без имени"} — ${U(r.state)}`), r.uri && e.appendLine(`   ${r.uri}`);
    }), e.appendLine(a ? `Всего вложений: ${a}` : "Вложений нет.");
  });
}
function U(n) {
  switch (n) {
    case p.Loaded:
      return "загружено";
    case p.Loading:
      return "загружается";
    case p.Hidden:
      return "скрыто";
    case p.Error:
      return "ошибка загрузки";
    default:
      return "состояние неизвестно";
  }
}
function V(n) {
  return m(n, "Диагностика", (e) => _(n, e));
}
const q = {
  create_project: R,
  add_files: K,
  reload_attachments: B,
  list_attachments: Q,
  diagnose: V
};
export {
  q as default
};
