#!/usr/bin/env bash
# =============================================================================
# scripts/start-issue.sh
# =============================================================================
# Prepares the local environment to start working on an issue branch.
#
# Usage:
#   ./scripts/start-issue.sh <branch-name>
#
# Example:
#   ./scripts/start-issue.sh fix/42-amount-of-accepts-float-values
#
# Requirements:
#   - git
#   - gh (GitHub CLI, authenticated)
#   - npm
# =============================================================================
 
set -euo pipefail
 
# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'
 
# ── Helpers ───────────────────────────────────────────────────────────────────
info()    { echo -e "${BLUE}ℹ${RESET}  $*"; }
success() { echo -e "${GREEN}✔${RESET}  $*"; }
warn()    { echo -e "${YELLOW}⚠${RESET}  $*"; }
error()   { echo -e "${RED}✖${RESET}  $*" >&2; }
step()    { echo -e "\n${BOLD}${CYAN}▶ $*${RESET}"; }
divider() { echo -e "${CYAN}────────────────────────────────────────────────────${RESET}"; }
 
# ── Dependency check ──────────────────────────────────────────────────────────
check_dependencies() {
  local missing=()
  for cmd in git gh npm; do
    if ! command -v "$cmd" &>/dev/null; then
      missing+=("$cmd")
    fi
  done
 
  if [[ ${#missing[@]} -gt 0 ]]; then
    error "Missing required tools: ${missing[*]}"
    error "Install them and try again."
    exit 1
  fi
}
 
# ── Usage ─────────────────────────────────────────────────────────────────────
usage() {
  echo -e ""
  echo -e "${BOLD}Usage:${RESET}"
  echo -e "  ./scripts/start-issue.sh <branch-name>"
  echo -e ""
  echo -e "${BOLD}Examples:${RESET}"
  echo -e "  ./scripts/start-issue.sh feat/12-add-transaction-category"
  echo -e "  ./scripts/start-issue.sh fix/42-amount-of-accepts-float-values"
  echo -e "  ./scripts/start-issue.sh chore/7-update-eslint-to-v9"
  echo -e ""
  echo -e "${BOLD}Valid prefixes:${RESET}  feat/  fix/  chore/  docs/"
  echo -e ""
}
 
# ── Validate branch name format ───────────────────────────────────────────────
# Expected: {prefix}/{issue-number}-{slugified-title}
# e.g.    : feat/42-add-transaction-category
validate_branch_name() {
  local branch="$1"
  local pattern='^(feat|fix|chore|docs)/([0-9]+)-[a-z0-9]+([a-z0-9-]*[a-z0-9])?$'
 
  if [[ ! "$branch" =~ $pattern ]]; then
    error "Branch name '${branch}' does not match the required convention."
    error "Expected format: {prefix}/{issue-number}-{slugified-title}"
    error "Valid prefixes : feat/  fix/  chore/  docs/"
    error ""
    error "Example        : feat/42-add-transaction-category"
    usage
    exit 1
  fi
}
 
# ── Extract metadata from branch name ────────────────────────────────────────
extract_issue_number() {
  local branch="$1"
  echo "$branch" | grep -oE '/[0-9]+' | grep -oE '[0-9]+'
}
 
extract_prefix() {
  local branch="$1"
  echo "$branch" | cut -d'/' -f1
}
 
# ── Map prefix → conventional commit type ────────────────────────────────────
commit_type_for_prefix() {
  case "$1" in
    feat)  echo "feat" ;;
    fix)   echo "fix" ;;
    chore) echo "chore" ;;
    docs)  echo "docs" ;;
    *)     echo "feat" ;;
  esac
}
 
# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  divider
  echo -e "  ${BOLD}@fm-budget-control/budget-core${RESET} — Start Issue"
  divider
 
  # ── Step 0: argument guard ─────────────────────────────────────────────────
  if [[ $# -ne 1 ]]; then
    error "Exactly one argument required: the branch name."
    usage
    exit 1
  fi
 
  local branch="$1"
 
  check_dependencies
 
  # ── Step 1: validate branch name format ───────────────────────────────────
  step "Validating branch name"
  validate_branch_name "$branch"
  success "Branch name is valid: ${BOLD}${branch}${RESET}"
 
  local issue_number
  issue_number=$(extract_issue_number "$branch")
 
  local prefix
  prefix=$(extract_prefix "$branch")
 
  local commit_type
  commit_type=$(commit_type_for_prefix "$prefix")
 
  # ── Step 2: verify clean working tree ─────────────────────────────────────
  step "Checking working tree"
  if ! git diff --quiet || ! git diff --cached --quiet; then
    error "Your working tree has uncommitted changes."
    error "Please stash or commit them before switching branches."
    echo -e ""
    echo -e "  ${YELLOW}git stash push -m \"wip: before switching to ${branch}\"${RESET}"
    echo -e "  ${YELLOW}git stash pop  ${RESET}  # when you return to this branch"
    exit 1
  fi
  success "Working tree is clean"
 
  # ── Step 3: verify gh CLI authentication ──────────────────────────────────
  step "Verifying GitHub CLI authentication"
  if ! gh auth status &>/dev/null; then
    error "GitHub CLI is not authenticated."
    error "Run: gh auth login"
    exit 1
  fi
  success "GitHub CLI authenticated"
 
  # ── Step 4: fetch latest from remote ──────────────────────────────────────
  step "Fetching latest from remote"
  git fetch origin --prune
  success "Remote refs updated"
 
  # ── Step 5: verify branch exists on remote ────────────────────────────────
  step "Verifying branch exists on remote"
  if ! git ls-remote --exit-code --heads origin "$branch" &>/dev/null; then
    error "Branch '${branch}' does not exist on remote."
    error "Possible reasons:"
    error "  • The issue-branch workflow has not run yet — wait a few seconds and retry."
    error "  • The issue was opened but the workflow failed — check the Actions tab."
    error "  • The branch name has a typo."
    exit 1
  fi
  success "Branch found on remote"
 
  # ── Step 6: sync main ──────────────────────────────────────────────────────
  step "Syncing main"
  git checkout main
  git pull origin main --ff-only
  success "main is up to date"
 
  # ── Step 7: checkout the issue branch ─────────────────────────────────────
  step "Checking out ${branch}"
  if git show-ref --verify --quiet "refs/heads/${branch}"; then
    # Local branch already exists — just switch to it
    git checkout "$branch"
    info "Local branch already existed — switched to it"
  else
    # Track the remote branch
    git checkout --track "origin/${branch}"
  fi
  success "Now on branch: ${BOLD}${branch}${RESET}"
 
  # ── Step 8: pull latest on the issue branch ───────────────────────────────
  step "Pulling latest on branch"
  git pull origin "$branch" --ff-only
  success "Branch is up to date with remote"
 
  # ── Step 9: install dependencies ──────────────────────────────────────────
  step "Installing dependencies"
  npm ci
  success "Dependencies installed"
 
  # ── Summary ───────────────────────────────────────────────────────────────
  echo ""
  divider
  echo -e "  ${BOLD}${GREEN}Ready to work on issue #${issue_number}${RESET}"
  divider
  echo -e ""
  echo -e "  ${BOLD}Branch   ${RESET} ${branch}"
  echo -e "  ${BOLD}Issue    ${RESET} https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/issues/${issue_number}"
  echo -e ""
  echo -e "  ${BOLD}Commit convention for this branch:${RESET}"
  echo -e ""
  echo -e "    ${CYAN}${commit_type}(<optional-scope>): <subject>${RESET}"
  echo -e ""
  echo -e "  ${BOLD}Examples:${RESET}"
 
  case "$commit_type" in
    feat)
      echo -e "    ${CYAN}feat: add TransactionCategory value object${RESET}"
      echo -e "    ${CYAN}feat(domain): expose Amount.fromCents() factory${RESET}"
      ;;
    fix)
      echo -e "    ${CYAN}fix: guard Amount.of() against non-safe integers${RESET}"
      echo -e "    ${CYAN}fix(domain): correct UTC offset in isAbove18()${RESET}"
      ;;
    chore)
      echo -e "    ${CYAN}chore: update eslint to v9${RESET}"
      echo -e "    ${CYAN}chore(deps): bump typescript to 5.8${RESET}"
      ;;
    docs)
      echo -e "    ${CYAN}docs: document hexagonal architecture entry points${RESET}"
      echo -e "    ${CYAN}docs(readme): update subpath import examples${RESET}"
      ;;
  esac
 
  echo -e ""
  echo -e "  Pre-flight will fire automatically on your first push."
  echo -e ""
  divider
}
 
main "$@"
