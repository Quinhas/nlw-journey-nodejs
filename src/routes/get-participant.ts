import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ClientError } from '../errors/client-error';
import { prisma } from '../lib/prisma';

export async function getParticipant(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/trips/:tripId/participants/:participantId',
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
          participantId: z.string().uuid(),
        }),
        response: {
          200: z.object({
            participant: z.object({
              id: z.string(),
              name: z.string().nullable(),
              email: z.string(),
              isConfirmed: z.boolean(),
            }),
          }),
        },
      },
    },
    async (req, reply) => {
      const { tripId, participantId } = req.params;

      const participant = await prisma.participant.findUnique({
        where: { id: participantId, tripId: tripId },
        select: {
          id: true,
          name: true,
          email: true,
          isConfirmed: true,
        },
      });

      if (!participant) {
        throw new ClientError('Participant not found.');
      }

      return reply.status(200).send({ participant });
    }
  );
}
