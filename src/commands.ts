/**
 * Команды плагина.
 */
import { AttachmentState } from 'albatros/enums';
import { distinct, fileName, pickFiles } from './files';
import { activeProject, attachAll, projectOf, projectTitle, summarize, waitForProject } from './project';

const CHANNEL = 'Создание проекта';

function channel(ctx: Context): OutputChannel {
  return ctx.createOutputChannel(CHANNEL);
}

/**
 * Создать проект из нескольких файлов.
 * Первый файл открывается как проект, остальные подключаются к нему вложениями.
 * Если проект уже открыт, пользователь выбирает, куда добавлять файлы.
 */
export async function create_project(ctx: Context): Promise<void> {
  const files = distinct(await pickFiles(ctx, 'Выберите файлы, которые нужно открыть в одном проекте'));
  if (!files.length) return;

  const output = channel(ctx);
  output.clear();
  output.show(true);
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
    if (!project) {
      output.appendLine('✗ Не удалось получить модель проекта. Формат первого файла не поддерживается как проект.');
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

  const results = await attachAll(ctx, project, rest, output);
  const report = summarize(results);
  output.appendLine(report);
  await ctx.showMessage(report, results.some(r => r.status === 'failed') ? 'warning' : 'info');
}

/** Добавить файлы в уже открытый проект. */
export async function add_files(ctx: Context): Promise<void> {
  const project = activeProject(ctx);
  if (!project) {
    await ctx.showMessage('Нет открытого проекта. Используйте команду «Создать проект».', 'warning');
    return;
  }

  const files = distinct(await pickFiles(ctx, 'Выберите файлы для добавления в проект'));
  if (!files.length) return;

  const output = channel(ctx);
  output.show(true);
  output.appendLine(`Добавление файлов в проект: ${files.length}`);

  const results = await attachAll(ctx, project, files, output);
  const report = summarize(results);
  output.appendLine(report);
  await ctx.showMessage(report, results.some(r => r.status === 'failed') ? 'warning' : 'info');
}

/** Перечитать все вложения текущего проекта. */
export async function reload_attachments(ctx: Context): Promise<void> {
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

  const output = channel(ctx);
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
        output.appendLine(`✗ ${name}: ${(e as Error)?.message ?? String(e)}`);
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
}

/** Показать состав проекта в канале вывода. */
export async function list_attachments(ctx: Context): Promise<void> {
  const project = activeProject(ctx);
  if (!project) {
    await ctx.showMessage('Нет открытого проекта.', 'warning');
    return;
  }

  const output = channel(ctx);
  output.clear();
  output.show();
  output.appendLine('Состав проекта');
  output.appendLine('─'.repeat(48));

  let count = 0;
  project.attachments.forEach(att => {
    count++;
    output.appendLine(`${count}. ${att.name ?? 'без имени'} — ${stateLabel(att.state)}`);
    if (att.uri) output.appendLine(`   ${att.uri}`);
  });

  output.appendLine('─'.repeat(48));
  output.appendLine(count ? `Всего вложений: ${count}` : 'Вложений нет.');
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
