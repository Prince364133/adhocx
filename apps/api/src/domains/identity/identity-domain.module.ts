import { Module } from '@nestjs/common';
import { AuthModule } from '../../modules/auth/auth.module';
import { UsersModule } from '../../modules/users/users.module';

/**
 * Identity Domain (Bounded Context: Identity & Access Management)
 * Encapsulates authentication, corporate SSO, user profiles, and RBAC authorization.
 */
@Module({
  imports: [AuthModule, UsersModule],
  exports: [AuthModule, UsersModule],
})
export class IdentityDomainModule {}

