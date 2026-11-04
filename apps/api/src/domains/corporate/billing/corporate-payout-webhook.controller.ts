import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CorporatePayoutService, PAYOUT_SIGNATURE_HEADER } from './corporate-payout.service';

/**
 * Payout provider confirmations. Deliberately has NO JWT / role guards: the caller is the payout
 * provider, authenticated by an HMAC-SHA256 signature of the raw request body with
 * CORPORATE_PAYOUT_WEBHOOK_SECRET (timing-safe compare; bad or missing signature -> 401).
 * Replayed event ids are acknowledged and ignored. This is the ONLY path that marks a payout PAID.
 */
@ApiTags('Corporate ETS - Payout Provider Callback')
@Controller('corporate/billing')
export class CorporatePayoutWebhookController {
  constructor(private readonly payouts: CorporatePayoutService) {}

  @Post('payouts/provider-callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Signed payout provider confirmation (PAID / FAILED / REVERSED)' })
  @ApiHeader({ name: PAYOUT_SIGNATURE_HEADER, description: 'hex HMAC-SHA256(rawBody, CORPORATE_PAYOUT_WEBHOOK_SECRET)' })
  @ApiResponse({ status: 200, description: 'Accepted (or replay ignored)' })
  @ApiResponse({ status: 401, description: 'Missing or invalid signature' })
  public async providerCallback(
    @Req() req: any,
    @Body() body: any,
    @Headers(PAYOUT_SIGNATURE_HEADER) signature?: string,
  ) {
    // main.ts enables rawBody so the signature is checked over the exact bytes the provider sent.
    const raw: Buffer | string = req?.rawBody ?? JSON.stringify(body ?? {});
    return this.payouts.handleProviderCallback(raw, signature, body);
  }
}
