import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { dayjs } from '../lib/dayjs';
import { prisma } from '../lib/prisma';

export async function getActivities(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/trips/:tripId/activities',
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
        response: {
          200: z.object({
            activities: z.array(
              z.object({
                date: z.date(),
                activities: z.array(
                  z.object({
                    id: z.string().uuid(),
                    title: z.string(),
                    occursAt: z.date(),
                  })
                ),
              })
            ),
          }),
        },
      },
    },
    async (req, reply) => {
      const { tripId } = req.params;

      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: {
          activities: {
            select: { id: true, title: true, occursAt: true },
            orderBy: { occursAt: 'asc' },
          },
        },
      });

      if (!trip) {
        throw new ClientError('Trip not found.');
      }

      const differenceInDaysBetweenTripStartAndEnd = dayjs(trip.endsAt).diff(
        trip.startsAt,
        'days'
      );

      const activities = Array.from({
        length: differenceInDaysBetweenTripStartAndEnd + 1,
      }).map((_, index) => {
        const date = dayjs(trip.startsAt).add(index, 'days');

        return {
          date: date.toDate(),
          activities: trip.activities.filter((activity) => {
            return dayjs(activity.occursAt).isSame(date, 'day');
          }),
        };
      });

      return reply.status(200).send({ activities });
    }
  );
}
