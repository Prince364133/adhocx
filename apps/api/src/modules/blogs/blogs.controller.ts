import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { BlogsService } from './blogs.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { QueryBlogDto } from './dto/query-blog.dto';

@ApiTags('Blogs & Content Hub')
@Controller('blogs')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  // ==========================================
  // PUBLIC ENDPOINTS (Marketing Website & SEO)
  // ==========================================

  @Get()
  @ApiOperation({ summary: 'List published blog posts for marketing site with search & category filters' })
  @SwaggerResponse({ status: 200, description: 'List of published articles with pagination' })
  async listPublished(@Query() query: QueryBlogDto) {
    return this.blogsService.listPublishedBlogs(query);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get current featured / trending blog article' })
  @SwaggerResponse({ status: 200, description: 'Featured blog article' })
  async getFeatured() {
    return this.blogsService.getFeaturedBlog();
  }

  @Get('categories')
  @ApiOperation({ summary: 'List all blog categories with article counts' })
  @SwaggerResponse({ status: 200, description: 'Array of categories with counts' })
  async getCategories() {
    return this.blogsService.getCategoriesWithCount();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get full article by SEO slug & increment view count' })
  @SwaggerResponse({ status: 200, description: 'Article data including rich content & SEO tags' })
  async getBySlug(@Param('slug') slug: string) {
    return this.blogsService.getBlogBySlug(slug);
  }
}

@ApiTags('Admin Blog Management')
@Controller('admin/blogs')
export class AdminBlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  // ==========================================
  // ADMIN ENDPOINTS (Admin Portal Operations)
  // ==========================================

  @Get()
  @ApiOperation({ summary: 'List all blog posts (published, drafts, archived) for Admin panel' })
  @SwaggerResponse({ status: 200, description: 'Paginated administrative list of blog posts' })
  async listAll(@Query() query: QueryBlogDto) {
    return this.blogsService.listAllBlogsAdmin(query);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get overall blog metrics (total, published, drafts, lifetime views)' })
  @SwaggerResponse({ status: 200, description: 'Blog metrics summary' })
  async getMetrics() {
    return this.blogsService.getMetrics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single blog post by UUID for editing' })
  @SwaggerResponse({ status: 200, description: 'Full blog post record' })
  async getById(@Param('id') id: string) {
    return this.blogsService.getBlogAdminById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new blog post from Admin panel' })
  @SwaggerResponse({ status: 201, description: 'Blog post created successfully' })
  async create(@Body() dto: CreateBlogDto) {
    return this.blogsService.createBlog(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing blog post or toggle status' })
  @SwaggerResponse({ status: 200, description: 'Blog post updated successfully' })
  async update(@Param('id') id: string, @Body() dto: UpdateBlogDto) {
    return this.blogsService.updateBlog(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a blog post' })
  @SwaggerResponse({ status: 200, description: 'Blog post deleted successfully' })
  async delete(@Param('id') id: string) {
    return this.blogsService.deleteBlog(id);
  }
}
