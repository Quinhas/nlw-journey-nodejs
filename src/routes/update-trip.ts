import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ClientError } from '../errors/client-error';
import { dayjs } from '../lib/dayjs';
import { prisma } from '../lib/prisma';

export async function updateTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().put(
    '/trips/:tripId',
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
        body: z.object({
          destination: z.string().min(4),
          starts_at: z.coerce.date(),
          ends_at: z.coerce.date(),
        }),
        response: {
          200: z.object({
            id: z.string().uuid(),
          }),
        },
      },
    },
    async (req, reply) => {
      const { tripId } = req.params;
      const { destination, starts_at, ends_at } = req.body;

      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
      });

      if (!trip) {
        throw new ClientError('Trip not found.');
      }

      if (dayjs(starts_at).isBefore(new Date())) {
        throw new ClientError('Invalid trip start date.');
      }

      if (dayjs(ends_at).isBefore(starts_at)) {
        throw new ClientError('Invalid trip end date.');
      }

      await prisma.trip.update({
        where: { id: trip.id },
        data: {
          destination,
          startsAt: starts_at,
          endsAt: ends_at,
        },
      });

      return reply.status(200).send({ id: trip.id });
    }
  );
}
