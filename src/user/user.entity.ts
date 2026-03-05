import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { EStatus } from '../utility/common.enum';

export const TABLE_USER = 'user';

@Entity({ name: TABLE_USER })
export class User {
  @ApiProperty({ example: 'uuid-1234' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'testuser' })
  @Column({ unique: true })
  username: string;

  @ApiHideProperty()
  @Column({ select: false })
  password: string;

  @ApiProperty({ enum: EStatus, example: EStatus.ENABLED })
  @Column({ type: 'smallint', default: EStatus.ENABLED })
  status: EStatus;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
