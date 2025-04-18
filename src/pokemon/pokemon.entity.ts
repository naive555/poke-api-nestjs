import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EStatus } from '../utility/common.enum';

export const TABLE_POKEMON = 'pokemon';

@Entity()
export class Pokemon {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  types: string;

  @Column()
  weight: number;

  @Column()
  height: number;

  @Column({ type: 'text', nullable: true })
  abilities: string;

  @Column()
  species: string;

  @Column({ type: 'text', nullable: true })
  forms: string;

  @Column({ default: EStatus.ENABLED })
  status: EStatus;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
  })
  updatedAt: Date;
}
