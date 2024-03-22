/**
 * Global variables
 */
const authDisabled = (process.env.DISABLE_AUTH === 'true') || false;

/**
 * Verifies if a user is signed in
 *
 * @type {{web: ((function(*, *, *): Promise<void>)|*), api: ((function(*, *, *): Promise<void>)|*)}}
 */
module.exports = {
    /**
     * Handle web authentication
     *
     * @param req
     * @param res
     * @param next
     * @return {Promise<void>}
     */
    web: async (req, res, next) => {
        // Check if authentication is enabled
        if(!authDisabled) {
            // Check if user has an existing authorization cookie
            if (!req.cookies.authorization) {
                res.redirect(302, '/login');
                return;
            }

            // Check if password is correct
            const passwordCheck = req.cookies.authorization === (process.env.SECURITY_CODE || "0000");
            if (!passwordCheck) {
                res.cookie('flashMessage', JSON.stringify({type: 'error', message: 'Password Invalid!'}), {httpOnly: true, expires: new Date(Date.now() + 24 * 60 * 60 * 1000)}).redirect(302, '/login');
                return;
            }
        }

        next();
    },

    /**
     * Handle api authentication
     *
     * @param req
     * @param res
     * @param next
     * @return {Promise<void>}
     */
    api: async (req, res, next) => {
        // Check if authentication is enabled
        if(!authDisabled) {
            // Check if user has sent the authorization header
            if (!req.headers.authorization) {
                res.status(401).send();
                return;
            }

            // Check if password is correct
            const passwordCheck = req.headers.authorization === `Bearer ${(process.env.SECURITY_CODE || "0000")}`;
            if (!passwordCheck) {
                res.status(403).send();
                return;
            }
        }

        next();
    }
}
