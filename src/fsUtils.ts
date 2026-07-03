import { Directory, Encoding, Filesystem, type WriteFileOptions } from '@capacitor/filesystem';

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

function isExistsError(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  if (code === 'OS-PLUG-FILE-0010') {
    return true;
  }
  const msg = toErrorMessage(err).toLowerCase();
  return msg.includes('already exist') || msg.includes('已经存在');
}

/** mkdir 且忽略目录已存在（Capacitor 不会自动跳过） */
export async function mkdirSafe(path: string, directory: Directory): Promise<void> {
  try {
    await Filesystem.mkdir({ path, directory, recursive: true });
  } catch (err) {
    if (!isExistsError(err)) {
      throw err;
    }
  }
}

/** writeFile + recursive；若因父目录已存在失败则重试一次 */
export async function writeFileSafe(options: WriteFileOptions): Promise<void> {
  try {
    await Filesystem.writeFile({ ...options, recursive: true });
  } catch (err) {
    if (!isExistsError(err)) {
      throw err;
    }
    await Filesystem.writeFile(options);
  }
}

export async function writeTextFileSafe(
  path: string,
  data: string,
  directory: Directory,
): Promise<void> {
  await writeFileSafe({ path, data, directory, encoding: Encoding.UTF8 });
}
