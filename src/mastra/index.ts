
import { createLogger, Mastra } from '@mastra/core';
import { extractorAgent } from './agents/extractor';
import * as fs from 'fs/promises';
import * as path from 'path';

export const mastra = new Mastra({
    agents: { 
        extractorAgent
      },
      logger: createLogger({
        name: 'Mastra',
        level: 'debug',
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
                    content: entry
                }
               ]
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