import { Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CategoryInputSchema,
  CityInputSchema,
  CorridorInputSchema,
  RestrictedItemInputSchema,
} from '@mersal/shared';
import { z } from 'zod';
import { Audited } from '../audit/audited.interceptor';
import { Public, Roles } from '../common/auth-user';
import { ApiZodBody, ZodBody } from '../common/zod';
import { CatalogService } from './catalog.service';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  /** Corridors, cities, categories and restricted items for public forms. */
  @Public()
  @Get()
  get() {
    return this.catalog.publicCatalog();
  }
}

const ActiveSchema = z.object({ active: z.boolean() });
const CityUpdate = CityInputSchema.partial();
const CategoryUpdate = CategoryInputSchema.partial();
const RestrictedUpdate = RestrictedItemInputSchema.partial();

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/catalog')
export class AdminCatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  get() {
    return this.catalog.adminCatalog();
  }

  @Post('corridors')
  @Audited('corridor.create', 'Corridor')
  @ApiZodBody(CorridorInputSchema)
  createCorridor(@ZodBody(CorridorInputSchema) body: z.output<typeof CorridorInputSchema>) {
    return this.catalog.createCorridor(body);
  }

  @Patch('corridors/:id')
  @Audited('corridor.update', 'Corridor')
  @ApiZodBody(ActiveSchema)
  updateCorridor(
    @Param('id') id: string,
    @ZodBody(ActiveSchema) body: z.output<typeof ActiveSchema>,
  ) {
    return this.catalog.setCorridorActive(id, body.active);
  }

  @Post('cities')
  @Audited('city.create', 'City')
  @ApiZodBody(CityInputSchema)
  createCity(@ZodBody(CityInputSchema) body: z.output<typeof CityInputSchema>) {
    return this.catalog.createCity(body);
  }

  @Patch('cities/:id')
  @Audited('city.update', 'City')
  @ApiZodBody(CityUpdate)
  updateCity(@Param('id') id: string, @ZodBody(CityUpdate) body: z.output<typeof CityUpdate>) {
    return this.catalog.updateCity(id, body);
  }

  @Post('categories')
  @Audited('category.create', 'Category')
  @ApiZodBody(CategoryInputSchema)
  createCategory(@ZodBody(CategoryInputSchema) body: z.output<typeof CategoryInputSchema>) {
    return this.catalog.createCategory(body);
  }

  @Patch('categories/:id')
  @Audited('category.update', 'Category')
  @ApiZodBody(CategoryUpdate)
  updateCategory(
    @Param('id') id: string,
    @ZodBody(CategoryUpdate) body: z.output<typeof CategoryUpdate>,
  ) {
    return this.catalog.updateCategory(id, body);
  }

  @Post('restricted-items')
  @Audited('restricted_item.create', 'RestrictedItem')
  @ApiZodBody(RestrictedItemInputSchema)
  createRestricted(
    @ZodBody(RestrictedItemInputSchema) body: z.output<typeof RestrictedItemInputSchema>,
  ) {
    return this.catalog.createRestrictedItem(body);
  }

  @Patch('restricted-items/:id')
  @Audited('restricted_item.update', 'RestrictedItem')
  @ApiZodBody(RestrictedUpdate)
  updateRestricted(
    @Param('id') id: string,
    @ZodBody(RestrictedUpdate) body: z.output<typeof RestrictedUpdate>,
  ) {
    return this.catalog.updateRestrictedItem(id, body);
  }
}
