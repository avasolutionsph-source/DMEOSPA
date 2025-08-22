// Console to Logger Migration Helper
// This script helps migrate console statements to logger

const migrateConsoleStatements = {
    // APP.JS remaining statements
    app: [
        {
            file: 'app.js',
            line: 404,
            old: "console.log('📦 Checking for GiftCertificateManager class...');",
            new: `if (window.logger) {
    window.logger.debug('Checking for GiftCertificateManager class', {
        category: 'APP',
        operation: 'check_gift_manager'
    });
} else {
    console.log('📦 Checking for GiftCertificateManager class...');
}`
        },
        {
            file: 'app.js',
            line: 405,
            old: "console.log('window.GiftCertificateManager exists?', !!window.GiftCertificateManager);",
            new: `if (window.logger) {
    window.logger.debug('GiftCertificateManager check', {
        category: 'APP',
        operation: 'check_gift_manager',
        data: { exists: !!window.GiftCertificateManager }
    });
} else {
    console.log('window.GiftCertificateManager exists?', !!window.GiftCertificateManager);
}`
        }
    ],
    
    // Pattern for systematic replacement
    replacePattern: function(statement, category, operation) {
        const isError = statement.includes('console.error');
        const isWarn = statement.includes('console.warn');
        const level = isError ? 'error' : isWarn ? 'warn' : 'info';
        
        return `if (window.logger) {
    window.logger.${level}('${operation}', {
        category: '${category}',
        operation: '${operation.toLowerCase().replace(/ /g, '_')}'
    });
} else {
    ${statement}
}`;
    }
};

module.exports = migrateConsoleStatements;