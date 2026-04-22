import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database';
import { env } from '../../config/env';
import { SignupInput, LoginInput } from './auth.schema';
import { AuthPayload } from '../../types';

export const signup = async (input: SignupInput) => {
  const existing = await prisma.healthWorker.findUnique({ where: { email: input.email } });
  if (existing) throw new Error('Email already registered');

  const passwordHash = await bcrypt.hash(input.password, 12);

  const worker = await prisma.healthWorker.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      phone: input.phone,
      role: input.role as 'admin' | 'health_worker',
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  const token = signToken({ id: worker.id, email: worker.email, role: worker.role as 'admin' | 'health_worker' });
  return { worker, token };
};

export const login = async (input: LoginInput) => {
  const worker = await prisma.healthWorker.findUnique({ where: { email: input.email } });
  if (!worker || !worker.isActive) throw new Error('Invalid credentials');

  const valid = await bcrypt.compare(input.password, worker.passwordHash);
  if (!valid) throw new Error('Invalid credentials');

  const token = signToken({ id: worker.id, email: worker.email, role: worker.role as 'admin' | 'health_worker' });
  const { passwordHash: _, ...safeWorker } = worker;
  return { worker: safeWorker, token };
};

const signToken = (payload: AuthPayload): string =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
