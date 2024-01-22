/**
 * Verifies if a user is signed in
 *
 * @param req
 * @param res
 * @param next
 */
module.exports = async (req, res, next) => {
    // Check if user has an existing authorization cookie
    if(!req.cookies.authorization) {
        res.redirect(302, '/login');
        return;
    }

    // Check if password is correct
    const passwordCheck = req.cookies.authorization === (process.env.SECURITY_CODE || "0000");
    if(!passwordCheck) {
        res.cookie('flashMessage', JSON.stringify({type: 'error', message: 'Password Invalid!'}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, '/login');
        return;
    }

    next();
}
