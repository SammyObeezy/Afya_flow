import { randomBytes } from 'crypto';

export const generatePatientCode = (): string => {
  const prefix = 'CHW';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};
