## MODIFIED Requirements

### Requirement: Web Search

The system SHALL provide a web search tool using the Tavily Search API that requires a single API key.

Risk level SHALL be `low`.

The tool SHALL return search result snippets AND an LLM-generated answer summary from Tavily (`include_answer: "advanced"`).

Phase 1 SHALL NOT include full-page browsing (fetching and rendering entire pages via `include_raw_content`).

#### Scenario: Web search executed

- **WHEN** the LLM invokes the web search tool with a query
- **THEN** the Tavily Search API is called
- **AND** an answer summary and up to 5 result snippets (title, URL, content) are returned immediately (risk: `low`)

#### Scenario: Answer summary included

- **WHEN** a web search is performed
- **THEN** the response includes an LLM-generated answer summary from Tavily
- **AND** the answer is generated in "advanced" mode for detailed responses

#### Scenario: No full-page browsing

- **WHEN** a web search is performed
- **THEN** only search result snippets and an answer summary are returned
- **AND** full-page content is not fetched or rendered