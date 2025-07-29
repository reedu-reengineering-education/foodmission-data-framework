#!/bin/bash

# Database Restore Script for FOODMISSION Data Framework
# This script restores PostgreSQL database from backup files

set -e

# Configuration
BACKUP_DIR="./backups"
DB_NAME="${DATABASE_NAME:-foodmission_dev}"
DB_USER="${DATABASE_USER:-postgres}"
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 FOODMISSION Database Restore Utility${NC}"
echo "========================================"

# Function to list available backups
list_backups() {
    echo -e "${BLUE}📋 Available backups:${NC}"
    
    if [ -d "$BACKUP_DIR" ] && [ "$(ls -A $BACKUP_DIR 2>/dev/null)" ]; then
        local count=1
        for backup in "$BACKUP_DIR"/*.sql.gz "$BACKUP_DIR"/*.sql; do
            if [ -f "$backup" ]; then
                local filename=$(basename "$backup")
                local size=$(du -h "$backup" | cut -f1)
                local date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$backup" 2>/dev/null || stat -c "%y" "$backup" 2>/dev/null | cut -d' ' -f1-2)
                echo "  $count) $filename ($size) - $date"
                ((count++))
            fi
        done
    else
        echo "  No backups found in $BACKUP_DIR"
        return 1
    fi
}

# Function to restore from a backup file
restore_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}❌ Backup file not found: $backup_file${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}🔄 Restoring database from backup...${NC}"
    echo "Backup file: $backup_file"
    echo "Database: $DB_NAME"
    echo "Host: $DB_HOST:$DB_PORT"
    
    # Ask for confirmation
    echo -e "${YELLOW}⚠️  WARNING: This will replace all data in the database!${NC}"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Restore cancelled."
        return 1
    fi
    
    # Determine if file is compressed
    local restore_command
    if [[ "$backup_file" == *.gz ]]; then
        restore_command="gunzip -c '$backup_file' | psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d '$DB_NAME'"
    else
        restore_command="psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d '$DB_NAME' -f '$backup_file'"
    fi
    
    echo -e "${YELLOW}🔄 Executing restore...${NC}"
    
    if eval "$restore_command"; then
        echo -e "${GREEN}✅ Database restored successfully!${NC}"
        
        # Run post-restore tasks
        echo -e "${YELLOW}🔧 Running post-restore tasks...${NC}"
        
        # Generate Prisma client
        if command -v npx &> /dev/null; then
            echo "Generating Prisma client..."
            npx prisma generate
        fi
        
        echo -e "${GREEN}✅ Post-restore tasks completed!${NC}"
        return 0
    else
        echo -e "${RED}❌ Database restore failed!${NC}"
        return 1
    fi
}

# Function to restore from the latest backup
restore_latest() {
    local backup_type="${1:-full}"
    
    echo -e "${YELLOW}🔍 Finding latest $backup_type backup...${NC}"
    
    local pattern
    case "$backup_type" in
        "full")
            pattern="foodmission_full_*.sql.gz"
            ;;
        "data")
            pattern="foodmission_data_*.sql.gz"
            ;;
        "schema")
            pattern="foodmission_schema_*.sql.gz"
            ;;
        *)
            echo -e "${RED}❌ Invalid backup type: $backup_type${NC}"
            return 1
            ;;
    esac
    
    local latest_backup=$(ls -t "$BACKUP_DIR"/$pattern 2>/dev/null | head -n 1)
    
    if [ -z "$latest_backup" ]; then
        echo -e "${RED}❌ No $backup_type backups found!${NC}"
        return 1
    fi
    
    echo "Latest $backup_type backup: $(basename "$latest_backup")"
    restore_backup "$latest_backup"
}

# Function to create a fresh database
create_fresh_db() {
    echo -e "${YELLOW}🆕 Creating fresh database...${NC}"
    
    # Drop and recreate database
    echo "Dropping existing database (if exists)..."
    dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" --if-exists "$DB_NAME" || true
    
    echo "Creating new database..."
    createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
    
    # Run Prisma migrations
    if command -v npx &> /dev/null; then
        echo "Running Prisma migrations..."
        npx prisma migrate deploy
        
        echo "Generating Prisma client..."
        npx prisma generate
    fi
    
    echo -e "${GREEN}✅ Fresh database created!${NC}"
}

# Check if PostgreSQL client tools are available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql not found. Please install PostgreSQL client tools.${NC}"
    exit 1
fi

# Parse command line arguments
case "${1:-list}" in
    "list")
        list_backups
        ;;
    "latest")
        restore_latest "${2:-full}"
        ;;
    "file")
        if [ -z "$2" ]; then
            echo -e "${RED}❌ Backup file path required${NC}"
            exit 1
        fi
        restore_backup "$2"
        ;;
    "fresh")
        create_fresh_db
        ;;
    "interactive")
        list_backups
        echo ""
        read -p "Enter backup number to restore (or 'q' to quit): " choice
        
        if [ "$choice" = "q" ]; then
            echo "Restore cancelled."
            exit 0
        fi
        
        # Get the selected backup file
        backup_files=($(ls -t "$BACKUP_DIR"/*.sql.gz "$BACKUP_DIR"/*.sql 2>/dev/null))
        selected_index=$((choice - 1))
        
        if [ $selected_index -ge 0 ] && [ $selected_index -lt ${#backup_files[@]} ]; then
            restore_backup "${backup_files[$selected_index]}"
        else
            echo -e "${RED}❌ Invalid selection${NC}"
            exit 1
        fi
        ;;
    *)
        echo -e "${BLUE}📖 Usage: $0 [list|latest|file|fresh|interactive]${NC}"
        echo ""
        echo "Commands:"
        echo "  list                    - List available backups (default)"
        echo "  latest [full|data|schema] - Restore from latest backup of specified type"
        echo "  file <path>             - Restore from specific backup file"
        echo "  fresh                   - Create fresh database with migrations"
        echo "  interactive             - Interactive backup selection"
        echo ""
        echo "Environment variables:"
        echo "  DATABASE_NAME - Database name (default: foodmission_dev)"
        echo "  DATABASE_USER - Database user (default: postgres)"
        echo "  DATABASE_HOST - Database host (default: localhost)"
        echo "  DATABASE_PORT - Database port (default: 5432)"
        echo ""
        echo "Examples:"
        echo "  $0 latest full          - Restore latest full backup"
        echo "  $0 file backup.sql.gz   - Restore specific backup file"
        echo "  $0 interactive          - Choose backup interactively"
        exit 1
        ;;
esac

echo -e "${GREEN}🎉 Restore operation completed!${NC}"