Before doing anything, read `_bmad-output/planning-artifacts/decision-log.md`: it holds the current project status, open items, and every decision made after the original PRD/architecture (it overrides them where they differ, e.g. hosting is Northflank, not Render). When you make or change a decision, record it there.

For this project, you should run the BMAD workflow end‑to‑end without waiting for me to manually type commands.


First create a storyfile using /bmad-bmm-create-story. This basically describes one "issue" that should be done.


After that, run /bmad-bmm-dev-story STORY-ID to implement it.


After implementation, run /bmad-bmm-code-review STORY-ID to review and refine the changes. Bmad will ask if it should fix it automatically. The answer is always yes.

Remember that when starting the flow, we could be anywhere. So you need to check the current state and then continue from there.

After the story was reviewed(one story completed): Stop so i can clear the agent context.

Don’t ask me to type out commands; choose and invoke them yourself as needed. Only pause if you hit an error you cannot fix or need clarification about requirements. I am aware of the risks involved.