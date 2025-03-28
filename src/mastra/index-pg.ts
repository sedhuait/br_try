import "dotenv/config";
import { Mastra } from "@mastra/core";
import { extractorAgent } from "./agents/extractor";
import * as fs from "fs/promises";
import * as path from "path";
import { z } from "zod";
import { createLogger } from "@mastra/core/logger";
import { MDocument } from "@mastra/rag";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { insightsAgent } from "./agents/insights";
import { PgVector } from "@mastra/pg";

// Constants
const PG_CONNECTION_STRING = 'postgresql://postgres:postgres@localhost:5432/mydb';

// Initialize PostgreSQL store
const pgStore = new PgVector(PG_CONNECTION_STRING);

// Initialize Mastra with the PostgreSQL store
export const mastra = new Mastra({
  agents: {
    extractorAgent,
    insightsAgent,
  },
  logger: createLogger({
    name: "Mastra",
    level: "debug",
  }),
  vectors: {
    postgres: pgStore,
  },
});

export async function processJsonFile() {
  try {
    const filePath = path.resolve("./src/data/synth_data_60_day_full.json");
    const txt = await fs.readFile(filePath, "utf-8");

    // Read and parse the JSON file
    const jsonData = JSON.parse(txt);

    // Process each entry in the JSON file
    for (const entry of jsonData) {
      // Pass the entry to extractorAgent
      const result = await mastra.getAgent("extractorAgent").generate(
        [
          {
            role: "user",
            content: `Here is the data: ${JSON.stringify(entry)}`,
          },
        ],
        {
          output: z.object({
            transformedInput: z.array(
              z.object({
                rawInput: z.any(),
                extractedFields: z.object({
                  project: z.string(),
                  team: z.string(),
                  department: z.string(),
                  members: z.array(z.string()),
                  insights: z.array(z.string()),
                  additionalInfo: z.object({}),
                }),
              })
            ),
            fullSummary: z.object({
              projects: z.array(
                z.object({
                  name: z.string(),
                  owner: z.string(),
                  description: z.string(),
                  goals: z.array(z.string()),
                  timeline: z.object({
                    startDate: z.string(),
                    endDate: z.string(),
                  }),
                })
              ),
              teams: z.array(
                z.object({
                  name: z.string(),
                  members: z.array(
                    z.object({
                      name: z.string(),
                      role: z.string(),
                    })
                  ),
                  department: z.string(),
                  objectives: z.array(z.string()),
                })
              ),
              insights: z.array(z.string()),
              additionalInfo: z.object({}),
            }),
          }),
        }
      );
      console.log(JSON.stringify(result.response, null, 2));
      break;
    }
  } catch (error) {
    mastra.getLogger().error("Error processing JSON file:", { error });
    throw error;
  }
}

export async function processRag() {
  try {
    // Create index if it doesn't exist
    await pgStore.createIndex({
      indexName: "embeddings",
      dimension: 1536, // For text-embedding-3-small
    });

    const filePath = path.resolve("./src/data/synth_data_60_day_full.json");
    const txt = await fs.readFile(filePath, "utf-8");

    const jsonData = JSON.parse(txt);

    for (let i = 4; i < jsonData.length; i++) {
      const entry = jsonData[i];
      for (let j = 0; j < entry.length; j++) {
        console.log("processing entry", i, j);
        const subEntry = entry[j];
        const doc = MDocument.fromJSON(JSON.stringify(subEntry));

        const chunks = await doc.chunk({
          strategy: "json",
          maxSize: 1000,
          minSize: 100,
          ensureAscii: true,
          extract: {
            summary: true,
            questions: true,
            keywords: true,
            title: true,
          },
        });

        console.log(`Created ${chunks.length} chunks, generating embeddings...`);

        // Create embeddings for each chunk
        const embeddingPromises = chunks.map(async (chunk) => {
          const result = await embed({
            model: openai.embedding("text-embedding-3-small"),
            value: chunk.text,
          });
          return result.embedding;
        });

        // batch to 50 each
        const batchSize = 10;
        const batches = [];
        for (let i = 0; i < embeddingPromises.length; i += batchSize) {
          batches.push(embeddingPromises.slice(i, i + batchSize));
        }

        for (const batch of batches) {
          const embeddings = await Promise.all(batch);
          console.log(`Generated ${embeddings.length} embeddings, uploading to PostgreSQL...`);

          // Store chunks in PostgreSQL
          await pgStore.upsert({
            indexName: "embeddings",
            vectors: embeddings,
            metadata: chunks.map((chunk) => ({
              text: chunk.text,
              summary: chunk.metadata?.sectionSummary,
              keywords: chunk.metadata?.keywords,
              title: chunk.metadata?.documentTitle,
            })),
          });

          console.log(`Successfully stored ${chunks.length} chunks in PostgreSQL`);
        }
      }
    }
  } catch (error) {
    mastra.getLogger().error("Error processing JSON file:", { error });
    throw error;
  }
}

processRag();
// processJsonFile();