import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { dayjs } from '../lib/dayjs';
import { prisma } from '../lib/prisma';

export async function createActivity(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/trips/:tripId/activities',
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
        body: z.object({
          title: z.string().min(4),
          occurs_at: z.coerce.date(),
        }),
        response: {
          201: z.object({
            id: z.string().uuid(),
          }),
        },
      },
    },
    async (req, reply) => {
      const { tripId } = req.params;
      const { title, occurs_at } = req.body;

      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
      });

      if (!trip) {
        throw new ClientError('Trip not found.');
      }

      if (dayjs(occurs_at).isBefore(trip.startsAt)) {
        throw new ClientError('Invalid activity date.');
      }

      if (dayjs(occurs_at).isAfter(trip.endsAt)) {
        throw new ClientError('Invalid activity date.');
      }

      const activity = await prisma.activity.create({
        data: {
          title,
          occursAt: occurs_at,
          tripId: trip.id,
        },
      });

      return reply.status(201).send({ id: activity.id });
    }
  );
}
