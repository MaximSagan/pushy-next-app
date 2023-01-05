import { z } from 'zod';
import { procedure, router } from '../trpc';
import webpush from 'web-push';

webpush.setVapidDetails(
    'https://pushy-next-app.vercel.app/',
    process.env.VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string
)

const subs = [];

export const appRouter = router({
  hello: procedure
    .input(
      z.object({
        text: z.string(),
      }),
    )
    .query(({ input }) => {
      return {
        greeting: `hello ${input.text}`,
      };
    }),

    putSub: procedure.input(z.object({
        name: z.string(),
        pushSub: z.any() as z.ZodType<PushSubscriptionJSON>
    })).mutation(async ({ input }) => {
        subs.push(input.pushSub);
        wait(1000);
        try {
            const result = await webpush.sendNotification(input.pushSub as any, 'Yoyoyo');
            return { result };
        } catch (e) {
            return { result: e instanceof Error ? e.message : 'Unknown error' }
        }
        
    })
});
// export type definition of API
export type AppRouter = typeof appRouter;

async function wait(ms: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    })
}