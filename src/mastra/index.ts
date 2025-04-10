import "dotenv/config";
import { Mastra } from "@mastra/core";
import { extractorAgent } from "./agents/extractor";
import * as fs from "fs/promises";
import * as path from "path";
import { z } from "zod";
import { createLogger } from "@mastra/core/logger";
import { PineconeVector } from "@mastra/pinecone";
import { MDocument } from "@mastra/rag";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { insightsAgent } from "./agents/insights";

// Constants
const PINECONE_INDEX_NAME = "test-project-data-v2";
const EMBEDDING_DIMENSION = 1536; // text-embedding-3-small dimension

// Initialize Pinecone with proper configuration
const pineconeStore = new PineconeVector(process.env.PINECONE_API_KEY!);

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
    pinecone: pineconeStore,
  },
});

async function deleteIndex(indexName: string) {
  try {
    console.log(`Attempting to delete index: ${indexName}`);
    await pineconeStore.deleteIndex(indexName);
    console.log(`Successfully deleted index: ${indexName}`);
  } catch (error) {
    console.error(`Error deleting index: ${indexName}`, error);
    throw error;
  }
}

async function ensurePineconeIndex() {
  try {
    const indexes = await pineconeStore.listIndexes();
    console.log("Available indexes:", indexes);

    if (!indexes.includes(PINECONE_INDEX_NAME)) {
      console.log(`Creating Pinecone index: ${PINECONE_INDEX_NAME}`);
      await pineconeStore.createIndex({
        indexName: PINECONE_INDEX_NAME,
        dimension: EMBEDDING_DIMENSION, // Using correct dimension for text-embedding-3-small
        metric: "cosine",
      });
      console.log("Index created successfully");
    } else {
      // Check if existing index has correct dimension
      const indexStats = await pineconeStore.describeIndex(PINECONE_INDEX_NAME);
      if (indexStats.dimension !== EMBEDDING_DIMENSION) {
        console.log(
          `Warning: Existing index has dimension ${indexStats.dimension}, but we need ${EMBEDDING_DIMENSION}`
        );
        console.log(
          "Deleting existing index and recreating with correct dimension..."
        );
        await deleteIndex(PINECONE_INDEX_NAME);
        await pineconeStore.createIndex({
          indexName: PINECONE_INDEX_NAME,
          dimension: EMBEDDING_DIMENSION,
          metric: "cosine",
        });
        console.log("Index recreated successfully with correct dimension");
      } else {
        console.log(
          `Index ${PINECONE_INDEX_NAME} already exists with correct dimension`
        );
      }
    }
  } catch (error) {
    mastra
      .getLogger()
      .error("Error ensuring Pinecone index exists:", { error });
    throw error;
  }
}

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
    // Ensure index exists before processing
    // await ensurePineconeIndex();

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

        console.log(
          `Created ${chunks.length} chunks, generating embeddings...`
        );

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
          console.log(
            `Generated ${embeddings.length} embeddings, uploading to Pinecone...`
          );

          // Store chunks in Pinecone
          await pineconeStore.upsert({
            indexName: PINECONE_INDEX_NAME,
            vectors: embeddings,
            metadata: chunks.map((chunk) => ({
              text: chunk.text,
              summary: chunk.metadata?.sectionSummary,
              keywords: chunk.metadata?.keywords,
              title: chunk.metadata?.documentTitle,
            })),
          });

          console.log(
            `Successfully stored ${chunks.length} chunks in Pinecone`
          );
        }
      }
    }
  } catch (error) {
    mastra.getLogger().error("Error processing JSON file:", { error });
    throw error;
  }
}

// processRag();
// processJsonFile();
