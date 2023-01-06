import { z } from "zod";
import { procedure, router } from "../trpc";
import webpush from "web-push";

try {
  webpush.setVapidDetails(
    "https://pushy-next-app.vercel.app/",
    process.env.VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string
  );
} catch (e) {
  console.error("Failed to set vapid details for web-push", e);
}

const pushUsers = new Map<string, PushSubscriptionJSON>();

export const appRouter = router({
  hello: procedure
    .input(
      z.object({
        text: z.string(),
      })
    )
    .query(({ input }) => {
      return {
        greeting: `hello ${input.text}`,
      };
    }),

  putSub: procedure
    .input(
      z.object({
        name: z.string(),
        pushSub: z.any() as z.ZodType<PushSubscriptionJSON>,
      })
    )
    .mutation(({ input }) => {
      pushUsers.forEach((existingSub, existingSubUserName) => {
        if (existingSub.endpoint === input.pushSub.endpoint) {
          // Get rid of any subs with same endpoint so we don't end up with the same endpoint listed twice for two different users
          pushUsers.delete(existingSubUserName);
        }
      });
      pushUsers.set(input.name, input.pushSub);
      return { message: "Registered sub" };
    }),

  postNotification: procedure
    .input(
      z.object({
        content: z.string(),
        countdownSec: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const { content, countdownSec } = input;
      await wait(countdownSec * 1000);

      const notification: NotificationOptions & { title: string } = {
        title: "Hey hey",
        body: content,
      };

      const results: { [name: string]: any } = {};
      for (const [userName, pushSub] of pushUsers.entries()) {
        try {
          const result = await webpush.sendNotification(
            pushSub as any,
            JSON.stringify({ notification })
          );
          results[userName] = result;
        } catch (e) {
          results[userName] = e instanceof Error ? e.message : "Unknown error";
        }
      }
      return { results };
    }),
});
// export type definition of API
export type AppRouter = typeof appRouter;

async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
