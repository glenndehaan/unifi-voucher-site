/**
 * Import base packages
 */
const { v4: uuidv4 } = require('uuid');

/**
 * Attaches a session ID to a user session
 *
 * @param req
 * @param res
 * @param next
 */
module.exports = async (req, res, next) => {
    req.sid = "";

    // Check if user has an existing session id
    if(!req.cookies.sid) {
        const sid = uuidv4();
        res.cookie('sid', sid, {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)});
        req.sid = sid;
        next();
        return;
    }

    req.sid = req.cookies.sid;

    next();
}
