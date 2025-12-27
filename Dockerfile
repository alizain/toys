FROM node:22-slim

# Install Claude Code globally
RUN npm install -g @anthropic-ai/claude-code

# Create non-root user
RUN useradd -m -s /bin/bash claude

# Set working directory
WORKDIR /workspace

# Switch to non-root user
USER claude

# Default command
CMD ["bash"]
