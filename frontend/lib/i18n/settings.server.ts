import 'server-only';
import fs from 'fs';
import path from 'path';

export interface LanguageConfig {
  key: string;
  name: string;
  flag: string;
}

export function getLanguageConfig(): LanguageConfig[] {
  const localesPath = path.join(process.cwd(), 'locales');
  const folders = fs.readdirSync(localesPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  return folders.map(folder => {
    const commonPath = path.join(localesPath, folder, 'common.json');
    try {
      const content = JSON.parse(fs.readFileSync(commonPath, 'utf-8'));
      return {
        key: folder,
        name: content.language?.name || folder,
        flag: content.language?.flag || `https://flagcdn.com/${folder}.svg`,
      };
    } catch {
      return {
        key: folder,
        name: folder,
        flag: `https://flagcdn.com/${folder}.svg`,
      };
    }
  });
}

export function getLanguages(): string[] {
  return getLanguageConfig().map(l => l.key);
}
