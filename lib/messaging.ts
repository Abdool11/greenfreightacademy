/**
 * Render a simple {{variable}} template.
 * Variables not provided are replaced with an empty string.
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{\s*([^{}\s]+)\s*\}\}/g, (_, key) =>
    variables[key] ?? ""
  );
}
