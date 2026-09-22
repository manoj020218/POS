import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

import { downloadTextFile } from './download-file.js';

/**
 * Hands a text file to the native share sheet (WhatsApp, email, Drive, ...)
 * so a cashier can send a report off the tablet without a Downloads folder
 * to dig through. Falls back to a browser download when running as a plain
 * web page (e.g. `npm run dev`), where there's no share sheet to open.
 */
export const shareTextFile = async (input: {
  contents: string;
  dialogTitle: string;
  filename: string;
  mimeType?: string;
}): Promise<void> => {
  if (!Capacitor.isNativePlatform()) {
    downloadTextFile(input.filename, input.contents, input.mimeType);
    return;
  }

  const written = await Filesystem.writeFile({
    data: input.contents,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
    path: input.filename
  });

  await Share.share({
    dialogTitle: input.dialogTitle,
    title: input.dialogTitle,
    url: written.uri
  });
};
