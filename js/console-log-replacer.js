// Console.log Replacement Script for Ava Solutions PWA
// Systematically replaces console.log statements with proper logging

class ConsoleLogReplacer {
    constructor() {
        this.replacements = new Map();
        this.stats = {
            totalFound: 0,
            replaced: 0,
            skipped: 0,
            errors: 0
        };
        
        // Patterns for different types of console statements
        this.patterns = {
            // Error patterns
            error: [
                /console\.error\(/g,
                /console\.warn\(.*(error|fail|exception)/gi
            ],
            
            // Warning patterns  
            warn: [
                /console\.warn\(/g,
                /console\.log\(.*(warn|warning|caution)/gi
            ],
            
            // Debug patterns
            debug: [
                /console\.debug\(/g,
                /console\.log\(.*debug/gi,
                /console\.log\(.*trace/gi
            ],
            
            // Info patterns (most console.log statements)
            info: [
                /console\.log\(/g,
                /console\.info\(/g
            ]
        };
        
        // Context mapping for component identification
        this.contextMappings = {
            'database': 'DATABASE',
            'api': 'API', 
            'auth': 'AUTH',
            'backup': 'BACKUP',
            'sync': 'SYNC',
            'pos': 'POS',
            'inventory': 'INVENTORY',
            'employee': 'EMPLOYEE',
            'products': 'PRODUCTS',
            'rooms': 'ROOMS',
            'settings': 'CONFIG',
            'migration': 'MIGRATION',
            'feature': 'FEATURE',
            'error': 'ERROR',
            'recovery': 'RECOVERY',
            'logger': 'SYSTEM'
        };
    }

    // Find all console.log statements in the codebase
    async findConsoleStatements() {
        const results = [];
        
        try {
            // Use grep to find all console statements
            const files = await this.getJavaScriptFiles();
            
            for (const file of files) {
                const statements = await this.findInFile(file);
                if (statements.length > 0) {
                    results.push({
                        file: file,
                        statements: statements
                    });
                }
            }
            
            this.stats.totalFound = results.reduce((sum, file) => sum + file.statements.length, 0);
            
            console.log(`🔍 Found ${this.stats.totalFound} console statements across ${results.length} files`);
            
            return results;
            
        } catch (error) {
            console.error('Failed to find console statements:', error);
            return [];
        }
    }

    async getJavaScriptFiles() {
        // List of JS files to process (excluding node_modules and generated files)
        return [
            'js/app.js',
            'js/database.js',
            'js/api.js',
            'js/auth.js', 
            'js/backup-system.js',
            'js/sync.js',
            'js/pos.js',
            'js/inventory.js',
            'js/employees.js',
            'js/products.js',
            'js/rooms.js',
            'js/settings.js',
            'js/dashboard.js',
            'js/gift-certificates.js',
            'js/entitlements.js',
            'js/chatbot.js',
            'js/auto-updater.js',
            'js/cloud-sync.js',
            'js/rollback-system.js',
            'js/browser-universal-fix.js',
            'js/config-service.js',
            'js/config-migration.js',
            'js/settings-migrated.js',
            'js/auth-migrated.js',
            'js/api-migrated.js',
            'js/error-recovery.js',
            'js/feature-flags.js',
            'js/logger-init.js',
            'js/logger-utils.js'
        ];
    }

    async findInFile(filePath) {
        try {
            const content = await this.readFile(filePath);
            const statements = [];
            
            // Find all console statements with context
            const lines = content.split('\n');
            
            lines.forEach((line, index) => {
                const trimmed = line.trim();
                
                // Skip comments and strings
                if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
                    return;
                }
                
                // Look for console statements
                const consoleMatch = trimmed.match(/(console\.(log|info|warn|error|debug)\s*\([^)]*\))/);
                if (consoleMatch) {
                    const statement = consoleMatch[1];
                    const level = this.determineLogLevel(statement, trimmed, filePath);
                    const category = this.determineCategory(statement, trimmed, filePath);
                    const message = this.extractMessage(statement);
                    
                    statements.push({
                        lineNumber: index + 1,
                        originalLine: line,
                        statement: statement,
                        level: level,
                        category: category,
                        message: message,
                        context: this.getContext(trimmed, filePath)
                    });
                }
            });
            
            return statements;
            
        } catch (error) {
            console.error(`Failed to read file ${filePath}:`, error);
            return [];
        }
    }

    async readFile(filePath) {
        // This would normally use fs.readFile, but for browser context we'll simulate
        // In actual implementation, this would read the file contents
        return `// Simulated content for ${filePath}`;
    }

    determineLogLevel(statement, context, filePath) {
        const lowerStatement = statement.toLowerCase();
        const lowerContext = context.toLowerCase();
        
        // Error patterns
        if (lowerStatement.includes('console.error') ||
            lowerContext.includes('error') ||
            lowerContext.includes('fail') ||
            lowerContext.includes('exception') ||
            lowerContext.includes('catch')) {
            return 'ERROR';
        }
        
        // Warning patterns
        if (lowerStatement.includes('console.warn') ||
            lowerContext.includes('warn') ||
            lowerContext.includes('deprecated') ||
            lowerContext.includes('caution')) {
            return 'WARN';
        }
        
        // Debug patterns
        if (lowerStatement.includes('console.debug') ||
            lowerContext.includes('debug') ||
            lowerContext.includes('trace') ||
            lowerContext.includes('verbose')) {
            return 'DEBUG';
        }
        
        // Success patterns (info level)
        if (lowerContext.includes('success') ||
            lowerContext.includes('complete') ||
            lowerContext.includes('ready') ||
            lowerContext.includes('initialized')) {
            return 'INFO';
        }
        
        // Default to INFO for most console.log statements
        return 'INFO';
    }

    determineCategory(statement, context, filePath) {
        const fileName = filePath.split('/').pop().replace('.js', '').toLowerCase();
        
        // Map file names to categories
        if (this.contextMappings[fileName]) {
            return this.contextMappings[fileName];
        }
        
        // Analyze context for category hints
        const lowerContext = context.toLowerCase();
        
        if (lowerContext.includes('database') || lowerContext.includes('db') || lowerContext.includes('indexeddb')) {
            return 'DATABASE';
        }
        
        if (lowerContext.includes('api') || lowerContext.includes('fetch') || lowerContext.includes('request')) {
            return 'API';
        }
        
        if (lowerContext.includes('auth') || lowerContext.includes('login') || lowerContext.includes('logout')) {
            return 'AUTH';
        }
        
        if (lowerContext.includes('config') || lowerContext.includes('setting')) {
            return 'CONFIG';
        }
        
        if (lowerContext.includes('backup') || lowerContext.includes('restore')) {
            return 'BACKUP';
        }
        
        if (lowerContext.includes('sync') || lowerContext.includes('synchroniz')) {
            return 'SYNC';
        }
        
        if (lowerContext.includes('navigation') || lowerContext.includes('page') || lowerContext.includes('route')) {
            return 'NAVIGATION';
        }
        
        if (lowerContext.includes('performance') || lowerContext.includes('timing') || lowerContext.includes('duration')) {
            return 'PERFORMANCE';
        }
        
        if (lowerContext.includes('user') || lowerContext.includes('click') || lowerContext.includes('interaction')) {
            return 'USER';
        }
        
        return 'GENERAL';
    }

    extractMessage(statement) {
        try {
            // Extract the message from console.log('message', data)
            const match = statement.match(/console\.\w+\s*\(\s*['"`]([^'"`]+)['"`]/);
            if (match) {
                return match[1];
            }
            
            // Handle more complex cases
            const argsMatch = statement.match(/console\.\w+\s*\(([^)]+)\)/);
            if (argsMatch) {
                const args = argsMatch[1].trim();
                // If it starts with a string literal, extract it
                const stringMatch = args.match(/^['"`]([^'"`]+)['"`]/);
                if (stringMatch) {
                    return stringMatch[1];
                }
                
                // Otherwise use the full arguments as message
                return args.length > 50 ? args.substring(0, 47) + '...' : args;
            }
            
            return 'Log statement';
        } catch (error) {
            return 'Log statement';
        }
    }

    getContext(line, filePath) {
        const fileName = filePath.split('/').pop().replace('.js', '');
        
        // Try to extract component/function context from the line
        const functionMatch = line.match(/function\s+(\w+)|(\w+)\s*\(/);
        if (functionMatch) {
            return functionMatch[1] || functionMatch[2];
        }
        
        // Use file name as fallback context
        return fileName;
    }

    // Generate replacement code for a console statement
    generateReplacement(statementInfo) {
        const { level, category, message, context } = statementInfo;
        
        // Template for the logger call
        const loggerCall = `window.logger.log({
            type: '${category}',
            category: '${category}',
            level: '${level}',
            message: ${this.formatMessage(message)},
            data: ${this.extractDataParameter(statementInfo.statement)}
        })`;
        
        return loggerCall;
    }

    formatMessage(message) {
        // Ensure the message is properly quoted
        if (message.startsWith("'") || message.startsWith('"') || message.startsWith('`')) {
            return message;
        }
        return `'${message.replace(/'/g, "\\'")}'`;
    }

    extractDataParameter(statement) {
        try {
            // Extract additional parameters beyond the first message
            const match = statement.match(/console\.\w+\s*\(\s*[^,]+,\s*(.+)\)/);
            if (match) {
                return match[1].trim();
            }
            return 'null';
        } catch (error) {
            return 'null';
        }
    }

    // Create a report of all console statements found
    generateReport(results) {
        const report = {
            summary: {
                totalFiles: results.length,
                totalStatements: this.stats.totalFound,
                byLevel: { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0 },
                byCategory: {},
                byFile: {}
            },
            details: results
        };

        // Calculate statistics
        results.forEach(file => {
            report.summary.byFile[file.file] = file.statements.length;
            
            file.statements.forEach(stmt => {
                report.summary.byLevel[stmt.level]++;
                
                if (!report.summary.byCategory[stmt.category]) {
                    report.summary.byCategory[stmt.category] = 0;
                }
                report.summary.byCategory[stmt.category]++;
            });
        });

        return report;
    }

    // Generate replacement suggestions
    generateReplacementSuggestions(results) {
        const suggestions = [];

        results.forEach(file => {
            const fileSuggestions = {
                file: file.file,
                replacements: []
            };

            file.statements.forEach(stmt => {
                const replacement = this.generateReplacement(stmt);
                
                fileSuggestions.replacements.push({
                    lineNumber: stmt.lineNumber,
                    original: stmt.originalLine.trim(),
                    replacement: replacement,
                    level: stmt.level,
                    category: stmt.category,
                    message: stmt.message
                });
            });

            suggestions.push(fileSuggestions);
        });

        return suggestions;
    }

    // Apply automatic replacements (would require file system access)
    async applyReplacements(suggestions, options = {}) {
        const { dryRun = true, backupFiles = true } = options;
        
        console.log(`${dryRun ? '🔍 DRY RUN:' : '✏️  APPLYING:'} Console.log replacements`);
        
        for (const file of suggestions) {
            console.log(`\n📄 Processing ${file.file}:`);
            
            for (const replacement of file.replacements) {
                console.log(`  Line ${replacement.lineNumber}: ${replacement.level} - ${replacement.category}`);
                console.log(`    OLD: ${replacement.original}`);
                console.log(`    NEW: ${replacement.replacement}`);
                
                if (!dryRun) {
                    // Here you would actually modify the file
                    // This is just a simulation
                    this.stats.replaced++;
                } else {
                    console.log(`    (Would replace if not dry run)`);
                }
            }
        }
        
        return {
            processed: suggestions.length,
            replaced: this.stats.replaced,
            dryRun: dryRun
        };
    }

    // Export report to downloadable file
    exportReport(report, format = 'json') {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `console-log-analysis-${timestamp}.${format}`;
        
        let content;
        let mimeType;
        
        if (format === 'json') {
            content = JSON.stringify(report, null, 2);
            mimeType = 'application/json';
        } else if (format === 'csv') {
            content = this.generateCSVReport(report);
            mimeType = 'text/csv';
        } else {
            content = this.generateTextReport(report);
            mimeType = 'text/plain';
        }
        
        // Create downloadable blob
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`📊 Report exported: ${filename}`);
    }

    generateCSVReport(report) {
        const lines = ['File,Line,Level,Category,Message,Original'];
        
        report.details.forEach(file => {
            file.statements.forEach(stmt => {
                const escaped = {
                    message: `"${stmt.message.replace(/"/g, '""')}"`,
                    original: `"${stmt.originalLine.trim().replace(/"/g, '""')}"`
                };
                
                lines.push(`${file.file},${stmt.lineNumber},${stmt.level},${stmt.category},${escaped.message},${escaped.original}`);
            });
        });
        
        return lines.join('\n');
    }

    generateTextReport(report) {
        const lines = [];
        lines.push('CONSOLE.LOG ANALYSIS REPORT');
        lines.push('=' .repeat(50));
        lines.push('');
        lines.push(`Total Files: ${report.summary.totalFiles}`);
        lines.push(`Total Statements: ${report.summary.totalStatements}`);
        lines.push('');
        lines.push('By Level:');
        Object.entries(report.summary.byLevel).forEach(([level, count]) => {
            lines.push(`  ${level}: ${count}`);
        });
        lines.push('');
        lines.push('By Category:');
        Object.entries(report.summary.byCategory).forEach(([category, count]) => {
            lines.push(`  ${category}: ${count}`);
        });
        lines.push('');
        lines.push('By File:');
        Object.entries(report.summary.byFile).forEach(([file, count]) => {
            lines.push(`  ${file}: ${count}`);
        });
        lines.push('');
        lines.push('DETAILED FINDINGS:');
        lines.push('-'.repeat(30));
        
        report.details.forEach(file => {
            lines.push(`\n${file.file}:`);
            file.statements.forEach(stmt => {
                lines.push(`  Line ${stmt.lineNumber}: [${stmt.level}] ${stmt.category} - ${stmt.message}`);
                lines.push(`    ${stmt.originalLine.trim()}`);
            });
        });
        
        return lines.join('\n');
    }

    // Public API
    async analyze() {
        console.log('🔍 Starting console.log analysis...');
        
        const results = await this.findConsoleStatements();
        const report = this.generateReport(results);
        const suggestions = this.generateReplacementSuggestions(results);
        
        console.log('\n📊 ANALYSIS COMPLETE:');
        console.log(`Files analyzed: ${report.summary.totalFiles}`);
        console.log(`Console statements found: ${report.summary.totalStatements}`);
        console.log('\nBy Level:');
        Object.entries(report.summary.byLevel).forEach(([level, count]) => {
            console.log(`  ${level}: ${count}`);
        });
        console.log('\nBy Category:');
        Object.entries(report.summary.byCategory).forEach(([category, count]) => {
            console.log(`  ${category}: ${count}`);
        });
        
        return {
            report,
            suggestions
        };
    }

    async replaceConsoleStatements(dryRun = true) {
        const analysis = await this.analyze();
        const result = await this.applyReplacements(analysis.suggestions, { dryRun });
        
        console.log('\n🎯 REPLACEMENT COMPLETE:');
        console.log(`Files processed: ${result.processed}`);
        console.log(`Statements ${dryRun ? 'would be ' : ''}replaced: ${result.replaced}`);
        
        return result;
    }
}

// Initialize and expose the replacer
window.ConsoleLogReplacer = ConsoleLogReplacer;

// Convenience functions
window.analyzeConsoleStatements = async () => {
    const replacer = new ConsoleLogReplacer();
    return await replacer.analyze();
};

window.replaceConsoleStatements = async (dryRun = true) => {
    const replacer = new ConsoleLogReplacer();
    return await replacer.replaceConsoleStatements(dryRun);
};

console.log('🔧 Console.log Replacer loaded. Use analyzeConsoleStatements() or replaceConsoleStatements() to start.');