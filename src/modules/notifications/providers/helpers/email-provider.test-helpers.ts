import { EmailProvider } from '../email.provider';
import { NotificationStatus } from '../../enums';

/**
 * Expectativa para validar resultado exitoso de email
 */
export function expectSuccessfulEmail(result: {
  success: boolean;
  messageId?: string;
  status?: string;
  sentAt?: Date;
}): void {
  expect(result.success).toBe(true);
  expect(result.messageId).toBeDefined();
  expect(result.messageId).toMatch(/^email-/);
  expect(result.status).toBe(NotificationStatus.SENT);
  expect(result.sentAt).toBeDefined();
}

/**
 * Expectativa para validar resultado fallido de email
 */
export function expectFailedEmail(
  result: { success: boolean; error?: string; status?: string; sentAt?: Date },
  expectedStatus?: NotificationStatus,
): void {
  expect(result.success).toBe(false);
  expect(result.error).toBeDefined();
  expect(result.error).toBeTruthy();
  if (expectedStatus) {
    expect(result.status).toBe(expectedStatus);
  }
  expect(result.sentAt).toBeUndefined();
}

/**
 * Expectativa para validar estructura de resultado
 */
export function expectValidEmailResult(result: { success: boolean; status?: string }): void {
  expect(result).toBeDefined();
  expect(result.success).toBeDefined();
  expect(result.status).toBeDefined();
}

/**
 * Datos de prueba para attachments
 */
export function createMockAttachment(filename: string = 'test.pdf'): {
  filename: string;
  content: string;
} {
  return {
    filename,
    content: `fake ${filename} content`,
  };
}

/**
 * Intentar obtener un resultado fallido (para tests de errores)
 */
export async function getFailedEmailResult(
  provider: EmailProvider,
  maxAttempts: number = 50,
): Promise<{ success: boolean; error?: string; status?: string } | null> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const result = await provider.send(
      `test${attempts}@example.com`,
      'Test Subject',
      '<p>Test Content</p>',
    );

    if (!result.success) {
      return result;
    }

    attempts++;
  }

  return null;
}
