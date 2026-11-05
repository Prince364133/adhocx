import { PhoneNumber } from '../src/auth/value-objects/phone-number.vo';
import { UserSession } from '../src/auth/aggregates/user-session.aggregate';
import { NotificationDispatch } from '../src/notification/aggregates/notification-dispatch.aggregate';
import { NotificationChannel } from '../src/notification/enums/notification-channel.enum';

describe('Auth & Notification Domains (DDD)', () => {
  describe('PhoneNumber Value Object', () => {
    it('should format 10-digit Indian numbers with +91 by default', () => {
      const result = PhoneNumber.create('9876543210');
      expect(result.isSuccess).toBe(true);
      const phone = result.getValue();
      expect(phone.countryCode).toBe('+91');
      expect(phone.nationalNumber).toBe('9876543210');
      expect(phone.e164).toBe('+919876543210');
      expect(phone.msg91Format).toBe('919876543210');
    });

    it('should handle custom country code and phone', () => {
      const result = PhoneNumber.create('9876543210', '+91');
      expect(result.isSuccess).toBe(true);
      const phone = result.getValue();
      expect(phone.countryCode).toBe('+91');
      expect(phone.e164).toBe('+919876543210');
      expect(phone.msg91Format).toBe('919876543210');
    });

    it('should handle international numbers like US (+1)', () => {
      const result = PhoneNumber.create('4155552671', '+1');
      expect(result.isSuccess).toBe(true);
      const phone = result.getValue();
      expect(phone.countryCode).toBe('+1');
      expect(phone.nationalNumber).toBe('4155552671');
      expect(phone.e164).toBe('+14155552671');
      expect(phone.msg91Format).toBe('14155552671');
    });

    it('should reject invalid or short phone numbers', () => {
      const result = PhoneNumber.create('123');
      expect(result.isFailure).toBe(true);
    });
  });

  describe('UserSession Aggregate', () => {
    it('should create an active user session and record domain event', () => {
      const phone = PhoneNumber.create('9876543210').getValue();
      const expiresAt = new Date(Date.now() + 3600 * 1000);

      const sessionResult = UserSession.create('sess-1', {
        userId: 'usr-1',
        role: 'DRIVER',
        authChannel: 'SMS',
        sessionToken: 'jwt-access-token-123',
        refreshToken: 'jwt-refresh-token-456',
        phone,
        expiresAt,
        ipAddress: '202.133.61.131',
      });

      expect(sessionResult.isSuccess).toBe(true);
      const session = sessionResult.getValue();
      expect(session.isValid()).toBe(true);
      expect(session.authChannel).toBe('SMS');
      expect(session.phone?.e164).toBe('+919876543210');
      expect(session.domainEvents.length).toBe(1);
      expect(session.domainEvents[0].eventName).toBe('Auth.UserSessionCreated');
    });

    it('should revoke a session cleanly', () => {
      const expiresAt = new Date(Date.now() + 3600 * 1000);
      const session = UserSession.create('sess-2', {
        userId: 'usr-2',
        role: 'EMPLOYEE',
        authChannel: 'SMS',
        sessionToken: 'jwt-token',
        expiresAt,
      }).getValue();

      expect(session.isValid()).toBe(true);
      session.revoke('User initiated logout');
      expect(session.isValid()).toBe(false);
      expect(session.status).toBe('REVOKED');
    });
  });

  describe('NotificationDispatch Aggregate', () => {
    it('should queue and mark SMS dispatch as sent', () => {
      const dispatch = NotificationDispatch.create('notif-1', {
        recipient: '919876543210',
        channel: NotificationChannel.SMS,
        body: 'Your AdhocX login OTP is 582910',
        templateId: '6aec3196704f112ad8019976',
        variables: { num: '582910' },
      }).getValue();

      expect(dispatch.status).toBe('QUEUED');
      expect(dispatch.channel).toBe(NotificationChannel.SMS);

      dispatch.markSent('msg91_msg_12345');
      expect(dispatch.status).toBe('SENT');
      expect(dispatch.messageId).toBe('msg91_msg_12345');
      expect(dispatch.domainEvents.length).toBe(1);
      expect(dispatch.domainEvents[0].eventName).toBe('Notification.Dispatched');
    });
  });
});
