/**
 * Команды плагина.
 *
 * Каждая команда обёрнута в guard: ошибка попадает в канал вывода и в сообщение
 * пользователю, поэтому нажатие кнопки никогда не остаётся без реакции.
 */
import { AttachmentState } from 'albatros/enums';
import { collect } from './diagnostics';
import { distinct, fileName, pickFiles } from './files';
import type { AttachResult } from './project';
import { activateView, activeProject, attachAll, projectOf, projectTitle, summarize, waitForProject } from './project';

const CHANNEL = 'Создание проекта';

function channel(ctx: Context): OutputChannel {
  return ctx.createOutputChannel(CHANNEL);
}

/** Выполнить команду, показав любую ошибку пользователю. */
async function guard(ctx: Context, title: string, body: (output: OutputChannel) => Promise<void>): Promise<void> {
  const output = channel(ctx);
  output.appendLine(`— ${title} —`);
  try {
    await body(output);
  } catch (e) {
    const text = (e as Error)?.message ?? String(e);
    output.appendLine(`Ошибка: ${text}`);
    const stack = (e as Error)?.stack;
    if (stack) output.appendLine(stack);
    output.show();
    await ctx.showMessage([`${title}: ${text}`, 'Подробности в канале вывода «Создание проекта».'], 'error');
  }
}

/**
 * Создать проект из нескольких файлов.
 * Первый файл открывается как проект, остальные подключаются к нему вложениями.
 * Если проект уже открыт, пользователь выбирает, куда добавлять файлы.
 */
export function create_project(ctx: Context): Promise<void> {
  const output = channel(ctx);
  return guard(ctx, 'Создание проекта', async () => {
    const files = distinct(await pickFiles(ctx, 'Выберите файлы, которые нужно открыть в одном проекте', output));
    if (!files.length) return;

    output.appendLine(`Выбрано файлов: ${files.length}`);
    for (const ws of files) output.appendLine(`  · ${fileName(ws)}`);

    const opened = ctx.manager.activeApp;
    let project = projectOf(opened);
    let rest = files;

    if (project) {
      const choice = await ctx.showQuickPick(
        [
          {label: 'Новый проект', description: `на основе файла «${fileName(files[0])}»`, value: 'new'},
          {label: 'Текущий проект', description: projectTitle(opened), value: 'current'}
        ],
        {title: 'Создание проекта', placeHolder: 'Куда добавить выбранные файлы'}
      );
      if (!choice) {
        output.appendLine('Отменено пользователем.');
        return;
      }
      if (choice.value === 'new') project = undefined;
    }

    if (!project) {
      const first = files[0];
      output.appendLine(`Открываю проект: ${fileName(first)}`);
      const app = await ctx.manager.openWorkspace(first);
      project = await waitForProject(app);
      if (!(await activateView(ctx, app))) {
        output.appendLine('Вид проекта не готов, подключение файлов может не сработать.');
      }
      if (!project) {
        output.appendLine('Не удалось получить модель проекта. Формат первого файла не поддерживается как проект.');
        output.show();
        await ctx.showMessage(
          `Файл «${fileName(first)}» не открылся как проект. Выберите первым файл проекта или откройте проект вручную.`,
          'error'
        );
        return;
      }
      rest = files.slice(1);
    }

    if (!rest.length) {
      output.appendLine('Дополнительных файлов нет.');
      await ctx.showMessage('Проект открыт. Дополнительных файлов для подключения не выбрано.', 'info');
      return;
    }

    await report(ctx, output, await attachAll(ctx, project, rest, output));
  });
}

/** Добавить файлы в уже открытый проект. */
export function add_files(ctx: Context): Promise<void> {
  const output = channel(ctx);
  return guard(ctx, 'Добавление файлов', async () => {
    const project = activeProject(ctx);
    if (!project) {
      await ctx.showMessage('Нет открытого проекта. Используйте команду «Создать проект».', 'warning');
      return;
    }

    const files = distinct(await pickFiles(ctx, 'Выберите файлы для добавления в проект', output));
    if (!files.length) return;

    output.appendLine(`Добавление файлов в проект: ${files.length}`);
    await report(ctx, output, await attachAll(ctx, project, files, output));
  });
}

/** Показать итог подключения файлов. Журнал открывается, если не всё прошло гладко. */
async function report(ctx: Context, output: OutputChannel, results: AttachResult[]): Promise<void> {
  const text = summarize(results);
  output.appendLine(text);
  const trouble = results.some(r => r.status === 'failed');
  if (trouble) output.show();
  await ctx.showMessage(text, trouble ? 'warning' : 'info');
}

/** Перечитать все вложения текущего проекта. */
export function reload_attachments(ctx: Context): Promise<void> {
  return guard(ctx, 'Обновление вложений', async output => {
    const project = activeProject(ctx);
    if (!project) {
      await ctx.showMessage('Нет открытого проекта.', 'warning');
      return;
    }

    const attachments: DwgAttachment[] = [];
    project.attachments.forEach(att => {
      attachments.push(att);
    });
    if (!attachments.length) {
      await ctx.showMessage('В проекте нет вложений.', 'info');
      return;
    }

    output.show(true);
    output.appendLine(`Обновление вложений: ${attachments.length}`);

    let failed = 0;
    const progress = ctx.beginProgress();
    progress.indeterminate = false;
    progress.label = 'Обновление вложений';
    try {
      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i];
        const name = att.name ?? att.uri ?? 'вложение';
        progress.details = name;
        progress.percents = Math.round((i / attachments.length) * 100);
        try {
          await att.show();
          output.appendLine(`+ ${name}`);
        } catch (e) {
          failed++;
          output.appendLine(`- ${name}: ${(e as Error)?.message ?? String(e)}`);
        }
      }
      progress.percents = 100;
    } finally {
      ctx.endProgress(progress);
    }

    const report = failed
      ? `Обновлено вложений: ${attachments.length - failed}. Не удалось: ${failed}.`
      : `Обновлено вложений: ${attachments.length}.`;
    output.appendLine(report);
    await ctx.showMessage(report, failed ? 'warning' : 'info');
  });
}

/** Показать состав проекта в канале вывода. */
export function list_attachments(ctx: Context): Promise<void> {
  return guard(ctx, 'Состав проекта', async output => {
    output.show();
    const project = activeProject(ctx);
    if (!project) {
      output.appendLine('Нет открытого проекта.');
      await ctx.showMessage('Нет открытого проекта.', 'warning');
      return;
    }

    let count = 0;
    project.attachments.forEach(att => {
      count++;
      output.appendLine(`${count}. ${att.name ?? 'без имени'} — ${stateLabel(att.state)}`);
      if (att.uri) output.appendLine(`   ${att.uri}`);
    });
    output.appendLine(count ? `Всего вложений: ${count}` : 'Вложений нет.');
  });
}

function stateLabel(state: AttachmentState): string {
  switch (state) {
    case AttachmentState.Loaded: return 'загружено';
    case AttachmentState.Loading: return 'загружается';
    case AttachmentState.Hidden: return 'скрыто';
    case AttachmentState.Error: return 'ошибка загрузки';
    default: return 'состояние неизвестно';
  }
}

/** Собрать отчёт об окружении для разбора проблем. */
export function diagnose(ctx: Context): Promise<void> {
  return guard(ctx, 'Диагностика', output => collect(ctx, output));
}
