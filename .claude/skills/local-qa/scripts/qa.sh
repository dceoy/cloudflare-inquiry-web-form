#!/usr/bin/env bash

set -euox pipefail
cd "$(git rev-parse --show-toplevel)"

# Python
PYTHON_LINE_LENGTH=120
RUFF_LINT_EXTEND_SELECT='F,E,W,C90,I,N,D,UP,S,B,A,COM,C4,PT,Q,SIM,ARG,ERA,PD,PLC,PLE,PLW,TRY,FLY,NPY,PERF,FURB,RUF'
RUFF_LINT_IGNORE='D100,D103,D203,D213,S101,B008,A002,A004,COM812,PLC2701,TRY003,B905,S108,S602,S603,PERF203,PLW1510'
ruff format --exclude=build --exclude=.venv "--line-length=${PYTHON_LINE_LENGTH}" .
ruff check --fix --exclude=build --exclude=.venv "--line-length=${PYTHON_LINE_LENGTH}" --extend-select="${RUFF_LINT_EXTEND_SELECT}" --ignore="${RUFF_LINT_IGNORE}"
pyright --threads=0 .

# Shell scripts
git ls-files -z -- '*.sh' '*.bash' '*.bats' | xargs -0 -t shellcheck

# TypeScript
pnpm run format
pnpm run lint:fix
pnpm run typecheck
pnpm run test

# GitHub Actions
zizmor --fix=safe .github/workflows
git ls-files -z -- '.github/workflows/*.yml' '.github/workflows/*.yaml' | xargs -0 -t actionlint
git ls-files -z -- '.github/workflows/*.yml' '.github/workflows/*.yaml' | xargs -0 -t yamllint -d '{"extends": "relaxed", "rules": {"line-length": "disable"}}'
checkov --framework=all --output=github_failed_only --directory=.
