/**
 * PaginationHelper - Reusable Pagination Utilities
 *
 * Purpose: Centralized pagination logic to ensure consistent behavior across all features.
 * Supports both traditional pagination and virtual scrolling for large datasets.
 *
 * Features:
 * - Static helper methods for pagination calculations
 * - HTML generation for pagination controls
 * - Virtual scrolling support
 * - Consistent page size (20 items default)
 * - Memory-efficient rendering
 *
 * Usage:
 * ```javascript
 * // Basic pagination
 * const page = 1;
 * const pageSize = 20;
 * const items = [...]; // Your data array
 *
 * // Get paginated items
 * const paginatedItems = window.paginationHelper.paginate(items, page, pageSize);
 *
 * // Get total pages
 * const totalPages = window.paginationHelper.getTotalPages(items.length, pageSize);
 *
 * // Render pagination controls
 * window.paginationHelper.renderPagination('paginationContainer', {
 *     currentPage: page,
 *     totalPages,
 *     totalItems: items.length,
 *     onPageChange: (newPage) => {
 *         console.log('Navigate to page:', newPage);
 *     }
 * });
 * ```
 */

class PaginationHelper {
    /**
     * Get items for a specific page
     * @param {Array} items - All items
     * @param {number} page - Current page (1-indexed)
     * @param {number} pageSize - Items per page (default: 20)
     * @returns {Array} Items for the specified page
     */
    static paginate(items, page, pageSize = 20) {
        if (!items || !Array.isArray(items)) {
            console.warn('⚠️ [PAGINATION-HELPER] Invalid items array');
            return [];
        }

        if (page < 1) {
            console.warn('⚠️ [PAGINATION-HELPER] Page must be >= 1, defaulting to 1');
            page = 1;
        }

        const start = (page - 1) * pageSize;
        const end = start + pageSize;

        return items.slice(start, end);
    }

    /**
     * Calculate total number of pages
     * @param {number} totalItems - Total number of items
     * @param {number} pageSize - Items per page (default: 20)
     * @returns {number} Total pages
     */
    static getTotalPages(totalItems, pageSize = 20) {
        if (totalItems <= 0) return 1;
        return Math.ceil(totalItems / pageSize);
    }

    /**
     * Get pagination info (useful for display)
     * @param {number} totalItems
     * @param {number} page
     * @param {number} pageSize
     * @returns {object} Pagination metadata
     */
    static getPaginationInfo(totalItems, page, pageSize = 20) {
        const totalPages = this.getTotalPages(totalItems, pageSize);
        const start = Math.min((page - 1) * pageSize + 1, totalItems);
        const end = Math.min(page * pageSize, totalItems);

        return {
            currentPage: page,
            totalPages,
            pageSize,
            totalItems,
            startItem: start,
            endItem: end,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            isFirstPage: page === 1,
            isLastPage: page === totalPages
        };
    }

    /**
     * Render pagination controls in a container
     * @param {string} containerId - DOM element ID
     * @param {object} options - Pagination options
     */
    static renderPagination(containerId, options = {}) {
        const {
            currentPage = 1,
            totalPages = 1,
            totalItems = 0,
            pageSize = 20,
            onPageChange = null,
            showItemCount = true,
            showPageNumbers = true,
            maxPageButtons = 5
        } = options;

        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`⚠️ [PAGINATION-HELPER] Container "${containerId}" not found`);
            return;
        }

        // If only one page, hide pagination
        if (totalPages <= 1) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';

        const info = this.getPaginationInfo(totalItems, currentPage, pageSize);

        let html = '<div class="pagination" style="display: flex; align-items: center; gap: 0.5rem; justify-content: space-between; width: 100%;">';

        // Item count on the left
        if (showItemCount) {
            html += `
                <div class="pagination-info" style="font-size: 0.875rem; color: #6b7280;">
                    Showing ${info.startItem}-${info.endItem} of ${totalItems}
                </div>
            `;
        }

        // Pagination controls on the right
        html += '<div class="pagination-controls" style="display: flex; gap: 0.25rem; align-items: center;">';

        // Previous button
        const prevDisabled = !info.hasPrevPage;
        html += `
            <button
                class="pagination-btn"
                ${prevDisabled ? 'disabled' : ''}
                onclick="${onPageChange ? `(${onPageChange})(${currentPage - 1})` : ''}"
                style="
                    padding: 0.5rem 0.75rem;
                    border: 1px solid #d1d5db;
                    border-radius: 0.375rem;
                    background: ${prevDisabled ? '#f3f4f6' : 'white'};
                    color: ${prevDisabled ? '#9ca3af' : '#374151'};
                    cursor: ${prevDisabled ? 'not-allowed' : 'pointer'};
                    font-size: 0.875rem;
                "
                ${prevDisabled ? '' : 'onmouseover="this.style.background=\'#f9fafb\'" onmouseout="this.style.background=\'white\'"'}
            >
                <i class="fas fa-chevron-left"></i> Previous
            </button>
        `;

        // Page numbers
        if (showPageNumbers) {
            const pageNumbers = this.getPageNumbers(currentPage, totalPages, maxPageButtons);

            for (const pageNum of pageNumbers) {
                if (pageNum === '...') {
                    html += `
                        <span style="padding: 0.5rem; color: #9ca3af;">...</span>
                    `;
                } else {
                    const isCurrent = pageNum === currentPage;
                    html += `
                        <button
                            class="pagination-btn"
                            onclick="${onPageChange ? `(${onPageChange})(${pageNum})` : ''}"
                            style="
                                padding: 0.5rem 0.75rem;
                                border: 1px solid ${isCurrent ? '#800020' : '#d1d5db'};
                                border-radius: 0.375rem;
                                background: ${isCurrent ? '#800020' : 'white'};
                                color: ${isCurrent ? 'white' : '#374151'};
                                cursor: pointer;
                                font-size: 0.875rem;
                                min-width: 2.5rem;
                            "
                            ${isCurrent ? '' : 'onmouseover="this.style.background=\'#f9fafb\'" onmouseout="this.style.background=\'white\'"'}
                        >
                            ${pageNum}
                        </button>
                    `;
                }
            }
        } else {
            // Show current page / total pages
            html += `
                <span style="padding: 0.5rem; font-size: 0.875rem; color: #374151;">
                    Page ${currentPage} of ${totalPages}
                </span>
            `;
        }

        // Next button
        const nextDisabled = !info.hasNextPage;
        html += `
            <button
                class="pagination-btn"
                ${nextDisabled ? 'disabled' : ''}
                onclick="${onPageChange ? `(${onPageChange})(${currentPage + 1})` : ''}"
                style="
                    padding: 0.5rem 0.75rem;
                    border: 1px solid #d1d5db;
                    border-radius: 0.375rem;
                    background: ${nextDisabled ? '#f3f4f6' : 'white'};
                    color: ${nextDisabled ? '#9ca3af' : '#374151'};
                    cursor: ${nextDisabled ? 'not-allowed' : 'pointer'};
                    font-size: 0.875rem;
                "
                ${nextDisabled ? '' : 'onmouseover="this.style.background=\'#f9fafb\'" onmouseout="this.style.background=\'white\'"'}
            >
                Next <i class="fas fa-chevron-right"></i>
            </button>
        `;

        html += '</div>'; // Close pagination-controls
        html += '</div>'; // Close pagination

        container.innerHTML = html;
    }

    /**
     * Get page numbers to display (with ellipsis for large page counts)
     * @param {number} currentPage
     * @param {number} totalPages
     * @param {number} maxButtons - Maximum page number buttons to show
     * @returns {Array} Array of page numbers or '...' strings
     */
    static getPageNumbers(currentPage, totalPages, maxButtons = 5) {
        const pages = [];

        if (totalPages <= maxButtons) {
            // Show all pages
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Show first page, last page, and pages around current
            const halfMax = Math.floor(maxButtons / 2);
            let startPage = Math.max(1, currentPage - halfMax);
            let endPage = Math.min(totalPages, currentPage + halfMax);

            // Adjust if at the beginning or end
            if (currentPage <= halfMax) {
                endPage = maxButtons;
            } else if (currentPage >= totalPages - halfMax) {
                startPage = totalPages - maxButtons + 1;
            }

            // Add first page and ellipsis if needed
            if (startPage > 1) {
                pages.push(1);
                if (startPage > 2) {
                    pages.push('...');
                }
            }

            // Add page numbers
            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }

            // Add ellipsis and last page if needed
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    pages.push('...');
                }
                pages.push(totalPages);
            }
        }

        return pages;
    }

    /**
     * Create a simple pagination component (for quick implementation)
     * @param {object} config
     * @returns {string} HTML string
     */
    static createPaginationHTML(config = {}) {
        const {
            currentPage = 1,
            totalPages = 1,
            onPageChange = 'handlePageChange'
        } = config;

        if (totalPages <= 1) return '';

        return `
            <div class="pagination-simple" style="display: flex; gap: 0.5rem; justify-content: center; margin: 1rem 0;">
                <button
                    ${currentPage === 1 ? 'disabled' : ''}
                    onclick="${onPageChange}(${currentPage - 1})"
                    class="btn-secondary">
                    Previous
                </button>
                <span style="padding: 0.5rem 1rem; display: flex; align-items: center;">
                    Page ${currentPage} of ${totalPages}
                </span>
                <button
                    ${currentPage === totalPages ? 'disabled' : ''}
                    onclick="${onPageChange}(${currentPage + 1})"
                    class="btn-primary">
                    Next
                </button>
            </div>
        `;
    }

    /**
     * Calculate which items should be visible in virtual scrolling
     * @param {number} scrollTop - Current scroll position
     * @param {number} itemHeight - Height of each item
     * @param {number} containerHeight - Height of container
     * @param {number} totalItems - Total number of items
     * @param {number} buffer - Extra items to render above/below viewport (default: 5)
     * @returns {object} Visible range { startIndex, endIndex, offsetY }
     */
    static getVirtualScrollRange(scrollTop, itemHeight, containerHeight, totalItems, buffer = 5) {
        const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
        const visibleItems = Math.ceil(containerHeight / itemHeight);
        const endIndex = Math.min(totalItems - 1, startIndex + visibleItems + buffer * 2);
        const offsetY = startIndex * itemHeight;

        return {
            startIndex,
            endIndex,
            offsetY,
            visibleCount: endIndex - startIndex + 1
        };
    }
}

// Expose as global
window.paginationHelper = PaginationHelper;

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaginationHelper;
}
