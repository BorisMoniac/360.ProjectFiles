/**
 * Диагностика окружения. Собирает всё, что нужно, чтобы понять,
 * в каком виде платформа хранит адреса файлов и какие команды у неё есть.
 */
import { AttachmentState } from 'albatros/enums';
import { importerFilters } from './files';
import { activeProject } from './project';

const LINE = '-'.repeat(56);

/** Собрать отчёт об окружении в канал вывода. */
export async function collect(ctx: Context, output: OutputChannel): Promise<void> {
  output.clear();
  output.show();
  output.appendLine('ДИАГНОСТИКА НашеПО · Создание проекта');
  output.appendLine(LINE);

  reportApp(ctx, output);
  reportAttachments(ctx, output);
  reportMru(ctx, output);
  reportExtensions(ctx, output);
  await probeFile(ctx, output);

  output.appendLine(LINE);
  output.appendLine('Отчёт готов. Скопируйте его целиком.');
}

/** Активное приложение и его рабочая область. */
function reportApp(ctx: Context, output: OutputChannel): void {
  output.appendLine('1. Активное приложение');
  const app = ctx.manager.activeApp;
  if (!app) {
    output.appendLine('   приложение не открыто');
    return;
  }
  output.appendLine(`   tag: ${app.tag}`);
  output.appendLine(`   окон: ${app.windows.length}`);
  const ws = app.workspace;
  output.appendLine(`   workspace.origin: ${ws?.origin ?? 'нет'}`);
  output.appendLine(`   workspace.root.title: ${ws?.root?.title ?? 'нет'}`);
  output.appendLine(`   workspace.inmemory: ${ws?.inmemory}`);
  output.appendLine(`   модель проекта найдена: ${activeProject(ctx) ? 'да' : 'нет'}`);
}

/** Вложения текущего проекта с адресами и состоянием. */
function reportAttachments(ctx: Context, output: OutputChannel): void {
  output.appendLine('2. Вложения проекта');
  const project = activeProject(ctx);
  if (!project) {
    output.appendLine('   проект не открыт');
    return;
  }
  let count = 0;
  project.attachments.forEach(att => {
    count++;
    output.appendLine(`   ${count}. ${att.name ?? 'без имени'} | ${stateLabel(att.state)}`);
    output.appendLine(`      uri:   ${att.uri ?? 'нет'}`);
    output.appendLine(`      etag:  ${att.etag ?? 'нет'}`);
    output.appendLine(`      sha1:  ${att.sha1 ?? 'нет'}`);
    output.appendLine(`      слой:  ${att.layer?.name ?? 'нет'}`);
  });
  if (!count) output.appendLine('   вложений нет');
}

/** История открытых рабочих областей. Показывает, какие адреса платформа считает пригодными. */
function reportMru(ctx: Context, output: OutputChannel): void {
  output.appendLine('3. История открытых файлов');
  const items = ctx.manager.mruWorkspaces?.items ?? [];
  if (!items.length) {
    output.appendLine('   история пуста');
    return;
  }
  for (const item of items.slice(0, 15)) {
    output.appendLine(`   ${item.title}`);
    output.appendLine(`      ${item.uri}`);
  }
}

/** Все расширения и их действия. Нужно, чтобы найти встроенную команду добавления файла. */
function reportExtensions(ctx: Context, output: OutputChannel): void {
  output.appendLine('4. Расширения и действия');
  for (const ext of ctx.manager.extensions) {
    const name = ext.manifest?.name ?? 'без имени';
    const ids = Object.keys(ext.actions ?? {});
    output.appendLine(`   ${name} (${ext.manifest?.version ?? 'без версии'}), действий: ${ids.length}`);
    for (const id of ids) {
      const action = ext.actions[id];
      output.appendLine(`      ${id} | ${action?.label ?? ''} | cmd: ${action?.cmd ?? ''}`);
    }
  }
}

/** Проба одного файла: что именно платформа отдаёт плагину. */
async function probeFile(ctx: Context, output: OutputChannel): Promise<void> {
  output.appendLine('5. Проба файла');
  output.appendLine('   Сейчас откроется выбор файла. Выберите любой файл модели.');
  let ws: Workspace | undefined;
  try {
    ws = await ctx.openDialog({buttonLabel: 'Проверить', filters: importerFilters(ctx)});
  } catch (e) {
    output.appendLine(`   диалог не открылся: ${(e as Error)?.message ?? String(e)}`);
    return;
  }
  if (!ws) {
    output.appendLine('   выбор отменён');
    return;
  }

  output.appendLine(`   root.title:    ${ws.root?.title}`);
  output.appendLine(`   root.mimeType: ${ws.root?.mimeType}`);
  output.appendLine(`   root.size:     ${ws.root?.size}`);
  output.appendLine(`   root.id:       ${ws.root?.id ?? 'нет'}`);
  output.appendLine(`   origin:        ${ws.origin ?? 'нет'}`);
  output.appendLine(`   inmemory:      ${ws.inmemory}`);
  output.appendLine(`   есть bookmark: ${typeof ws.bookmark === 'function' ? 'да' : 'нет'}`);

  if (typeof ws.bookmark === 'function') {
    try {
      const value = await ws.bookmark();
      output.appendLine(`   bookmark():    ${value ?? 'undefined'}`);
    } catch (e) {
      output.appendLine(`   bookmark() ошибка: ${(e as Error)?.message ?? String(e)}`);
    }
  }

  try {
    const bytes = await ws.root.get();
    output.appendLine(`   чтение файла:  ${bytes?.byteLength ?? 0} байт`);
  } catch (e) {
    output.appendLine(`   чтение файла ошибка: ${(e as Error)?.message ?? String(e)}`);
  }
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
