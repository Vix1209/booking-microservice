import { Auth } from '../../auth/entities/auth.entity';

import { Exclude } from 'class-transformer';
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from 'types/role.types';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, type: 'varchar' })
  firstName: string;

  @Column({ nullable: true, type: 'varchar' })
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true, type: 'varchar' })
  phone: string | null;

  @Column({ default: 'active' })
  status: 'active' | 'suspended' | 'deleted';

  @Column({ type: 'enum', enum: Role, default: Role.ADMIN })
  role: Role;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updatedAt: Date;

  @OneToOne(() => Auth, (auth) => auth.user, {
    cascade: ['insert', 'update', 'remove'],
    eager: false,
  })
  @Exclude()
  auth?: Auth;
}
