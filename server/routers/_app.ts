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

type UserPushSub = {
  name: string;
  pushSub: PushSubscriptionJSON;
};

let pushUsers: UserPushSub[] = [];

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
      // Get rid of any subs with same name or endpoint
      pushUsers = pushUsers.filter(
        (existingSub) =>
          existingSub.name !== input.name &&
          existingSub.pushSub.endpoint !== input.pushSub.endpoint
      );
      pushUsers.push({ name: input.name, pushSub: input.pushSub });
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

      const results: { [name: string]: any } = {};
      for (const pushUser of pushUsers) {
        try {
          const result = await webpush.sendNotification(
            pushUser.pushSub as any,
            content
          );
          results[pushUser.name] = result;
        } catch (e) {
          results[pushUser.name] =
            e instanceof Error ? e.message : "Unknown error";
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
