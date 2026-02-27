import 'server-only';
import fs from 'fs';
import path from 'path';
import type { LanguageConfig } from './settings';

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

/**
 * Dynamically discover all translation namespaces from the fallback locale folder.
 * Each .json file in locales/en/ becomes a namespace (e.g. common.json → 'common').
 */
export function getNamespaces(): string[] {
  const localesPath = path.join(process.cwd(), 'locales');
  const fallbackFolder = 'en';
  const nsPath = path.join(localesPath, fallbackFolder);
  
  try {
    return fs.readdirSync(nsPath)
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
  } catch {
    return ['common'];
  }
}
