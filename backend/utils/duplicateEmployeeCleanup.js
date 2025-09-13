import Employee from '../models/Employee.js';
import Transaction from '../models/Transaction.js';
import employeeStatsManager from './employeeStatsManager.js';
import logger from './logger.js';

/**
 * Comprehensive Employee Duplicate Detection and Cleanup Utility
 */
class DuplicateEmployeeCleanup {
    
    /**
     * Find all duplicate employees for a user
     * @param {string} userId - User ID to check
     * @returns {Object} Duplicate analysis results
     */
    async findDuplicateEmployees(userId) {
        try {
            console.log(`🔍 [DUPLICATE-CLEANUP] Finding duplicate employees for user: ${userId}`);
            
            const employees = await Employee.find({ userId }).sort({ createdAt: 1 });
            const duplicateGroups = [];
            const processed = new Set();
            
            for (let i = 0; i < employees.length; i++) {
                const emp1 = employees[i];
                if (processed.has(emp1._id.toString())) continue;
                
                const group = {
                    primaryEmployee: emp1,
                    duplicates: [],
                    reason: 'unknown'
                };
                
                for (let j = i + 1; j < employees.length; j++) {
                    const emp2 = employees[j];
                    if (processed.has(emp2._id.toString())) continue;
                    
                    // Check for exact name match
                    if (this.isExactNameMatch(emp1, emp2)) {
                        group.duplicates.push(emp2);
                        group.reason = 'exact_name_match';
                        processed.add(emp2._id.toString());
                    }
                    // Check for similar name (typos, spacing)
                    else if (this.isSimilarName(emp1, emp2)) {
                        group.duplicates.push(emp2);
                        group.reason = 'similar_name_match';
                        processed.add(emp2._id.toString());
                    }
                    // Check for same email
                    else if (emp1.email && emp2.email && emp1.email === emp2.email) {
                        group.duplicates.push(emp2);
                        group.reason = 'email_match';
                        processed.add(emp2._id.toString());
                    }
                }
                
                if (group.duplicates.length > 0) {
                    duplicateGroups.push(group);
                    processed.add(emp1._id.toString());
                    
                    console.log(`❌ [DUPLICATE-CLEANUP] Found duplicate group (${group.reason}):`, {
                        primary: `${emp1.firstName} ${emp1.lastName} (${emp1._id})`,
                        duplicates: group.duplicates.map(d => `${d.firstName} ${d.lastName} (${d._id})`)
                    });
                }
            }
            
            return {
                userId,
                totalEmployees: employees.length,
                duplicateGroups,
                totalDuplicates: duplicateGroups.reduce((sum, group) => sum + group.duplicates.length, 0)
            };
            
        } catch (error) {
            console.error('❌ [DUPLICATE-CLEANUP] Error finding duplicates:', error);
            throw error;
        }
    }
    
    /**
     * Check if two employees have exactly the same name
     */
    isExactNameMatch(emp1, emp2) {
        const name1 = `${emp1.firstName} ${emp1.lastName}`.toLowerCase().trim();
        const name2 = `${emp2.firstName} ${emp2.lastName}`.toLowerCase().trim();
        return name1 === name2;
    }
    
    /**
     * Check if two employees have similar names (accounting for typos)
     */
    isSimilarName(emp1, emp2) {
        const name1 = `${emp1.firstName} ${emp1.lastName}`.toLowerCase().trim();
        const name2 = `${emp2.firstName} ${emp2.lastName}`.toLowerCase().trim();
        
        // Remove extra spaces and normalize
        const normalized1 = name1.replace(/\s+/g, ' ');
        const normalized2 = name2.replace(/\s+/g, ' ');
        
        // Check for simple variations
        if (Math.abs(normalized1.length - normalized2.length) <= 2) {
            // Use simple Levenshtein distance for similarity
            const similarity = this.calculateSimilarity(normalized1, normalized2);
            return similarity > 0.85; // 85% similarity threshold
        }
        
        return false;
    }
    
    /**
     * Calculate similarity score between two strings
     */
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }
    
    /**
     * Calculate Levenshtein distance between two strings
     */
    levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
        
        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1, // insertion
                    matrix[j - 1][i] + 1, // deletion
                    matrix[j - 1][i - 1] + indicator // substitution
                );
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    /**
     * Merge duplicate employees and update transaction references
     */
    async mergeDuplicateEmployees(userId, duplicateGroups) {
        try {
            console.log(`🔧 [DUPLICATE-CLEANUP] Starting duplicate merge for user: ${userId}`);
            
            let totalMerged = 0;
            let totalTransactionsUpdated = 0;
            
            for (const group of duplicateGroups) {
                const { primaryEmployee, duplicates, reason } = group;
                
                console.log(`🔄 [DUPLICATE-CLEANUP] Merging ${duplicates.length} duplicates into ${primaryEmployee.firstName} ${primaryEmployee.lastName}`);
                
                // Calculate combined statistics
                let combinedSales = primaryEmployee.totalSales || 0;
                let combinedCommission = primaryEmployee.totalCommission || 0;
                let combinedTransactions = primaryEmployee.totalTransactions || 0;
                
                // Update all transactions pointing to duplicates to point to primary employee
                for (const duplicate of duplicates) {
                    // Find all transactions referencing this duplicate
                    const transactions = await Transaction.find({
                        userId,
                        $or: [
                            { 'employee.id': duplicate._id.toString() },
                            { 'employee.id': duplicate.localId },
                            { employeeId: duplicate._id.toString() },
                            { employeeId: duplicate.localId }
                        ]
                    });
                    
                    console.log(`   📋 Found ${transactions.length} transactions for duplicate ${duplicate.firstName} ${duplicate.lastName}`);
                    
                    // Update each transaction to reference the primary employee
                    for (const transaction of transactions) {
                        await Transaction.findByIdAndUpdate(transaction._id, {
                            'employee.id': primaryEmployee._id.toString(),
                            'employee.name': `${primaryEmployee.firstName} ${primaryEmployee.lastName}`,
                            employeeId: primaryEmployee._id.toString(),
                            syncStatus: 'pending' // Mark for re-sync
                        });
                        
                        totalTransactionsUpdated++;
                    }
                    
                    // Add duplicate's stats to primary
                    combinedSales += duplicate.totalSales || 0;
                    combinedCommission += duplicate.totalCommission || 0;
                    combinedTransactions += duplicate.totalTransactions || 0;
                    
                    // Delete the duplicate employee
                    await Employee.findByIdAndDelete(duplicate._id);
                    totalMerged++;
                    
                    console.log(`   ✅ Deleted duplicate ${duplicate.firstName} ${duplicate.lastName} (${duplicate._id})`);
                }
                
                // Update primary employee with combined statistics
                await Employee.findByIdAndUpdate(primaryEmployee._id, {
                    totalSales: combinedSales,
                    totalCommission: combinedCommission,
                    totalTransactions: combinedTransactions,
                    syncStatus: 'pending',
                    lastSyncDate: new Date()
                });
                
                console.log(`   ✅ Updated primary employee ${primaryEmployee.firstName} ${primaryEmployee.lastName} with combined stats:`);
                console.log(`      Sales: ₱${combinedSales}, Commission: ₱${combinedCommission}, Transactions: ${combinedTransactions}`);
            }
            
            // Recalculate all employee stats from actual transaction data to verify accuracy
            console.log(`🔄 [DUPLICATE-CLEANUP] Recalculating employee stats for verification...`);
            const repairedCount = await employeeStatsManager.recalculateEmployeeStats(userId);
            
            const results = {
                userId,
                totalMerged,
                totalTransactionsUpdated,
                repairedEmployeesCount: repairedCount,
                completedAt: new Date()
            };
            
            console.log(`✅ [DUPLICATE-CLEANUP] Merge completed:`, results);
            
            return results;
            
        } catch (error) {
            console.error('❌ [DUPLICATE-CLEANUP] Error merging duplicates:', error);
            throw error;
        }
    }
    
    /**
     * Complete cleanup process - find and merge all duplicates
     */
    async performCompleteCleanup(userId) {
        try {
            console.log(`🚀 [DUPLICATE-CLEANUP] Starting complete cleanup for user: ${userId}`);
            
            // Step 1: Find duplicates
            const duplicateAnalysis = await this.findDuplicateEmployees(userId);
            
            if (duplicateAnalysis.totalDuplicates === 0) {
                console.log(`✅ [DUPLICATE-CLEANUP] No duplicates found for user ${userId}`);
                return {
                    userId,
                    duplicatesFound: 0,
                    duplicatesMerged: 0,
                    message: 'No duplicates found'
                };
            }
            
            // Step 2: Merge duplicates
            const mergeResults = await this.mergeDuplicateEmployees(userId, duplicateAnalysis.duplicateGroups);
            
            // Step 3: Final validation
            const finalAnalysis = await this.findDuplicateEmployees(userId);
            
            const results = {
                userId,
                initialDuplicates: duplicateAnalysis.totalDuplicates,
                duplicatesMerged: mergeResults.totalMerged,
                transactionsUpdated: mergeResults.totalTransactionsUpdated,
                remainingDuplicates: finalAnalysis.totalDuplicates,
                success: finalAnalysis.totalDuplicates === 0,
                completedAt: new Date()
            };
            
            if (results.success) {
                console.log(`🎉 [DUPLICATE-CLEANUP] Complete success! All duplicates resolved for user ${userId}`);
            } else {
                console.log(`⚠️ [DUPLICATE-CLEANUP] Partial success. ${results.remainingDuplicates} duplicates remain for user ${userId}`);
            }
            
            return results;
            
        } catch (error) {
            console.error('❌ [DUPLICATE-CLEANUP] Complete cleanup failed:', error);
            throw error;
        }
    }
}

// Export singleton instance
export default new DuplicateEmployeeCleanup();