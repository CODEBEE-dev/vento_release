// coreContext.ts
type ParamKind = 'Identifier' | 'StringLiteral' | string;
type ParamDef = {
  label?: string;
  type?: 'input';
  initial?: {
    value: any;
    kind: ParamKind;
  };
};

type TagMeta = {
  id: string;
  title: string;
  category: string;
  keywords?: string[];
  context?: string;
  icon?: string;
  params: Record<string, ParamDef>;
};

const _registry: TagMeta[] = [];

function defineTag<TOpts extends object>(
  key: string,
  meta: TagMeta,
  render: (options: TOpts) => Promise<string>
) {
  _registry.push(meta);
  return render;
}

function attrsToString(attributes?: Record<string, string>) {
  return attributes
    ? Object.entries(attributes)
        .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`)
        .join(' ')
    : '';
}

function getParam(
  { label, initialValue, literal = false, type = 'input' as 'input' }:
  { label?: string; initialValue: any; literal?: boolean; type?: 'input' }
): ParamDef {
  return {
    label,
    initial: {
      value: initialValue,
      kind: (literal ? 'StringLiteral' : 'Identifier') as ParamKind,
    },
    type, // <- ahora es 'input', no string
  };
}

const getContent = (content) => {
    return Array.isArray(content) ? content.join('\n') : content ?? '';
}

const html = defineTag(
  'html',
  {
    id: 'html.html',
    title: 'HTML Tag',
    category: 'html',
    keywords: ['html', 'tag'],
    context: 'context.html.html',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      lang: getParam({ label: 'Language', initialValue: 'en', literal: true }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content: string | string[]; lang?: string; attributes?: Record<string, string> }) => {
    const { content, lang, attributes } = options;
    return `
<!DOCTYPE html>
<html lang="${lang ?? 'en'}" ${attrsToString(attributes)}>
  ${getContent(content)}
</html>`;
  }
);

const head = defineTag(
  'head',
  {
    id: 'html.head',
    title: 'Head Tag',
    category: 'html',
    keywords: ['html', 'head', 'tag'],
    context: 'context.html.head',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: {
    content: string | string[],
    attributes?: Record<string, string>
}) => {
    const { content, attributes } = options;

    return `
  <head ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>
    ${getContent(content)}
    <link
      rel="stylesheet"
      href="/public/pico/css/pico.classless.min.css"
    >
  </head>`
});


const body = defineTag(
  'body',
  {
    id: 'html.body',
    title: 'Body Tag',
    category: 'html',
    keywords: ['html', 'body', 'tag'],
    context: 'context.html.body',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: {
    content: string | string[],
    attributes?: Record<string, string>
}) => {
    const { content, attributes } = options;

    return `
  <body ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>
    ${getContent(content)}
    <script src="/public/pico/js/minimal-theme-switcher.js"></script>
  </body>`
});

const meta = defineTag(
  'meta',
  {
    id: 'html.meta',
    title: 'Meta Tag',
    category: 'html',
    keywords: ['html', 'meta', 'tag'],
    context: 'context.html.meta',
    icon: 'layout-panel-top',
    params: {
      name: getParam({ label: 'Name', initialValue: '', literal: true }),
      content: getParam({ label: 'Content', initialValue: '', literal: true }),
      lang: getParam({ label: 'Language', initialValue: '', literal: true }),
      charset: getParam({ label: 'Charset', initialValue: '', literal: true }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
 async (options: {
    name?: string
    content?: string
    lang?: string
    charset?: string,
    attributes?: Record<string, string>
}) => {
    const { name, content, lang, charset, attributes } = options;

    return `
  <meta ${name ? `name="${name}"` : ''} ${content ? `content="${content}"` : ''} ${lang ? `lang="${lang}"` : ''} ${charset ? `charset="${charset}"` : ''} ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>
  `;
});

const title = defineTag(
  'title',
  {
    id: 'html.title',
    title: 'Title Tag',
    category: 'html',
    keywords: ['html', 'title', 'tag'],
    context: 'context.html.title',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: {
    content?: string
    attributes?: Record<string, string>
}) => {
    const { content, attributes } = options;

    return `
  <title ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</title>
  `
});

const link = defineTag(
  'link',
  {
    id: 'html.link',
    title: 'Link Tag',
    category: 'html',
    keywords: ['html', 'link', 'tag'],
    context: 'context.html.link',
    icon: 'layout-panel-top',
    params: {
      rel: getParam({ label: 'Rel', initialValue: '', literal: true }),
      href: getParam({ label: 'Href', initialValue: '', literal: true }),
      type: getParam({ label: 'Type', initialValue: '', literal: true }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: {
    rel?: string
    href?: string
    type?: string
    attributes?: Record<string, string>
}) => {
    const { rel, href, type, attributes } = options;

    return `
  <link ${rel ? `rel="${rel}"` : ''} ${href ? `href="${href}"` : ''} ${type ? `type="${type}"` : ''} ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>
  `
});

const table = defineTag(
  'table',
  {
    id: 'html.table',
    title: 'Table Tag',
    category: 'html',
    keywords: ['html', 'table', 'tag'],
    context: 'context.html.table',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: {
    content?: string
    attributes?: Record<string, string>
}) => {
    const { content, attributes } = options;
    return `
  <table ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</table>
  `
});

const header = defineTag(
  'header',
  {
    id: 'html.header',
    title: 'Header Tag',
    category: 'html',
    keywords: ['html', 'header', 'tag'],
    context: 'context.html.header',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: {
    content?: string
    attributes?: Record<string, string>
}) => {
    const { content, attributes } = options;
    return `
  <header ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</header>
  `;
});

const main = defineTag(
  'main',
  {
    id: 'html.main',
    title: 'Main Tag',
    category: 'html',
    keywords: ['html', 'main', 'tag'],
    context: 'context.html.main',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: {
    content?: string
    attributes?: Record<string, string>
}) => {
    const { content, attributes } = options;
    return `
  <main ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</main>
  `;
});

const footer = defineTag(
  'footer',
  {
    id: 'html.footer',
    title: 'Footer Tag',
    category: 'html',
    keywords: ['html', 'footer', 'tag'],
    context: 'context.html.footer',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: {
    content?: string
    attributes?: Record<string, string>
}) => {
    const { content, attributes } = options;
    return `
  <footer ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</footer>
  `;
});

const script = defineTag(
  'script',
  {
    id: 'html.script',
    title: 'Script Tag',
    category: 'html',
    keywords: ['html', 'script', 'tag'],
    context: 'context.html.script',
    icon: 'layout-panel-top',
    params: {
      src: getParam({ label: 'Source', initialValue: '', literal: false }),
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { src?: string, content?: string, attributes?: Record<string, string> }) => {
    const { src, content, attributes } = options;
    return `
  <script ${src ? `src="${src}"` : ''} ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>
    ${getContent(content)}
  </script>
  `;
});

const hgroup = defineTag(
  'hgroup',
  {
    id: 'html.hgroup',
    title: 'HGroup Tag',
    category: 'html',
    keywords: ['html', 'hgroup', 'tag'],
    context: 'context.html.hgroup',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <hgroup ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</hgroup>
  `;
});

const h1 = defineTag(
  'h1',
  {
    id: 'html.h1',
    title: 'H1 Tag',
    category: 'html',
    keywords: ['html', 'h1', 'tag'],
    context: 'context.html.h1',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <h1 ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</h1>
  `;
});

const h2 = defineTag(
  'h2',
  {
    id: 'html.h2',
    title: 'H2 Tag',
    category: 'html',
    keywords: ['html', 'h2', 'tag'],
    context: 'context.html.h2',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <h2 ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</h2>
  `;
});

const h3 = defineTag(
  'h3',
  {
    id: 'html.h3',
    title: 'H3 Tag',
    category: 'html',
    keywords: ['html', 'h3', 'tag'],
    context: 'context.html.h3',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <h3 ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</h3>
  `;
});

const h4 = defineTag(
  'h4',
  {
    id: 'html.h4',
    title: 'H4 Tag',
    category: 'html',
    keywords: ['html', 'h4', 'tag'],
    context: 'context.html.h4',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <h4 ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</h4>
  `;
});

const h5 = defineTag(
  'h5',
  {
    id: 'html.h5',
    title: 'H5 Tag',
    category: 'html',
    keywords: ['html', 'h5', 'tag'],
    context: 'context.html.h5',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <h5 ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</h5>
  `;
});

const h6 = defineTag(
  'h6',
  {
    id: 'html.h6',
    title: 'H6 Tag',
    category: 'html',
    keywords: ['html', 'h6', 'tag'],
    context: 'context.html.h6',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <h6 ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</h6>
  `;
});

const p = defineTag(
  'p',
  {
    id: 'html.p',
    title: 'P Tag',
    category: 'html',
    keywords: ['html', 'p', 'tag'],
    context: 'context.html.p',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <p ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</p>
  `;
});

const nav = defineTag(
  'nav',
  {
    id: 'html.nav',
    title: 'Nav Tag',
    category: 'html',
    keywords: ['html', 'nav', 'tag'],
    context: 'context.html.nav',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <nav ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</nav>
  `;
});

const ul = defineTag(
  'ul',
  {
    id: 'html.ul',
    title: 'UL Tag',
    category: 'html',
    keywords: ['html', 'ul', 'tag'],
    context: 'context.html.ul',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <ul ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</ul>
  `;
});

const li = defineTag(
  'li',
  {
    id: 'html.li',
    title: 'LI Tag',
    category: 'html',
    keywords: ['html', 'li', 'tag'],
    context: 'context.html.li',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <li ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</li>
  `;
});

const a = defineTag(
  'a',
  {
    id: 'html.a',
    title: 'A Tag',
    category: 'html',
    keywords: ['html', 'a', 'tag'],
    context: 'context.html.a',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      href: getParam({ label: 'HREF', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, href?: string, attributes?: Record<string, string> }) => {
    const { content, href, attributes } = options;
    return `
  <a ${href ? `href="${href}"` : ''} ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</a>
  `;
});

const section = defineTag(
  'section',
  {
    id: 'html.section',
    title: 'Section Tag',
    category: 'html',
    keywords: ['html', 'section', 'tag'],
    context: 'context.html.section',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <section ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</section>
  `;
});

const form = defineTag(
  'form',
  {
    id: 'html.form',
    title: 'Form Tag',
    category: 'html',
    keywords: ['html', 'form', 'tag'],
    context: 'context.html.form',
    icon: 'layout-panel-top',
    params: {
      role: getParam({ label: 'Role', initialValue: '', literal: false }),
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      method: getParam({ label: 'Method', initialValue: '', literal: false }),
      action: getParam({ label: 'Action', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { role?: string, content?: string, method?: string, action?: string, attributes?: Record<string, string> }) => {
    const { role, content, method, action, attributes } = options;
    return `
  <form ${role ? `role="${role}"` : ''} ${method ? `method="${method}"` : ''} ${action ? `action="${action}"` : ''} ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</form>
  `;
});

const input = defineTag(
  'input',
  {
    id: 'html.input',
    title: 'Input Tag',
    category: 'html',
    keywords: ['html', 'input', 'tag'],
    context: 'context.html.input',
    icon: 'layout-panel-top',
    params: {
      type: getParam({ label: 'Type', initialValue: '', literal: false }),
      name: getParam({ label: 'Name', initialValue: '', literal: false }),
      value: getParam({ label: 'Value', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { type?: string, name?: string, value?: string, attributes?: Record<string, string> }) => {
    const { type, name, value, attributes } = options;
    return `
  <input ${type ? `type="${type}"` : ''} ${name ? `name="${name}"` : ''} ${value ? `value="${value}"` : ''} ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''} />
  `;
});

const button = defineTag(
  'button',
  {
    id: 'html.button',
    title: 'Button Tag',
    category: 'html',
    keywords: ['html', 'button', 'tag'],
    context: 'context.html.button',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      type: getParam({ label: 'Type', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, type?: string, attributes?: Record<string, string> }) => {
    const { content, type, attributes } = options;
    return `
  <button ${type ? `type="${type}"` : ''} ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</button>
  `;
});

const blockquote = defineTag(
  'blockquote',
  {
    id: 'html.blockquote',
    title: 'Blockquote Tag',
    category: 'html',
    keywords: ['html', 'blockquote', 'tag'],
    context: 'context.html.blockquote',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <blockquote ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</blockquote>
  `;
});

const del = defineTag(
  'del',
  {
    id: 'html.del',
    title: 'Deleted Text Tag',
    category: 'html',
    keywords: ['html', 'del', 'tag'],
    context: 'context.html.del',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <del ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</del>
  `;
});

const em = defineTag(
  'em',
  {
    id: 'html.em',
    title: 'Emphasis Tag',
    category: 'html',
    keywords: ['html', 'em', 'tag'],
    context: 'context.html.em',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <em ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</em>
  `;
});

const u = defineTag(
  'u',
  {
    id: 'html.u',
    title: 'Underline Tag',
    category: 'html',
    keywords: ['html', 'u', 'tag'],
    context: 'context.html.u',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <u ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</u>
  `;
});

const strong = defineTag(
  'strong',
  {
    id: 'html.strong',
    title: 'Strong Tag',
    category: 'html',
    keywords: ['html', 'strong', 'tag'],
    context: 'context.html.strong',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <strong ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</strong>
  `;
});

const small = defineTag(
  'small',
  {
    id: 'html.small',
    title: 'Small Tag',
    category: 'html',
    keywords: ['html', 'small', 'tag'],
    context: 'context.html.small',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <small ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</small>
  `;
});

const s = defineTag(
  's',
  {
    id: 'html.s',
    title: 'Strikethrough Tag',
    category: 'html',
    keywords: ['html', 's', 'tag'],
    context: 'context.html.s',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <s ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</s>
  `;
});

const sub = defineTag(
  'sub',
  {
    id: 'html.sub',
    title: 'Subscript Tag',
    category: 'html',
    keywords: ['html', 'sub', 'tag'],
    context: 'context.html.sub',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <sub ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</sub>
  `;
});

const sup = defineTag(
  'sup',
  {
    id: 'html.sup',
    title: 'Superscript Tag',
    category: 'html',
    keywords: ['html', 'sup', 'tag'],
    context: 'context.html.sup',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <sup ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</sup>
  `;
});

const abbr = defineTag(
  'abbr',
  {
    id: 'html.abbr',
    title: 'Abbreviation Tag',
    category: 'html',
    keywords: ['html', 'abbr', 'tag'],
    context: 'context.html.abbr',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <abbr ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</abbr>
  `;
});

const kbd = defineTag(
  'kbd',
  {
    id: 'html.kbd',
    title: 'Keyboard Tag',
    category: 'html',
    keywords: ['html', 'kbd', 'tag'],
    context: 'context.html.kbd',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <kbd ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</kbd>
  `;
});

const mark = defineTag(
  'mark',
  {
    id: 'html.mark',
    title: 'Mark Tag',
    category: 'html',
    keywords: ['html', 'mark', 'tag'],
    context: 'context.html.mark',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <mark ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</mark>
  `;
});

const figure = defineTag(
  'figure',
  {
    id: 'html.figure',
    title: 'Figure Tag',
    category: 'html',
    keywords: ['html', 'figure', 'tag'],
    context: 'context.html.figure',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <figure ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</figure>
  `;
});

const img = defineTag(
  'img',
  {
    id: 'html.img',
    title: 'Image Tag',
    category: 'html',
    keywords: ['html', 'img', 'tag'],
    context: 'context.html.img',
    icon: 'layout-panel-top',
    params: {
      src: getParam({ label: 'Source', initialValue: '', literal: false }),
      alt: getParam({ label: 'Alt Text', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { src?: string, alt?: string, attributes?: Record<string, string> }) => {
    const { src, alt, attributes } = options;
    return `
  <img src="${src}" alt="${alt}" ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''} />
  `;
});

const figcaption = defineTag(
  'figcaption',
  {
    id: 'html.figcaption',
    title: 'Figcaption Tag',
    category: 'html',
    keywords: ['html', 'figcaption', 'tag'],
    context: 'context.html.figcaption',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <figcaption ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</figcaption>
  `;
});

const label = defineTag(
  'label',
  {
    id: 'html.label',
    title: 'Label Tag',
    category: 'html',
    keywords: ['html', 'label', 'tag'],
    context: 'context.html.label',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <label ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</label>
  `;
});

const legend = defineTag(
  'legend',
  {
    id: 'html.legend',
    title: 'Legend Tag',
    category: 'html',
    keywords: ['html', 'legend', 'tag'],
    context: 'context.html.legend',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <legend ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</legend>
  `;
});

const fieldset = defineTag(
  'fieldset',
  {
    id: 'html.fieldset',
    title: 'Fieldset Tag',
    category: 'html',
    keywords: ['html', 'fieldset', 'tag'],
    context: 'context.html.fieldset',
    icon: 'layout-panel-top',
    params: {
      role: getParam({ label: 'Role', initialValue: '', literal: false }),
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { role?: string, content?: string, attributes?: Record<string, string> }) => {
    const { role, content, attributes } = options;
    return `
  <fieldset ${role ? `role="${role}"` : ''} ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</fieldset>
  `;
});

const summary = defineTag(
  'summary',
  {
    id: 'html.summary',
    title: 'Summary Tag',
    category: 'html',
    keywords: ['html', 'summary', 'tag'],
    context: 'context.html.summary',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <summary ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</summary>
  `;
});

const details = defineTag(
  'details',
  {
    id: 'html.details',
    title: 'Details Tag',
    category: 'html',
    keywords: ['html', 'details', 'tag'],
    context: 'context.html.details',
    icon: 'layout-panel-top',
    params: {
      name: getParam({ label: 'Name', initialValue: '', literal: false }),
      open: getParam({ label: 'Open', initialValue: false, literal: true }),
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { name?: string, open?: boolean, content?: string, attributes?: Record<string, string> }) => {
    const { name, open, content, attributes } = options;
    return `
  <details ${name ? `name="${name}"` : ''} ${open ? 'open' : ''} ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</details>
  `;
});

const article = defineTag(
  'article',
  {
    id: 'html.article',
    title: 'Article Tag',
    category: 'html',
    keywords: ['html', 'article', 'tag'],
    context: 'context.html.article',
    icon: 'layout-panel-top',
    params: {
      busy: getParam({ label: 'Busy', initialValue: false, literal: true }),
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { busy?: boolean, content?: string, attributes?: Record<string, string> }) => {
    const { busy, content, attributes } = options;
    return `
  <article ${busy ? 'aria-busy="true"' : ''} ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</article>
  `;
});

const progress = defineTag(
  'progress',
  {
    id: 'html.progress',
    title: 'Progress Tag',
    category: 'html',
    keywords: ['html', 'progress', 'tag'],
    context: 'context.html.progress',
    icon: 'layout-panel-top',
    params: {
      value: getParam({ label: 'Value', initialValue: 0, literal: true }),
      max: getParam({ label: 'Max', initialValue: 100, literal: true }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { value?: number, max?: number, attributes?: Record<string, string> }) => {
    const { value, max, attributes } = options;
    return `
  <progress value="${value}" max="${max}" ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}></progress>
  `;
});

const pre = defineTag(
  'pre',
  {
    id: 'html.pre',
    title: 'Preformatted Text Tag',
    category: 'html',
    keywords: ['html', 'pre', 'tag'],
    context: 'context.html.pre',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <pre ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</pre>
  `;
});

const code = defineTag(
  'code',
  {
    id: 'html.code',
    title: 'Code Tag',
    category: 'html',
    keywords: ['html', 'code', 'tag'],
    context: 'context.html.code',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <code ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</code>
  `;
});

const ol = defineTag(
  'ol',
  {
    id: 'html.ol',
    title: 'Ordered List Tag',
    category: 'html',
    keywords: ['html', 'ol', 'tag'],
    context: 'context.html.ol',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <ol ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</ol>
  `;
});

const tr = defineTag(
  'tr',
  {
    id: 'html.tr',
    title: 'Table Row Tag',
    category: 'html',
    keywords: ['html', 'tr', 'tag'],
    context: 'context.html.tr',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <tr ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</tr>
  `;
});

const td = defineTag(
  'td',
  {
    id: 'html.td',
    title: 'Table Data Cell Tag',
    category: 'html',
    keywords: ['html', 'td', 'tag'],
    context: 'context.html.td',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <td ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</td>
  `;
});

const th = defineTag(
  'th',
  {
    id: 'html.th',
    title: 'Table Header Cell Tag',
    category: 'html',
    keywords: ['html', 'th', 'tag'],
    context: 'context.html.th',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <th ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</th>
  `;
});

const thead = defineTag(
  'thead',
  {
    id: 'html.thead',
    title: 'Table Header Tag',
    category: 'html',
    keywords: ['html', 'thead', 'tag'],
    context: 'context.html.thead',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <thead ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</thead>
  `;
});

const tbody = defineTag(
  'tbody',
  {
    id: 'html.tbody',
    title: 'Table Body Tag',
    category: 'html',
    keywords: ['html', 'tbody', 'tag'],
    context: 'context.html.tbody',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <tbody ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</tbody>
  `;
});

const tfoot = defineTag(
  'tfoot',
  {
    id: 'html.tfoot',
    title: 'Table Footer Tag',
    category: 'html',
    keywords: ['html', 'tfoot', 'tag'],
    context: 'context.html.tfoot',
    icon: 'layout-panel-top',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <tfoot ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</tfoot>
  `;
});

const div = defineTag(
  'div',
  {
    id: 'html.div',
    title: 'Division Tag',
    category: 'html',
    keywords: ['html', 'div', 'tag'],
    context: 'context.html.div',
    icon: 'layout-panel',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <div ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</div>
  `;
});

const span = defineTag(
  'span',
  {
    id: 'html.span',
    title: 'Span Tag',
    category: 'html',
    keywords: ['html', 'span', 'tag'],
    context: 'context.html.span',
    icon: 'layout-panel',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <span ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</span>
  `;
});

const caption = defineTag(
  'caption',
  {
    id: 'html.caption',
    title: 'Caption Tag',
    category: 'html',
    keywords: ['html', 'caption', 'tag'],
    context: 'context.html.caption',
    icon: 'layout-panel',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <caption ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</caption>
  `;
});

const b = defineTag(
  'b',
  {
    id: 'html.b',
    title: 'Bold Tag',
    category: 'html',
    keywords: ['html', 'b', 'tag'],
    context: 'context.html.b',
    icon: 'text-bold',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <b ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</b>
  `;
});

const i = defineTag(
  'i',
  {
    id: 'html.i',
    title: 'Italic Tag',
    category: 'html',
    keywords: ['html', 'i', 'tag'],
    context: 'context.html.i',
    icon: 'text-italic',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <i ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</i>
  `;
});

const ins = defineTag(
  'ins',
  {
    id: 'html.ins',
    title: 'Inserted Text Tag',
    category: 'html',
    keywords: ['html', 'ins', 'tag'],
    context: 'context.html.ins',
    icon: 'text-underline',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <ins ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</ins>
  `;
});

const samp = defineTag(
  'samp',
  {
    id: 'html.samp',
    title: 'Sample Output Tag',
    category: 'html',
    keywords: ['html', 'samp', 'tag'],
    context: 'context.html.samp',
    icon: 'text-quote',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <samp ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</samp>
  `;
});

const time = defineTag(
  'time',
  {
    id: 'html.time',
    title: 'Time Tag',
    category: 'html',
    keywords: ['html', 'time', 'tag'],
    context: 'context.html.time',
    icon: 'text-clock',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <time ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</time>
  `
});

const output = defineTag(
  'output',
  {
    id: 'html.output',
    title: 'Output Tag',
    category: 'html',
    keywords: ['html', 'output', 'tag'],
    context: 'context.html.output',
    icon: 'text-output',
    params: {
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { content?: string, attributes?: Record<string, string> }) => {
    const { content, attributes } = options;
    return `
  <output ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</output>
  `;
});

const select = defineTag(
  'select',
  {
    id: 'html.select',
    title: 'Select Tag',
    category: 'html',
    keywords: ['html', 'select', 'tag'],
    context: 'context.html.select',
    icon: 'text-select',
    params: {
      required: getParam({ label: 'Required', initialValue: false }),
      name: getParam({ label: 'Name', initialValue: '' }),
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { required?: boolean, name?: string, content?: string, attributes?: Record<string, string> }) => {
    const { required, name, content, attributes } = options;
    return `
  <select ${name ? `name="${name}"` : ''} ${required ? 'required' : ''} ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</select>
  `;
});

const option = defineTag(
  'option',
  {
    id: 'html.option',
    title: 'Option Tag',
    category: 'html',
    keywords: ['html', 'option', 'tag'],
    context: 'context.html.option',
    icon: 'text-option',
    params: {
      value: getParam({ label: 'Value', initialValue: '' }),
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { value?: string, content?: string, attributes?: Record<string, string> }) => {
    const { value, content, attributes } = options;
    return `
  <option ${value ? `value="${value}"` : ''} ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</option>
  `;
});

const dialog = defineTag(
  'dialog',
  {
    id: 'html.dialog',
    title: 'Dialog Tag',
    category: 'html',
    keywords: ['html', 'dialog', 'tag'],
    context: 'context.html.dialog',
    icon: 'text-dialog',
    params: {
      open: getParam({ label: 'Open', initialValue: false }),
      content: getParam({ label: 'Content', initialValue: '', literal: false }),
      attributes: getParam({ label: 'Attributes', initialValue: {} }),
    },
  },
  async (options: { open?: boolean, content?: string, attributes?: Record<string, string> }) => {
    const { open, content, attributes } = options;
    return `
  <dialog ${open ? 'open' : ''} ${attributes ? Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>${getContent(content)}</dialog>
  `;
});


export default {
    html: html,
    body: body,
    head: head,
    meta: meta,
    title: title,
    link: link,
    header: header,
    main: main,
    progress: progress,
    article: article,
    details: details,
    summary: summary,
    fieldset: fieldset,
    img: img,
    figure: figure,
    figcaption: figcaption,
    label: label,
    legend: legend,
    h1: h1,
    h2: h2,
    h3: h3,
    h4: h4,
    h5: h5,
    h6: h6,
    p: p,
    blockquote: blockquote,
    pre: pre,
    code: code,
    em: em,
    strong: strong,
    a: a,
    ul: ul,
    ol: ol,
    li: li,
    table: table,
    tr: tr,
    td: td,
    th: th,
    thead: thead,
    tbody: tbody,
    tfoot: tfoot,
    caption: caption,
    div: div,
    span: span,
    b: b,
    i: i,
    u: u,
    s: s,
    small: small,
    mark: mark,
    del: del,
    ins: ins,
    sub: sub,
    sup: sup,
    kbd: kbd,
    samp: samp,
    time: time,
    output: output,
    section: section,
    form: form,
    input: input,
    button: button,
    abbr: abbr,
    nav: nav,
    footer: footer,
    script: script,
    hgroup: hgroup,
    option: option,
    select: select,
    dialog: dialog,
    _registry: _registry
}