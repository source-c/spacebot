#!/bin/sh
set -e

# If no config.toml exists, create a minimal one that binds the API to 0.0.0.0
# so it's reachable from outside the container.
if [ ! -f "$SPACEBOT_DIR/config.toml" ]; then
    mkdir -p "$SPACEBOT_DIR"
    cat > "$SPACEBOT_DIR/config.toml" <<'EOF'
[api]
bind = "0.0.0.0"
EOF
fi

exec "$@"
