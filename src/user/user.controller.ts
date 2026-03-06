import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserDto, UpdateUserDto, UserQueryDto } from './dto/user.dto';
import { User } from './user.entity';
import { UserService } from './user.service';

@ApiTags('user')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Get all users' })
  @ApiOkResponse({ type: [User] })
  @Get()
  find(@Query() query: UserQueryDto) {
    return this.userService.find(query);
  }

  @ApiOperation({ summary: 'Get user by id' })
  @ApiOkResponse({ type: User })
  @ApiNotFoundResponse({ description: 'User not found' })
  @Get(':id')
  async findById(@Param('id') id: string) {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  @ApiOperation({ summary: 'Create user' })
  @ApiOkResponse({ type: User })
  @Post()
  create(@Body() body: CreateUserDto) {
    return this.userService.create(body);
  }

  @ApiOperation({ summary: 'Update user' })
  @ApiNoContentResponse()
  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return this.userService.update(id, body);
  }

  @ApiOperation({ summary: 'Delete user' })
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.userService.delete(id);
  }
}
