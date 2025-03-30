// import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { makeAgentNode } from "./agentModel.js";
import {
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";

const { openaiKey } = process.env;
let SINGLETON_GRAPH: any;

// export const model = new ChatOpenAI({
//     model: "o3-mini",
//     apiKey: openaiKey,
//     temperature: 0.1,
//   });

export const model = new ChatOllama({
  model: "llama3.2",
  temperature: 0.1,
});

export const getGraph = () => {
  if (!SINGLETON_GRAPH) {
    const travelAdvisor = makeAgentNode({
      model,
      name: "travel_advisor",
      destinations: ["sightseeing_advisor", "hotel_advisor"],
      systemPrompt: [
        "You are a travel expert that can recommend travel destinations (e.g. countries, cities, etc). ",
        "If you need specific sightseeing recommendations, ask 'sightseeing_advisor' for help. ",
        "If you need hotel recommendations, ask 'hotel_advisor' for help. ",
        "If you have enough information to respond to the user, return '__end__'. ",
        "Never mention other agents by name.",
      ].join(""),
    });

    const sightseeingAdvisor = makeAgentNode({
      model,
      name: "sightseeing_advisor",
      destinations: ["travel_advisor", "hotel_advisor"],
      systemPrompt: [
        "You are a travel expert that can provide specific sightseeing recommendations for a given destination. ",
        "If you need general travel help, go to 'travel_advisor' for help. ",
        "If you need hotel recommendations, go to 'hotel_advisor' for help. ",
        "If you have enough information to respond to the user, return 'finish'. ",
        "Never mention other agents by name.",
      ].join(""),
    });

    const hotelAdvisor = makeAgentNode({
      model,
      name: "hotel_advisor",
      destinations: ["travel_advisor", "sightseeing_advisor"],
      systemPrompt: [
        "You are a booking expert that provides hotel recommendations for a given destination. ",
        "If you need general travel help, ask 'travel_advisor' for help. ",
        "If you need specific sightseeing recommendations, ask 'sightseeing_advisor' for help. ",
        "If you have enough information to respond to the user, return 'finish'. ",
        "Never mention other agents by name.",
      ].join(""),
    });

    SINGLETON_GRAPH = new StateGraph(MessagesAnnotation)
      .addNode("travel_advisor", travelAdvisor, {
        ends: ["sightseeing_advisor", "hotel_advisor", "__end__"],
      })
      .addNode("sightseeing_advisor", sightseeingAdvisor, {
        ends: ["travel_advisor", "hotel_advisor", "__end__"],
      })
      .addNode("hotel_advisor", hotelAdvisor, {
        ends: ["travel_advisor", "sightseeing_advisor", "__end__"],
      })
      // we'll always start with a general travel advisor
      .addEdge("__start__", "travel_advisor")
      .compile();
  }
  return SINGLETON_GRAPH;
};

export const askQuestion = async (question: string) => {
  const graph = getGraph();

  try {
    const recommendationStream = await graph.stream({
      messages: [
        {
          role: "user",
          content: question,
        },
      ],
    });

    const response: string[] = [];
    for await (const chunk of recommendationStream) {
      response.push(chunk);
    }

    return response[0] || "Response not found...";
  } catch (error) {
    console.log("Error: ", error);
    throw error;
  }
};
