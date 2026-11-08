// Files in memory, seeded by the fixture (tags.json, tag-draft.json, ...).
import { FIX } from './store';

const files: Record<string, string> = FIX.files ?? (FIX.files = {});
export const Paths = { document: 'doc', cache: 'cache' };
export class File {
  name: string;
  constructor(_dir: unknown, ...parts: string[]) {
    this.name = parts.join('/');
  }
  get exists() {
    return this.name in files;
  }
  get uri() {
    return `file:///${this.name}`;
  }
  get size() {
    return (files[this.name] ?? '').length;
  }
  textSync() {
    return files[this.name];
  }
  async text() {
    return files[this.name];
  }
  writeSync(text: string) {
    files[this.name] = text;
  }
  write(text: string) {
    files[this.name] = text;
  }
  create() {
    files[this.name] ??= '';
  }
  delete() {
    delete files[this.name];
  }
}
export class Directory {
  exists = true;
  constructor(..._a: unknown[]) {}
  create() {}
  list() {
    return [];
  }
}
