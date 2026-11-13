import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Msg91Service } from '../src/modules/notifications/msg91.service';

describe('Msg91Service', () => {
  // fetch is mocked in every live-path test below, so opt in to the HTTP path under NODE_ENV=test.
  beforeAll(() => { process.env.MSG91_SEND_IN_TEST = 'true'; });
  afterAll(() => { delete process.env.MSG91_SEND_IN_TEST; });
  afterEach(() => jest.restoreAllMocks());

  let service: Msg91Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Msg91Service,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'MSG91_AUTH_KEY') return 'test_msg91_auth_key_12345';
              if (key === 'MSG91_OTP_TEMPLATE_ID') return '6aec3196704f112ad8019976';
              if (key === 'MSG91_SENDER_ID') return 'ADHOCX';
              if (key === 'MSG91_ENABLED') return 'true';
              return defaultValue ?? '';
            }),
          },
        },
      ],
    }).compile();

    service = module.get<Msg91Service>(Msg91Service);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Phone Number Normalization', () => {
    it('should format 10-digit Indian numbers with 91 prefix', () => {
      expect(service.normalizePhone('9876543210')).toBe('919876543210');
      expect(service.normalizePhone(' 9876543210 ')).toBe('919876543210');
      expect(service.normalizePhone('98765-43210')).toBe('919876543210');
    });

    it('should handle +91 prefix and strip plus', () => {
      expect(service.normalizePhone('+919876543210')).toBe('919876543210');
      expect(service.normalizePhone('+91 98765 43210')).toBe('919876543210');
    });

    it('should strip leading 0 from 11-digit numbers', () => {
      expect(service.normalizePhone('09876543210')).toBe('919876543210');
    });

    it('should preserve international numbers without plus', () => {
      expect(service.normalizePhone('+14155552671')).toBe('14155552671');
    });
  });

  describe('Simulated Dispatch', () => {
    it('should simulate SMS dispatch when AuthKey is not configured', async () => {
      jest.spyOn(service, 'isConfigured').mockReturnValue(false);

      const result = await service.sendOtp('9876543210', '123456');

      expect(result.success).toBe(true);
      expect(result.simulated).toBe(true);
      expect(result.messageId).toContain('msg91_sim_');
    });
  });

  describe('Live Flow API Dispatch', () => {
    it('should dispatch to MSG91 Flow API with template variables', async () => {
      const mockFetch = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          message: '3362796e6c6b383437343431',
          type: 'success',
        }),
      } as any);

      const result = await service.sendOtp('+919876543210', '482910');

      expect(result.success).toBe(true);
      expect(result.simulated).toBe(false);
      expect(result.messageId).toBe('3362796e6c6b383437343431');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://control.msg91.com/api/v5/flow/',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            authkey: 'test_msg91_auth_key_12345',
            'content-type': 'application/json',
          }),
          body: JSON.stringify({
            template_id: '6aec3196704f112ad8019976',
            short_url: '0',
            sender: 'ADHOCX',
            recipients: [
              {
                mobiles: '919876543210',
                num: '482910',
                otp: '482910',
                code: '482910',
              },
            ],
          }),
        }),
      );
    });

    it('should handle MSG91 API error responses cleanly without throwing', async () => {
      jest.spyOn(global, 'fetch' as any).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          message: 'IP is not whitelisted',
          type: 'error',
        }),
      } as any);

      const result = await service.sendOtp('9876543210', '482910');

      expect(result.success).toBe(false);
      expect(result.simulated).toBe(false);
      expect(result.error).toBe('IP is not whitelisted');
    });

    it('should catch network exceptions gracefully', async () => {
      jest.spyOn(global, 'fetch' as any).mockRejectedValue(new Error('Connection timed out'));

      const result = await service.sendOtp('9876543210', '482910');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection timed out');
    });
  });
});

describe('Msg91Service test-mode guard (never send real SMS from tests)', () => {
  it('reports not configured under NODE_ENV=test even with a real-looking key, unless a test opts in', async () => {
    const saved = { key: process.env.MSG91_AUTH_KEY, optIn: process.env.MSG91_SEND_IN_TEST };
    process.env.MSG91_AUTH_KEY = 'looks-like-a-live-key';
    delete process.env.MSG91_SEND_IN_TEST;
    const fetchSpy = jest.spyOn(global, 'fetch' as any);
    try {
      const svc = new Msg91Service({ get: (k: string, d?: string) => process.env[k] ?? d } as any);
      expect(process.env.NODE_ENV).toBe('test');
      expect(svc.isConfigured()).toBe(false);
      const res = await svc.sendOtp('+919876543210', '123456');
      expect(res.simulated).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
      process.env.MSG91_AUTH_KEY = saved.key ?? '';
      if (saved.optIn !== undefined) process.env.MSG91_SEND_IN_TEST = saved.optIn;
    }
  });
});
