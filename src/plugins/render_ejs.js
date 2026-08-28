// Node-only leaf: lazy EJS rendering for export plugins. Kept a separate
// module (and in vite.config.js nodeOnlyFiles) so browser bundles stub it to
// null without dragging ejs in, and kept a dynamic import so the CLI's
// startup stays fast (see CLAUDE.md: heavy deps are lazily imported).
export default async function renderEjs(template, data, options) {
    const { default: ejs } = await import("ejs");
    return ejs.render(template, data, options);
}
