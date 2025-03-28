# BR Try

A TypeScript-based project built with Mastra.ai framework for building AI-powered applications with memory and RAG (Retrieval-Augmented Generation) capabilities.

## 🚀 Features

- Built with Mastra.ai framework
- PostgreSQL integration for data persistence
- Pinecone vector database integration
- Support for multiple AI models (Anthropic, DeepSeek, OpenAI)
- RAG (Retrieval-Augmented Generation) capabilities
- Memory management system
- TypeScript support

## 📋 Prerequisites

- Node.js (Latest LTS version recommended)
- Docker and Docker Compose
- PostgreSQL
- Pinecone account (for vector database)
- API keys for AI providers (Anthropic, DeepSeek, OpenAI)

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd br_try
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following variables (adjust values as needed):
```env
# Add your environment variables here
# See .env.development for reference
```

4. Start the Docker services:
```bash
docker-compose up -d
```

5. Run the setup script:
```bash
./setup.sh
```

## 🏃‍♂️ Development

To start the development server:

```bash
pnpm dev
```

## 📁 Project Structure

```
br_try/
├── src/
│   ├── mastra/
│   │   ├── agents/      # AI agents configuration
│   │   ├── tools/       # Custom tools and utilities
│   │   ├── workflows/   # Application workflows
│   │   ├── stores/      # Data stores
│   │   └── index.ts     # Main application entry
├── data/                # Data files
├── docker/              # Docker configuration files
├── dist/               # Compiled output
└── package.json        # Project dependencies and scripts
```

## 🔧 Configuration

The project uses several configuration files:

- `tsconfig.json` - TypeScript configuration
- `docker-compose.yml` - Docker services configuration
- `.env` and `.env.development` - Environment variables

## 📦 Dependencies

Main dependencies include:

- `@mastra/core`: ^0.7.0
- `@mastra/memory`: ^0.2.6
- `@mastra/pg`: ^0.2.6
- `@mastra/pinecone`: ^0.2.4
- `@mastra/rag`: ^0.1.14
- Various AI model SDKs (Anthropic, DeepSeek, OpenAI)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## 📄 License

This project is licensed under the ISC License. 