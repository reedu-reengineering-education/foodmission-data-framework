#!/bin/bash

# Database Backup Script for FOODMISSION Data Framework
# This script creates backups of the PostgreSQL database with timestamps

set -e

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
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

echo -e "${BLUE}🗄️  FOODMISSION Database Backup Utility${NC}"
echo "========================================"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to create a full database backup
create_full_backup() {
    local backup_file="${BACKUP_DIR}/foodmission_full_${TIMESTAMP}.sql"
    
    echo -e "${YELLOW}📦 Creating full database backup...${NC}"
    echo "Database: $DB_NAME"
    echo "Host: $DB_HOST:$DB_PORT"
    echo "Backup file: $backup_file"
    
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose --clean --if-exists --create > "$backup_file"; then
        
        # Compress the backup
        gzip "$backup_file"
        backup_file="${backup_file}.gz"
        
        local file_size=$(du -h "$backup_file" | cut -f1)
        echo -e "${GREEN}✅ Full backup completed successfully!${NC}"
        echo "📁 Backup saved to: $backup_file"
        echo "📊 File size: $file_size"
        
        return 0
    else
        echo -e "${RED}❌ Full backup failed!${NC}"
        return 1
    fi
}

# Function to create a data-only backup
create_data_backup() {
    local backup_file="${BACKUP_DIR}/foodmission_data_${TIMESTAMP}.sql"
    
    echo -e "${YELLOW}📊 Creating data-only backup...${NC}"
    
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose --data-only --inserts > "$backup_file"; then
        
        # Compress the backup
        gzip "$backup_file"
        backup_file="${backup_file}.gz"
        
        local file_size=$(du -h "$backup_file" | cut -f1)
        echo -e "${GREEN}✅ Data backup completed successfully!${NC}"
        echo "📁 Backup saved to: $backup_file"
        echo "📊 File size: $file_size"
        
        return 0
    else
        echo -e "${RED}❌ Data backup failed!${NC}"
        return 1
    fi
}

# Function to create a schema-only backup
create_schema_backup() {
    local backup_file="${BACKUP_DIR}/foodmission_schema_${TIMESTAMP}.sql"
    
    echo -e "${YELLOW}🏗️  Creating schema-only backup...${NC}"
    
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose --schema-only > "$backup_file"; then
        
        # Compress the backup
        gzip "$backup_file"
        backup_file="${backup_file}.gz"
        
        local file_size=$(du -h "$backup_file" | cut -f1)
        echo -e "${GREEN}✅ Schema backup completed successfully!${NC}"
        echo "📁 Backup saved to: $backup_file"
        echo "📊 File size: $file_size"
        
        return 0
    else
        echo -e "${RED}❌ Schema backup failed!${NC}"
        return 1
    fi
}

# Function to list existing backups
list_backups() {
    echo -e "${BLUE}📋 Existing backups:${NC}"
    
    if [ -d "$BACKUP_DIR" ] && [ "$(ls -A $BACKUP_DIR)" ]; then
        ls -lah "$BACKUP_DIR" | grep -E '\.(sql|gz)$' | while read -r line; do
            echo "  $line"
        done
    else
        echo "  No backups found in $BACKUP_DIR"
    fi
}

# Function to clean old backups (keep last 10)
cleanup_old_backups() {
    echo -e "${YELLOW}🧹 Cleaning up old backups (keeping last 10)...${NC}"
    
    if [ -d "$BACKUP_DIR" ]; then
        # Remove old backups, keeping the 10 most recent
        ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
        echo -e "${GREEN}✅ Cleanup completed${NC}"
    fi
}

# Check if PostgreSQL client tools are available
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}❌ pg_dump not found. Please install PostgreSQL client tools.${NC}"
    exit 1
fi

# Parse command line arguments
case "${1:-full}" in
    "full")
        create_full_backup
        ;;
    "data")
        create_data_backup
        ;;
    "schema")
        create_schema_backup
        ;;
    "list")
        list_backups
        ;;
    "cleanup")
        cleanup_old_backups
        ;;
    "all")
        create_full_backup && create_data_backup && create_schema_backup
        ;;
    *)
        echo -e "${BLUE}📖 Usage: $0 [full|data|schema|list|cleanup|all]${NC}"
        echo ""
        echo "Commands:"
        echo "  full     - Create full database backup (default)"
        echo "  data     - Create data-only backup"
        echo "  schema   - Create schema-only backup"
        echo "  all      - Create all types of backups"
        echo "  list     - List existing backups"
        echo "  cleanup  - Remove old backups (keep last 10)"
        echo ""
        echo "Environment variables:"
        echo "  DATABASE_NAME - Database name (default: foodmission_dev)"
        echo "  DATABASE_USER - Database user (default: postgres)"
        echo "  DATABASE_HOST - Database host (default: localhost)"
        echo "  DATABASE_PORT - Database port (default: 5432)"
        exit 1
        ;;
esac

echo -e "${GREEN}🎉 Backup operation completed!${NC}"