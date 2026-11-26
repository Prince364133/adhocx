import type { Config } from '@docusaurus/types';

const config: Config = {
  title: 'AdhocX Documentation',
  tagline: 'Product, engineering, and API documentation',
  url: process.env.DOCUSAURUS_URL || 'http://localhost:7007',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  markdown: {
    format: 'md',
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          exclude: ['**/internal/**'],
          editUrl: 'https://github.com/Prince364133/adhocx/edit/main/apps/docs/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      },
    ],
  ],
  plugins: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexDocs: true,
        indexBlog: false,
        indexPages: false,
        explicitSearchResultPath: true,
        highlightSearchTermsOnTargetPage: false,
        searchBarShortcut: true,
        searchBarShortcutHint: false,
        searchBarShortcutKeymap: 'mod+k',
        searchBarPosition: 'right',
        searchResultContextMaxLength: 80,
      },
    ],
  ],
  themes: ['@docusaurus/theme-mermaid'],
  themeConfig: {
    mermaid: {
      theme: {
        light: 'neutral',
        dark: 'dark',
      },
    },
    navbar: {
      title: 'AdhocX',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: process.env.API_DOCS_URL || 'http://localhost:7001/docs',
          label: 'API Reference (Swagger)',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} AdhocX.`,
    },
  },
};

export default config;
