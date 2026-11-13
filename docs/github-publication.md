# GitHub publication preparation — approval required

Intended owner, explicitly supplied by the user: **Ad-Bakkou**. Proposed repository: **darija-translate-rest-service**. Proposed visibility: **public**, pending explicit approval of destination, visibility and the final commit inventory. No published URL has been verified. No remote was configured at inspection.

Description: Authenticated Jakarta REST translation service powered by Gemini, with Chrome, Python, PHP and React Native clients.

Git is available. GitHub CLI was not found on PATH or at its standard Windows installation path. The connected GitHub integration authenticates to a different account and must not be used to publish this project. Authentication as Ad-Bakkou is not established in this process. Local Git author configuration is not proof of GitHub authentication; its existing author name/email will appear in commit metadata if published. Review that metadata locally before approval.

## After explicit approval only

Install GitHub CLI from its [official installation instructions](https://cli.github.com/), then authenticate interactively. Do not paste tokens into chat or command arguments. The commands below are prepared instructions and have NOT been executed:

```powershell
gh auth login --hostname github.com --git-protocol https --web
gh api user --jq .login
# STOP unless the login above is Ad-Bakkou and publication is approved.
git status --short
git log -1 --format=fuller
git ls-tree -r --long HEAD
# Run only if origin is still absent and the intended repository does not exist:
gh repo create Ad-Bakkou/darija-translate-rest-service --public --source . --remote origin --description 'Authenticated Jakarta REST translation service powered by Gemini, with Chrome, Python, PHP and React Native clients.'
git push -u origin master
gh repo view Ad-Bakkou/darija-translate-rest-service --json nameWithOwner,url,visibility
```

If the destination already exists, stop and inspect it instead of overwriting history or adding a duplicate remote. No force push. The source branch is master; no artificial historical commits are needed. See [official gh repo create documentation](https://cli.github.com/manual/gh_repo_create).

After a successful approved push, verify the returned URL and professor access, then add that actual URL to README/submission metadata. Commit and push that factual documentation update under the approved scope, and regenerate the ZIP from the final reviewed commit. The current package has no published GitHub URL and no MP4. Do not represent a proposed destination as an existing repository.
