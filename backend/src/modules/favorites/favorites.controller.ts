import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { AddFavoriteDto } from './dto/add-favorite.dto';
import { UpdateSortDto } from './dto/update-sort.dto';
import { GetFavoritesDto } from './dto/get-favorites.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post()
  @ApiOperation({ summary: '添加收藏' })
  @ApiResponse({ status: 201, description: '添加成功' })
  @ApiResponse({ status: 400, description: '无效股票代码' })
  @ApiResponse({ status: 409, description: '股票已在收藏列表中' })
  async addFavorite(
    @CurrentUser('userId') userId: string,
    @Body() dto: AddFavoriteDto,
  ) {
    return this.favoritesService.addFavorite(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: '获取收藏列表' })
  @ApiResponse({ status: 200, description: '返回收藏列表' })
  async getFavorites(
    @CurrentUser('userId') userId: string,
    @Query() dto: GetFavoritesDto,
  ) {
    return this.favoritesService.getFavorites(userId, dto.group_name);
  }

  @Put(':id/sort')
  @ApiOperation({ summary: '更新收藏排序' })
  @ApiResponse({ status: 200, description: '排序更新成功' })
  @ApiResponse({ status: 404, description: '收藏不存在' })
  async updateSort(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSortDto,
  ) {
    const favoriteId = parseInt(id, 10);
    if (isNaN(favoriteId)) {
      throw new BadRequestException('无效的收藏ID');
    }
    return this.favoritesService.updateSort(userId, favoriteId, dto.sort_order);
  }

  @Delete(':id')
  @ApiOperation({ summary: '取消收藏' })
  @ApiResponse({ status: 200, description: '取消收藏成功' })
  @ApiResponse({ status: 404, description: '收藏不存在' })
  async removeFavorite(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    const favoriteId = parseInt(id, 10);
    if (isNaN(favoriteId)) {
      throw new BadRequestException('无效的收藏ID');
    }
    return this.favoritesService.removeFavorite(userId, favoriteId);
  }
}
