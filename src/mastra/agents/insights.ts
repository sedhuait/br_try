// import { deepseek } from "@ai-sdk/deepseek";
// import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { createVectorQueryTool, PINECONE_PROMPT } from "@mastra/rag";
import { z } from "zod";

const PINECONE_INDEX_NAME = "test-project-data-v2";
const vectorQueryTool = createVectorQueryTool({
    vectorStoreName: 'pinecone',
    indexName: PINECONE_INDEX_NAME,
    model: openai.embedding('text-embedding-3-small'),
  });

export const insightsAgent = new Agent({
    name: 'Insights Agent',
    instructions: `
        You are a helpful data insights agent from pincone vector database.
  
        Process queries using the provided context. Structure responses to be concise and relevant.
        ${PINECONE_PROMPT}
  `,
  model: openai('gpt-4o-mini'),
    // model: anthropic('claude-3-5-sonnet-20241022'),
    // model: deepseek('deepseek-chat'),
    memory: new Memory({
        options: {
          workingMemory: {
            enabled: true,
          },
          lastMessages: 500000000000,
        },
    }),
    tools: {vectorQueryTool}
});
  