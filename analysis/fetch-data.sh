#!/usr/bin/env bash
# Puts a snapshot of the workshop data into analysis/data/ for report.qmd.
#
#   ./fetch-data.sh              latest backup from the repository's 'data' branch (default)
#   ./fetch-data.sh --live       fresh read of the database with scripts/backup.mjs
#   ./fetch-data.sh --from DIR   copy the node files from a local directory
#
# Environment:
#   DATA_REPO_URL          repository to fetch the backup from (default: this checkout's
#                          'origin' remote, otherwise the project's GitHub repository)
#   DATA_BRANCH            branch holding the backups (default: data)
#   FIREBASE_DATABASE_URL  database read by --live (default: the production database,
#                          read only; set it to an emulator URL to test)
#
# Each run replaces the previous snapshot, so files from different sources are
# never mixed, and records where the data came from in data/fetch-info.json
# (method 'branch', 'live' or 'directory', with the source, branch and commit).
set -euo pipefail

analysis_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$analysis_dir/.." && pwd)"
data_dir="$analysis_dir/data"
default_repo_url='https://github.com/pablobernabeu/Unlock_the_Lab.git'
node_files=(ratings.json leaderboard.json rankings.json sessions.json active.json backup-info.json)

usage() {
    sed -n '2,7p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

mode='branch'
source_dir=''
while [ $# -gt 0 ]; do
    case "$1" in
        --branch) mode='branch' ;;
        --live) mode='live' ;;
        --from)
            mode='dir'
            source_dir="${2:-}"
            if [ -z "$source_dir" ]; then
                echo '--from needs a directory.' >&2
                exit 1
            fi
            shift
            ;;
        -h | --help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            usage >&2
            exit 1
            ;;
    esac
    shift
done

staging="$(mktemp -d)"
trap 'rm -rf "$staging"' EXIT

copy_node_files() {
    local from="$1"
    local file
    for file in "${node_files[@]}"; do
        if [ -f "$from/$file" ]; then
            cp "$from/$file" "$staging/"
        fi
    done
}

# Drops any user name or token from a URL before it is printed or recorded.
without_credentials() {
    printf '%s' "$1" | sed -E 's#://[^/@]+@#://#'
}

json_string() {
    local value="${1//\\/\\\\}"
    printf '"%s"' "${value//\"/\\\"}"
}

commit=''
case "$mode" in
    branch)
        origin_url="$(git -C "$repo_root" remote get-url origin 2> /dev/null ||
            echo "$default_repo_url")"
        url="${DATA_REPO_URL:-$origin_url}"
        branch="${DATA_BRANCH:-data}"
        echo "Fetching the latest backup from the '$branch' branch of $(without_credentials "$url")"
        # A shallow clone into a temporary directory leaves this checkout untouched.
        if ! git clone --quiet --depth 1 --single-branch --branch "$branch" "$url" \
            "$staging/clone"; then
            echo "Could not fetch the '$branch' branch of $(without_credentials "$url")." >&2
            echo "The 'Backup data' workflow creates the branch on its first run;" >&2
            echo 'until then, use --live or --from.' >&2
            exit 1
        fi
        commit="$(git -C "$staging/clone" rev-parse HEAD)"
        copy_node_files "$staging/clone"
        rm -rf "$staging/clone"
        method='branch'
        source="$(without_credentials "$url")"
        ;;
    live)
        if ! command -v node > /dev/null; then
            echo 'Node.js is needed for --live.' >&2
            exit 1
        fi
        echo 'Reading the database through its REST API (GET requests only)'
        node "$repo_root/scripts/backup.mjs" --out "$staging"
        method='live'
        source="$(without_credentials "${FIREBASE_DATABASE_URL:-production}")"
        ;;
    dir)
        if [ ! -d "$source_dir" ]; then
            echo "No directory at $source_dir" >&2
            exit 1
        fi
        copy_node_files "$source_dir"
        method='directory'
        source="$(cd "$source_dir" && pwd)"
        ;;
esac

if [ ! -f "$staging/ratings.json" ]; then
    echo 'The source has no ratings.json, so analysis/data was left unchanged.' >&2
    exit 1
fi

{
    printf '{\n  "method": %s,\n' "$(json_string "$method")"
    printf '  "source": %s,\n' "$(json_string "$source")"
    if [ -n "$commit" ]; then
        printf '  "branch": %s,\n' "$(json_string "$branch")"
        printf '  "commit": %s,\n' "$(json_string "$commit")"
    fi
    printf '  "fetchedAt": %s\n}\n' "$(json_string "$(date -u +%Y-%m-%dT%H:%M:%SZ)")"
} > "$staging/fetch-info.json"

mkdir -p "$data_dir"
for file in "${node_files[@]}" fetch-info.json; do
    rm -f "$data_dir/$file"
done
cp "$staging"/*.json "$data_dir/"

echo "Snapshot written to $data_dir:"
(cd "$data_dir" && ls -l -- *.json)
