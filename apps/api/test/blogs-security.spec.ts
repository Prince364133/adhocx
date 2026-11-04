import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UserRole } from '@adhocx/contracts';
import { AdminBlogsController, BlogsController } from '../src/modules/blogs/blogs.controller';
import { JwtAuthGuard } from '../src/common/guards/auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import { sanitizeBlogHtml, sanitizeImageUrl } from '../src/modules/blogs/blog-html-sanitizer';

/**
 * /admin/blogs had no auth: anyone could create, edit or delete posts, and post bodies are rendered
 * as raw HTML on the public marketing site (stored XSS). Now ADMIN-only, and bodies are sanitized.
 */
describe('admin blog endpoints', () => {
  it('require a signed-in ADMIN', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminBlogsController)).toEqual([JwtAuthGuard, RolesGuard]);
    expect(Reflect.getMetadata(ROLES_KEY, AdminBlogsController)).toEqual([UserRole.ADMIN]);
  });

  it('public read endpoints stay public', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, BlogsController)).toBeUndefined();
  });
});

describe('blog HTML sanitizer', () => {
  it('strips scripts, event handlers, iframes and javascript: links', () => {
    const out = sanitizeBlogHtml(
      '<p onclick="steal()">Hi</p><script>alert(1)</script><iframe src="https://x"></iframe>' +
        '<a href="javascript:alert(1)">x</a><img src="x" onerror="alert(1)"><img src="data:image/png;base64,AAA">',
    )!;
    expect(out).not.toMatch(/script|onclick|onerror|iframe|javascript:|data:/i);
    expect(out).toContain('<p>Hi</p>');
  });

  it('keeps normal article formatting, links and https images', () => {
    const html =
      '<h2>Title</h2><p><strong>Bold</strong> <em>it</em></p><ul><li>a</li></ul>' +
      '<a href="https://adhocx.com" target="_blank">site</a><img src="https://cdn.adhocx.com/a.png" alt="a">';
    const out = sanitizeBlogHtml(html)!;
    expect(out).toContain('<h2>Title</h2>');
    expect(out).toContain('<strong>Bold</strong>');
    expect(out).toContain('<li>a</li>');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('src="https://cdn.adhocx.com/a.png"');
  });

  it('leaves markdown untouched', () => {
    const md = '## Heading\n\n1. **Bold** item\n- [link](https://adhocx.com)';
    expect(sanitizeBlogHtml(md)).toBe(md);
  });

  it('cover image must be http(s) or a site path', () => {
    expect(sanitizeImageUrl('https://cdn.adhocx.com/a.png')).toBe('https://cdn.adhocx.com/a.png');
    expect(sanitizeImageUrl('/images/a.png')).toBe('/images/a.png');
    expect(sanitizeImageUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeImageUrl('//evil.example/a.png')).toBeNull();
    expect(sanitizeImageUrl('')).toBeNull();
  });
});
