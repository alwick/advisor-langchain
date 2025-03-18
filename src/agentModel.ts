import { Command, MessagesAnnotation } from "@langchain/langgraph";
import { z } from "zod";

export const makeAgentNode = (params: {
    model: any,
    name: string,
    destinations: string[],
    systemPrompt: string
  }) => {
    return async (state: typeof MessagesAnnotation.State) => {
      const possibleDestinations = ["__end__", ...params.destinations] as const;
      // define schema for the structured output:
      // - model's text response (`response`)
      // - name of the node to go to next (or '__end__')
      const responseSchema = z.object({
        response: z.string().describe(
          "A human readable response to the original question. Does not need to be a final response. Will be streamed back to the user."
        ),
        goto: z.enum(possibleDestinations).describe("The next agent to call, or __end__ if the user's query has been resolved. Must be one of the specified values."),
      });
      const messages = [
        {
          role: "system",
          content: params.systemPrompt
        },
        ...state.messages,
      ];
      const response = await params.model.withStructuredOutput(responseSchema, {
        name: "router",
      }).invoke(messages);
  
      // handoff to another agent or halt
      const aiMessage = {
        role: "assistant",
        content: response.response,
        name: params.name,
      };
      return new Command({
        goto: response.goto,
        update: { messages: aiMessage }
      });
    }
  };