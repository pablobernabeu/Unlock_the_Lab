#!/usr/bin/env bash
# Puts a snapshot of the workshop data into analysis/data/ for report.qmd.
#
#   ./fetch-data.sh              latest backup from the repository's 'data' branch (default)
#   ./fetch-data.sh --live       fresh read of the database with scripts/backup.mjs
#   ./fetch-data.sh --from DIR   copy the node files from a local directory
#   ./fetch-data.sh --from FILE  split a full snapshot downloaded from the facilitator panel
#
# Environment:
#   DATA_REPO_URL          repository to fetch the backup from (default: this checkout's
#                          'origin' remote, otherwise the project's GitHub repository)
#   DATA_BRANCH            branch holding the backups (default: data)
#   FIREBASE_DATABASE_URL  database read by --live (default: the production database,
#                          read only; set it to an emulator URL to test, such as
#                          http://127.0.0.1:9000/?ns=unlock-the-lab-workshop-default-rtdb)
#
# Each run replaces the previous snapshot, so files from different sources are
# never mixed, and records where the data came from in data/fetch-info.json
# (method 'branch', 'live', 'directory' or 'snapshot', with the source, branch,
# commit and export time).
set -euo pipefail

analysis_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$analysis_dir/.." && pwd)"
data_dir="$analysis_dir/data"
default_repo_url='https://github.com/pablobernabeu/Unlock_the_Lab.git'
node_files=(ratings.json leaderboard.json rankings.json sessions.json active.json backup-info.json)

usage() {
    sed -n '2,8p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
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
                echo '--from needs a directory or a snapshot file.' >&2
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

# Splits a full snapshot from the facilitator panel ({exportedAt, counts, nodes}) into
# the node files a backup holds, and prints the export time. Arguments: snapshot, out dir.
# shellcheck disable=SC2016 # JavaScript, not shell
split_snapshot='
const fs = require("node:fs");
const path = require("node:path");
const [file, out] = process.argv.slice(1);
let snapshot;
try {
    snapshot = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (error) {
    console.error(`${file} could not be read as JSON: ${error.message}`);
    process.exit(1);
}
const nodes = snapshot?.nodes;
const exported = new Date(snapshot?.exportedAt);
if (typeof snapshot?.exportedAt !== "string" || Number.isNaN(exported.getTime()) ||
    !nodes || typeof nodes !== "object" || Array.isArray(nodes)) {
    console.error(`${file} is not a full snapshot from the facilitator panel.`);
    process.exit(1);
}
const write = (name, value) =>
    fs.writeFileSync(path.join(out, name), `${JSON.stringify(value, null, 2)}\n`);
for (const node of ["ratings", "leaderboard", "rankings", "sessions", "active"]) {
    write(`${node}.json`, nodes[node] ?? null);
}
write("backup-info.json", { lastBackup: exported.toISOString(), counts: snapshot.counts ?? {} });
console.log(exported.toISOString());
'

commit=''
exported_at=''
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
        if [ -f "$source_dir" ]; then
            if ! command -v node > /dev/null; then
                echo 'Node.js is needed to read a snapshot file with --from.' >&2
                exit 1
            fi
            exported_at="$(node -e "$split_snapshot" -- "$source_dir" "$staging")"
            method='snapshot'
            source="$(basename "$source_dir")"
        elif [ -d "$source_dir" ]; then
            copy_node_files "$source_dir"
            method='directory'
            source="$(cd "$source_dir" && pwd)"
        else
            echo "No directory or file at $source_dir" >&2
            exit 1
        fi
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
    if [ -n "$exported_at" ]; then
        printf '  "exportedAt": %s,\n' "$(json_string "$exported_at")"
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
