const moment = require('moment');
const Project = require('../models/Project');
const Load = require('../models/Load');

// @desc    Get reports page
// @route   GET /reports
exports.getReportsPage = async (req, res) => {
    try {
        console.log("Loading reports page...");
        // Get all projects for filter dropdown
        const projects = await Project.find().sort({ code: 1 });

        console.log(`Found ${projects.length} projects for report filters`);

        // Render the reports page
        return res.render('report/index', {
            title: 'Reports',
            projects,
            reportData: null,
            filters: {
                reportType: '',
                projectCode: '',
                startDate: '',
                endDate: ''
            }
        });
    } catch (err) {
        console.error('Error retrieving data for reports page:', err);

        // Handle error more gracefully
        return res.status(500).render('error', {
            statusCode: 500,
            title: 'Error Loading Reports',
            message: 'There was a problem retrieving the data needed for the reports page.',
            error: process.env.NODE_ENV === 'development' ? err : undefined
        });
    }
};

// @desc    Generate report
// @route   POST /reports/generate
exports.generateReport = async (req, res) => {
    try {
        const { reportType, projectCode, startDate, endDate } = req.body;

        // Validate report type
        if (!reportType) {
            req.flash('error_msg', 'Report type is required');
            return res.redirect('/reports');
        }

        // Get all projects for filter dropdown
        const projects = await Project.find().sort({ code: 1 });

        // Build query based on filters
        const query = {};

        if (projectCode) {
            query.projectCode = projectCode;
        }

        // Set date filters if provided
        if (startDate || endDate) {
            query.dateEntered = {};

            if (startDate) {
                query.dateEntered.$gte = new Date(startDate);
            }

            if (endDate) {
                // Add one day to include the end date fully
                const endDateTime = new Date(endDate);
                endDateTime.setDate(endDateTime.getDate() + 1);
                query.dateEntered.$lt = endDateTime;
            }
        }

        let reportData = null;

        // Generate report based on type
        switch (reportType) {
            case 'loads-by-project':
                reportData = await generateLoadsByProjectReport(query);
                break;

            case 'load-status-summary':
                reportData = await generateLoadStatusReport(query);
                break;

            case 'weight-by-date':
                reportData = await generateWeightByDateReport(query);
                break;

            default:
                req.flash('error_msg', 'Invalid report type');
                return res.redirect('/reports');
        }

        res.render('report/index', {
            title: 'Reports',
            projects,
            reportData,
            reportType,
            filters: {
                reportType,
                projectCode,
                startDate,
                endDate
            }
        });
    } catch (err) {
        console.error('Error generating report:', err);
        req.flash('error_msg', 'Error generating report');
        res.redirect('/reports');
    }
};

// Helper function to generate loads by project report
async function generateLoadsByProjectReport(query) {
    // Get loads with counts grouped by project
    const loadsByProject = await Load.aggregate([
        { $match: query },
        {
            $group: {
                _id: '$projectCode',
                count: { $sum: 1 },
                totalWeight: { $sum: '$totalWeight' },
                totalSkids: { $sum: '$skidCount' }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    // Get project details for each group
    const projects = await Project.find({
        code: { $in: loadsByProject.map(item => item._id) }
    });

    // Create a map of project codes to names
    const projectMap = {};
    projects.forEach(project => {
        projectMap[project.code] = project.name;
    });

    // Enhance report data with project names
    const reportData = loadsByProject.map(item => ({
        projectCode: item._id,
        projectName: projectMap[item._id] || 'Unknown Project',
        loadCount: item.count,
        totalWeight: item.totalWeight,
        totalSkids: item.totalSkids
    }));

    // Add totals
    const totals = {
        loadCount: reportData.reduce((sum, item) => sum + item.loadCount, 0),
        totalWeight: reportData.reduce((sum, item) => sum + item.totalWeight, 0),
        totalSkids: reportData.reduce((sum, item) => sum + item.totalSkids, 0)
    };

    return {
        title: 'Loads by Project',
        data: reportData,
        totals,
        type: 'loads-by-project'
    };
}

// Helper function to generate load status report
async function generateLoadStatusReport(query) {
    // Get loads with counts grouped by status
    const loadsByStatus = await Load.aggregate([
        { $match: query },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalWeight: { $sum: '$totalWeight' },
                totalSkids: { $sum: '$skidCount' }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    // Calculate totals
    const totals = {
        loadCount: loadsByStatus.reduce((sum, item) => sum + item.count, 0),
        totalWeight: loadsByStatus.reduce((sum, item) => sum + item.totalWeight, 0),
        totalSkids: loadsByStatus.reduce((sum, item) => sum + item.totalSkids, 0)
    };

    return {
        title: 'Load Status Summary',
        data: loadsByStatus.map(item => ({
            status: item._id,
            loadCount: item.count,
            totalWeight: item.totalWeight,
            totalSkids: item.totalSkids,
            percentOfTotal: totals.loadCount > 0 ? (item.count / totals.loadCount * 100).toFixed(1) : 0
        })),
        totals,
        type: 'load-status-summary'
    };
}

// Helper function to generate weight by date report
async function generateWeightByDateReport(query) {
    // Get loads grouped by date
    const weightByDate = await Load.aggregate([
        { $match: query },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$dateEntered' } },
                loadCount: { $sum: 1 },
                totalWeight: { $sum: '$totalWeight' },
                totalSkids: { $sum: '$skidCount' }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    // Calculate totals
    const totals = {
        loadCount: weightByDate.reduce((sum, item) => sum + item.loadCount, 0),
        totalWeight: weightByDate.reduce((sum, item) => sum + item.totalWeight, 0),
        totalSkids: weightByDate.reduce((sum, item) => sum + item.totalSkids, 0)
    };

    return {
        title: 'Weight Summary by Date',
        data: weightByDate.map(item => ({
            date: item._id,
            formattedDate: moment(item._id).format('MMM DD, YYYY'),
            loadCount: item.loadCount,
            totalWeight: item.totalWeight,
            totalSkids: item.totalSkids,
            averageWeight: item.loadCount > 0 ? (item.totalWeight / item.loadCount).toFixed(2) : 0
        })),
        totals,
        type: 'weight-by-date'
    };
}