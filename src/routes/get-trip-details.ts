import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ClientError } from '../errors/client-error';
import { prisma } from '../lib/prisma';

export async function getTripDetails(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/trips/:tripId',
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
        response: {
          200: z.object({
            trip: z.object({
              id: z.string().uuid(),
              destination: z.string(),
              startsAt: z.date(),
              endsAt: z.date(),
              isConfirmed: z.boolean(),
            }),
          }),
        },
      },
    },
    async (req, reply) => {
      const { tripId } = req.params;

      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        select: {
          id: true,
          destination: true,
          startsAt: true,
          endsAt: true,
          isConfirmed: true,
        },
      });

      if (!trip) {
        throw new ClientError('Trip not found.');
      }

      return reply.status(200).send({ trip });
    }
  );
}
