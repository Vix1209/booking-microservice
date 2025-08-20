import { hash } from 'argon2';
import { User } from '../../users/entities/user.entity';
import {
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  Entity,
  JoinColumn,
  DeleteDateColumn,
  BeforeInsert,
} from 'typeorm';

@Entity('auth')
export class Auth {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  hashedPassword: string;

  @Column({ type: 'varchar', nullable: true })
  hashedRefreshToken: string | null;

  @Column({ type: 'text', array: true, nullable: true, default: '{}' })
  blacklistedTokens: string[] | null;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @OneToOne(() => User, (user) => user.auth, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  user: User;

  @BeforeInsert()
  async hashPassword() {
    this.hashedPassword = await hash(this.hashedPassword);
  }
}
