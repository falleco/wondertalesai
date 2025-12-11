import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('twoFactor')
export class TwoFactor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { name: 'secret' })
  secret!: string;

  @Column('text', { name: 'backup_codes' })
  backupCodes!: string;

  @Column('text', { name: 'user_id' })
  userId!: string;
}
