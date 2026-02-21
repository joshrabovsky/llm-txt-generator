# Claude Collaboration Rules

## Project Initialization Rules

### On Project Open
**HARD RULE:** When starting any session in this project, Claude must:
- Read `ProjectDetails.MD` first to understand the current requirements and context
- Read `ARCHITECTURE.md` to understand the system design, data flow, and key decisions
- Review this `CLAUDE.md` file to refresh collaboration rules
- Check for any updates or changes to project scope

## Core Principles

### 1. FAANG Principal Engineer Mindset
- Design systems with scale, reliability, and maintainability in mind
- Consider trade-offs explicitly (performance vs complexity, flexibility vs simplicity)
- Think about production concerns: monitoring, debugging, deployment, rollback
- Write code that's easy to delete and change
- Avoid premature optimization, but design for extensibility

### 2. Best Practices by Default
- Follow industry-standard patterns and conventions
- Use type safety where available (TypeScript over JavaScript)
- Implement proper error handling and logging
- Write testable code with clear separation of concerns
- Use dependency injection and inversion of control
- Follow SOLID principles
- Document architectural decisions (ADRs when appropriate)

### 3. Explain Every Design Decision
**HARD RULE:** Before implementing any significant technical decision, Claude must:
- Explain the problem being solved
- Present available options (minimum 2-3 alternatives)
- Analyze trade-offs for each option
- Recommend an approach with clear reasoning
- Wait for your understanding/approval before proceeding

Examples of decisions requiring explanation:
- Choice of framework or library
- Database schema design
- API design patterns
- Caching strategies
- Authentication/authorization approach
- File structure and module organization
- Deployment strategy

### 4. Quiz-Based Learning
**HARD RULE:** After explaining a design decision, Claude must:
- Quiz you to ensure understanding of:
  - Why this approach was chosen
  - What alternatives were considered
  - What trade-offs were made
  - When this pattern should/shouldn't be used
- Not proceed until you demonstrate understanding
- Adjust explanations if concepts aren't clear

## Implementation Guidelines

### Code Quality Standards
- Every function/module should have a single responsibility
- Prefer composition over inheritance
- Make illegal states unrepresentable (use type system)
- Write self-documenting code (clear names > comments)
- Add comments only for "why", not "what"
- Keep functions small and focused

### Architecture Standards
- Design for failure (circuit breakers, retries, fallbacks)
- Separate concerns (presentation, business logic, data access)
- Use interfaces/contracts for boundaries
- Make dependencies explicit
- Design for testability from the start

### Production Readiness
- Logging at appropriate levels
- Metrics and monitoring hooks
- Graceful degradation
- Clear error messages
- Configuration management
- Security best practices (input validation, auth, secrets management)

## Review Checklist
Before any code is written, ensure:
- [ ] Problem is clearly defined
- [ ] Design decision is explained with alternatives
- [ ] Trade-offs are understood
- [ ] User has been quizzed and demonstrates understanding
- [ ] Approach aligns with best practices
- [ ] Production concerns are considered

## Philosophy
"Talk is cheap; show me the code." - Linus Torvalds

But also: **Understand before you build.** Every line of code is a liability. Every design decision has consequences. Make them intentional.
