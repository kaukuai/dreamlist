// Next.js embeds this value in both server and browser bundles. Sites keeps
// its existing authenticated workflow when the variable is absent.
export const browserPreview = process.env.NEXT_PUBLIC_DREAMLIST_MODE === "browser";
