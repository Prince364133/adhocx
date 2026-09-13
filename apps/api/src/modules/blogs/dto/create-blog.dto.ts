import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BlogStatusEnum {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export class CreateBlogDto {
  @ApiProperty({ description: 'Blog title', example: 'How AdhocX Streamlines Enterprise Cab Procurement in Hyderabad' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'SEO slug (auto-generated if omitted)', example: 'how-adhocx-streamlines-enterprise-cab-procurement' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ description: 'Short summary/excerpt for previews & search snippets' })
  @IsString()
  @IsNotEmpty()
  excerpt: string;

  @ApiProperty({ description: 'Full markdown or HTML content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'Primary Category', example: 'B2B Fleet Operations' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ description: 'Tags list', example: ['Fleet Management', 'Hyderabad Cab Service', 'Enterprise Logistics'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Cover image URL' })
  @IsString()
  @IsOptional()
  coverImage?: string;

  @ApiPropertyOptional({ description: 'Author name', default: 'AdhocX Team' })
  @IsString()
  @IsOptional()
  authorName?: string;

  @ApiPropertyOptional({ description: 'Author role/title', default: 'Fleet Operations Research' })
  @IsString()
  @IsOptional()
  authorRole?: string;

  @ApiPropertyOptional({ enum: BlogStatusEnum, default: BlogStatusEnum.DRAFT })
  @IsEnum(BlogStatusEnum)
  @IsOptional()
  status?: BlogStatusEnum;

  @ApiPropertyOptional({ description: 'Estimated read time', default: '5 min read' })
  @IsString()
  @IsOptional()
  readTime?: string;

  @ApiPropertyOptional({ description: 'Custom SEO Meta Title (max 60 chars)' })
  @IsString()
  @IsOptional()
  seoTitle?: string;

  @ApiPropertyOptional({ description: 'Custom SEO Meta Description (max 160 chars)' })
  @IsString()
  @IsOptional()
  seoDescription?: string;

  @ApiPropertyOptional({ description: 'Target SEO focus keywords' })
  @IsString()
  @IsOptional()
  seoKeywords?: string;
}
