export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}
