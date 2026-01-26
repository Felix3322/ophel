/**
 * @type {import('prettier').Options}
 */
export default {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: false,
  singleQuote: false,
  trailingComma: "all",
  arrowParens: "always",
  endOfLine: "lf",
  bracketSpacing: true,
  bracketSameLine: true,
  proseWrap: "preserve",
  overrides: [
    {
      files: "*.md",
      options: {
        plugins: [],
      },
    },
  ],
}
