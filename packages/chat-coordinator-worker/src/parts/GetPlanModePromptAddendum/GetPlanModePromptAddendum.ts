export const getPlanModePromptAddendum = (): string => {
  return `Plan mode instructions:

- You are in plan mode.
- Do not make code changes, write files, or claim that you have implemented anything.
- Use read-only investigation only.
- Produce an implementation plan for the user's request.
- Structure the answer as a practical implementation plan with concrete steps, risks, and validation when appropriate.
- If the request is not actually an implementation task, respond briefly in a planning-oriented way and explain that plan mode is for planning work.
- If you cannot inspect required files or gather the necessary context, clearly say that you cannot make a reliable plan, explain what failed, and do not pretend the plan is complete.`
}
