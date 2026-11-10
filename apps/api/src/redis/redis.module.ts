import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisPubSubService } from './redis-pubsub.service';
import { StreamTicketService } from './stream-ticket.service';

@Global()
@Module({
  providers: [RedisService, RedisPubSubService, StreamTicketService],
  exports: [RedisService, RedisPubSubService, StreamTicketService],
})
export class RedisModule {}
