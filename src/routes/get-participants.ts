import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export async function getParticipants(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/trips/:tripId/participants',
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
        response: {
          200: z.object({
            participants: z.array(
              z.object({
                id: z.string(),
                name: z.string().nullable(),
                email: z.string(),
                isConfirmed: z.boolean(),
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
          participants: {
            select: {
              id: true,
              name: true,
              email: true,
              isConfirmed: true,
            },
          },
        },
      });

      if (!trip) {
        throw new ClientError('Trip not found.');
      }

      return reply.status(200).send({ participants: trip.participants });
    }
  );
}
