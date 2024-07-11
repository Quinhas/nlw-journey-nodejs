import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { ClientError } from './errors/client-error';

type FastifyErrorHandler = FastifyInstance['errorHandler'];

export const errorHandler: FastifyErrorHandler = (error, request, reply) => {
  if (error instanceof ClientError) {
    return reply.status(400).send({
      message: error.message,
    });
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: error.errors[0].message,
    });
  }

  return reply.status(500).send({
    message: error.message,
  });
};
