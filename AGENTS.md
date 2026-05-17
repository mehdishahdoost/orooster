# Development Process for Agents

When making changes to the codebase, please follow this process:

1. Commit your changes locally:
   - Stage your changes with `git add .`
   - Commit with a descriptive message: `git commit -m "description of changes"`
   - Push to your fork or branch: `git push origin your-branch-name`

2. Create a Pull Request:
   - Run `gh pr create` to create a PR using the GitHub CLI
   - Use `gh pr create --title "your-pr-title" --body "your description"` to specify title and description
   - You can also use `gh pr create --fill` to auto-generate title and description from commit history
   - The PR will be created against the default branch or you can specify the base branch with `--base branch-name`

3. For subsequent changes:
   - Make your changes
   - Commit them: `git commit -m "description of additional changes"`
   - Push to your branch: `git push origin your-branch-name`
   - The PR will automatically update with your new commits

This process ensures all changes are properly tracked and reviewed before merging.