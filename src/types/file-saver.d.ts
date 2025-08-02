declare module 'file-saver' {
  export function saveAs(data: Blob | File, filename?: string, options?: { autoBom?: boolean }): void;
  export function saveAs(data: string, filename?: string, options?: { autoBom?: boolean }): void;
}
