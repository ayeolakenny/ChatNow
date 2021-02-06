import Express from "express";
import cors from "cors";
import { PubSub, GraphQLServer } from "graphql-yoga";
import path from "path";
import fs from "fs";

(async () => {
  const messages: Object[] = [];

  const subscribers: Function[] = [];
  const onMessagesUpdate = (fn: Function) => subscribers.push(fn);

  interface Options {
    user: String;
    content: String;
  }

  const resolvers = {
    Query: {
      messages: (): Object[] => messages,
    },

    Mutation: {
      postMessage: (_: any, { user, content }: Options): Number => {
        const id: Number = messages.length;
        messages.push({
          id,
          user,
          content,
        });
        subscribers.forEach((fn: Function) => fn());
        return id;
      },
    },

    Subscription: {
      messages: {
        subscribe: (_parent: any, _args: any, { pubsub }: any) => {
          const channel = Math.random().toString(36).slice(2, 15);
          onMessagesUpdate(() => pubsub.publish(channel, { messages }));
          setTimeout(() => pubsub.publish(channel, { messages }), 0);
          return pubsub.asyncIterator(channel);
        },
      },
    },
  };

  const pubsub = new PubSub();

  const server = new GraphQLServer({
    typeDefs: fs.readFileSync(path.join(__dirname, "schema.graphql"), "utf8"),
    resolvers,
    context: { pubsub },
  });

  const app = Express();
  app.use(
    cors({
      credentials: true,
      origin: "http://localhost:3000",
    })
  );

  server.start(({ port }) => console.log(`Server has started at port ${port}`));
})();
