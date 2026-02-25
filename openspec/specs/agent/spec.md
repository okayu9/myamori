# Agent Specification

## Purpose

The agent core that orchestrates message processing, LLM invocation, tool execution, conversation history, and memory management.

## Requirements

### Requirement: Message Processing Flow

The agent SHALL process each incoming message through the following steps in order:

1. Verify the user is in the allowlist.
2. Retrieve recent conversation history from D1 and relevant long-term memories from Vectorize.
3. Send system prompt, context, and tool definitions to the LLM.
4. If the LLM returns a text response, send it to the user.
5. If the LLM requests a tool call, route it to the Tool Executor:
   - `low` risk: execute immediately, feed the result back to the LLM to continue the conversation.
   - `high` risk: send an approval request; on approval execute and return the result, on rejection or timeout cancel.
6. Save the conversation history to D1.
7. Write an audit log entry to D1.

### Requirement: Tool Call Limit

The agent SHALL enforce a maximum number of tool call steps per conversation turn (default: 5) to prevent the LLM from chaining tool calls indefinitely.

### Requirement: LLM Abstraction

The agent SHALL use the Vercel AI SDK (`ai` package) for a unified LLM interface, allowing provider/model swaps without changing application code.

The specific LLM provider and model SHALL be decided at implementation time.

### Requirement: System Prompt

The system prompt SHALL be constructed dynamically and include: the assistant's role and personality, available tool descriptions, current date and time, and any relevant context from memory.

### Requirement: Short-Term Memory

The system SHALL store conversation history in D1.

The system SHALL include the most recent N messages (default: 20) in the LLM context for each invocation.

### Requirement: Long-Term Memory

When conversation history exceeds a threshold, older messages SHALL be summarized by the LLM.

The summary SHALL be embedded using Workers AI and stored in Vectorize.

On each new message, the system SHALL perform a vector search to retrieve relevant past memories and include them in the LLM context.

Long-term memory is a Phase 3 feature.
