import fs from 'fs';

const header = fs.readFileSync('apps/marketing/src/components/Header.astro', 'utf8');
const linkRegex = /href="([^"]+)"/g;
let m;
const links = new Set();
while ((m = linkRegex.exec(header)) !== null) {
  links.add(m[1]);
}

const vendors = fs.readFileSync('apps/marketing/src/pages/vendors.astro', 'utf8');
const index = fs.readFileSync('apps/marketing/src/pages/index.astro', 'utf8');
const terms = fs.readFileSync('apps/marketing/src/pages/terms.astro', 'utf8');
const blogs = fs.readFileSync('apps/marketing/src/pages/blogs.astro', 'utf8');

Array.from(links).forEach(l => {
  if (l.includes('#')) {
    const [page, id] = l.split('#');
    let targetContent = '';
    if (page === '/vendors') targetContent = vendors;
    else if (page === '/terms') targetContent = terms;
    else if (page === '/blogs') targetContent = blogs;
    else if (page === '/' || page === '') targetContent = index;

    const exists = targetContent.includes(`id="${id}"`);
    console.log(`${l.padEnd(30)} -> ID #${id} exists in ${page || '/'}: ${exists}`);
  } else {
    console.log(`${l.padEnd(30)} -> regular page link`);
  }
});

