/**
 * Выбор файлов и разбор их имён.
 */

/** Запасной набор фильтров, если импортёры почему-то не найдены. */
const FALLBACK_FILTERS: FileFilter[] = [
  {name: 'Модели и чертежи', extensions: ['smdx', 'ifc', 'dwg', 'dxf', 'xml']}
];

/**
 * Фильтры диалога, собранные из зарегистрированных импортёров проекта.
 *
 * Так же строит свой список сама платформа в команде «Добавить файл»,
 * поэтому набор форматов совпадает с тем, что доступно в дереве проекта,
 * включая форматы, которые добавили сторонние плагины.
 */
export function importerFilters(ctx: Context): FileFilter[] {
  const filters: FileFilter[] = [];
  for (const extension of ctx.manager.extensions) {
    const importers = extension.manifest?.albatros?.importers ?? [];
    for (const importer of importers) {
      if (importer.target !== 'wdx') continue;
      const pattern = importer.filenamePattern.endsWith('/')
        ? importer.filenamePattern.slice(0, -1)
        : importer.filenamePattern;
      const value = pattern.startsWith('.') ? pattern.substring(1) : pattern;
      if (value) filters.push({name: importer.description, extensions: [value]});
    }
  }
  if (!filters.length) return FALLBACK_FILTERS;
  filters.unshift({name: 'Все поддерживаемые форматы', extensions: filters.map(f => f.extensions[0])});
  return filters;
}

/** Заголовок рабочей области, то есть имя файла с расширением. */
export function fileName(ws: Workspace): string {
  const title = ws.root?.title;
  if (title) return title;
  const origin = ws.origin ?? '';
  const tail = origin.split(/[\/\\]/).pop() ?? '';
  return decodeURIComponent(tail) || 'Без имени';
}

/** Привести результат диалога к массиву рабочих областей. */
function toList(value: unknown): Workspace[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.filter(item => !!item) as Workspace[];
}

/** Один способ выбора файлов. */
interface PickAttempt {
  name: string;
  run: () => Promise<unknown>;
}

/**
 * Показать диалог выбора файлов.
 *
 * Способы перебираются по очереди. Следующий пробуется, если предыдущий бросил
 * ошибку или завершился мгновенно и без результата, то есть окно не открылось.
 * Если окно открылось и пользователь отменил выбор, возвращается пустой массив.
 */
export async function pickFiles(ctx: Context, message: string, output: OutputChannel): Promise<Workspace[]> {
  const filters = importerFilters(ctx);
  output.appendLine(`Форматов в фильтре: ${filters.length}`);

  const attempts: PickAttempt[] = [
    {
      name: 'диалог открытия',
      run: () => ctx.openDialog({multiSelections: true, buttonLabel: 'Выбрать', message, filters})
    },
    {
      name: 'диалог открытия без фильтров',
      run: () => ctx.openDialog({multiSelections: true})
    },
    {
      name: 'обозреватель хранилищ',
      run: () => ctx.openStorageFiles({
        id: 'nashepo.projectfiles.picker',
        title: message,
        canPickMany: true,
        allowLocal: true,
        filters
      })
    }
  ];

  const problems: string[] = [];

  for (const attempt of attempts) {
    const started = Date.now();
    try {
      const items = toList(await attempt.run());
      const elapsed = Date.now() - started;
      if (items.length) {
        output.appendLine(`Выбор файлов: ${attempt.name}, выбрано ${items.length}`);
        return items;
      }
      if (elapsed >= 400) {
        output.appendLine(`Выбор файлов отменён пользователем (${attempt.name}).`);
        return [];
      }
      output.appendLine(`Способ «${attempt.name}» не открыл окно (${elapsed} мс), пробую следующий.`);
      problems.push(`${attempt.name}: окно не открылось`);
    } catch (e) {
      const text = (e as Error)?.message ?? String(e);
      output.appendLine(`Способ «${attempt.name}» завершился ошибкой: ${text}`);
      problems.push(`${attempt.name}: ${text}`);
    }
  }

  output.appendLine('Ни один способ выбора файлов не сработал.');
  output.show();
  await ctx.showMessage(['Не удалось открыть окно выбора файлов.', ...problems], 'error');
  return [];
}

/** Убрать повторы по имени файла и по адресу. */
export function distinct(items: Workspace[]): Workspace[] {
  const seen = new Set<string>();
  const result: Workspace[] = [];
  for (const ws of items) {
    const key = (ws.origin ?? '') + '|' + fileName(ws);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(ws);
  }
  return result;
}
