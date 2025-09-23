
#!/usr/bin/env bash
# clones the MySQL database referenced in backend/.env into a timestamped test database
# usage: ./scripts/clone_db_to_test.sh [--no-prompt]

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

#!/usr/bin/env bash
# clones the MySQL database referenced in backend/.env into a timestamped test database
# usage: ./scripts/clone_db_to_test.sh [--no-prompt]

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

#!/usr/bin/env bash
# clones the MySQL database referenced in backend/.env into a timestamped test database
# usage: ./scripts/clone_db_to_test.sh [--no-prompt]

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/backend/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found. Please run from project root." >&2
  exit 1
fi

# Read DATABASE_URL from backend/.env (supports simple KEY=VALUE format)
DATABASE_URL_LINE=$(grep -E '^DATABASE_URL=' "$ENV_FILE" || true)
if [ -z "$DATABASE_URL_LINE" ]; then
  echo "DATABASE_URL not found in $ENV_FILE" >&2
  exit 1
fi

DATABASE_URL=${DATABASE_URL_LINE#DATABASE_URL=}
DATABASE_URL=${DATABASE_URL#"}
DATABASE_URL=${DATABASE_URL%"}

# Parse MySQL URL of form: mysql://user:pass@host:port/dbname
if [[ "$DATABASE_URL" =~ mysql://([^:]+):([^@]+)@([^:/]+):?([0-9]*)/([^?]+) ]]; then
  DB_USER="${BASH_REMATCH[1]}"
  DB_PASS="${BASH_REMATCH[2]}"
  DB_HOST="${BASH_REMATCH[3]}"
  DB_PORT="${BASH_REMATCH[4]}"
  DB_NAME="${BASH_REMATCH[5]}"
else
  echo "Unsupported DATABASE_URL format: $DATABASE_URL" >&2
  exit 1
fi

if [ -z "$DB_PORT" ]; then
  DB_PORT=3306
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TEST_DB="${DB_NAME}_test_${TIMESTAMP}"

NO_PROMPT=0
if [ "${1-}" = "--no-prompt" ]; then
  NO_PROMPT=1
fi

echo "Source DB: $DB_NAME@$DB_HOST:$DB_PORT"
echo "Target DB: $TEST_DB@$DB_HOST:$DB_PORT"

if [ $NO_PROMPT -eq 0 ]; then
  read -p "Proceed to create test database '$TEST_DB' as user '$DB_USER'? [y/N] " answer
  case "$answer" in
    [Yy]*) ;;
    *) echo "Aborted."; exit 1 ;;
  esac
fi

TMPFILE="/tmp/${DB_NAME}_dump_${TIMESTAMP}.sql"

echo "Creating test database '$TEST_DB'..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u"$DB_USER" -p"$DB_PASS" -e "CREATE DATABASE IF NOT EXISTS ${TEST_DB};"

echo "Dumping source DB to temporary file: $TMPFILE"
mysqldump -h "$DB_HOST" -P "$DB_PORT" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$TMPFILE"

echo "Importing dump into test DB..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u"$DB_USER" -p"$DB_PASS" "$TEST_DB" < "$TMPFILE"

rm -f "$TMPFILE"

echo "Test database '$TEST_DB' created and populated."

cat <<'EOF'
Restore notes:
- To restore from the test DB back to the original DB (overwrite), run:
  mysqldump --databases <test_db_name> | mysql -h <host> -u<user> -p<password> <original_db_name>

- Example (careful: this will overwrite your original DB):
  mysqldump -h $DB_HOST -P $DB_PORT -u$DB_USER -p<password> $TEST_DB | mysql -h $DB_HOST -P $DB_PORT -u$DB_USER -p<password> $DB_NAME

EOF

echo "Done. Test DB: $TEST_DB"

# Read DATABASE_URL from backend/.env (supports simple KEY=VALUE format)
DATABASE_URL_LINE=$(grep -E '^DATABASE_URL=' "$ENV_FILE" || true)
if [ -z "$DATABASE_URL_LINE" ]; then
  echo "DATABASE_URL not found in $ENV_FILE" >&2
  exit 1
fi

DATABASE_URL=${DATABASE_URL_LINE#DATABASE_URL=}
DATABASE_URL=${DATABASE_URL#"}
DATABASE_URL=${DATABASE_URL%"}

# Parse MySQL URL of form: mysql://user:pass@host:port/dbname
if [[ "$DATABASE_URL" =~ mysql://([^:]+):([^@]+)@([^:/]+):?([0-9]*)/([^?]+) ]]; then
  DB_USER="${BASH_REMATCH[1]}"
  DB_PASS="${BASH_REMATCH[2]}"
  DB_HOST="${BASH_REMATCH[3]}"
  DB_PORT="${BASH_REMATCH[4]}"
  DB_NAME="${BASH_REMATCH[5]}"
else
  echo "Unsupported DATABASE_URL format: $DATABASE_URL" >&2
  exit 1
fi

if [ -z "$DB_PORT" ]; then
  DB_PORT=3306
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TEST_DB="${DB_NAME}_test_${TIMESTAMP}"

NO_PROMPT=0
if [ "${1-}" = "--no-prompt" ]; then
  NO_PROMPT=1
fi

echo "Source DB: $DB_NAME@$DB_HOST:$DB_PORT"
echo "Target DB: $TEST_DB@$DB_HOST:$DB_PORT"

if [ $NO_PROMPT -eq 0 ]; then
  read -p "Proceed to create test database '$TEST_DB' as user '$DB_USER'? [y/N] " answer
  case "$answer" in
    [Yy]*) ;;
    *) echo "Aborted."; exit 1 ;;
  esac
fi

# Create the test DB
echo "Creating test database '$TEST_DB'..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u"$DB_USER" -p"$DB_PASS" -e "CREATE DATABASE \`$TEST_DB\`;"

echo "Dumping source DB and importing into test DB (this may take a while)..."
mysqldump -h "$DB_HOST" -P "$DB_PORT" -u"$DB_USER" -p"$DB_PASS" --databases "$DB_NAME" \
  | sed 's/DEFINER[ ]*=[^*]*\*/\*/g' \
  | sed "s/CREATE DATABASE .*;/CREATE DATABASE IF NOT EXISTS \`$TEST_DB\`;/g" \
  | sed "s/USE \`${DB_NAME}\`;/USE \`${TEST_DB}\`;/g" \
  | mysql -h "$DB_HOST" -P "$DB_PORT" -u"$DB_USER" -p"$DB_PASS"

echo "Test database '$TEST_DB' created and populated."

cat <<'EOF'
Restore notes:
- To restore from the test DB back to the original DB (overwrite), run:
  mysqldump --databases <test_db_name> | mysql -h <host> -u<user> -p<password> <original_db_name>

- Example (careful: this will overwrite your original DB):
  mysqldump -h $DB_HOST -P $DB_PORT -u$DB_USER -p<password> $TEST_DB | mysql -h $DB_HOST -P $DB_PORT -u$DB_USER -p<password> $DB_NAME

EOF

echo "Done. Test DB: $TEST_DB"
