/**
 * Retrieves a flash message from a cookie if available
 *
 * @param req
 * @param res
 * @param next
 */
module.exports = async (req, res, next) => {
    req.flashMessage = {
        type: '',
        message: ''
    };

    if(req.cookies.flashMessage) {
        req.flashMessage = JSON.parse(req.cookies.flashMessage);
        res.cookie('flashMessage', '', {httpOnly: true, expires: new Date(0)})
    }

    next();
}
