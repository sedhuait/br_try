import 'dotenv/config';
import {  Mastra } from '@mastra/core';
import { extractorAgent } from './agents/extractor';
import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';
import { createLogger } from '@mastra/core/logger';

export const mastra = new Mastra({
    agents: { 
        extractorAgent
      },
      logger: createLogger({
        name: 'Mastra',
        level: 'info',
      }),
})



export async function processJsonFile() {
    try {

        const filePath = path.resolve('./src/data/synth_data_60_day.json');
        const txt = await fs.readFile(filePath, 'utf-8');
        
        // Read and parse the JSON file
        const jsonData = JSON.parse(txt);
        
        // Process each entry in the JSON file
        for (const entry of jsonData) {
            // Pass the entry to extractorAgent
            const result = await mastra.getAgent('extractorAgent').generate(
               [
                {
                    role: 'user',
                    content: "extract data from following content: " + JSON.stringify(entry, null, 2)
                }
               ],
               {
                output: z.object({
                    projects: z.array(z.object({
                        name: z.string(),
                        owner: z.string(),
                        description: z.string(),
                        goals: z.array(z.string()),
                        timeline: z.object({
                            startDate: z.string(),
                            endDate: z.string()
                        })
                    })),
                    teams: z.array(z.object({
                        name: z.string(),
                        members: z.array(z.object({
                            name: z.string(),
                            role: z.string()
                        })),
                        department: z.string(),
                        objectives: z.array(z.string())
                    })),
                    insights: z.array(z.string()),
                    additionalInfo: z.object({})
                })
            }
               
            );
            console.log(JSON.stringify(result, null, 2));
            break;
        }
    } catch (error) {
        mastra.getLogger().error("Error processing JSON file:", { error });
        throw error;
    }
}

processJsonFile();