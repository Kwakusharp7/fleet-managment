const { check, validationResult } = require('express-validator');
const Setting = require('../models/Setting');

// @desc    Get settings page
// @route   GET /settings
exports.getSettings = async (req, res) => {
    try {
        // Get all settings
        const settings = await Setting.find();

        // Convert settings array to object for easier access
        const settingsObj = {};
        settings.forEach(setting => {
            settingsObj[setting.key] = setting.value;
        });

        res.render('settings/index', {
            title: 'System Settings',
            settings: settingsObj
        });
    } catch (err) {
        console.error('Error retrieving settings:', err);
        req.flash('error_msg', 'Error retrieving settings');
        res.redirect('/dashboard');
    }
};

// @desc    Update settings
// @route   POST /settings
exports.updateSettings = [
    check('adminEmail', 'Valid email is required').isEmail().optional(),
    check('weightUnit', 'Weight unit is required').notEmpty().optional(),
    check('dimensionUnit', 'Dimension unit is required').notEmpty().optional(),

    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).render('settings/index', {
                title: 'System Settings',
                errors: errors.array(),
                settings: req.body
            });
        }

        try {
            // Get settings from request body
            const settingsToUpdate = req.body;

            // Update each setting
            for (const [key, value] of Object.entries(settingsToUpdate)) {
                await Setting.findOneAndUpdate(
                    { key },
                    { key, value },
                    { upsert: true, new: true }
                );
            }

            req.flash('success_msg', 'Settings updated successfully');
            res.redirect('/settings');
        } catch (err) {
            console.error('Error updating settings:', err);
            req.flash('error_msg', 'Error updating settings');
            res.redirect('/settings');
        }
    }
];