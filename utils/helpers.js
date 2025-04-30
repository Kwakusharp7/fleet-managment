/**
 * Helper utility functions for the application
 */
const moment = require('moment');
const config = require('../config/config');

/**
 * Format date using moment.js
 * @param {Date} date - Date to format
 * @param {String} format - Format string (long, short, input)
 * @returns {String} Formatted date string
 */
exports.formatDate = (date, format = 'long') => {
    if (!date) return '';

    const formatString = config.dateFormat[format] || 'YYYY-MM-DD HH:mm';
    return moment(date).format(formatString);
};

/**
 * Format currency
 * @param {Number} amount - Amount to format
 * @param {Number} decimals - Number of decimal places
 * @returns {String} Formatted currency string
 */
exports.formatCurrency = (amount, decimals = 2) => {
    if (amount === null || amount === undefined) return '';
    return parseFloat(amount).toFixed(decimals);
};

/**
 * Format weight with appropriate unit
 * @param {Number} weight - Weight to format
 * @param {Number} decimals - Number of decimal places
 * @returns {String} Formatted weight string with unit
 */
exports.formatWeight = (weight, decimals = 2) => {
    if (weight === null || weight === undefined) return '';
    return `${parseFloat(weight).toFixed(decimals)} ${config.weightUnit}`;
};

/**
 * Format dimensions with appropriate unit
 * @param {Number} value - Dimension value to format
 * @param {Number} decimals - Number of decimal places
 * @returns {String} Formatted dimension string with unit
 */
exports.formatDimension = (value, decimals = 2) => {
    if (value === null || value === undefined) return '';
    return `${parseFloat(value).toFixed(decimals)} ${config.dimensionUnit}`;
};

/**
 * Calculate the area of a rectangle
 * @param {Number} length - Length
 * @param {Number} width - Width
 * @returns {Number} Area
 */
exports.calculateArea = (length, width) => {
    if (!length || !width) return 0;
    return parseFloat(length) * parseFloat(width);
};

/**
 * Calculate percentage
 * @param {Number} part - Part value
 * @param {Number} whole - Whole value
 * @param {Number} decimals - Number of decimal places
 * @returns {Number} Percentage
 */
exports.calculatePercentage = (part, whole, decimals = 1) => {
    if (!whole) return 0;
    return ((part / whole) * 100).toFixed(decimals);
};

/**
 * Generate a unique ID with prefix
 * @param {String} prefix - Prefix for the ID
 * @returns {String} Unique ID
 */
exports.generateId = (prefix = 'id') => {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
};

/**
 * Check if a load is overweight
 * @param {Object} load - Load object
 * @returns {Boolean} True if load is overweight
 */
exports.isOverweight = (load) => {
    if (!load || !load.truckInfo || !load.truckInfo.weight) return false;

    const totalWeight = (load.totalWeight || 0);
    return totalWeight > load.truckInfo.weight;
};

/**
 * Get the space utilization of a load
 * @param {Object} load - Load object
 * @returns {Object} Space utilization info
 */
exports.getSpaceUtilization = (load) => {
    if (!load || !load.truckInfo || !load.truckInfo.length || !load.truckInfo.width) {
        return { totalArea: 0, truckArea: 0, percentage: 0 };
    }

    const totalArea = load.skids.reduce((sum, skid) => {
        return sum + ((skid.width || 0) * (skid.length || 0));
    }, 0);

    const truckArea = load.truckInfo.length * load.truckInfo.width;
    const percentage = truckArea > 0 ? (totalArea / truckArea) * 100 : 0;

    return {
        totalArea,
        truckArea,
        percentage,
        formattedPercentage: `${percentage.toFixed(1)}%`
    };
};

/**
 * Truncate text to specified length
 * @param {String} text - Text to truncate
 * @param {Number} length - Maximum length
 * @returns {String} Truncated text
 */
exports.truncateText = (text, length = 100) => {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
};

/**
 * Get status badge HTML
 * @param {String} status - Status string
 * @param {String} type - Type of status (load, project, user)
 * @returns {String} HTML for status badge
 */
exports.getStatusBadge = (status, type = 'load') => {
    if (!status) return '';

    let statusClass = '';

    if (type === 'load') {
        statusClass = `status-${status.toLowerCase()}`;
    } else if (type === 'project' || type === 'user') {
        statusClass = status === 'Active' ? 'status-active' : 'status-inactive';
    }

    return `<span class="status-badge ${statusClass}">${status}</span>`;
};