#!/bin/bash

NEW_KEY="YOUR_SSH_PUBLIC_KEY_HERE"
SSH_DIR="$HOME/.ssh"
AUTHORIZED_KEYS="$SSH_DIR/authorized_keys"

# Abort if ~/.ssh does not exist
if [ ! -d "$SSH_DIR" ]; then
  echo "Error: $SSH_DIR does not exist. Aborting."
  exit 1
fi

# Abort if authorized_keys does not exist
if [ ! -f "$AUTHORIZED_KEYS" ]; then
  echo "Error: $AUTHORIZED_KEYS does not exist. Aborting."
  exit 1
fi

# Add key if not already present
if grep -qxF "$NEW_KEY" "$AUTHORIZED_KEYS"; then
  echo "Key already exists in authorized_keys"
else
  echo "$NEW_KEY" >> "$AUTHORIZED_KEYS"
  echo "Key added successfully"
fi