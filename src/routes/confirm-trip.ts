import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { env } from '../env';
import { dayjs } from '../lib/dayjs';
import { getMailClient } from '../lib/mail';
import { prisma } from '../lib/prisma';

export async function confirmTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/trips/:tripId/confirm',
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
      },
    },
    async (req, reply) => {
      const { tripId } = req.params;

      const trip = await prisma.trip.findUnique({
        where: {
          id: tripId,
        },
        include: {
          participants: {
            where: { isOwner: false },
            select: { id: true, email: true },
          },
        },
      });

      if (!trip) {
        throw new ClientError('Trip not found.');
      }

      if (trip.isConfirmed) {
        return reply.redirect(`${env.WEB_BASE_URL}/trips/${trip.id}`);
      }

      await prisma.trip.update({
        where: { id: trip.id },
        data: { isConfirmed: true },
      });

      const formattedStartDate = dayjs(trip.startsAt).format('LL');
      const formattedEndDate = dayjs(trip.endsAt).format('LL');

      const mail = await getMailClient();

      await Promise.all(
        trip.participants.map(async (participant) => {
          const confirmationLink = `${env.API_BASE_URL}/participants/${participant.id}/confirm`;

          const message = await mail.sendMail({
            from: { name: 'Equipe plann.er', address: 'oi@plann.er' },
            to: participant.email,
            subject: `Confirme sua presença na viagem para ${trip.destination} em ${formattedStartDate}`,
            html: `
              <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
                <p>Você foi convidado para uma viagem para participar de uma viagem para <strong>${trip.destination}</strong> nas datas de <strong>${formattedStartDate}</strong> até <strong>${formattedEndDate}</strong>.</p>
                <p></p>
                <p>Para confirmar sua presença na viagem, clique no link abaixo:</p>
                <p></p>
                <p>
                  <a href="${confirmationLink}">Confirmar viagem</a>
                </p>
                <p></p>
                <p>Caso você não saiba do que se trata esse e-mail, apenas ignore esse e-mail.</p>
              </div>
            `.trim(),
          });

          console.log(nodemailer.getTestMessageUrl(message));
        })
      );

      return reply.redirect(`${env.WEB_BASE_URL}/trips/${trip.id}`);
    }
  );
}
