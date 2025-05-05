const moment = require('moment');
const Project = require('../models/Project');
const Load = require('../models/Load');
const User = require('../models/User');

// @desc    Get dashboard data
// @route   GET /dashboard
exports.getDashboard = async (req, res) => {
    try {
        if (req.user.role === 'Loader') {
            return res.redirect('/loader');
        }

        // Get counts
        const activeProjects = await Project.countDocuments({ status: 'Active' });
        const totalProjects = await Project.countDocuments();
        const loaderCount = req.user.role === 'Admin' ?
            await User.countDocuments({ role: 'Loader' }) : 0;

        // Get today's date in local timezone for comparison
        const today = moment().startOf('day');
        const tomorrow = moment(today).add(1, 'days');

        // Get loads today
        const loadsToday = await Load.countDocuments({
            dateEntered: {
                $gte: today.toDate(),
                $lt: tomorrow.toDate()
            }
        });

        const totalLoads = await Load.countDocuments();
        const plannedLoads = await Load.countDocuments({ status: 'Planned' });
        const loadedLoads = await Load.countDocuments({ status: 'Loaded' });
        const deliveredLoads = await Load.countDocuments({ status: 'Delivered' });

        // Calculate total skids and potential overweight loads
        const loadStats = await Load.aggregate([
            {
                $group: {
                    _id: null,
                    totalSkids: { $sum: '$skidCount' },
                    totalWeight: { $sum: '$totalWeight' }
                }
            }
        ]);

        const totalSkids = loadStats.length > 0 ? loadStats[0].totalSkids : 0;

        // Find potentially overweight loads
        const overweightLoads = await Load.countDocuments({
            $expr: {
                $gt: ['$totalWeight', '$truckInfo.weight']
            }
        });

        // Get recent loads
        const recentLoads = await Load.find()
            .sort({ dateEntered: -1 })
            .limit(5)
            .lean();

        // Get projects for the recent loads
        const projectCodes = [...new Set(recentLoads.map(load => load.projectCode))];
        const projects = await Project.find({ code: { $in: projectCodes } });

        const projectMap = {};
        projects.forEach(project => {
            projectMap[project.code] = project;
        });

        // Enhance recent loads with project info
        const enhancedRecentLoads = recentLoads.map(load => {

            const project = projectMap[load.projectCode] || { name: 'Unknown Project' };
            return {
                ...load,
                projectName: project.name,
                projectFullName: `${load.projectCode} – ${project.name}`,
                formattedDate: moment(load.dateEntered).format('YYYY-MM-DD HH:mm')
            };
        });

        // Render dashboard
        res.render('dashboard/index', {
            title: 'Dashboard',
            stats: {
                activeProjects,
                totalProjects,
                loadsToday,
                totalLoads,
                plannedLoads,
                loadedLoads,
                deliveredLoads,
                totalSkids,
                overweightLoads,
                loaderCount
            },
            recentLoads: enhancedRecentLoads,
            user: req.user
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error retrieving dashboard data');
        res.render('dashboard/index', {
            title: 'Dashboard',
            stats: {
                activeProjects: 0,
                totalProjects: 0,
                loadsToday: 0,
                totalLoads: 0,
                plannedLoads: 0,
                loadedLoads: 0,
                deliveredLoads: 0,
                totalSkids: 0,
                overweightLoads: 0
            },
            recentLoads: [],
            error: 'Error retrieving dashboard data'
        });
    }
};

// @desc    Get admin dashboard data (for AJAX)
// @route   GET /dashboard/admin-stats
exports.getAdminStats = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Get counts
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ status: 'Active' });

        // Get load counts by status
        const statusCounts = await Load.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Format status counts
        const statusMap = {};
        statusCounts.forEach(item => {
            statusMap[item._id] = item.count;
        });

        // Get project counts by status
        const projectCounts = await Project.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Format project counts
        const projectStatusMap = {};
        projectCounts.forEach(item => {
            projectStatusMap[item._id] = item.count;
        });

        // Return stats
        res.json({
            users: {
                total: totalUsers,
                active: activeUsers,
                inactive: totalUsers - activeUsers
            },
            loads: {
                total: statusMap.Planned + statusMap.Loaded + statusMap.Delivered || 0,
                planned: statusMap.Planned || 0,
                loaded: statusMap.Loaded || 0,
                delivered: statusMap.Delivered || 0
            },
            projects: {
                total: projectStatusMap.Active + projectStatusMap.Inactive || 0,
                active: projectStatusMap.Active || 0,
                inactive: projectStatusMap.Inactive || 0
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error retrieving admin statistics' });
    }
};

// @desc    Get chart data for dashboard
// @route   GET /dashboard/chart-data
exports.getChartData = async (req, res) => {
    try {
        // Get loads by day for past 7 days
        const startDate = moment().subtract(6, 'days').startOf('day');
        const endDate = moment().endOf('day');

        const loadsByDay = await Load.aggregate([
            {
                $match: {
                    dateEntered: {
                        $gte: startDate.toDate(),
                        $lte: endDate.toDate()
                    }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$dateEntered' } },
                    count: { $sum: 1 },
                    weight: { $sum: '$totalWeight' }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // Fill in missing days
        const loadData = [];
        const weightData = [];

        for (let i = 0; i < 7; i++) {
            const date = moment(startDate).add(i, 'days').format('YYYY-MM-DD');
            const dayData = loadsByDay.find(item => item._id === date);

            loadData.push({
                date,
                displayDate: moment(date).format('MMM DD'),
                count: dayData ? dayData.count : 0
            });

            weightData.push({
                date,
                displayDate: moment(date).format('MMM DD'),
                weight: dayData ? dayData.weight : 0
            });
        }

        // Get top projects by load count
        const projectLoads = await Load.aggregate([
            {
                $group: {
                    _id: '$projectCode',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 5
            }
        ]);

        // Get project names
        const projectCodes = projectLoads.map(item => item._id);
        const projects = await Project.find({ code: { $in: projectCodes } });

        const projectMap = {};
        projects.forEach(project => {
            projectMap[project.code] = project.name;
        });

        // Format project data
        const projectData = projectLoads.map(item => ({
            code: item._id,
            name: projectMap[item._id] || 'Unknown Project',
            fullName: `${item._id} – ${projectMap[item._id] || 'Unknown Project'}`,
            count: item.count
        }));

        // Return chart data
        res.json({
            loadsByDay: loadData,
            weightByDay: weightData,
            topProjects: projectData
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error retrieving chart data' });
    }
};