---
name: local-business-prompt-research
description: Research and improve local AI search prompts for OpenGEO audits.
---

# Local Business Prompt Research

Use this skill to improve OpenGEO prompt coverage.

## Workflow

1. Start from the business category, location, services, and customer personas.
2. Cover discovery, comparison, urgency, trust, price, and specialty intents.
3. Include location variants such as town, neighborhood, county, and "near me" phrasing.
4. Avoid leaking the target business name into answer-generation prompts unless the test explicitly requires branded visibility.
5. Group prompts into clear clusters.
6. Mark prompts as draft until reviewed.

## Output

Return:

- prompt clusters
- missing local intents
- risky or biased prompts
- suggested active prompt set
