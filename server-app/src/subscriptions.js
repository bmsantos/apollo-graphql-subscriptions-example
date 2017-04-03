import {PubSub, SubscriptionManager} from "graphql-subscriptions";
import {makeExecutableSchema} from "graphql-tools";

const pubsub = new PubSub();

// The DB
const messages = [];

const typeDefs = `
type Query {
  messages: [String!]!
}
type Mutation {
  addMessage(message: String!): [String!]!
}
type Subscription {
  newMessage(userId: Int!): String!
}
`;

const resolvers = {
  Query: {
    messages(root, {}, context) {
      return messages;
    }
  },
  Mutation: {
    addMessage(root, {message}, context) {
      let entry = JSON.stringify({id: messages.length, message: message});
      messages.push(entry);
      pubsub.publish('newMessage', { entry: entry, serverUserId: context.serverUserId } );
      return messages;
    },
  },
  Subscription: {
    newMessage(message, variables, context, subscription) {
      return message.entry;
    }
  },
};

const destinationFilter = (options, { filter }, subscriptionName) => ({
  // PubSub channel name (newMessage)
  ['newMessage']: {
    filter: (payload, context) => {
      if (payload.serverUserId === context.clientUserId) {
        return payload.entry;
      }
      return null;
    }
  },
});

const setupFunctions = {
  // The name of the subscription in our schema
  newMessage: destinationFilter,
};

const schema = makeExecutableSchema({typeDefs, resolvers});
const subscriptionManager = new SubscriptionManager({schema, pubsub, setupFunctions});

export {subscriptionManager, pubsub, schema, resolvers};