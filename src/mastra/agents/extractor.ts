import { anthropic } from "@ai-sdk/anthropic";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";

export const extractorAgent = new Agent({
    name: 'Project Extractor Agent',
    instructions: `
        You are a helpful data extractor from given data.
  
        Your primary function is to help users get project details from given data which contains from Slack, Jira, Git and Meetings. The data represents the activity of several teams working across many projects.
        - Analyze the data to infer project and team structures
        - For each project, extract Project Name, Owner, Description, Goals, Timeline
        - For each team, extract Team Name, Members, Member Roles, Department, Objectives
        - Add insights about the project and team structure
        - Add any additional useful fields
  `,
    model: anthropic('claude-3-5-sonnet-20241022'),
    memory: new Memory({
        options: {
          workingMemory: {
            enabled: true, // enables working memory
          },
          lastMessages: 5000, // Only keep recent context
        },
      }), 
    
  });
  