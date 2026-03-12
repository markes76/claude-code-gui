# linkedin-cli skill

You have access to `linkedin-cli`, an unofficial LinkedIn CLI tool. Use it to read information from the user's LinkedIn account.

## Prerequisites

The user must be authenticated. Check first with:
```bash
linkedin status --json
```
If not authenticated, instruct them to run `linkedin login`.

## Golden Rule

**Always use `--json` when fetching data for processing.** Plain output is for humans; `--json` gives you clean structured data you can parse, filter, and analyze.

---

## Commands Reference

### Authentication

```bash
linkedin login              # Open browser for manual LinkedIn login
linkedin status --json      # Check session validity + current user info
linkedin logout             # Clear saved session
```

### Profile

```bash
linkedin profile --json                                     # Your full profile
linkedin profile https://www.linkedin.com/in/johndoe --json # Another person's profile
```

**Output fields:** `firstName`, `lastName`, `headline`, `summary`, `locationName`, `industryName`, `publicIdentifier`, `entityUrn`

### Connections

```bash
linkedin connections --json                        # List connections (default 25)
linkedin connections --count --json                # Just the total count
linkedin connections --search "John" --json        # Filter by name
linkedin connections --recent --json               # Most recently connected
linkedin connections --limit 100 --json            # Up to 100 connections
```

**Output fields (array):** `entityUrn`, `firstName`, `lastName`, `headline`, `publicIdentifier`, `connectedAt` (epoch ms)

### Feed & Posts

```bash
linkedin feed --json                        # Recent feed (default 20)
linkedin feed --mine --json                 # Only your posts
linkedin feed --mine --stats --json         # Your posts with engagement stats
linkedin feed --limit 50 --json             # More items
linkedin posts <post-url> --json            # Specific post with comments
```

**Feed item fields:** `entityUrn`, `actor` (name, description), `commentary.text.text`, `socialDetail.totalSocialActivityCounts` (numLikes, numComments, numShares), `createdAt`

### Messages

```bash
linkedin messages --json                    # Recent conversations
linkedin messages --unread --json           # Unread only
linkedin messages --search "keyword" --json # Search messages
linkedin messages --limit 50 --json         # More conversations
```

**Conversation fields:** `entityUrn`, `participants`, `lastActivityAt`, `read`, `events`

### Notifications

```bash
linkedin notifications --json               # Recent notifications
linkedin notifications --unread --json      # Unread only
```

**Fields:** `entityUrn`, `publishedAt`, `read`, `headline.text`, `subtext.text`

### Network

```bash
linkedin network invitations --json         # Received connection requests
linkedin network invitations --sent --json  # Sent requests
linkedin network suggestions --json         # People you may know
```

### Analytics

```bash
linkedin analytics --json                   # Post performance last 30 days
linkedin analytics --post <post-url> --json # Specific post analytics
linkedin analytics --followers --json       # Follower growth/demographics
```

**Fields:** `totalImpressions`, `uniqueImpressions`, `totalEngagements`, `engagementRate`, `totalClicks`, `totalReactions`, `totalComments`, `totalReposts`

### Search

```bash
linkedin search people "AI engineer" --json         # Search people
linkedin search companies "cybersecurity" --json    # Search companies
linkedin search jobs "product manager" --json       # Search jobs
linkedin search posts "enterprise AI" --json        # Search content/posts
linkedin search people "designer" --limit 25 --json # More results
```

**Result fields:** `entityUrn`, `title.text`, `primarySubtitle.text`, `secondarySubtitle.text`, `navigationUrl`, `publicIdentifier`

### Jobs

```bash
linkedin jobs saved --json          # Your saved jobs
linkedin jobs applied --json        # Jobs you applied to
linkedin jobs recommended --json    # Recommended for you
```

**Fields:** `entityUrn`, `title`, `companyName`, `locationName`, `listedAt`

---

## Global Flags

| Flag | Description |
|------|-------------|
| `--json` | Structured JSON output (always use for data) |
| `--no-color` | Disable color (useful in CI/pipes) |
| `--limit <n>` | Max results (varies by command) |

---

## Natural Language → Command Mapping

| User asks | Command to run |
|-----------|----------------|
| "How many connections do I have?" | `linkedin connections --count --json` |
| "Show me my recent posts with engagement" | `linkedin feed --mine --stats --json` |
| "Find AI engineers in my network" | `linkedin search people "AI engineer" --json` |
| "What are my unread messages?" | `linkedin messages --unread --json` |
| "Show my post analytics for last month" | `linkedin analytics --json` |
| "Who are my most recent connections?" | `linkedin connections --recent --limit 10 --json` |
| "What jobs have I applied to?" | `linkedin jobs applied --json` |
| "What pending connection requests do I have?" | `linkedin network invitations --json` |
| "Search for cybersecurity companies" | `linkedin search companies "cybersecurity" --json` |
| "What does my LinkedIn profile say?" | `linkedin profile --json` |
| "Show me John Smith's profile" | `linkedin search people "John Smith" --limit 5 --json` (then use the publicIdentifier to fetch: `linkedin profile https://www.linkedin.com/in/<id> --json`) |
| "What notifications haven't I read?" | `linkedin notifications --unread --json` |
| "What are my saved jobs?" | `linkedin jobs saved --json` |
| "Are there any job recommendations for me?" | `linkedin jobs recommended --json` |
| "Show me posts about AI on my feed" | `linkedin feed --json` then filter by keyword |
| "What's the engagement on my posts?" | `linkedin feed --mine --stats --json` |

---

## Combining Commands for Complex Queries

### Example: Find a specific connection and view their profile
```bash
# 1. Find by name
linkedin connections --search "Jane Doe" --json

# 2. Use publicIdentifier from result to fetch profile
linkedin profile https://www.linkedin.com/in/janedoe --json
```

### Example: Audit your post performance
```bash
# Get all your posts with stats
linkedin feed --mine --stats --limit 50 --json | jq '[.[] | {text: .commentary.text.text, likes: .socialDetail.totalSocialActivityCounts.numLikes, comments: .socialDetail.totalSocialActivityCounts.numComments}] | sort_by(-.likes)'
```

### Example: Export connections to CSV (using jq)
```bash
linkedin connections --limit 500 --json | jq -r '.[] | [.firstName, .lastName, .headline, .publicIdentifier] | @csv'
```

### Example: Find unread messages from a specific person
```bash
linkedin messages --unread --json | jq '.[] | select(.participants[].participantType.member.firstName.text == "Alice")'
```

---

## Error Handling

| Error | Meaning | Action |
|-------|---------|--------|
| `Auth error: No session found` | Not logged in | Run `linkedin login` |
| `Session expired` | Cookie expired | Run `linkedin login` again |
| `Rate limited (429)` | Too many requests | Wait 60s before retrying |
| `Access forbidden (403)` | Blocked request | Wait and retry, or re-login |

---

## Important Notes

1. This is an **unofficial tool** using undocumented LinkedIn APIs. API responses may change.
2. LinkedIn rate-limits aggressively. Add delays between bulk requests.
3. The tool is **read-only** — no writes, no posts, no messages sent.
4. Session cookies expire periodically. If commands fail with auth errors, re-run `linkedin login`.
5. Use `--limit` to control request volume and avoid rate limits.
