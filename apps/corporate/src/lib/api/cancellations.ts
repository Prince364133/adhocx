import { tripsApi } from './corporate';
import type { BookingQueueResponse } from './types';

export const cancellationsApi = {
  list(
    tenantId: string,
    params: { page?: number; limit?: number; search?: string } = {},
  ): Promise<BookingQueueResponse> {
    return tripsApi.requests({ tenantId, status: 'CANCELLED', ...params });
  },
};
