import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EStatus } from '../utility/common.enum';

export const TABLE_POKEMON = 'pokemon';

@Entity({ name: TABLE_POKEMON })
export class Pokemon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'jsonb', nullable: true })
  types: string[];

  @Column()
  weight: number;

  @Column()
  height: number;

  @Column({ type: 'jsonb', nullable: true })
  abilities: string[];

  @Column()
  species: string;

  @Column({ type: 'jsonb', nullable: true })
  forms: string[];

  @Column({ type: 'smallint', default: EStatus.ENABLED })
  status: EStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
