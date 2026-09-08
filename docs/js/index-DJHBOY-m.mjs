var d = /* @__PURE__ */ ((n) => (n[n.Hidden = 1] = "Hidden", n[n.Loading = 2] = "Loading", n[n.Loaded = 3] = "Loaded", n[n.Error = 4] = "Error", n))(d || {});
const E = [
  { name: "Модели и чертежи", extensions: ["smdx", "ifc", "dwg", "dxf", "xml"] }
];
function y(n) {
  const e = [];
  for (const a of n.manager.extensions) {
    const i = a.manifest?.albatros?.importers ?? [];
    for (const r of i) {
      if (r.target !== "wdx") continue;
      const t = r.filenamePattern.endsWith("/") ? r.filenamePattern.slice(0, -1) : r.filenamePattern, s = t.startsWith(".") ? t.substring(1) : t;
      s && e.push({ name: r.description, extensions: [s] });
    }
  }
  return e.length ? (e.unshift({ name: "Все поддерживаемые форматы", extensions: e.map((a) => a.extensions[0]) }), e) : E;
}
function w(n) {
  const e = n.root?.title;
  if (e) return e;
  const i = (n.origin ?? "").split(/[\/\\]/).pop() ?? "";
  return decodeURIComponent(i) || "Без имени";
}
function M(n) {
  return n ? (Array.isArray(n) ? n : [n]).filter((a) => !!a) : [];
}
async function u(n, e, a) {
  const i = y(n);
  a.appendLine(`Форматов в фильтре: ${i.length}`);
  const r = [
    {
      name: "диалог открытия",
      run: () => n.openDialog({ multiSelections: !0, buttonLabel: "Выбрать", message: e, filters: i })
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
        filters: i
      })
    }
  ], t = [];
  for (const s of r) {
    const o = Date.now();
    try {
      const c = M(await s.run()), p = Date.now() - o;
      if (c.length)
        return a.appendLine(`Выбор файлов: ${s.name}, выбрано ${c.length}`), c;
      if (p >= 400)
        return a.appendLine(`Выбор файлов отменён пользователем (${s.name}).`), [];
      a.appendLine(`Способ «${s.name}» не открыл окно (${p} мс), пробую следующий.`), t.push(`${s.name}: окно не открылось`);
    } catch (c) {
      const p = c?.message ?? String(c);
      a.appendLine(`Способ «${s.name}» завершился ошибкой: ${p}`), t.push(`${s.name}: ${p}`);
    }
  }
  return a.appendLine("Ни один способ выбора файлов не сработал."), a.show(), await n.showMessage(["Не удалось открыть окно выбора файлов.", ...t], "error"), [];
}
function b(n) {
  const e = /* @__PURE__ */ new Set(), a = [];
  for (const i of n) {
    const r = (i.origin ?? "") + "|" + w(i);
    e.has(r) || (e.add(r), a.push(i));
  }
  return a;
}
const P = "ru.albatros.wdx/attachment:add:workspace";
function m(n) {
  if (!n) return;
  const e = n.model;
  if (!(!e || typeof e != "object" || !("attachments" in e)))
    return e.project ?? e;
}
function f(n) {
  return m(n.app) ?? m(n.manager.activeApp);
}
function h(n) {
  if (!n) return "проект";
  const e = n.workspace?.root?.title;
  return e || (n.windows[0]?.title ?? "проект");
}
async function D(n, e = 12e4) {
  const a = Date.now() + e;
  for (; ; ) {
    const i = m(n);
    if (i) return i;
    if (Date.now() > a) return;
    await j(100);
  }
}
async function A(n, e, a = 6e4) {
  const i = Date.now() + a;
  for (; ; ) {
    const r = e.windows.find((t) => t.context !== void 0);
    if (r && (n.manager.activeWindow = r, r.context?.layer))
      return !0;
    if (Date.now() > i) return !1;
    await j(100);
  }
}
function F(n, e) {
  return !!n.attachments.find((a) => a.name === e);
}
async function k(n, e, a, i) {
  const r = [];
  for (let t = 0; t < a.length; t++) {
    const s = a[t], o = w(s);
    if (F(e, o)) {
      i.appendLine(`= ${o}: уже подключён к проекту`), r.push({ name: o, status: "exists" });
      continue;
    }
    try {
      i.appendLine(`… ${o}: подключаю (${t + 1} из ${a.length})`), await n.manager.eval(P, { workspace: s }), i.appendLine(`+ ${o}: подключён`), r.push({ name: o, status: "added" });
    } catch (c) {
      const p = H(c, o);
      i.appendLine(`- ${o}: ${p}`), r.push({ name: o, status: "failed", message: p });
    }
  }
  return r;
}
function H(n, e) {
  const a = n?.message;
  if (a) return a;
  const i = e.lastIndexOf("."), r = i > 0 ? e.slice(i) : "";
  return r ? `платформа отклонила файл. Проверьте, что формат ${r} поддерживается импортёром и открыт вид проекта` : "платформа отклонила файл";
}
function _(n) {
  const e = n.filter((t) => t.status === "added").length, a = n.filter((t) => t.status === "exists").length, i = n.filter((t) => t.status === "failed"), r = [`Подключено файлов: ${e}`];
  return a && r.push(`уже было в проекте: ${a}`), i.length && r.push(`не удалось: ${i.length} (${i.map((t) => t.name).join(", ")})`), r.join(". ") + ".";
}
function j(n) {
  return new Promise((e) => setTimeout(e, n));
}
const $ = "-".repeat(56);
async function C(n, e) {
  e.clear(), e.show(), e.appendLine("ДИАГНОСТИКА НашеПО · Создание проекта"), e.appendLine($), O(n, e), S(n, e), T(n, e), W(n, e), await I(n, e), e.appendLine($), e.appendLine("Отчёт готов. Скопируйте его целиком.");
}
function O(n, e) {
  e.appendLine("1. Активное приложение");
  const a = n.manager.activeApp;
  if (!a) {
    e.appendLine("   приложение не открыто");
    return;
  }
  e.appendLine(`   tag: ${a.tag}`), e.appendLine(`   окон: ${a.windows.length}`);
  const i = a.workspace;
  e.appendLine(`   workspace.origin: ${i?.origin ?? "нет"}`), e.appendLine(`   workspace.root.title: ${i?.root?.title ?? "нет"}`), e.appendLine(`   workspace.inmemory: ${i?.inmemory}`), e.appendLine(`   модель проекта найдена: ${f(n) ? "да" : "нет"}`);
}
function S(n, e) {
  e.appendLine("2. Вложения проекта");
  const a = f(n);
  if (!a) {
    e.appendLine("   проект не открыт");
    return;
  }
  let i = 0;
  a.attachments.forEach((r) => {
    i++, e.appendLine(`   ${i}. ${r.name ?? "без имени"} | ${N(r.state)}`), e.appendLine(`      uri:   ${r.uri ?? "нет"}`), e.appendLine(`      etag:  ${r.etag ?? "нет"}`), e.appendLine(`      sha1:  ${r.sha1 ?? "нет"}`), e.appendLine(`      слой:  ${r.layer?.name ?? "нет"}`);
  }), i || e.appendLine("   вложений нет");
}
function T(n, e) {
  e.appendLine("3. История открытых файлов");
  const a = n.manager.mruWorkspaces?.items ?? [];
  if (!a.length) {
    e.appendLine("   история пуста");
    return;
  }
  for (const i of a.slice(0, 15))
    e.appendLine(`   ${i.title}`), e.appendLine(`      ${i.uri}`);
}
function W(n, e) {
  e.appendLine("4. Расширения и действия");
  for (const a of n.manager.extensions) {
    const i = a.manifest?.name ?? "без имени", r = Object.keys(a.actions ?? {});
    e.appendLine(`   ${i} (${a.manifest?.version ?? "без версии"}), действий: ${r.length}`);
    for (const t of r) {
      const s = a.actions[t];
      e.appendLine(`      ${t} | ${s?.label ?? ""} | cmd: ${s?.cmd ?? ""}`);
    }
  }
}
async function I(n, e) {
  e.appendLine("5. Проба файла"), e.appendLine("   Сейчас откроется выбор файла. Выберите любой файл модели.");
  let a;
  try {
    a = await n.openDialog({ buttonLabel: "Проверить", filters: y(n) });
  } catch (i) {
    e.appendLine(`   диалог не открылся: ${i?.message ?? String(i)}`);
    return;
  }
  if (!a) {
    e.appendLine("   выбор отменён");
    return;
  }
  if (e.appendLine(`   root.title:    ${a.root?.title}`), e.appendLine(`   root.mimeType: ${a.root?.mimeType}`), e.appendLine(`   root.size:     ${a.root?.size}`), e.appendLine(`   root.id:       ${a.root?.id ?? "нет"}`), e.appendLine(`   origin:        ${a.origin ?? "нет"}`), e.appendLine(`   inmemory:      ${a.inmemory}`), e.appendLine(`   есть bookmark: ${typeof a.bookmark == "function" ? "да" : "нет"}`), typeof a.bookmark == "function")
    try {
      const i = await a.bookmark();
      e.appendLine(`   bookmark():    ${i ?? "undefined"}`);
    } catch (i) {
      e.appendLine(`   bookmark() ошибка: ${i?.message ?? String(i)}`);
    }
  try {
    const i = await a.root.get();
    e.appendLine(`   чтение файла:  ${i?.byteLength ?? 0} байт`);
  } catch (i) {
    e.appendLine(`   чтение файла ошибка: ${i?.message ?? String(i)}`);
  }
}
function N(n) {
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
const z = "Создание проекта";
function g(n) {
  return n.createOutputChannel(z);
}
async function l(n, e, a) {
  const i = g(n);
  i.appendLine(`— ${e} —`);
  try {
    await a(i);
  } catch (r) {
    const t = r?.message ?? String(r);
    i.appendLine(`Ошибка: ${t}`);
    const s = r?.stack;
    s && i.appendLine(s), i.show(), await n.showMessage([`${e}: ${t}`, "Подробности в канале вывода «Создание проекта»."], "error");
  }
}
function R(n) {
  const e = g(n);
  return l(n, "Создание проекта", async () => {
    const a = b(await u(n, "Выберите файлы, которые нужно открыть в одном проекте", e));
    if (!a.length) return;
    e.appendLine(`Выбрано файлов: ${a.length}`);
    for (const t of a) e.appendLine(`  · ${w(t)}`);
    const i = n.manager.activeApp;
    let r = m(i);
    if (r) {
      const t = await n.showQuickPick(
        [
          { label: "Новый проект", description: "создать пустой проект и вложить в него все файлы", value: "new" },
          { label: "Текущий проект", description: h(i), value: "current" }
        ],
        { title: "Создание проекта", placeHolder: "Куда добавить выбранные файлы" }
      );
      if (!t) {
        e.appendLine("Отменено пользователем.");
        return;
      }
      t.value === "new" && (r = void 0);
    }
    if (!r) {
      e.appendLine("Создаю пустой проект. Укажите папку и имя проекта.");
      const t = await K(n);
      if (!t) {
        e.appendLine("Создание проекта отменено.");
        return;
      }
      if (r = await D(t), await A(n, t) || e.appendLine("Вид проекта не готов, подключение файлов может не сработать."), !r) {
        e.appendLine("Не удалось получить модель нового проекта."), e.show(), await n.showMessage("Новый проект создан, но его модель недоступна. Подключите файлы командой «Добавить файлы».", "error");
        return;
      }
      e.appendLine("Проект создан: " + h(t));
    }
    await v(n, e, await k(n, r, a, e));
  });
}
async function K(n) {
  const a = await n.manager.eval("ru.albatros.wdx/project:create");
  return a && typeof a == "object" && "workspace" in a ? a : n.manager.activeApp;
}
function B(n) {
  const e = g(n);
  return l(n, "Добавление файлов", async () => {
    const a = f(n);
    if (!a) {
      await n.showMessage("Нет открытого проекта. Используйте команду «Создать проект».", "warning");
      return;
    }
    const i = b(await u(n, "Выберите файлы для добавления в проект", e));
    i.length && (e.appendLine(`Добавление файлов в проект: ${i.length}`), await v(n, e, await k(n, a, i, e)));
  });
}
async function v(n, e, a) {
  const i = _(a);
  e.appendLine(i);
  const r = a.some((t) => t.status === "failed");
  r && e.show(), await n.showMessage(i, r ? "warning" : "info");
}
function Q(n) {
  return l(n, "Обновление вложений", async (e) => {
    const a = f(n);
    if (!a) {
      await n.showMessage("Нет открытого проекта.", "warning");
      return;
    }
    const i = [];
    if (a.attachments.forEach((o) => {
      i.push(o);
    }), !i.length) {
      await n.showMessage("В проекте нет вложений.", "info");
      return;
    }
    e.show(!0), e.appendLine(`Обновление вложений: ${i.length}`);
    let r = 0;
    const t = n.beginProgress();
    t.indeterminate = !1, t.label = "Обновление вложений";
    try {
      for (let o = 0; o < i.length; o++) {
        const c = i[o], p = c.name ?? c.uri ?? "вложение";
        t.details = p, t.percents = Math.round(o / i.length * 100);
        try {
          await c.show(), e.appendLine(`+ ${p}`);
        } catch (L) {
          r++, e.appendLine(`- ${p}: ${L?.message ?? String(L)}`);
        }
      }
      t.percents = 100;
    } finally {
      n.endProgress(t);
    }
    const s = r ? `Обновлено вложений: ${i.length - r}. Не удалось: ${r}.` : `Обновлено вложений: ${i.length}.`;
    e.appendLine(s), await n.showMessage(s, r ? "warning" : "info");
  });
}
function U(n) {
  return l(n, "Состав проекта", async (e) => {
    e.show();
    const a = f(n);
    if (!a) {
      e.appendLine("Нет открытого проекта."), await n.showMessage("Нет открытого проекта.", "warning");
      return;
    }
    let i = 0;
    a.attachments.forEach((r) => {
      i++, e.appendLine(`${i}. ${r.name ?? "без имени"} — ${V(r.state)}`), r.uri && e.appendLine(`   ${r.uri}`);
    }), e.appendLine(i ? `Всего вложений: ${i}` : "Вложений нет.");
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
function q(n) {
  return l(n, "Диагностика", (e) => C(n, e));
}
const G = {
  create_project: R,
  add_files: B,
  reload_attachments: Q,
  list_attachments: U,
  diagnose: q
};
export {
  G as default
};
