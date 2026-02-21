import { getSingletonHighlighter, type Highlighter } from "shiki";

let cachedTheme = "github-dark";
let highlighterPromise: Promise<Highlighter> | null = null;

async function getHighlighterInstance(theme: string) {
  if (!highlighterPromise || cachedTheme !== theme) {
    cachedTheme = theme;
    highlighterPromise = getSingletonHighlighter({ themes: [theme] });
  }
  return highlighterPromise;
}

export async function highlightCode(code: string, lang: string, theme = "github-dark") {
  const highlighter = await getHighlighterInstance(theme);
  const loaded = highlighter.getLoadedLanguages();
  if (!loaded.includes(lang as any)) {
    await highlighter.loadLanguage(lang as any);
  }
  return highlighter.codeToHtml(code, { lang, theme });
}
